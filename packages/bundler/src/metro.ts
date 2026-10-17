// Metro has no plugin API unplugin can reach, so pureform wraps its config instead: generate
// `.pureform/` before Metro starts, keep generating while it runs, and resolve
// `virtual:pureform/registry` to the generated index.
//
//   // metro.config.js
//   const { getDefaultConfig } = require("@react-native/metro-config");
//   const { withPureformGlue } = require("@pureform/bundler/metro");
//   module.exports = withPureformGlue(getDefaultConfig(__dirname), { options: { fontStack: "all" } });

import { existsSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import {
    DEFAULT_OUT_DIR,
    GenerateError,
    INDEX_FILE,
    missingGlueMessage,
    watchGlue,
    generate,
} from "@pureform/generate";
import type { CodegenAdapter, Target } from "@pureform/generate";

import {
    describeResult,
    generateOptions,
    pruneOptions,
    REGISTRY_ID,
    toPosix,
} from "./options";
import type { PureformPluginOptions } from "./options";
import { findUsage } from "./prune";

export interface PureformMetroOptions<
    Options = Record<string, unknown>,
> extends Omit<PureformPluginOptions<Options>, "target"> {
    /** The target. Default `"native"`. */
    readonly target?: Target | CodegenAdapter<Options>;
}

/** What Metro's `resolveRequest` returns, as far as pureform needs it. */
export type MetroResolution =
    | { readonly type: "sourceFile"; readonly filePath: string }
    | { readonly type: string; readonly [key: string]: unknown };

/** Metro's resolution context, as far as pureform needs it. */
export interface MetroResolutionContext {
    readonly resolveRequest: MetroResolveRequest;
    readonly originModulePath?: string;
    readonly [key: string]: unknown;
}

export type MetroResolveRequest = (
    context: MetroResolutionContext,
    moduleName: string,
    platform: string | null,
) => MetroResolution;

/** A Metro config, as far as pureform needs it. */
export interface MetroConfig {
    readonly projectRoot?: string;
    readonly resolver?: {
        readonly resolveRequest?: MetroResolveRequest | null;
        readonly [key: string]: unknown;
    };
    readonly [key: string]: unknown;
}

/** The config `withPureformGlue` returns: the one given, with pureform's `resolveRequest`. */
export type MetroConfigWithGlue<C extends MetroConfig> = Omit<C, "resolver"> & {
    readonly resolver: Omit<NonNullable<C["resolver"]>, "resolveRequest"> & {
        readonly resolveRequest: MetroResolveRequest;
    };
};

/** A Metro config that generates `.pureform/` first, regenerates on changes (unless `watch`
 *  is `false`), and resolves `virtual:pureform/registry`. Fails like a build when the first
 *  generation does. */
export const withPureformGlue = async <C extends MetroConfig>(
    config: C,
    options: PureformMetroOptions = {},
): Promise<MetroConfigWithGlue<C>> => {
    const root = resolve(options.root ?? config.projectRoot ?? process.cwd());
    // Metro serves and bundles from one config, so pruning is the app's call: `prune: true` in a
    // config for release bundles.
    const prune = pruneOptions(options.prune, false);
    const pruning = prune
        ? findUsage(
              root,
              resolve(root, options.outDir ?? DEFAULT_OUT_DIR),
              prune,
          )
        : undefined;
    for (const line of pruning?.warnings ?? []) console.warn(line);
    const settings = generateOptions(
        { ...options, target: options.target ?? "native" },
        root,
        pruning?.usage,
    );
    if (options.watch === false) {
        await generate(settings);
    } else {
        let failure: unknown;
        let started = false;
        const watcher = watchGlue(settings, {
            // Metro bundling once should still end.
            unref: true,
            onResult: (result) => {
                const changed = describeResult(result);
                if (changed && started) console.log(changed);
            },
            onError: (error) => {
                failure = error;
                if (started) {
                    console.error(
                        error instanceof Error ? error.message : String(error),
                    );
                }
            },
        });
        const first = await watcher.ready;
        if (!first) {
            watcher.close();
            throw failure;
        }
        started = true;
    }

    const index = join(
        resolve(root, options.outDir ?? DEFAULT_OUT_DIR),
        INDEX_FILE,
    );
    const upstream = config.resolver?.resolveRequest ?? undefined;
    const resolveRequest: MetroResolveRequest = (
        context,
        moduleName,
        platform,
    ) => {
        if (moduleName === REGISTRY_ID) {
            if (!existsSync(index)) {
                const importer = context.originModulePath;
                throw new GenerateError(
                    "missing-glue",
                    missingGlueMessage(
                        `${toPosix(relative(root, join(index, "..")))}/`,
                        importer
                            ? toPosix(relative(root, importer))
                            : undefined,
                    ),
                );
            }
            return { type: "sourceFile", filePath: index };
        }
        return upstream
            ? upstream(context, moduleName, platform)
            : context.resolveRequest(context, moduleName, platform);
    };
    return {
        ...config,
        resolver: { ...config.resolver, resolveRequest },
    } as MetroConfigWithGlue<C>;
};
