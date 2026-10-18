// The options `pureform generate` runs with: an app's codegen file (`pureform.codegen.ts`, which
// its bundler config can import too, so both generate the same registry), with the command's
// flags over it.

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { findConfigFile, TARGET_PACKAGES } from "@pureform/generate";
import type { GenerateOptions, Target } from "@pureform/generate";
import { createJiti } from "jiti";

import { CliError } from "./errors";

/** The codegen file names looked for in the root, in order. */
export const CODEGEN_FILES = [
    "pureform.codegen.ts",
    "pureform.codegen.mts",
    "pureform.codegen.cts",
    "pureform.codegen.js",
    "pureform.codegen.mjs",
    "pureform.codegen.cjs",
] as const;

/** The targets `--target` takes. */
export const TARGETS = Object.keys(TARGET_PACKAGES) as readonly Target[];

/** What a codegen file exports as `codegen`, or as its default export: `generate`'s options, as the
 *  bundler plugin takes them. Keys the command doesn't know, such as the plugin's `watch`,
 *  are left alone. `root`, when set, is relative to the codegen file's folder. */
export type CodegenFileOptions<Options = Record<string, unknown>> = Partial<
    Omit<GenerateOptions<Options>, "check">
>;

/** The flags of `pureform generate`, as parsed. */
export interface GenerateFlags {
    readonly check?: boolean;
    readonly watch?: boolean;
    readonly root?: string;
    readonly config?: string;
    readonly codegen?: string;
    readonly target?: Target;
    /** The adapter's options as JSON, merged over the codegen file's. */
    readonly options?: string;
    /** Comma-separated component names. */
    readonly components?: string;
    readonly lazy?: string;
    readonly outDir?: string;
    /** `false` with `--no-train-check`. */
    readonly trainCheck?: boolean;
}

/** The first of `CODEGEN_FILES` in `root`, if any. */
export const findCodegenFile = (root: string): string | undefined =>
    CODEGEN_FILES.map((name) => resolve(root, name)).find((file) =>
        existsSync(file),
    );

const isObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

/** Loads a codegen file's `codegen` export, or its default export. Fresh on every call, so a
 *  watcher sees edits. */
export const loadCodegenOptions = async (
    file: string,
): Promise<CodegenFileOptions> => {
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
            `pureform: loading the codegen options at ${file} failed: ${error instanceof Error ? error.message : String(error)}`,
            { cause: error },
        );
    }
    const codegen = loaded.codegen ?? loaded.default;
    if (!isObject(codegen)) {
        throw new CliError(
            `pureform: ${file} should export the generate options as \`codegen\` (or as its default export), an object such as \`{ target: "panda" }\`.`,
        );
    }
    return codegen as CodegenFileOptions;
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

/** The options to generate with, and the codegen file they came from, if any. */
export interface ResolvedCodegenOptions {
    readonly options: GenerateOptions;
    readonly file: string | undefined;
}

/** Settles the options: the flags, then the codegen file (`--codegen`, or the first of
 *  `CODEGEN_FILES` in the root), then the defaults. */
export const resolveCodegenOptions = async (
    flags: GenerateFlags,
    cwd: string,
): Promise<ResolvedCodegenOptions> => {
    const start = resolve(cwd, flags.root ?? ".");
    const file =
        flags.codegen === undefined
            ? findCodegenFile(start)
            : resolve(cwd, flags.codegen);
    if (file !== undefined && !existsSync(file)) {
        throw new CliError(`pureform: no codegen options at ${file}.`);
    }
    const codegen = file === undefined ? {} : await loadCodegenOptions(file);

    const root =
        flags.root === undefined && codegen.root !== undefined && file
            ? resolve(dirname(file), codegen.root)
            : start;
    const target = flags.target ?? codegen.target;
    if (target === undefined) {
        throw new CliError(
            `pureform: no target to generate for. Pass --target (${TARGETS.join(", ")}), or export the options as \`codegen\` from ${CODEGEN_FILES[0]}, such as \`export const codegen = { target: "panda" }\`.`,
        );
    }
    const adapterOptions =
        flags.options === undefined
            ? codegen.options
            : { ...codegen.options, ...parseOptions(flags.options) };

    const options: GenerateOptions = {
        config: flags.config ?? codegen.config ?? findConfigFile(root),
        target,
        root,
        ...(adapterOptions === undefined ? {} : { options: adapterOptions }),
        ...optional(
            "components",
            names(flags.components) ?? codegen.components,
        ),
        ...optional("lazy", names(flags.lazy) ?? codegen.lazy),
        ...optional("outDir", flags.outDir ?? codegen.outDir),
        ...optional(
            "trainCheck",
            flags.trainCheck === false ? false : codegen.trainCheck,
        ),
        ...optional("imports", codegen.imports),
        ...(flags.check ? { check: true } : {}),
    };
    return { options, file };
};

const optional = <Key extends string, Value>(
    key: Key,
    value: Value | undefined,
): { [K in Key]?: Value } =>
    (value === undefined ? {} : { [key]: value }) as { [K in Key]?: Value };
