import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

// The workspace keeps TS6 for compiler-API tooling; TS7's default export is version-only.
import ts from "@typescript/typescript6";
import { describe, expect, test } from "vitest";

import { findRoot, readWorkspace } from "./workspace";

interface Manifest {
    dependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
    exports?: Record<string, unknown>;
}

const root = findRoot(fileURLToPath(new URL(".", import.meta.url)));
const workspace = new Map(
    readWorkspace(root).map(({ name, path }) => [
        name,
        {
            path,
            manifest: JSON.parse(
                readFileSync(join(root, path, "package.json"), "utf8"),
            ) as Manifest,
        },
    ]),
);
const names = (...packages: string[]) =>
    packages.map((name) => `@pureform/${name}`);

function pkg(name: string) {
    const entry = workspace.get(name);
    if (!entry) throw new Error(`Missing workspace package: ${name}`);
    return entry;
}

function dependencies(manifest: Manifest): string[] {
    // Peers (including optional peers) and optional dependencies are production edges too.
    // Build tools and test environments in devDependencies are intentionally excluded.
    return Object.keys({
        ...manifest.dependencies,
        ...manifest.peerDependencies,
        ...manifest.optionalDependencies,
    }).sort();
}

function dependencyPaths(start: string): string[][] {
    pkg(start);
    const paths: string[][] = [];
    const pending = [[start]];
    const visited = new Set<string>();
    for (const path of pending) {
        const name = path[path.length - 1]!;
        if (visited.has(name)) continue;
        visited.add(name);
        const entry = workspace.get(name);
        // External packages are checked as edges, not crawled through node_modules.
        if (!entry) continue;
        for (const dependency of dependencies(entry.manifest)) {
            const next = [...path, dependency];
            paths.push(next);
            pending.push(next);
        }
    }
    return paths;
}

const utilities = names("utils", "type-utils");
const neutral = names(
    "core",
    "anatomy",
    "styling",
    "binding-core",
    "theme",
).concat(utilities);
const webLeaves = names("core", "anatomy", "web-contracts").concat(utilities);

describe("platform production dependencies", () => {
    test.each([
        ["core", utilities],
        ["anatomy", names("core").concat(utilities)],
        ["styling", names("core").concat(utilities)],
        ["binding-core", names("core", "anatomy", "styling").concat(utilities)],
        ["web-contracts", names("core", "anatomy")],
        ["css-lowering", names("core", "web-contracts")],
        [
            "styling-web",
            names("core", "styling", "css-lowering", "web-contracts"),
        ],
    ] as const)("%s stays within its direct layer", (name, allowed) => {
        const manifest = pkg(`@pureform/${name}`).manifest;
        expect(
            dependencies(manifest).filter(
                (dependency) => !allowed.includes(dependency),
            ),
        ).toEqual([]);
    });

    test.each([
        ["core", neutral],
        ["anatomy", neutral],
        ["styling", neutral],
        ["binding-core", neutral],
        ["web-contracts", webLeaves],
        ["css-lowering", webLeaves],
        ["styling-web", webLeaves.concat(names("styling", "css-lowering"))],
    ] as const)(
        "%s keeps its transitive production boundary",
        (name, allowed) => {
            const violations = dependencyPaths(`@pureform/${name}`)
                .filter((path) => !allowed.includes(path[path.length - 1]!))
                .map((path) => path.join(" -> "));
            expect(violations).toEqual([]);
        },
    );

    test.each(["react-native", "rn-adapter"])(
        "%s cannot acquire web packages through production dependencies",
        (name) => {
            const forbidden = new Set([
                ...names(
                    "web-contracts",
                    "styling-web",
                    "css-lowering",
                    "binding-web",
                    "css-adapter",
                    "panda-adapter",
                    "tailwind-adapter",
                    "react",
                    "solid",
                ),
                "react-dom",
                "@solidjs/web",
            ]);
            expect(
                dependencyPaths(`@pureform/${name}`)
                    .filter((path) => forbidden.has(path[path.length - 1]!))
                    .map((path) => path.join(" -> ")),
            ).toEqual([]);
        },
    );
});

/** A directory's module files: production sources, and with `tests`, also specs and fixtures. */
function sourceFiles(directory: string, tests = false): string[] {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) {
            return !tests && entry.name === "__tests__"
                ? []
                : sourceFiles(path, tests);
        }
        return /\.[cm]?[jt]sx?$/.test(entry.name) &&
            (tests || !/\.(spec|test)\./.test(entry.name))
            ? [path]
            : [];
    });
}

