// The bundler plugin, written once with unplugin: generate `.pureform/` when dev or build
// starts, serve `virtual:pureform/registry` (the generated index), generate again when the config
// or a file it imports changes, and name `pureform generate` when an import reaches glue that
// isn't there.

import { existsSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

import {
    createGlueRunner,
    DEFAULT_OUT_DIR,
    GenerateError,
    INDEX_FILE,
    missingGlueMessage,
} from "@pureform/generate";
import type { GenerateResult, GlueRunner } from "@pureform/generate";
import { createUnplugin } from "unplugin";
import type { UnpluginFactory } from "unplugin";
import type { ViteDevServer } from "vite";

import {
    describeResult,
    generateOptions,
    REGISTRY_ID,
    toPosix,
} from "./options";
import type { PureformPluginOptions } from "./options";

const message = (error: unknown) =>
    error instanceof Error ? error.message : String(error);

export const unpluginFactory: UnpluginFactory<
    PureformPluginOptions<Record<string, unknown>>,
    false
> = (options) => {
    let root: string | undefined;
    let runner: GlueRunner | undefined;
    // The run the next lookup waits for: the first, or the latest regeneration.
    let pending: Promise<GenerateResult> | undefined;
    let serving = false;
    let server: ViteDevServer | undefined;
    let hinted = false;
    let warn = (text: string) => console.warn(text);
    let error = (text: string) => console.error(text);
    const watching = options.watch !== false;

    const setRoot = (value: string) => {
        if (runner) return;
        root = resolve(options.root ?? value);
        runner = createGlueRunner(generateOptions(options, root));
    };
    const outDir = () => resolve(root!, options.outDir ?? DEFAULT_OUT_DIR);
    const shown = (path: string) => toPosix(relative(root!, path)) || ".";

    const hints = (result: GenerateResult) => {
        if (hinted) return;
        hinted = true;
        for (const hint of result.hints) warn(`pureform: ${hint}`);
    };

    const start = () => {
        setRoot(process.cwd());
        pending ??= runner!.run();
        return pending;
    };

    // Regenerates after a change; failures are reported, not thrown, so dev keeps going.
    const regenerate = () => {
        const run = runner!.run();
        pending = run;
        run.then(
            (result) => {
                const changed = describeResult(result);
                if (changed) warn(changed);
                server?.watcher.add(runner!.dependencies);
            },
            (failure: unknown) => {
                error(message(failure));
                server?.ws.send({
                    type: "error",
                    err: { message: message(failure), stack: "" },
                });
            },
        );
    };

    // Waits for the latest run, settled either way.
    const settled = async () => {
        await pending?.catch(() => undefined);
    };

    const missing = async (importer: string | undefined) => {
        await settled();
        if (existsSync(join(outDir(), INDEX_FILE))) return;
        throw new GenerateError(
            "missing-glue",
            missingGlueMessage(
                `${shown(outDir())}/`,
                importer && isAbsolute(importer) ? shown(importer) : importer,
            ),
        );
    };

    return {
        name: "pureform",
        enforce: "pre",

        async buildStart() {
            try {
                hints(await start());
            } catch (failure) {
                // A dev server keeps running on the glue there is; the error shows on import.
                if (!serving) throw failure;
                error(message(failure));
            }
            if (watching) {
                for (const file of runner!.dependencies)
                    this.addWatchFile(file);
            }
        },

        watchChange(id) {
            if (watching && runner?.affects(id)) regenerate();
        },

        async resolveId(id, importer) {
            if (!root) return null;
            if (id === REGISTRY_ID) {
                await missing(importer);
                return join(outDir(), INDEX_FILE);
            }
            if (
                importer &&
                !importer.startsWith("\0") &&
                (id.startsWith(".") || isAbsolute(id))
            ) {
                const from = importer.split("?")[0]!;
                const target = resolve(dirname(from), id.split("?")[0]!);
                const folder = outDir();
                if (
                    (target === folder || target.startsWith(folder + sep)) &&
                    !existsSync(join(folder, INDEX_FILE))
                ) {
                    await missing(from);
                }
            }
            return null;
        },

        vite: {
            // Before any plugin's `configResolved`: Panda's reads `.pureform/panda.ts` there.
            async config(config, env) {
                serving = env.command === "serve";
                setRoot(config.root ?? process.cwd());
                try {
                    await start();
                } catch (failure) {
                    if (!serving) throw failure;
                }
            },
            configResolved(config) {
                warn = (text) => config.logger.warn(text);
                error = (text) => config.logger.error(text);
            },
            configureServer(value) {
                server = value;
                if (watching) value.watcher.add(runner!.dependencies);
            },
        },
    };
};

/** The plugin for every bundler unplugin supports: `pureform.vite(options)`, `.rollup`, … */
export const pureform = /* #__PURE__ */ createUnplugin(unpluginFactory);
