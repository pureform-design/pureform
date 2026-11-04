// Which tokens a provider's `overrides` completes: the generated `TokenRegistry`'s entries.

import type { CoreConfig } from "@pureform/core/types";

import { matchesRef, tokenRefs } from "./tokens";

/** The tokens `overrides` completes, as globs over var refs (`colors.*`). */
export interface OverridableTokens {
    /** What to include: globs, or the presets `"semantic"` (the semantic tokens) and `"all"`
     *  (every token, with the components'). Default `["semantic", "components.*"]`. */
    readonly include?: readonly string[];
    /** Globs left out of what `include` selects. */
    readonly exclude?: readonly string[];
}

/** An overridable token: its var ref and its category, the ref's first segment. */
export interface OverridableToken {
    readonly ref: string;
    readonly category: string;
}

export const DEFAULT_OVERRIDABLE_INCLUDE = [
    "semantic",
    "components.*",
] as const;

/** The overridable tokens of a config and its components' tokens (`components.<name>.<token>`),
 *  sorted by ref. */
export const overridableTokens = (
    config: CoreConfig,
    components: Readonly<Record<string, readonly string[]>>,
    options: OverridableTokens = {},
): OverridableToken[] => {
    const include = options.include ?? DEFAULT_OVERRIDABLE_INCLUDE;
    const exclude = options.exclude ?? [];
    const candidates = [
        ...tokenRefs(config),
        ...Object.entries(components).flatMap(([name, tokens]) =>
            tokens.map((token) => ({
                ref: `components.${name}.${token}`,
                semantic: false,
            })),
        ),
    ];
    const chosen = candidates.filter(
        ({ ref, semantic }) =>
            include.some((entry) =>
                entry === "all"
                    ? true
                    : entry === "semantic"
                      ? semantic
                      : matchesRef(entry, ref),
            ) && !exclude.some((glob) => matchesRef(glob, ref)),
    );
    return [...new Map(chosen.map((token) => [token.ref, token])).values()]
        .map(({ ref }) => ({ ref, category: ref.split(".")[0]! }))
        .toSorted((a, b) => a.ref.localeCompare(b.ref));
};
