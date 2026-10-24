import { existsSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { isGenerateError } from "@pureform/generate";
import { rolldown } from "rolldown";
import { build, createServer } from "vite";
import type { Plugin } from "vite";
import { describe, expect, it, vi } from "vitest";

import {
    configSource,
    eventually,
    fakeAdapter,
    outputFile,
    tempApp,
    writeTree,
} from "./__fixtures__/app";
import { REGISTRY_ID } from "./options";
import type { PureformPluginOptions } from "./options";
import { pureform, unpluginFactory } from "./plugin";

const rejection = async (promise: Promise<unknown>) => {
    try {
        await promise;
    } catch (error) {
        return error;
    }
    throw new Error("expected a rejection");
};

// Builds an app's main.ts as a library with Vite, and imports the result.
const viteBuild = async (
    root: string,
    plugins: Plugin[],
): Promise<{ names: string[]; classes: unknown[]; themes: string[] }> => {
    await build({
        root,
        configFile: false,
        logLevel: "silent",
        plugins,
        build: {
            outDir: "out",
            minify: false,
            lib: { entry: "main.ts", formats: ["es"], fileName: "main" },
        },
    });
    return import(/* @vite-ignore */ join(root, "out/main.mjs"));
};

// The plugin's hooks, called directly.
const hooks = (options: PureformPluginOptions) => {
    const plugin = unpluginFactory(options, { framework: "rollup" });
    const context = { addWatchFile: () => undefined } as never;
    return {
        buildStart: () =>
            (plugin.buildStart as () => Promise<void>).call(context),
        resolveId: (id: string, importer?: string) =>
            (
                plugin.resolveId as (
                    id: string,
                    importer: string | undefined,
                ) => Promise<string | null>
            ).call(context, id, importer),
        watchChange: (id: string) =>
            (plugin.watchChange as (id: string) => void).call(context, id),
    };
};

describe("pureform.vite", () => {
    it("generates .pureform/ and builds the app from virtual:pureform/registry", async () => {
        const root = tempApp("chip", "divider");
        const adapter = fakeAdapter();
        const app = await viteBuild(root, [
            pureform.vite({ target: adapter, options: { prefix: "pf-" } }),
        ]);
        expect(app.names).toEqual(["chip", "divider"]);
        expect(app.classes).toEqual([
            { root: { class: "pf-chip" } },
            { root: { class: "pf-divider" } },
        ]);
        expect(app.themes).toEqual(["teal"]);
        expect(outputFile(root, "fake/pruned/web/chip.ts")).toContain(
            '"pf-chip"',
        );
        // The full output, then the pruned one.
        expect(adapter.calls).toHaveLength(2);
    });

    it("writes the generated registry before other plugins' configResolved, as Panda's needs", async () => {
        const root = tempApp("chip");
        let seen: boolean | undefined;
        const reader: Plugin = {
            name: "reader",
            enforce: "pre",
            configResolved: () => {
                seen = existsSync(join(root, ".pureform/index.ts"));
            },
        };
        await viteBuild(root, [
            reader,
            pureform.vite({ target: fakeAdapter() }),
        ]);
        expect(seen).toBe(true);
    });

    it("takes the allow-list, the lazy list, the folder, and the config path", async () => {
        const root = tempApp();
        writeTree(root, {
            "design/system.ts": configSource(
                "chip",
                "badge",
                "divider",
            ).replace("./parts", "../parts"),
        });
        writeTree(root, {
            "main.ts": `import { registry } from "virtual:pureform/registry";\nexport const names = registry.names;\nexport const classes = [registry.entry("chip").factory({}), registry.entry("badge").kind];\nexport const themes = [];\n`,
        });
        const app = await viteBuild(root, [
            pureform.vite({
                config: "design/system.ts",
                target: fakeAdapter(),
                components: ["chip", "badge"],
                lazy: ["badge"],
                outDir: "src/generated",
            }),
        ]);
        expect(app.names).toEqual(["chip", "badge"]);
        expect(app.classes).toEqual([{ root: { class: "chip" } }, "lazy"]);
        expect(existsSync(join(root, "src/generated/index.ts"))).toBe(true);
        expect(existsSync(join(root, ".pureform"))).toBe(false);
    });

    it("fails the build when generating fails", async () => {
        const root = tempApp("chip");
        writeTree(root, { "pureform.config.ts": "export default 1;\n" });
        const error = await rejection(
            viteBuild(root, [pureform.vite({ target: fakeAdapter() })]),
        );
        expect(String(error)).toContain("pureform: the config at");
    });

    it("generates again in dev when the config or a file it imports changes", async () => {
        const root = tempApp("chip");
        const adapter = fakeAdapter();
        const server = await createServer({
            root,
            configFile: false,
            logLevel: "silent",
            plugins: [pureform.vite({ target: adapter })],
            server: { middlewareMode: true, ws: false },
        });
        try {
            expect(outputFile(root, "fake/full/index.ts")).toContain('"chip"');
            const resolved =
                await server.environments.client.pluginContainer.resolveId(
                    REGISTRY_ID,
                    join(root, "main.ts"),
                );
            expect(resolved?.id).toBe(
                join(root, ".pureform/fake/full/index.ts"),
            );

            writeFileSync(
                join(root, "pureform.config.ts"),
                configSource("chip", "divider"),
            );
            await eventually(() =>
                existsSync(join(root, ".pureform/fake/full/web/divider.ts")),
            );

            writeFileSync(
                join(root, "parts.ts"),
                `const part = (name) => ({ kind: "component", name, recipe: { base: {} } });\nexport const parts = { chip: part("chip"), divider: part("divider"), badge: part("badge"), extra: 1 };\n`,
            );
            const calls = adapter.calls.length;
            await eventually(() => adapter.calls.length > calls);
        } finally {
            await server.close();
        }
    });

    it("keeps a dev server going when generating fails, and names the missing generated registry on import", async () => {
        const root = tempApp("chip");
        writeTree(root, { "pureform.config.ts": "export default 1;\n" });
        const errors: string[] = [];
        const server = await createServer({
            root,
            configFile: false,
            logLevel: "silent",
            customLogger: {
                info: () => undefined,
                warn: () => undefined,
                warnOnce: () => undefined,
                error: (message) => void errors.push(message),
                clearScreen: () => undefined,
                hasErrorLogged: () => false,
                hasWarned: false,
            },
            plugins: [pureform.vite({ target: fakeAdapter() })],
            server: { middlewareMode: true, ws: false },
        });
        try {
            const error = await rejection(
                server.environments.client.pluginContainer.resolveId(
                    REGISTRY_ID,
                    join(root, "main.ts"),
                ),
            );
            expect(String(error)).toContain(
                "the generated registry in .pureform/ is missing (imported from main.ts)",
            );
            writeFileSync(
                join(root, "pureform.config.ts"),
                configSource("chip"),
            );
            await eventually(() =>
                existsSync(join(root, ".pureform/index.ts")),
            );
        } finally {
            await server.close();
        }
    });
});

describe("pureform.rolldown", () => {
    it("generates on build start and resolves the registry", async () => {
        const root = tempApp("chip");
        const bundle = await rolldown({
            cwd: root,
            input: join(root, "main.ts"),
            plugins: [pureform.rolldown({ root, target: fakeAdapter() })],
            logLevel: "silent",
        });
        const { output } = await bundle.generate({ format: "es" });
        await bundle.close();
        expect(output[0].code).toContain('class: "chip"');
        expect(outputFile(root, "fake/pruned/index.ts")).toContain(
            "createRegistry",
        );
    });
});

describe("the plugin's hooks", () => {
    it("names the missing generated registry for an import into the folder, and leaves other imports alone", async () => {
        const root = tempApp("chip");
        const plugin = hooks({ root, target: fakeAdapter() });
        await plugin.buildStart();
        const importer = join(root, "src/main.ts");
        expect(await plugin.resolveId("../.pureform", importer)).toBe(
            join(root, ".pureform/fake/pruned/index.ts"),
        );
        expect(
            await plugin.resolveId("../.pureform/fake/full/web/chip", importer),
        ).toBeNull();
        expect(await plugin.resolveId("./other", importer)).toBeNull();
        expect(await plugin.resolveId("react", importer)).toBeNull();

        rmSync(join(root, ".pureform"), { recursive: true });
        const error = await rejection(
            plugin.resolveId("../.pureform/index", importer),
        );
        expect(isGenerateError(error, "missing-output")).toBe(true);
        expect((error as Error).message).toContain(
            "pureform: the generated registry in .pureform/ is missing (imported from src/main.ts).",
        );
        expect((error as Error).message).toContain("pureform generate");
        expect((error as Error).message).toContain("@pureform/bundler");
        expect(await plugin.resolveId("./other", importer)).toBeNull();
    });

    it("generates again on a change to a dependency only", async () => {
        const root = tempApp("chip");
        const adapter = fakeAdapter();
        const plugin = hooks({ root, target: adapter });
        await plugin.buildStart();
        plugin.watchChange(join(root, "main.ts"));
        plugin.watchChange(join(root, ".pureform/index.ts"));
        await plugin.buildStart();
        expect(adapter.calls).toHaveLength(2);
        writeFileSync(
            join(root, "pureform.config.ts"),
            configSource("divider"),
        );
        plugin.watchChange(join(root, "pureform.config.ts"));
        await plugin.buildStart();
        expect(adapter.calls).toHaveLength(4);
        expect(outputFile(root, "fake/full/index.ts")).toContain('"divider"');
    });

    it("doesn't watch with watch: false", async () => {
        const root = tempApp("chip");
        const adapter = fakeAdapter();
        const plugin = hooks({ root, target: adapter, watch: false });
        await plugin.buildStart();
        plugin.watchChange(join(root, "pureform.config.ts"));
        await plugin.buildStart();
        expect(adapter.calls).toHaveLength(2);
    });
});

describe("pruning", () => {
    // An app whose bundle reads only the registry's names, and whose other source draws a chip.
    const prunable = (...names: string[]) => {
        const root = tempApp(...names);
        writeTree(root, {
            "main.ts": `import { registry } from "virtual:pureform/registry";\nexport const names = registry.names;\nexport const classes = [];\nexport const themes = [];\n`,
            "src/ui.tsx": `import { Chip } from "@pureform/solid/chip";\nexport const ui = <Chip variant="assist" />;\n`,
        });
        return root;
    };

    it("builds with only the components the app draws", async () => {
        const root = prunable("chip", "divider", "badge");
        const adapter = fakeAdapter();
        const info = vi.spyOn(console, "log").mockImplementation(() => {});
        try {
            const app = await viteBuild(root, [
                pureform.vite({ target: adapter }),
            ]);
            expect(app.names).toEqual(["chip"]);
        } finally {
            info.mockRestore();
        }
        expect(adapter.calls).toHaveLength(2);
        expect(adapter.calls[1]!.components).toEqual(["chip"]);
        expect(
            existsSync(join(root, ".pureform/fake/pruned/web/divider.ts")),
        ).toBe(false);
        // The full output stays, for a dev server and the editor.
        expect(
            existsSync(join(root, ".pureform/fake/full/web/divider.ts")),
        ).toBe(true);
    });

    it("keeps the components prune.keep names, and everything with prune: false", async () => {
        const kept = await viteBuild(prunable("chip", "divider", "badge"), [
            pureform.vite({
                target: fakeAdapter(),
                prune: { keep: ["badge"] },
            }),
        ]);
        expect(kept.names).toEqual(["chip", "badge"]);
        const all = await viteBuild(prunable("chip", "divider", "badge"), [
            pureform.vite({ target: fakeAdapter(), prune: false }),
        ]);
        expect(all.names).toEqual(["chip", "divider", "badge"]);
    });

    it("keeps everything and warns when the scan can't read a name", async () => {
        const root = prunable("chip", "divider");
        writeTree(root, {
            "src/dynamic.ts": `import { useClassFactory } from "@pureform/solid";\nexport const factory = useClassFactory(name);\n`,
        });
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        try {
            const app = await viteBuild(root, [
                pureform.vite({ target: fakeAdapter() }),
            ]);
            expect(app.names).toEqual(["chip", "divider"]);
            expect(warn.mock.calls.flat().join("\n")).toContain(
                "pureform: pruning kept every component and variant, since src/dynamic.ts calls useClassFactory with a component name the scan can't read",
            );
        } finally {
            warn.mockRestore();
        }
    });

    it("doesn't prune a dev server", async () => {
        const root = prunable("chip", "divider");
        const server = await createServer({
            root,
            configFile: false,
            logLevel: "silent",
            plugins: [pureform.vite({ target: fakeAdapter() })],
            server: { middlewareMode: true, ws: false },
        });
        try {
            expect(outputFile(root, "fake/full/index.ts")).toContain(
                '"divider"',
            );
            expect(existsSync(join(root, ".pureform/fake/pruned"))).toBe(false);
        } finally {
            await server.close();
        }
    });

    it("prunes a Rolldown build", async () => {
        const root = prunable("chip", "divider");
        const bundle = await rolldown({
            cwd: root,
            input: join(root, "main.ts"),
            plugins: [pureform.rolldown({ root, target: fakeAdapter() })],
            logLevel: "silent",
        });
        await bundle.generate({ format: "es" });
        await bundle.close();
        expect(outputFile(root, "fake/pruned/index.ts")).not.toContain(
            '"divider"',
        );
        expect(outputFile(root, "fake/pruned/index.ts")).toContain('"chip"');
    });
});

describe("several targets", () => {
    // Web and native targets told apart by their class prefix.
    const targets = () => ({
        web: { target: fakeAdapter(), options: { prefix: "web-" } },
        native: {
            target: fakeAdapter("native"),
            options: { prefix: "native-" },
        },
    });

    it("gives the web target by default, and the native one where react-native maps to react-native-web", async () => {
        const root = tempApp("chip");
        const web = await viteBuild(root, [
            pureform.vite({ targets: targets(), prune: false }),
        ]);
        expect(web.classes).toEqual([{ root: { class: "web-chip" } }]);
        const native = await build({
            root,
            configFile: false,
            logLevel: "silent",
            plugins: [pureform.vite({ targets: targets(), prune: false })],
            resolve: { alias: { "react-native": "react-native-web" } },
            build: {
                outDir: "native-out",
                minify: false,
                lib: { entry: "main.ts", formats: ["es"], fileName: "main" },
            },
        }).then(
            () =>
                import(
                    /* @vite-ignore */ join(root, "native-out/main.mjs")
                ) as Promise<{
                    classes: unknown[];
                }>,
        );
        expect(native.classes).toEqual([{ root: { class: "native-chip" } }]);
        expect(outputFile(root, "native.ts")).toContain(
            'export * from "./native/full/index";',
        );
    });

    it("gives a target to the files its include names, whatever the aliases", async () => {
        const root = tempApp("chip");
        writeTree(root, {
            "main.ts": `export { classes as web } from "./web/app";\nexport { classes as native } from "./native/app";\nexport const names = [];\nexport const themes = [];\nexport const classes = [];\n`,
            "web/app.ts": `import { registry } from "../.pureform";\nexport const classes = registry.names.map((name) => registry.entry(name).factory({}));\n`,
            "native/app.ts": `import { registry } from "../.pureform";\nexport const classes = registry.names.map((name) => registry.entry(name).factory({}));\n`,
        });
        const { native: nativeTarget, web } = targets();
        const app = (await build({
            root,
            configFile: false,
            logLevel: "silent",
            plugins: [
                pureform.vite({
                    targets: {
                        web,
                        native: { ...nativeTarget, include: ["native"] },
                    },
                    prune: false,
                }),
            ],
            resolve: { alias: { "react-native": "react-native-web" } },
            build: {
                outDir: "out",
                minify: false,
                lib: { entry: "main.ts", formats: ["es"], fileName: "main" },
            },
        }).then(
            () => import(/* @vite-ignore */ join(root, "out/main.mjs")),
        )) as {
            web: unknown[];
            native: unknown[];
        };
        expect(app.web).toEqual([{ root: { class: "web-chip" } }]);
        expect(app.native).toEqual([{ root: { class: "native-chip" } }]);
    });

    it("resolves a per-target entry to its target", async () => {
        const root = tempApp("chip");
        const plugin = hooks({ root, targets: targets() });
        await plugin.buildStart();
        const importer = join(root, "src/main.ts");
        expect(await plugin.resolveId("../.pureform/native", importer)).toBe(
            join(root, ".pureform/native/pruned/index.ts"),
        );
        expect(await plugin.resolveId("../.pureform/index.ts", importer)).toBe(
            join(root, ".pureform/web/pruned/index.ts"),
        );
        expect(
            await plugin.resolveId("../.pureform/styles.css?inline", importer),
        ).toBe(join(root, ".pureform/web/pruned/styles.css?inline"));
    });
});

describe("full and pruned output", () => {
    it("lets a dev server and a build run side by side", async () => {
        const root = tempApp("chip", "divider");
        writeTree(root, {
            "main.ts": `import { registry } from "virtual:pureform/registry";\nexport const names = registry.names;\nexport const classes = [];\nexport const themes = [];\n`,
            "src/ui.tsx": `import { Chip } from "@pureform/solid/chip";\nexport const ui = <Chip variant="assist" />;\n`,
        });
        const server = await createServer({
            root,
            configFile: false,
            logLevel: "silent",
            plugins: [pureform.vite({ target: fakeAdapter() })],
            server: { middlewareMode: true, ws: false },
        });
        try {
            const top = outputFile(root, "index.ts");
            const full = outputFile(root, "fake/full/index.ts");
            const info = vi.spyOn(console, "log").mockImplementation(() => {});
            try {
                const app = await viteBuild(root, [
                    pureform.vite({ target: fakeAdapter() }),
                ]);
                expect(app.names).toEqual(["chip"]);
            } finally {
                info.mockRestore();
            }
            expect(outputFile(root, "index.ts")).toBe(top);
            expect(outputFile(root, "fake/full/index.ts")).toBe(full);
            const resolved =
                await server.environments.client.pluginContainer.resolveId(
                    "./.pureform",
                    join(root, "main.ts"),
                );
            expect(resolved?.id).toBe(
                join(root, ".pureform/fake/full/index.ts"),
            );
        } finally {
            await server.close();
        }
    });

    it("points a pruned build's stylesheet imports at the pruned stylesheet", async () => {
        const root = tempApp("chip", "divider");
        writeTree(root, {
            "app.css": `@import "./.pureform/styles.css";\n`,
            "main.ts": `import "./app.css";\nexport const names = [];\nexport const classes = [];\nexport const themes = [];\n`,
            "src/ui.tsx": `import { Chip } from "@pureform/solid/chip";\nexport const ui = <Chip variant="assist" />;\n`,
        });
        let seen: string | undefined;
        const reader: Plugin = {
            name: "reader",
            enforce: "pre",
            transform: (code, id) => {
                if (id.endsWith("app.css")) seen = code;
            },
        };
        const info = vi.spyOn(console, "log").mockImplementation(() => {});
        try {
            await viteBuild(root, [
                pureform.vite({ target: fakeAdapter() }),
                reader,
            ]);
        } finally {
            info.mockRestore();
        }
        expect(seen).toContain('@import "./.pureform/fake/pruned/styles.css"');
        expect(process.env["PUREFORM_OUTPUT"]).toBe("pruned");
        delete process.env["PUREFORM_OUTPUT"];
    });
});