function packageSources(name: string, tests: boolean): string[] {
    return sourceFiles(join(root, pkg(`@pureform/${name}`).path, "src"), tests);
}

/** The package specifiers an entry's source imports, re-exports, requires, or references as
 *  types. Parsed as modules, so comments, CSS strings, and ARIA prop names never match. */
function specifiers(file: string): string[] {
    const source = ts.preProcessFile(readFileSync(file, "utf8"), true, true);
    return [...source.importedFiles, ...source.typeReferenceDirectives]
        .map(({ fileName }) => fileName)
        .filter((fileName) => !fileName.startsWith("."));
}

const packageOf = (specifier: string) =>
    specifier
        .split("/")
        .slice(0, specifier.startsWith("@") ? 2 : 1)
        .join("/");

function violations(
    name: string,
    tests: boolean,
    forbidden: (specifier: string) => boolean,
): string[] {
    return packageSources(name, tests).flatMap((file) =>
        specifiers(file)
            .filter(forbidden)
            .map((specifier) => `${relative(root, file)} -> ${specifier}`),
    );
}

const webPackages = names(
    "web-contracts",
    "styling-web",
    "binding-web",
    "css-lowering",
    "css-adapter",
    "panda-adapter",
    "tailwind-adapter",
    "react",
    "solid",
);
const webRuntimes = [
    "react-dom",
    "solid-js",
    "@solidjs/web",
    "@zag-js/core",
    "@zag-js/types",
];
const isWebRuntime = (specifier: string) =>
    webRuntimes.includes(packageOf(specifier)) ||
    packageOf(specifier).startsWith("@zag-js/");

describe("platform source imports", () => {
    // Manifests prove declared edges; these prove what the code (and a tsconfig path or hoisted
    // install that would hide an undeclared edge) actually reaches.
    test.each(["core", "anatomy", "styling", "binding-core"])(
        "%s source and tests import no web package, web runtime, or UI framework",
        (name) => {
            expect(
                violations(
                    name,
                    true,
                    (specifier) =>
                        webPackages.includes(packageOf(specifier)) ||
                        isWebRuntime(specifier) ||
                        packageOf(specifier) === "react" ||
                        packageOf(specifier) === "react-native",
                ),
            ).toEqual([]);
        },
    );

    test.each(["react-native", "rn-adapter"])(
        "%s source and tests import no web package or web runtime",
        (name) => {
            expect(
                violations(
                    name,
                    true,
                    (specifier) =>
                        webPackages.includes(packageOf(specifier)) ||
                        // React DOM renders React Native Web's output in the rn-adapter's
                        // own tests only; it never reaches shipped source.
                        (isWebRuntime(specifier) &&
                            !(
                                name === "rn-adapter" &&
                                packageOf(specifier) === "react-dom"
                            )),
                ),
            ).toEqual([]);
            expect(
                violations(
                    name,
                    false,
                    (specifier) => packageOf(specifier) === "react-dom",
                ),
            ).toEqual([]);
        },
    );

    test.each([
        ["web-contracts", names("core")],
        ["css-lowering", names("core", "web-contracts")],
        [
            "styling-web",
            names("core", "styling", "css-lowering", "web-contracts"),
        ],
    ] as const)(
        "%s imports only its own layer, even in tests",
        (name, allowed) => {
            expect(
                violations(
                    name,
                    true,
                    (specifier) =>
                        specifier.startsWith("@pureform/") &&
                        !allowed.includes(packageOf(specifier)),
                ),
            ).toEqual([]);
        },
    );
});

