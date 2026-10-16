// The options `pureform generate` runs with: an app's glue file (`pureform.glue.ts`, which its
// bundler config can import too, so both generate the same glue), with the command's flags
// over it.

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { findConfigFile, TARGET_PACKAGES } from "@pureform/generate";
import type { GenerateOptions, Target } from "@pureform/generate";
import { createJiti } from "jiti";

import { CliError } from "./errors";

/** The glue file names looked for in the root, in order. */
export const GLUE_FILES = [
    "pureform.glue.ts",
    "pureform.glue.mts",
    "pureform.glue.cts",
    "pureform.glue.js",
    "pureform.glue.mjs",
    "pureform.glue.cjs",
] as const;

/** The targets `--target` takes. */
export const TARGETS = Object.keys(TARGET_PACKAGES) as readonly Target[];

/** What a glue file exports as `glue`, or as its default export: `generate`'s options, as the
 *  bundler plugin takes them. Keys the command doesn't know, such as the plugin's `watch`,
 *  are left alone. `root`, when set, is relative to the glue file's folder. */
export type GlueOptions<Options = Record<string, unknown>> = Partial<
    Omit<GenerateOptions<Options>, "check">
>;

/** The flags of `pureform generate`, as parsed. */
export interface GenerateFlags {
    readonly check?: boolean;
    readonly watch?: boolean;
    readonly root?: string;
    readonly config?: string;
    readonly glue?: string;
    readonly target?: Target;
    /** The adapter's options as JSON, merged over the glue file's. */
    readonly options?: string;
    /** Comma-separated component names. */
    readonly components?: string;
    readonly lazy?: string;
    readonly outDir?: string;
    /** `false` with `--no-train-check`. */
    readonly trainCheck?: boolean;
}

/** The first of `GLUE_FILES` in `root`, if any. */
export const findGlueFile = (root: string): string | undefined =>
    GLUE_FILES.map((name) => resolve(root, name)).find((file) =>
        existsSync(file),
    );

const isObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

/** Loads a glue file's `glue` export, or its default export. Fresh on every call, so a watcher
 *  sees edits. */
export const loadGlue = async (file: string): Promise<GlueOptions> => {
    const jiti = createJiti(pathToFileURL(file).href, {
        moduleCache: false,
        fsCache: false,
        interopDefault: false,
        tryNative: false,
    });
    let loaded: Record<string, unknown>;
    try {
        loaded = await jiti.import<Record<string, unknown>>(file);
    } catch (error) {
        throw new CliError(
            `pureform: loading the glue options at ${file} failed: ${error instanceof Error ? error.message : String(error)}`,
            { cause: error },
        );
    }
    const glue = loaded.glue ?? loaded.default;
    if (!isObject(glue)) {
        throw new CliError(
            `pureform: ${file} should export the generate options as \`glue\` (or as its default export), an object such as \`{ target: "panda" }\`.`,
        );
    }
    return glue as GlueOptions;
};

const names = (list: string | undefined): readonly string[] | undefined =>
    list === undefined
        ? undefined
        : list
              .split(",")
              .map((name) => name.trim())
              .filter((name) => name.length > 0);

const parseOptions = (json: string): Record<string, unknown> => {
    let parsed: unknown;
    try {
        parsed = JSON.parse(json);
    } catch (error) {
        throw new CliError(
            `pureform: --options isn't valid JSON: ${error instanceof Error ? error.message : String(error)}`,
        );
    }
    if (!isObject(parsed)) {
        throw new CliError(
            `pureform: --options should be a JSON object, such as '{"prefix":"pf"}'.`,
        );
    }
    return parsed;
};

/** The options to generate with, and the glue file they came from, if any. */
export interface ResolvedGlue {
    readonly options: GenerateOptions;
    readonly glueFile: string | undefined;
}

/** Settles the options: the flags, then the glue file (`--glue`, or the first of `GLUE_FILES`
 *  in the root), then the defaults. */
export const resolveGlue = async (
    flags: GenerateFlags,
    cwd: string,
): Promise<ResolvedGlue> => {
    const start = resolve(cwd, flags.root ?? ".");
    const glueFile =
        flags.glue === undefined
            ? findGlueFile(start)
            : resolve(cwd, flags.glue);
    if (glueFile !== undefined && !existsSync(glueFile)) {
        throw new CliError(`pureform: no glue options at ${glueFile}.`);
    }
    const glue = glueFile === undefined ? {} : await loadGlue(glueFile);

    const root =
        flags.root === undefined && glue.root !== undefined && glueFile
            ? resolve(dirname(glueFile), glue.root)
            : start;
    const target = flags.target ?? glue.target;
    if (target === undefined) {
        throw new CliError(
            `pureform: no target to generate for. Pass --target (${TARGETS.join(", ")}), or export the options as \`glue\` from ${GLUE_FILES[0]}, such as \`export const glue = { target: "panda" }\`.`,
        );
    }
    const adapterOptions =
        flags.options === undefined
            ? glue.options
            : { ...glue.options, ...parseOptions(flags.options) };

    const options: GenerateOptions = {
        config: flags.config ?? glue.config ?? findConfigFile(root),
        target,
        root,
        ...(adapterOptions === undefined ? {} : { options: adapterOptions }),
        ...optional("components", names(flags.components) ?? glue.components),
        ...optional("lazy", names(flags.lazy) ?? glue.lazy),
        ...optional("outDir", flags.outDir ?? glue.outDir),
        ...optional(
            "trainCheck",
            flags.trainCheck === false ? false : glue.trainCheck,
        ),
        ...optional("imports", glue.imports),
        ...(flags.check ? { check: true } : {}),
    };
    return { options, glueFile };
};

const optional = <Key extends string, Value>(
    key: Key,
    value: Value | undefined,
): { [K in Key]?: Value } =>
    (value === undefined ? {} : { [key]: value }) as { [K in Key]?: Value };
