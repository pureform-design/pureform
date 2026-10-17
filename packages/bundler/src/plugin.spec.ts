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
    glue,
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
        expect(glue(root, "web/chip.ts")).toContain('"pf-chip"');
        expect(adapter.calls).toHaveLength(1);
    });

    it("writes the glue before other plugins' configResolved, as Panda's needs", async () => {
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
                outDir: "src/glue",
            }),
        ]);
        expect(app.names).toEqual(["chip", "badge"]);
        expect(app.classes).toEqual([{ root: { class: "chip" } }, "lazy"]);
        expect(existsSync(join(root, "src/glue/index.ts"))).toBe(true);
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
            expect(glue(root, "index.ts")).toContain('"chip"');
            const resolved =
                await server.environments.client.pluginContainer.resolveId(
                    REGISTRY_ID,
                    join(root, "main.ts"),
                );
            expect(resolved?.id).toBe(join(root, ".pureform/index.ts"));

            writeFileSync(
                join(root, "pureform.config.ts"),
                configSource("chip", "divider"),
            );
            await eventually(() =>
                existsSync(join(root, ".pureform/web/divider.ts")),
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

    it("keeps a dev server going when generating fails, and names the missing glue on import", async () => {
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
                "the generated glue in .pureform/ is missing (imported from main.ts)",
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
        expect(glue(root, "index.ts")).toContain("createRegistry");
    });
});

describe("the plugin's hooks", () => {
    it("names the missing glue for an import into the folder, and leaves other imports alone", async () => {
        const root = tempApp("chip");
        const plugin = hooks({ root, target: fakeAdapter() });
        await plugin.buildStart();
        const importer = join(root, "src/main.ts");
        expect(await plugin.resolveId("../.pureform", importer)).toBeNull();
        expect(await plugin.resolveId("./other", importer)).toBeNull();
        expect(await plugin.resolveId("react", importer)).toBeNull();

        rmSync(join(root, ".pureform"), { recursive: true });
        const error = await rejection(
            plugin.resolveId("../.pureform/index", importer),
        );
        expect(isGenerateError(error, "missing-glue")).toBe(true);
        expect((error as Error).message).toContain(
            "pureform: the generated glue in .pureform/ is missing (imported from src/main.ts).",
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
        expect(adapter.calls).toHaveLength(1);
        writeFileSync(
            join(root, "pureform.config.ts"),
            configSource("divider"),
        );
        plugin.watchChange(join(root, "pureform.config.ts"));
        await plugin.buildStart();
        expect(adapter.calls).toHaveLength(2);
        expect(glue(root, "index.ts")).toContain('"divider"');
    });

    it("doesn't watch with watch: false", async () => {
        const root = tempApp("chip");
        const adapter = fakeAdapter();
        const plugin = hooks({ root, target: adapter, watch: false });
        await plugin.buildStart();
        plugin.watchChange(join(root, "pureform.config.ts"));
        await plugin.buildStart();
        expect(adapter.calls).toHaveLength(1);
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
        expect(adapter.calls).toHaveLength(1);
        expect(adapter.calls[0]!.components).toEqual(["chip"]);
        expect(existsSync(join(root, ".pureform/web/divider.ts"))).toBe(false);
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
            expect(glue(root, "index.ts")).toContain('"divider"');
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
        expect(glue(root, "index.ts")).not.toContain('"divider"');
        expect(glue(root, "index.ts")).toContain('"chip"');
    });
});
