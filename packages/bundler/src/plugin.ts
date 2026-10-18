// The bundler plugin, written once with unplugin: generate `.pureform/` when dev or build
// starts, serve `virtual:pureform/registry` (the generated index), generate again when the config
// or a file it imports changes, and name `pureform generate` when an import reaches a generated
// registry that isn't there.

import { existsSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

import {
    createGenerateRunner,
    DEFAULT_OUT_DIR,
    GenerateError,
    INDEX_FILE,
    missingOutputMessage,
} from "@pureform/generate";
import type { GenerateResult, GenerateRunner } from "@pureform/generate";
import { createUnplugin } from "unplugin";
import type { UnpluginFactory } from "unplugin";
import type { ViteDevServer } from "vite";

import {
    describeResult,
    generateOptions,
    pruneOptions,
    REGISTRY_ID,
    toPosix,
} from "./options";
import type { PureformPluginOptions } from "./options";
import { describePruning, findUsage } from "./prune";
import type { Pruning } from "./prune";

const message = (error: unknown) =>
    error instanceof Error ? error.message : String(error);

export const unpluginFactory: UnpluginFactory<
    PureformPluginOptions<Record<string, unknown>>,
    false
> = (options) => {
    let root: string | undefined;
    let runner: GenerateRunner | undefined;
    // The run the next lookup waits for: the first, or the latest regeneration.
    let pending: Promise<GenerateResult> | undefined;
    let serving = false;
    let server: ViteDevServer | undefined;
    let hinted = false;
    let warn = (text: string) => console.warn(text);
    let info = (text: string) => console.log(text);
    let error = (text: string) => console.error(text);
    const watching = options.watch !== false;
    let pruning: Pruning | undefined;
    let reported = false;

    // Creates the runner once, scanning the app first when this build prunes.
    const setRoot = (value: string, prune: boolean) => {
        if (runner) return;
        root = resolve(options.root ?? value);
        const pruneWith = prune ? pruneOptions(options.prune, true) : undefined;
        if (pruneWith) {
            pruning = findUsage(root, outDir(), {
                ...pruneWith,
                exclude: [...(pruneWith.exclude ?? []), ...excluded],
            });
            for (const line of pruning.warnings) warn(line);
        }
        runner = createGenerateRunner(
            generateOptions(options, root, pruning?.usage),
        );
    };
    // The bundler's own output folder, which the scan skips.
    let excluded: string[] = [];
    const outDir = () => resolve(root!, options.outDir ?? DEFAULT_OUT_DIR);
    const shown = (path: string) => toPosix(relative(root!, path)) || ".";

    const hints = (result: GenerateResult) => {
        if (!reported && pruning?.usage) info(describePruning(result));
        reported = true;
        if (hinted) return;
        hinted = true;
        for (const hint of result.hints) warn(`pureform: ${hint}`);
    };

    const start = (prune = false) => {
        setRoot(process.cwd(), prune);
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
            "missing-output",
            missingOutputMessage(
                `${shown(outDir())}/`,
                importer && isAbsolute(importer) ? shown(importer) : importer,
            ),
        );
    };

    return {
        name: "pureform",
        enforce: "pre",

        async buildStart() {
            // Bundlers other than Vite start here: they prune unless watching.
            const meta = (this as { meta?: { watchMode?: boolean } }).meta;
            try {
                hints(await start(!serving && meta?.watchMode !== true));
            } catch (failure) {
                // A dev server keeps running on the registry there is; the error shows on import.
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
                if (config.build?.outDir) excluded = [config.build.outDir];
                setRoot(
                    config.root ?? process.cwd(),
                    !serving && !config.build?.watch,
                );
                try {
                    await start();
                } catch (failure) {
                    if (!serving) throw failure;
                }
            },
            configResolved(config) {
                warn = (text) => config.logger.warn(text);
                info = (text) => config.logger.info(text);
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
