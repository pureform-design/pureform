// What the bundler plugin and the Metro wrapper share: their options, how they become
// `generate`'s, and how a run is reported.

import { isAbsolute, relative, sep } from "node:path";

import type { CoreConfig } from "@pureform/core/types";
import { findConfigFile } from "@pureform/generate";
import type {
    CodegenAdapter,
    GenerateTargetsOptions,
    GenerateTargetsResult,
    ImportRuleOptions,
    Target,
    TargetOptions,
    Usage,
} from "@pureform/generate";

/** The id the generated index is served as. */
export const REGISTRY_ID = "virtual:pureform/registry";

export interface PureformPluginOptions<Options = Record<string, unknown>> {
    /** The config: a path relative to the root, or the config itself. Default: the first
     *  `pureform.config.{ts,mts,cts,js,mjs,cjs}` in the root. */
    readonly config?: string | CoreConfig;
    /** Several targets, by name: each writes `.pureform/<name>/`, and an import of
     *  `.pureform/` gets the one its file or bundler environment wants (see `PluginTarget`). */
    readonly targets?: Readonly<Record<string, PluginTarget<Options>>>;
    /** One target, `"panda"`, `"css"`, `"tailwind"`, or `"native"`, or an adapter: the
     *  shorthand for `targets: { [target]: { target, options, components, lazy } }`. */
    readonly target?: Target | CodegenAdapter<Options>;
    /** The single target's build options, such as the Panda adapter's `prefix`. */
    readonly options?: Options;
    /** The single target's allow-list: generate only these components. Default: every
     *  component. */
    readonly components?: readonly string[];
    /** The single target's components whose registry entries load on demand. */
    readonly lazy?: readonly string[];
    /** The app's root. Default: the bundler's root (Vite's `root`), or the working directory. */
    readonly root?: string;
    /** The folder to write, relative to the root. Default `.pureform`. */
    readonly outDir?: string;
    /** Check that the installed pureform packages agree in version. Default `true`. */
    readonly versionCheck?: boolean;
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

/** A target of several, with the files that get it. */
export interface PluginTarget<
    Options = Record<string, unknown>,
> extends TargetOptions<Options> {
    /** The files whose imports of `.pureform/` get this target: paths relative to the root
     *  (a folder takes everything under it) or patterns over the absolute path. When any
     *  target has `include`, a file none matches gets the default target (the first web
     *  one); otherwise a bundler environment that maps `react-native` to `react-native-web`
     *  (and Metro) gets the first native target. */
    readonly include?: readonly (string | RegExp)[];
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

/** The options `generateTargets` gets from the plugin's, for a root: `pruned` writes the
 *  pruned output too, for what pruning found. */
export const generateOptions = <Options>(
    options: PureformPluginOptions<Options>,
    root: string,
    pruned = false,
    usage?: Usage,
): GenerateTargetsOptions<Options> => {
    const { watch: _, prune: __, config, targets, ...rest } = options;
    return Object.fromEntries(
        Object.entries({
            ...rest,
            targets:
                targets &&
                Object.fromEntries(
                    Object.entries(targets).map(
                        ([name, { include: _include, ...target }]) => [
                            name,
                            target,
                        ],
                    ),
                ),
            config: config ?? findConfigFile(root),
            root,
            pruned: pruned || undefined,
            usage,
        }).filter(([, value]) => value !== undefined),
    ) as unknown as GenerateTargetsOptions<Options>;
};

/** Whether a file is one a target's `include` names. */
export const includes = (
    patterns: readonly (string | RegExp)[],
    root: string,
    file: string,
): boolean => {
    const path = toPosix(file);
    const local = toPosix(relative(root, file));
    return patterns.some((pattern) => {
        if (typeof pattern !== "string") return pattern.test(path);
        const prefix = toPosix(pattern).replace(/^\.\//, "").replace(/\/$/, "");
        return (
            !isAbsolute(local) &&
            !local.startsWith("../") &&
            (local === prefix || local.startsWith(`${prefix}/`))
        );
    });
};

/** Whether a bundler's aliases map `react-native` to `react-native-web`. */
export const aliasesReactNativeWeb = (alias: unknown): boolean => {
    const list = Array.isArray(alias)
        ? (alias as { find: unknown; replacement: unknown }[])
        : Object.entries((alias ?? {}) as Record<string, unknown>).map(
              ([find, replacement]) => ({ find, replacement }),
          );
    return list.some(
        ({ find, replacement }) =>
            (find instanceof RegExp
                ? find.test("react-native")
                : find === "react-native") &&
            typeof replacement === "string" &&
            replacement.includes("react-native-web"),
    );
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
export const describeResult = (
    result: Pick<GenerateTargetsResult, "root" | "outDir" | "files">,
): string | undefined => {
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