describe("portable packages compile without DOM types", () => {
    // `lib` is ESNext and no ambient `types` load, so a DOM type or API (`HTMLElement`,
    // `document`, `window`) is an unknown name rather than silently available.
    test.each(["core", "anatomy", "styling", "binding-core"])(
        "%s has no DOM global in its source",
        (name) => {
            const directory = join(root, pkg(`@pureform/${name}`).path, "src");
            const globals = join(directory, "platform-globals.d.ts");
            const options: ts.CompilerOptions = {
                lib: ["lib.esnext.d.ts"],
                types: [],
                target: ts.ScriptTarget.ESNext,
                module: ts.ModuleKind.ESNext,
                moduleResolution: ts.ModuleResolutionKind.Bundler,
                customConditions: ["development"],
                noEmit: true,
                skipLibCheck: true,
                strict: true,
            };
            const sources = packageSources(name, false).filter(
                (file) => !file.endsWith(".d.ts"),
            );
            const program = ts.createProgram(
                [...sources, ...(existsSync(globals) ? [globals] : [])],
                options,
            );
            const own = new Set(sources);
            const unknownNames = ts
                .getPreEmitDiagnostics(program)
                // 2304/2552 are "Cannot find name"; 2503 is a missing namespace (`JSX`, `DOM`).
                .filter(
                    (diagnostic) =>
                        [2304, 2503, 2552].includes(diagnostic.code) &&
                        diagnostic.file !== undefined &&
                        own.has(diagnostic.file.fileName),
                )
                .map(
                    (diagnostic) =>
                        `${relative(root, diagnostic.file!.fileName)}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")}`,
                );
            expect(unknownNames).toEqual([]);
        },
    );
});

describe("Native's mixed-package entrypoint", () => {
    test.each(["react-native", "rn-adapter"])(
        "%s consumes js-effects only through /core",
        (name) => {
            const violations: string[] = [];
            for (const file of sourceFiles(
                join(root, pkg(`@pureform/${name}`).path, "src"),
            )) {
                // Parse module references, not comments, CSS strings, or ARIA prop names.
                const source = ts.preProcessFile(
                    readFileSync(file, "utf8"),
                    true,
                    true,
                );
                for (const { fileName } of source.importedFiles) {
                    if (
                        (fileName === "@pureform/js-effects" ||
                            fileName.startsWith("@pureform/js-effects/")) &&
                        fileName !== "@pureform/js-effects/core"
                    ) {
                        violations.push(
                            `${relative(root, file)} -> ${fileName}`,
                        );
                    }
                }
            }
            // Do not scan every source file in js-effects (or machines) just because
            // Native depends on the package: their browser and neutral entries coexist.
            expect(violations).toEqual([]);
        },
    );
});

/** Every source entry a package's manifest exports (its root and subpaths, excluding wildcard
 *  and fixture subpaths), so a moved API can't linger on a subpath. */
function sourceEntries(name: string): string[] {
    const { path, manifest } = pkg(name);
    return Object.entries(manifest.exports ?? {}).flatMap(([key, target]) => {
        if (key.includes("*") || key.includes("fixtures")) return [];
        const conditions = target as {
            import?: { development?: string };
            development?: string;
        };
        const entry =
            conditions.import?.development ?? conditions.development ?? "";
        return entry.endsWith(".ts") ? [join(root, path, entry)] : [];
    });
}

const surfaces = names(
    "core",
    "anatomy",
    "binding-core",
    "styling",
    "web-contracts",
    "css-lowering",
    "styling-web",
    "binding-web",
);
const entrypoints = new Map(
    surfaces.map((name) => [name, sourceEntries(name)] as const),
);
let program: ts.Program | undefined;

function publicExports(name: string): Set<string> {
    // Resolve source barrels, including `export *` and type-only exports, without
    // executing package runtimes or relying on potentially stale dist output.
    if (!program) {
        const options: ts.CompilerOptions = {
            module: ts.ModuleKind.ESNext,
            moduleResolution: ts.ModuleResolutionKind.Bundler,
            noLib: true,
            types: [],
        };
        const host = ts.createCompilerHost(options);
        // Only local barrels matter here. The manifest tests guard package edges;
        // loading external declarations would also load entire platform runtimes.
        host.resolveModuleNames = (modules, containingFile) =>
            modules.map((module) =>
                module.startsWith(".")
                    ? ts.resolveModuleName(
                          module,
                          containingFile,
                          options,
                          host,
                      ).resolvedModule
                    : undefined,
            );
        program = ts.createProgram(
            [...entrypoints.values()].flat(),
            options,
            host,
        );
    }
    const checker = program.getTypeChecker();
    const exported = new Set<string>();
    for (const entry of entrypoints.get(name) ?? []) {
        const file = program.getSourceFile(entry);
        if (!file) throw new Error(`Missing source entrypoint for ${name}`);
        const symbol = checker.getSymbolAtLocation(file);
        if (!symbol) throw new Error(`Missing module symbol for ${name}`);
        for (const { name } of checker.getExportsOfModule(symbol)) {
            exported.add(name);
        }
    }
    return exported;
}

