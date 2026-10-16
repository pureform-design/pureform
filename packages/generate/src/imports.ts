// The config's import rules: build tools import it in Node and the app's bundle may import it in
// the browser, so it may import only pureform packages and pure data (its own relative files),
// with no Node built-ins and no environment reads at top level. This walks the config's
// relative imports, checking each file, and lists the files it reached for watching.

import { existsSync, readFileSync, statSync } from "node:fs";
import { builtinModules } from "node:module";
import { dirname, extname, isAbsolute, resolve } from "node:path";

import { parseSync } from "oxc-parser";

/** What the import rules allow besides pureform packages. */
export interface ImportRuleOptions {
    /** Packages the config may import, by name or pattern: `["lodash-es", /^@acme\//]`. */
    readonly allow?: readonly (string | RegExp)[];
}

export type ImportRule =
    /** A Node built-in (`node:fs`, `path`). */
    | "builtin"
    /** A package that isn't pureform's and isn't allowed. */
    | "package"
    /** `process.env`, `import.meta.env`, `Bun.env`, or `Deno.env` read at top level. */
    | "env";

export interface ImportViolation {
    readonly file: string;
    readonly line: number;
    readonly column: number;
    readonly rule: ImportRule;
    /** The import specifier, for `builtin` and `package`. */
    readonly specifier?: string;
    readonly message: string;
}

export interface ConfigImports {
    /** The config and every file it imports through relative paths, absolute. */
    readonly files: readonly string[];
    readonly violations: readonly ImportViolation[];
}

const SOURCE_EXTENSIONS = [
    ".ts",
    ".tsx",
    ".mts",
    ".cts",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
];
const RESOLVE_EXTENSIONS = [...SOURCE_EXTENSIONS, ".json"];
const BUILTINS = new Set(builtinModules);

const isFile = (path: string): boolean =>
    existsSync(path) && statSync(path).isFile();

// A relative import as TypeScript and bundlers resolve it: the path, the path with an
// extension, a `.js` written for a `.ts` file, or a folder's index.
const resolveRelative = (
    from: string,
    specifier: string,
): string | undefined => {
    const base = resolve(dirname(from), specifier.split("?")[0] ?? specifier);
    if (isFile(base)) return base;
    for (const extension of RESOLVE_EXTENSIONS) {
        if (isFile(base + extension)) return base + extension;
    }
    const extension = extname(base);
    if ([".js", ".jsx", ".mjs", ".cjs"].includes(extension)) {
        const stem = base.slice(0, -extension.length);
        for (const candidate of [".ts", ".tsx", ".mts", ".cts"]) {
            if (isFile(stem + candidate)) return stem + candidate;
        }
    }
    for (const extension of RESOLVE_EXTENSIONS) {
        const index = resolve(base, `index${extension}`);
        if (isFile(index)) return index;
    }
    return undefined;
};

const isRelative = (specifier: string): boolean =>
    specifier.startsWith("./") ||
    specifier.startsWith("../") ||
    specifier === "." ||
    specifier === ".." ||
    isAbsolute(specifier);

const isBuiltin = (specifier: string): boolean =>
    specifier.startsWith("node:") ||
    specifier.startsWith("bun:") ||
    BUILTINS.has(specifier) ||
    BUILTINS.has(specifier.split("/")[0] ?? "");

const isAllowed = (
    specifier: string,
    allow: readonly (string | RegExp)[],
): boolean =>
    specifier.startsWith("@pureform/") ||
    allow.some((rule) =>
        typeof rule === "string"
            ? specifier === rule || specifier.startsWith(`${rule}/`)
            : rule.test(specifier),
    );

type Node = { type: string; start: number; end: number } & Record<
    string,
    unknown
>;

const isNode = (value: unknown): value is Node =>
    typeof value === "object" &&
    value !== null &&
    typeof (value as { type?: unknown }).type === "string";

const FUNCTIONS = new Set([
    "FunctionDeclaration",
    "FunctionExpression",
    "ArrowFunctionExpression",
]);

const ENV_OBJECTS = new Set(["process", "Bun", "Deno"]);

const propertyName = (node: Node): string | undefined => {
    const property = node.property as Node | undefined;
    if (!property) return undefined;
    if (!node.computed && property.type === "Identifier") {
        return property.name as string;
    }
    if (property.type === "Literal" && typeof property.value === "string") {
        return property.value;
    }
    return undefined;
};

// `process.env`, `Bun.env`, `Deno.env`, `import.meta.env`.
const isEnvRead = (node: Node): boolean => {
    if (node.type !== "MemberExpression" || propertyName(node) !== "env") {
        return false;
    }
    const object = node.object as Node;
    if (object.type === "Identifier") {
        return ENV_OBJECTS.has(object.name as string);
    }
    return object.type === "MetaProperty";
};

