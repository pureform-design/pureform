// Generating again and again, as the bundler plugin does in dev and `pureform generate --watch`
// does: one run at a time, calls made during a run folded into one more run after it, and the
// files to watch kept from the last run that read them.

import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { generate } from "./generate";
import type { GenerateOptions, GenerateResult } from "./generate";

/** The config file names looked for in the root, in order. */
export const CONFIG_FILES = [
    "pureform.config.ts",
    "pureform.config.mts",
    "pureform.config.cts",
    "pureform.config.js",
    "pureform.config.mjs",
    "pureform.config.cjs",
] as const;

/** The first of `CONFIG_FILES` in `root`, or `pureform.config.ts` when there's none (so the
 *  error names the usual file). */
export const findConfigFile = (root: string = process.cwd()): string =>
    CONFIG_FILES.find((name) => existsSync(resolve(root, name))) ??
    CONFIG_FILES[0];

export interface GlueRunner {
    /** Generates. A call while a run is going waits for it, then for one more run that every
     *  call made meanwhile shares, so the result reflects the files as they are now. */
    run(): Promise<GenerateResult>;
    /** The last run's result, if one succeeded. */
    readonly last: GenerateResult | undefined;
    /** The files a change to should generate again, absolute: the config and the files it
     *  imports, as of the last run that got that far, and the config file at least. */
    readonly dependencies: readonly string[];
    /** Whether a changed file is one of `dependencies`. */
    affects(file: string): boolean;
}

/** A runner over `generate` with these options. `config` is resolved against `root` once. */
export const createGlueRunner = <Options = Record<string, unknown>>(
    options: GenerateOptions<Options>,
): GlueRunner => {
    const root = resolve(options.root ?? process.cwd());
    const settled = { ...options, root };
    const configFile =
        typeof options.config === "string"
            ? resolve(root, options.config)
            : undefined;
    let dependencies = new Set<string>(configFile ? [configFile] : []);
    let last: GenerateResult | undefined;
    let running: Promise<GenerateResult> | undefined;
    let queued: Promise<GenerateResult> | undefined;

    const once = async (): Promise<GenerateResult> => {
        const result = await generate(settled);
        last = result;
        if (result.dependencies.length > 0 || configFile) {
            dependencies = new Set([
                ...(configFile ? [configFile] : []),
                ...result.dependencies,
            ]);
        }
        return result;
    };

    const run = (): Promise<GenerateResult> => {
        if (!running) {
            running = once().finally(() => {
                running = undefined;
            });
            return running;
        }
        queued ??= running
            .catch(() => undefined)
            .then(() => {
                queued = undefined;
                return run();
            });
        return queued;
    };

    return {
        run,
        get last() {
            return last;
        },
        get dependencies() {
            return [...dependencies];
        },
        affects: (file) => dependencies.has(resolve(root, file)),
    };
};
