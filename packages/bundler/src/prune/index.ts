// Pruning as the plugin and the Metro wrapper run it: scan the app, apply the options, and say
// what was kept.

import type { GenerateResult, Usage } from "@pureform/generate";

import type { PruneOptions } from "../options";
import { scanUsage } from "./scan";

export { scanUsage } from "./scan";
export type { ScanOptions, ScanResult } from "./scan";

/** What pruning found for a build. */
export interface Pruning {
    /** The usage to generate for, or `undefined` to keep everything. */
    readonly usage: Usage | undefined;
    /** Lines to print: why everything was kept. */
    readonly warnings: readonly string[];
}

/** Scans an app and applies the pruning options to what it found. */
export const findUsage = (
    root: string,
    outDir: string,
    options: PruneOptions,
): Pruning => {
    let scanned;
    try {
        scanned = scanUsage({
            root,
            outDir,
            ...(options.include && { include: options.include }),
            ...(options.exclude && { exclude: options.exclude }),
        });
    } catch (error) {
        return {
            usage: undefined,
            warnings: [
                `pureform: pruning kept every component and variant, since scanning the app failed: ${error instanceof Error ? error.message : String(error)}`,
            ],
        };
    }
    if (!scanned.usage) {
        return {
            usage: undefined,
            warnings: [
                `pureform: pruning kept every component and variant, since ${scanned.warnings.join("; ")}. Pass the components to keep in the plugin's \`prune.keep\` and fix these, or set \`prune: false\`.`,
            ],
        };
    }
    const keep = new Set(options.keep ?? []);
    const variants = Object.fromEntries(
        Object.entries(scanned.usage.variants ?? {}).filter(
            ([name]) => !keep.has(name),
        ),
    );
    return {
        usage: {
            components: [
                ...new Set([...scanned.usage.components, ...keep]),
            ].sort(),
            variants: options.variants === false ? {} : variants,
        },
        warnings: [],
    };
};

/** One line saying what a pruned build kept. */
export const describePruning = (result: GenerateResult): string => {
    const names = result.components;
    const shown =
        names.length <= 8
            ? names.join(", ")
            : `${names.slice(0, 8).join(", ")}, …`;
    return `pureform: pruned the generated registry to the ${names.length} component${names.length === 1 ? "" : "s"} the app uses${names.length > 0 ? ` (${shown})` : ""}, and the variant values it selects`;
};
