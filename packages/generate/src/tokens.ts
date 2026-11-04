// Token and theme pruning for `narrowConfig`: drops the named themes an app doesn't select, and
// the tokens nothing a build keeps can reach. It errs toward keeping, as keyframe pruning does.

import type { CoreConfig, ThemeOverride } from "@pureform/core/types";

/** What a pruned build may drop besides components and variant values. */
export interface TokenPruning {
    /** The named themes the app selects. The others are left out. Absent keeps every theme. */
    readonly themes?: readonly string[];
    /** Drop the tokens nothing the build keeps reaches. Off by default. */
    readonly pruneTokens?: boolean;
    /** Tokens to keep whatever the build reaches: globs over a token's path, written either as
     *  its config path (`semanticTokens.surface.*`) or as its var ref (`colors.*`). */
    readonly keepTokens?: readonly string[];
    /** Custom property names, without the `--`, that the app's own code reads, such as `colors-brand`
     *  from `var(--colors-brand)`. A token whose var name one of them contains is kept. */
    readonly appVars?: readonly string[];
}

const NESTED = ["tokens", "semanticTokens"] as const;
const SINGLE = [
    "fonts",
    "durations",
    "easings",
    "zIndices",
    "springs",
] as const;

// Groups whose vars carry another category's name, as the CSS lowering's `aliasTarget` maps them.
const CATEGORY: Record<string, string> = {
    fontSize: "fontSizes",
    fontWeight: "fontWeights",
    lineHeight: "lineHeights",
    letterSpacing: "letterSpacings",
    borderWidth: "borderWidths",
};

const hyphenate = (name: string): string =>
    name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

// The ref a token path emits as a var, or `undefined` for a path that isn't a token. Tokens and
// semantic tokens share their category's namespace, so one ref can name two entries.
const refOf = (path: readonly string[]): string | undefined => {
    const [ns, ...rest] = path;
    switch (ns) {
        case "tokens": {
            const [group = "", ...name] = rest;
            return `${CATEGORY[group] ?? group}.${name.join(".")}`;
        }
        case "semanticTokens": {
            const [group = "", ...name] = rest;
            return `${group}.${name.join(".")}`;
        }
        case "zIndices":
            return `zIndex.${rest.join(".")}`;
        case "durations":
        case "easings":
        case "springs":
        case "fonts":
            return `${ns}.${rest.join(".")}`;
        default:
            return undefined;
    }
};

const globToRegExp = (glob: string): RegExp =>
    new RegExp(
        `^${glob
            .split("*")
            .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
            .join(".*")}$`,
    );

interface Entry {
    readonly path: string[];
    readonly ref: string;
    readonly value: unknown;
}

// The token entries of a base config or a theme.
const entriesOf = (parts: object): Entry[] => {
    const out: Entry[] = [];
    const add = (path: string[], value: unknown) => {
        const ref = refOf(path);
        if (ref !== undefined) out.push({ path, ref, value });
    };
    const record = parts as Record<string, Record<string, unknown> | undefined>;
    for (const ns of NESTED) {
        for (const [group, entries] of Object.entries(record[ns] ?? {})) {
            for (const [name, value] of Object.entries(
                entries as Record<string, unknown>,
            )) {
                add([ns, group, name], value);
            }
        }
    }
    for (const tier of SINGLE) {
        for (const [name, value] of Object.entries(record[tier] ?? {})) {
            add([tier, name], value);
        }
    }
    return out;
};

interface Found {
    paths: string[][];
    vars: string[];
}