const literalSource = (node: unknown): string | undefined =>
    isNode(node) && node.type === "Literal" && typeof node.value === "string"
        ? node.value
        : isNode(node) &&
            node.type === "TemplateLiteral" &&
            (node.expressions as unknown[]).length === 0
          ? ((node.quasis as { value: { cooked: string } }[])[0]?.value
                .cooked ?? undefined)
          : undefined;

// Imports and re-exports that are erased at build time.
const isTypeOnly = (node: Node): boolean => {
    if (node.importKind === "type" || node.exportKind === "type") return true;
    const specifiers = node.specifiers as Node[] | undefined;
    return (
        node.type === "ImportDeclaration" &&
        specifiers !== undefined &&
        specifiers.length > 0 &&
        specifiers.every((specifier) => specifier.importKind === "type")
    );
};

interface Found {
    specifier: string;
    start: number;
}

const scanFile = (
    file: string,
    source: string,
): { imports: Found[]; env: number[] } => {
    const { program } = parseSync(file, source, { sourceType: "module" });
    const imports: Found[] = [];
    const env: number[] = [];
    const visit = (node: Node, depth: number) => {
        switch (node.type) {
            case "ImportDeclaration":
            case "ExportNamedDeclaration":
            case "ExportAllDeclaration": {
                const specifier = literalSource(node.source);
                if (specifier !== undefined && !isTypeOnly(node)) {
                    imports.push({ specifier, start: node.start });
                }
                break;
            }
            case "ImportExpression": {
                const specifier = literalSource(node.source);
                if (specifier !== undefined) {
                    imports.push({ specifier, start: node.start });
                }
                break;
            }
            case "CallExpression": {
                const callee = node.callee as Node;
                const args = node.arguments as unknown[];
                if (
                    callee.type === "Identifier" &&
                    callee.name === "require" &&
                    args.length === 1
                ) {
                    const specifier = literalSource(args[0]);
                    if (specifier !== undefined) {
                        imports.push({ specifier, start: node.start });
                    }
                }
                break;
            }
            case "MemberExpression":
                if (depth === 0 && isEnvRead(node)) env.push(node.start);
                break;
        }
        const inner = FUNCTIONS.has(node.type) ? depth + 1 : depth;
        for (const [key, value] of Object.entries(node)) {
            if (key === "type" || key === "start" || key === "end") continue;
            if (Array.isArray(value)) {
                for (const item of value) if (isNode(item)) visit(item, inner);
            } else if (isNode(value)) {
                visit(value, inner);
            }
        }
    };
    visit(program as unknown as Node, 0);
    return { imports, env };
};

const position = (
    source: string,
    offset: number,
): { line: number; column: number } => {
    const before = source.slice(0, offset);
    const line = before.split("\n").length;
    return { line, column: offset - before.lastIndexOf("\n") };
};

/** Walks the config and the files it imports through relative paths, and checks each against
 *  the import rules. */
export const scanConfigImports = (
    entry: string,
    options: ImportRuleOptions = {},
): ConfigImports => {
    const allow = options.allow ?? [];
    const files: string[] = [];
    const violations: ImportViolation[] = [];
    const seen = new Set<string>();
    const queue = [resolve(entry)];
    while (queue.length > 0) {
        const file = queue.shift()!;
        if (seen.has(file)) continue;
        seen.add(file);
        files.push(file);
        if (!SOURCE_EXTENSIONS.includes(extname(file))) continue;
        const source = readFileSync(file, "utf8");
        const { imports, env } = scanFile(file, source);
        for (const { specifier, start } of imports) {
            if (isRelative(specifier)) {
                const target = resolveRelative(file, specifier);
                if (target) queue.push(target);
                continue;
            }
            const at = position(source, start);
            if (isBuiltin(specifier)) {
                violations.push({
                    file,
                    ...at,
                    rule: "builtin",
                    specifier,
                    message: `imports the Node built-in "${specifier}"; the config must also load in the browser`,
                });
            } else if (!isAllowed(specifier, allow)) {
                violations.push({
                    file,
                    ...at,
                    rule: "package",
                    specifier,
                    message: `imports "${specifier}"; the config may import only pureform packages and its own data files`,
                });
            }
        }
        for (const start of env) {
            violations.push({
                file,
                ...position(source, start),
                rule: "env",
                message:
                    "reads the environment at top level; the config must give the same result wherever it's imported",
            });
        }
    }
    return { files, violations };
};

/** The violations as one message, with paths relative to `root` when given. */
export const formatImportViolations = (
    violations: readonly ImportViolation[],
    root?: string,
): string => {
    const where = (file: string) =>
        root && file.startsWith(`${resolve(root)}/`)
            ? file.slice(resolve(root).length + 1)
            : file;
    return [
        "pureform: the config breaks its import rules. It's imported by build tools in Node and by the app in the browser, so it may import only pureform packages and pure data, with no Node built-ins and no environment reads at top level:",
        ...violations.map(
            (violation) =>
                `  ${where(violation.file)}:${violation.line}:${violation.column} ${violation.message}`,
        ),
        "Allow a pure-data package with the `allow` import rule option.",
    ].join("\n");
};
