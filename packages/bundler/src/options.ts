// What the bundler plugin and the Metro wrapper share: their options, how they become
// `generate`'s, and how a run is reported.

import { relative, sep } from "node:path";

import type { CoreConfig } from "@pureform/core/types";
import { findConfigFile } from "@pureform/generate";
import type {
    CodegenAdapter,
    GenerateOptions,
    GenerateResult,
    ImportRuleOptions,
    Target,
    Usage,
} from "@pureform/generate";

/** The id the generated index is served as. */
export const REGISTRY_ID = "virtual:pureform/registry";

export interface PureformPluginOptions<Options = Record<string, unknown>> {
    /** The config: a path relative to the root, or the config itself. Default: the first
     *  `pureform.config.{ts,mts,cts,js,mjs,cjs}` in the root. */
    readonly config?: string | CoreConfig;
    /** The target, `"panda"`, `"css"`, `"tailwind"`, or `"native"`, or an adapter. */
    readonly target: Target | CodegenAdapter<Options>;
    /** The adapter's build options, such as the Panda adapter's `prefix`. */
    readonly options?: Options;
    /** The allow-list: generate only these components. Default: every component. */
    readonly components?: readonly string[];
    /** Components whose registry entries load on demand. */
    readonly lazy?: readonly string[];
    /** The app's root. Default: the bundler's root (Vite's `root`), or the working directory. */
    readonly root?: string;
    /** The folder to write, relative to the root. Default `.pureform`. */
    readonly outDir?: string;
    /** Check that the installed pureform packages agree in version. Default `true`. */
    readonly trainCheck?: boolean;
    /** The config's import rules: `true` (default), with these options, or `false`. */
    readonly imports?: boolean | ImportRuleOptions;
    /** Generate again when the config or a file it imports changes, in dev and watch builds.
     *  Default `true`. */
    readonly watch?: boolean;
    /** Usage-based pruning: builds keep only the components the app draws and the variant
     *  values it selects, found by scanning its source. `true` (default in bundler builds,
     *  `false` in Metro), `false`, or options. Dev servers and watch builds never prune. */
    readonly prune?: boolean | PruneOptions;
}

/** How pruning scans the app, and what it keeps whatever it finds. */
export interface PruneOptions {
    /** Files and folders to scan, relative to the root, and what they import by relative
     *  path. Default: every script under the root. */
    readonly include?: readonly string[];
    /** Folders and files to skip, relative to the root, besides `node_modules`, dot folders,
     *  `dist`, `build`, `coverage`, `styled-system`, the generated registry, and test files. */
    readonly exclude?: readonly string[];
    /** Components to keep with every variant, whatever the scan finds: ones the app reaches in
     *  ways it can't see, such as through a package that renders them. */
    readonly keep?: readonly string[];
    /** Narrow each component's variant values too, not only the components. Default `true`. */
    readonly variants?: boolean;
}

/** The options `generate` gets from the plugin's, for a root, and what pruning found. */
export const generateOptions = <Options>(
    options: PureformPluginOptions<Options>,
    root: string,
    usage?: Usage,
): GenerateOptions<Options> => {
    const { watch: _, prune: __, config, ...rest } = options;
    return Object.fromEntries(
        Object.entries({
            ...rest,
            config: config ?? findConfigFile(root),
            root,
            usage,
        }).filter(([, value]) => value !== undefined),
    ) as unknown as GenerateOptions<Options>;
};

/** The pruning options, or `undefined` when pruning is off. */
export const pruneOptions = (
    option: boolean | PruneOptions | undefined,
    fallback: boolean,
): PruneOptions | undefined => {
    const value = option ?? fallback;
    if (value === false) return undefined;
    return value === true ? {} : value;
};

export const toPosix = (path: string) => path.split(sep).join("/");

/** One line saying what a run changed, or `undefined` when nothing did. Names the files when
 *  there are a few, and counts them by status otherwise. */
export const describeResult = (result: GenerateResult): string | undefined => {
    const changed = result.files.filter((file) => file.status !== "unchanged");
    if (changed.length === 0) return undefined;
    const folder = toPosix(relative(result.root, result.outDir)) || ".";
    if (changed.length <= 3) {
        return `pureform: updated ${folder}/ (${changed
            .map((file) => `${file.status} ${file.path}`)
            .join(", ")})`;
    }
    const counts = new Map<string, number>();
    for (const file of changed) {
        counts.set(file.status, (counts.get(file.status) ?? 0) + 1);
    }
    return `pureform: updated ${folder}/ (${[...counts]
        .map(([status, count]) => `${count} ${status}`)
        .join(", ")})`;
};