describe("portable public surfaces", () => {
    test.each([
        [
            "core",
            [
                "STATE_ATTRIBUTES",
                "AttributeState",
                "StateAttribute",
                "MOTION_ATTRIBUTE",
                "REDUCED_MOTION_QUERY",
                "formatLinearEasing",
                "parseLinearEasing",
            ],
        ],
        [
            "anatomy",
            [
                "PART_ATTRIBUTE",
                "SCOPE_ATTRIBUTE",
                "TEST_ID_ATTRIBUTE",
                "PartAttributes",
                "partAttributes",
            ],
        ],
        [
            "binding-core",
            [
                "cx",
                "ClassValue",
                "ClassDictionary",
                "classEntry",
                "lazyFactoryError",
                "serverLazyFactoryMessage",
                "combineProps",
                "CombineRules",
                "mergeStyleObjects",
                "partClasses",
                "spreadableProps",
                "outsideRootMessage",
                "stateAttributes",
                "StateAttributes",
                "partSources",
                "providerAttributes",
                "ProviderAttributes",
                "ProviderTheme",
                "ThemeName",
                "ThemeOverrides",
                "ThemeHydration",
                "themeAttributes",
                "themeAttributeOf",
                "MOTION_ATTRIBUTE",
                "REDUCED_MOTION_QUERY",
                "rippleClasses",
                "RippleClasses",
                "indicationTokenValue",
                "indicationTokenValues",
                "providerIndicationOverrides",
                "componentIndicationTokens",
                "fieldControlProps",
                "buttonMachineProps",
                "checkboxMachineProps",
                "listItemRootProps",
                "cardRootProps",
                "nativeSelectProps",
                "toastGroupStyle",
            ],
        ],
        [
            "styling",
            [
                "componentClasses",
                "joinClasses",
                "tokenStyle",
                "withTokenStyle",
                "ClassFactory",
                "ClassSlots",
                "SlotClasses",
                "TokenStyle",
                "TokenVars",
                "SpringVars",
                "CssVars",
                "ThemeAttributes",
                "VarOptions",
                "defineRuntimeTheme",
                "isRuntimeTheme",
                "preloadTheme",
                "themeScope",
                "RuntimeTheme",
                "tokenVar",
                "themeVars",
            ],
        ],
    ] as const)(
        "%s does not re-export extracted web APIs",
        (name, obsolete) => {
            const exported = publicExports(`@pureform/${name}`);
            expect(obsolete.filter((symbol) => exported.has(symbol))).toEqual(
                [],
            );
        },
    );

    test("styling no longer exposes the CSS theme-vars subpath", () => {
        expect(pkg("@pureform/styling").manifest.exports).not.toHaveProperty(
            "./theme-vars",
        );
    });

    test.each([
        ["anatomy", ["partSlot", "partTestId"]],
        [
            "binding-core",
            [
                "createSlotReader",
                "forSlot",
                "forInstance",
                "selectionSignature",
            ],
        ],
        ["styling", ["selectionCache", "selectionKey", "createRegistry"]],
    ] as const)("%s retains neutral readers and caches", (name, retained) => {
        expect([...publicExports(`@pureform/${name}`)]).toEqual(
            expect.arrayContaining([...retained]),
        );
    });

    // Removing an API from a portable package is only a move if its web owner has it.
    test.each([
        [
            "web-contracts",
            [
                "STATE_ATTRIBUTES",
                "MOTION_ATTRIBUTE",
                "REDUCED_MOTION_QUERY",
                "PART_ATTRIBUTE",
                "SCOPE_ATTRIBUTE",
                "TEST_ID_ATTRIBUTE",
            ],
        ],
        ["css-lowering", ["formatLinearEasing", "parseLinearEasing"]],
        [
            "styling-web",
            [
                "componentClasses",
                "joinClasses",
                "tokenStyle",
                "withTokenStyle",
                "createWebRegistry",
                "defineRuntimeTheme",
                "preloadTheme",
                "tokenVar",
                "themeVars",
            ],
        ],
        [
            "binding-web",
            [
                "partAttributes",
                "stateAttributes",
                "partSources",
                "providerAttributes",
                "themeAttributeOf",
                "resolveWebProvider",
                "cx",
                "classEntry",
                "combineProps",
                "partClasses",
                "rippleClasses",
                "providerIndicationOverrides",
            ],
        ],
    ] as const)("%s owns the web APIs moved to it", (name, owned) => {
        expect([...publicExports(`@pureform/${name}`)]).toEqual(
            expect.arrayContaining([...owned]),
        );
    });
});
