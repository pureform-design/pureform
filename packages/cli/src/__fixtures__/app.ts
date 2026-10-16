// Test fixtures: a temporary app with a config, a glue file holding a fake adapter, and a way to
// run the command and keep what it printed.

import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { main } from "../program";

/** Writes files under a root. */
export const writeTree = (
    root: string,
    files: Record<string, string>,
): void => {
    for (const [path, contents] of Object.entries(files)) {
        const file = join(root, path);
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, contents);
    }
};

/** A config naming these components, all single-slot, importing its parts from a file. */
export const configSource = (...names: string[]): string =>
    `import { parts } from "./parts";\nexport default { tokens: {}, semanticTokens: {}, themes: { teal: {} }, components: { ${names.map((name) => `${name}: parts.${name}`).join(", ")} } };\n`;

const partsSource = `const part = (name) => ({ kind: "component", name, recipe: { base: {} } });\nexport const parts = { chip: part("chip"), divider: part("divider"), badge: part("badge") };\n`;

/** A glue file whose target is a fake web adapter writing one module per component. */
export const glueSource = (
    options: Record<string, unknown> = {},
    exportName = "glue",
): string =>
    `const fake = {\n    name: "fake",\n    platform: "web",\n    codegen: (context) => ({\n        components: context.components.map((name) => ({\n            name,\n            path: \`web/\${name}.ts\`,\n            contents: \`export const \${name} = () => ({ root: { class: "\${context.options.prefix ?? ""}\${name}" } });\\n\`,\n        })),\n    }),\n};\n${exportName === "default" ? "export default" : `export const ${exportName} =`} { target: fake, ...${JSON.stringify(options)} };\n`;

/** Writes an app into `root`: a config of `names` and, unless `glue` is `false`, a glue file. */
export const writeApp = (
    root: string,
    names: readonly string[] = ["chip", "divider"],
    glue: Record<string, unknown> | false = {},
): string => {
    writeTree(root, {
        "pureform.config.ts": configSource(...names),
        "parts.ts": partsSource,
        ...(glue === false ? {} : { "pureform.glue.ts": glueSource(glue) }),
    });
    return root;
};

/** A fresh app root, as `writeApp` writes it. */
export const tempApp = (
    names?: readonly string[],
    glue?: Record<string, unknown> | false,
): string =>
    writeApp(mkdtempSync(join(tmpdir(), "pureform-cli-")), names, glue);

/** Reads a file under an app's `.pureform/`. */
export const glueFile = (root: string, path: string): string =>
    readFileSync(join(root, ".pureform", path), "utf8");

export interface Run {
    readonly code: number;
    readonly stdout: string;
    readonly stderr: string;
}

/** Runs the command in `cwd`, keeping what it printed. */
export const run = async (
    cwd: string,
    args: readonly string[],
    signal?: AbortSignal,
): Promise<Run> => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const code = await main(args, {
        cwd,
        stdout: (text) => stdout.push(text),
        stderr: (text) => stderr.push(text),
        ...(signal ? { signal } : {}),
    });
    return { code, stdout: stdout.join("\n"), stderr: stderr.join("\n") };
};
