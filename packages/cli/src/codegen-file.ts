// The options `pureform generate` runs with: an app's codegen file (`pureform.codegen.ts`, which
// its bundler config can import too, so both generate the same registry), with the command's
// flags over it.

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { findUsage, pruneOptions } from "@pureform/bundler";
import type { PruneOptions } from "@pureform/bundler";
import {
    DEFAULT_OUT_DIR,
    findConfigFile,
    TARGET_PACKAGES,
} from "@pureform/generate";
import type { GenerateTargetsOptions, Target } from "@pureform/generate";
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

/** What a codegen file exports as `codegen`, or as its default export: `generateTargets`'
 *  options, as the bundler plugin takes them (one `target`, or several `targets`), with the
 *  plugin's `prune` for `--prune`. Keys the command doesn't know, such as the plugin's
 *  `watch` or a target's `include`, are left alone. `root`, when set, is relative to the
 *  codegen file's folder. */
export type CodegenFileOptions<Options = Record<string, unknown>> = Partial<
    Omit<GenerateTargetsOptions<Options>, "check" | "pruned" | "usage">
> & { readonly prune?: boolean | PruneOptions };

/** The flags of `pureform generate`, as parsed. */
export interface GenerateFlags {
    readonly check?: boolean;
    readonly watch?: boolean;
    /** Write each target's pruned output too, from a scan of the app's source. */
    readonly prune?: boolean;
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
    readonly options: GenerateTargetsOptions;
    readonly file: string | undefined;
    /** Lines to print: why pruning kept everything. */
    readonly warnings: readonly string[];
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
    // `--target` replaces the codegen file's targets with one.
    const targets = flags.target === undefined ? codegen.targets : undefined;
    if (
        targets !== undefined &&
        (flags.options !== undefined ||
            flags.components !== undefined ||
            flags.lazy !== undefined)
    ) {
        throw new CliError(
            "pureform: --options, --components and --lazy set a single target's; the codegen file names several `targets`. Pass --target too, or edit the codegen file.",
        );
    }
    if (target === undefined && targets === undefined) {
        throw new CliError(
            `pureform: no target to generate for. Pass --target (${TARGETS.join(", ")}), or export the options as \`codegen\` from ${CODEGEN_FILES[0]}, such as \`export const codegen = { target: "panda" }\`.`,
        );
    }
    const adapterOptions =
        flags.options === undefined
            ? codegen.options
            : { ...codegen.options, ...parseOptions(flags.options) };

    const outDir = flags.outDir ?? codegen.outDir;
    const warnings: string[] = [];
    let usage;
    if (flags.prune) {
        const pruning = findUsage(
            root,
            resolve(root, outDir ?? DEFAULT_OUT_DIR),
            pruneOptions(codegen.prune, true) ?? {},
        );
        usage = pruning.usage;
        warnings.push(...pruning.warnings);
    }

    const options: GenerateTargetsOptions = {
        config: flags.config ?? codegen.config ?? findConfigFile(root),
        ...(targets === undefined ? { target: target! } : { targets }),
        root,
        ...(adapterOptions === undefined ? {} : { options: adapterOptions }),
        ...optional(
            "components",
            names(flags.components) ?? codegen.components,
        ),
        ...optional("lazy", names(flags.lazy) ?? codegen.lazy),
        ...optional("outDir", outDir),
        ...optional(
            "trainCheck",
            flags.trainCheck === false ? false : codegen.trainCheck,
        ),
        ...optional("imports", codegen.imports),
        ...(flags.check ? { check: true } : {}),
        ...(flags.prune ? { pruned: true } : {}),
        ...optional("usage", usage),
    };
    return { options, file, warnings };
};

const optional = <Key extends string, Value>(
    key: Key,
    value: Value | undefined,
): { [K in Key]?: Value } =>
    (value === undefined ? {} : { [key]: value }) as { [K in Key]?: Value };
