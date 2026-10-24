// The bundler plugin, written once with unplugin: generate `.pureform/` when dev or build
// starts, generate again when the config or a file it imports changes, redirect imports of
// `.pureform/`'s entries (and `virtual:pureform/registry`) to the target and output (full in dev,
// pruned in builds) each import wants, and name `pureform generate` when an import reaches a
// generated registry that isn't there.

import { existsSync } from "node:fs";
import {
    basename,
    dirname,
    isAbsolute,
    join,
    relative,
    resolve,
    sep,
} from "node:path";

import {
    createGenerateRunner,
    DEFAULT_OUT_DIR,
    entryFile,
    GenerateError,
    INDEX_FILE,
    missingOutputMessage,
    OUTPUT_ENV,
} from "@pureform/generate";
import type {
    GenerateRunner,
    GenerateTargetsResult,
    OutputKind,
} from "@pureform/generate";
import { createUnplugin } from "unplugin";
import type { UnpluginFactory } from "unplugin";
import type { ViteDevServer } from "vite";

import {
    aliasesReactNativeWeb,
    describeResult,
    generateOptions,
    includes,
    pruneOptions,
    REGISTRY_ID,
    toPosix,
} from "./options";
import type { PureformPluginOptions } from "./options";
import { describePruning, findUsage } from "./prune";
import type { Pruning } from "./prune";

const message = (error: unknown) =>
    error instanceof Error ? error.message : String(error);

const CSS_IMPORT = /(@import\s+(?:url\(\s*)?)(["'])([^"']+)\2/g;

export const unpluginFactory: UnpluginFactory<
    PureformPluginOptions<Record<string, unknown>>,
    false
> = (options) => {
    let root: string | undefined;
    let runner: GenerateRunner | undefined;
    // The run the next lookup waits for: the first, or the latest regeneration.
    let pending: Promise<GenerateTargetsResult> | undefined;
    let serving = false;
    let server: ViteDevServer | undefined;
    let hinted = false;
    let warn = (text: string) => console.warn(text);
    let info = (text: string) => console.log(text);
    let error = (text: string) => console.error(text);
    const watching = options.watch !== false;
    let pruning: Pruning | undefined;
    let reported = false;
    // The output imports get: full in dev servers and watch builds, pruned in builds that prune.
    let kind: OutputKind = "full";
    // The bundler's aliases, for bundlers without Vite's environments.
    let alias: unknown;
    const included = Object.entries(options.targets ?? {}).filter(
        ([, target]) => target.include !== undefined,
    );

    // Creates the runner once, scanning the app first when this build prunes.
    const setRoot = (value: string, prune: boolean) => {
        if (runner) return;
        root = resolve(options.root ?? value);
        const pruneWith = prune ? pruneOptions(options.prune, true) : undefined;
        if (pruneWith) {
            kind = "pruned";
            // Tools that load `.pureform/`'s scripts themselves, such as Panda, read this.
            process.env[OUTPUT_ENV] = "pruned";
            pruning = findUsage(root, outDir(), {
                ...pruneWith,
                exclude: [...(pruneWith.exclude ?? []), ...excluded],
            });
            for (const line of pruning.warnings) warn(line);
        }
        runner = createGenerateRunner(
            generateOptions(options, root, kind === "pruned", pruning?.usage),
        );
    };
    // The bundler's own output folder, which the scan skips.
    let excluded: string[] = [];
    const outDir = () => resolve(root!, options.outDir ?? DEFAULT_OUT_DIR);
    const shown = (path: string) => toPosix(relative(root!, path)) || ".";

    const hints = (result: GenerateTargetsResult) => {
        const main = result.targets.find(
            (target) => target.name === result.defaultTarget,
        );
        if (!reported && pruning?.usage && main?.pruned) {
            info(describePruning(main.pruned));
        }
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

    // The latest run's result, settled either way.
    const settled = async () =>
        (await pending?.catch(() => undefined)) ?? runner?.last;

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

    // The target an importer gets: by `include`, then by the environment's aliases.
    const targetFor = (
        result: GenerateTargetsResult,
        importer: string | undefined,
        environment: unknown,
    ): string => {
        const file = importer?.split("?")[0];
        if (included.length > 0) {
            const found = included.find(
                ([, target]) =>
                    file !== undefined &&
                    includes(target.include!, root!, file),
            );
            return found?.[0] ?? result.defaultTarget;
        }
        const native = result.targets.find(
            (target) => target.platform === "native",
        );
        const aliases =
            (environment as { config?: { resolve?: { alias?: unknown } } })
                ?.config?.resolve?.alias ?? alias;
        if (
            native &&
            result.targets.length > 1 &&
            aliasesReactNativeWeb(aliases)
        ) {
            return native.name;
        }
        return result.defaultTarget;
    };

    // The file an entry of `.pureform/` stands for, for this importer.
    const redirect = async (
        path: string,
        importer: string | undefined,
        environment: unknown,
    ): Promise<string | undefined> => {
        const result = await settled();
        if (!result) return undefined;
        return entryFile(
            result,
            path,
            targetFor(result, importer, environment),
            kind,
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
            const environment = (this as { environment?: unknown }).environment;
            if (id === REGISTRY_ID) {
                await missing(importer);
                return (
                    (await redirect(outDir(), importer, environment)) ??
                    join(outDir(), INDEX_FILE)
                );
            }
            if (
                importer &&
                !importer.startsWith("\0") &&
                (id.startsWith(".") || isAbsolute(id))
            ) {
                const from = importer.split("?")[0]!;
                const [request, ...query] = id.split("?");
                const target = resolve(dirname(from), request!);
                const folder = outDir();
                if (target !== folder && !target.startsWith(folder + sep)) {
                    return null;
                }
                if (!existsSync(join(folder, INDEX_FILE))) {
                    await missing(from);
                }
                const file = await redirect(target, from, environment);
                if (file) {
                    return query.length > 0
                        ? `${file}?${query.join("?")}`
                        : file;
                }
            }
            return null;
        },

        // A pruned build's stylesheets import the pruned stylesheet: CSS tools such as
        // Tailwind resolve `@import` themselves, past `resolveId`.
        transformInclude: (id) =>
            kind === "pruned" &&
            !id.startsWith("\0") &&
            /\.css(?:$|\?)/.test(id) &&
            root !== undefined &&
            !id.startsWith(outDir() + sep),
        async transform(code, id) {
            if (!code.includes(basename(outDir()))) return null;
            const file = id.split("?")[0]!;
            const environment = (this as { environment?: unknown }).environment;
            const replaced: [string, string][] = [];
            for (const match of code.matchAll(CSS_IMPORT)) {
                const request = match[3]!;
                if (!request.startsWith(".") && !isAbsolute(request)) continue;
                const to = await redirect(
                    resolve(dirname(file), request),
                    file,
                    environment,
                );
                if (!to) continue;
                const path = toPosix(relative(dirname(file), to));
                replaced.push([
                    match[0],
                    `${match[1]}${match[2]}${path.startsWith("../") ? path : `./${path}`}${match[2]}`,
                ]);
            }
            if (replaced.length === 0) return null;
            let out = code;
            for (const [from, to] of replaced) out = out.replace(from, to);
            return { code: out, map: null };
        },

        vite: {
            // Before any plugin's `configResolved`: Panda's reads `.pureform/panda.ts` there.
            async config(config, env) {
                serving = env.command === "serve";
                if (config.build?.outDir) excluded = [config.build.outDir];
                alias = config.resolve?.alias;
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
                alias = config.resolve.alias;
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