// The alias paths and `var(--name)` names a value holds, at any depth.
const collect = (value: unknown, found: Found): void => {
    if (typeof value === "string") {
        for (const match of value.matchAll(/var\(--([\w-]+)/g)) {
            found.vars.push(match[1]!);
        }
        return;
    }
    if (Array.isArray(value)) {
        for (const item of value) collect(item, found);
        return;
    }
    if (typeof value !== "object" || value === null) return;
    const node = value as Record<string, unknown>;
    if (node["type"] === "alias" && Array.isArray(node["path"])) {
        found.paths.push(node["path"].map(String));
    }
    for (const child of Object.values(node)) collect(child, found);
};

// The refs of the tokens a build keeps can reach, from what it holds outside the token tiers.
const reachable = (
    config: CoreConfig,
    keep: readonly string[],
    appVars: readonly string[],
): { refs: Set<string>; styles: Set<string> } => {
    const keepPaths = keep.map(globToRegExp);
    const refs = new Set<string>();
    const found: Found = { paths: [], vars: [...appVars] };

    const entries = [
        ...entriesOf(config),
        ...Object.values(config.themes ?? {}).flatMap(entriesOf),
    ];
    const byRef = new Map<string, Entry[]>();
    for (const entry of entries) {
        byRef.set(entry.ref, [...(byRef.get(entry.ref) ?? []), entry]);
    }

    const {
        tokens: _tokens,
        semanticTokens: _semantic,
        fonts: _fonts,
        durations: _durations,
        easings: _easings,
        zIndices: _zIndices,
        springs: _springs,
        textStyles,
        themes,
        ...roots
    } = config;
    collect(roots, found);
    for (const theme of Object.values(themes ?? {})) {
        collect(theme.components, found);
    }

    const visit = (ref: string) => {
        if (refs.has(ref)) return;
        refs.add(ref);
        for (const entry of byRef.get(ref) ?? []) collect(entry.value, found);
    };

    // A scale-bound utility takes any key of its scale at the call site, and an instance names
    // a spring role at runtime.
    const scales = Object.values(config.utilities ?? {}).flatMap((util) =>
        util.kind === "dynamic" && util.scale ? [util.scale.join(".")] : [],
    );
    for (const entry of entries) {
        const dotted = entry.path.join(".");
        if (
            entry.path[0] === "springs" ||
            scales.some((scale) => dotted.startsWith(`${scale}.`)) ||
            keepPaths.some((p) => p.test(dotted) || p.test(entry.ref))
        ) {
            visit(entry.ref);
        }
    }

    const styles = new Set<string>();
    const visitStyle = (name: string) => {
        if (styles.has(name)) return;
        styles.add(name);
        collect(textStyles?.[name], found);
    };
    for (const name of Object.keys(textStyles ?? {})) {
        if (keepPaths.some((p) => p.test(`textStyles.${name}`))) {
            visitStyle(name);
        }
    }
    let paths = 0;
    let vars = 0;
    while (paths < found.paths.length || vars < found.vars.length) {
        while (paths < found.paths.length) {
            const path = found.paths[paths++]!;
            const ref = refOf(path);
            if (ref !== undefined) {
                visit(ref);
            } else if (path[0] === "textStyles") {
                visitStyle(path.slice(1).join("."));
            }
        }
        const fresh = found.vars.slice(vars);
        vars = found.vars.length;
        // A raw var is matched as text, so it errs toward keeping.
        for (const entry of entries) {
            const name = entry.ref.split(".").map(hyphenate).join("-");
            if (fresh.some((v) => v.includes(name))) visit(entry.ref);
        }
    }
    return { refs, styles };
};

const prunedTiers = <T extends object>(
    parts: T,
    reached: (path: string[]) => boolean,
): T => {
    const record = parts as Record<string, Record<string, unknown> | undefined>;
    const next: Record<string, unknown> = { ...record };
    for (const ns of NESTED) {
        const tier = record[ns];
        if (!tier) continue;
        next[ns] = Object.fromEntries(
            Object.entries(tier)
                .map(([group, entries]) => [
                    group,
                    Object.fromEntries(
                        Object.entries(
                            entries as Record<string, unknown>,
                        ).filter(([name]) => reached([ns, group, name])),
                    ),
                ])
                .filter(([, entries]) => Object.keys(entries!).length > 0),
        );
    }
    for (const tier of SINGLE) {
        const entries = record[tier];
        if (!entries) continue;
        next[tier] = Object.fromEntries(
            Object.entries(entries).filter(([name]) => reached([tier, name])),
        );
    }
    return next as T;
};

/** The config with the themes the app doesn't select left out and, when `pruneTokens` is set,
 *  the tokens and text styles nothing reaches. A token is reached by a kept component, a text style or keyframe
 *  one names, another reached token, a scale-bound utility, a raw `var(--name)` in the config,
 *  or `keepTokens`. Springs always stay, since an instance names a spring role at runtime. */
export const pruneConfigTokens = (
    config: CoreConfig,
    pruning: TokenPruning,
): CoreConfig => {
    let next = config;
    if (pruning.themes && config.themes) {
        const selected = new Set(pruning.themes);
        next = {
            ...next,
            themes: Object.fromEntries(
                Object.entries(config.themes).filter(([name]) =>
                    selected.has(name),
                ),
            ),
        };
    }
    if (!pruning.pruneTokens) return next;
    const { refs, styles } = reachable(
        next,
        pruning.keepTokens ?? [],
        pruning.appVars ?? [],
    );
    const reached = (path: string[]) => {
        const ref = refOf(path);
        return ref === undefined || refs.has(ref);
    };
    return {
        ...prunedTiers(next, reached),
        ...(next.textStyles && {
            textStyles: Object.fromEntries(
                Object.entries(next.textStyles).filter(([name]) =>
                    styles.has(name),
                ),
            ),
        }),
        ...(next.themes && {
            themes: Object.fromEntries(
                Object.entries(next.themes).map(
                    ([name, theme]): [string, ThemeOverride] => [
                        name,
                        prunedTiers(theme, reached),
                    ],
                ),
            ),
        }),
    } as CoreConfig;
};
