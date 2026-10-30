// What an app uses, for usage-based pruning: the components it draws and, per component, the
// variant values it selects. The bundler plugin finds it by scanning the app; `generate` narrows
// the components to it and hands adapters the variants, which they narrow their styles to.

import type { AnyComponentSpec, CoreConfig } from "@pureform/core/types";

import type { ComponentShape } from "./adapter";

/** Variant values in use, by component and group: `{ button: { variant: ["filled"] } }`. A
 *  component or a group left out keeps every value, and so does a group listed as `["*"]`. A
 *  `"*"` group stands for every group not listed: `{ text: { "*": [] } }` keeps only the
 *  defaults, `{ text: { "*": [], style: ["*"] } }` every style and the others' defaults. */
export type VariantUsage = Readonly<
    Record<string, Readonly<Record<string, readonly string[]>>>
>;

/** What an app uses, as the bundler plugin's scan found it. */
export interface Usage {
    /** The components the app draws. The others are left out of the generated registry; names the
     *  config doesn't have are ignored. */
    readonly components: readonly string[];
    /** The variant values it selects. A component or group left out keeps every value. */
    readonly variants?: VariantUsage;
}

/** The variant usage `generate` hands adapters: only the given components, only groups and values
 *  the shapes have, each group with its default and in the config's order, and no group that
 *  keeps every value (nor a component left with none). Empty when nothing narrows. */
export const normalizeVariants = (
    variants: VariantUsage | undefined,
    components: readonly string[],
    shape: (name: string) => ComponentShape,
): VariantUsage => {
    const normalized: Record<string, Record<string, readonly string[]>> = {};
    if (!variants) return normalized;
    for (const name of components) {
        const groups = variants[name];
        if (!groups) continue;
        const { variants: values, defaults } = shape(name);
        const narrowed: Record<string, readonly string[]> = {};
        for (const [group, all] of Object.entries(values)) {
            const used = groups[group] ?? groups["*"];
            if (!used || used.includes("*")) continue;
            const kept = all.filter(
                (value) => used.includes(value) || defaults[group] === value,
            );
            if (kept.length < all.length) narrowed[group] = kept;
        }
        if (Object.keys(narrowed).length > 0) normalized[name] = narrowed;
    }
    return normalized;
};

/** Whether a component's variant value is kept under a usage. */
export const keepsValue = (
    variants: VariantUsage | undefined,
    name: string,
    group: string,
    value: string,
): boolean => variants?.[name]?.[group]?.includes(value) ?? true;

const narrowSpec = (
    name: string,
    spec: AnyComponentSpec,
    variants: VariantUsage,
): AnyComponentSpec => {
    const groups = variants[name];
    if (!groups) return spec;
    const kept = (group: string, value: string) =>
        keepsValue(variants, name, group, value);
    const recipe = spec.recipe as {
        variants?: Record<string, Record<string, unknown>>;
        compoundVariants?: { match: Record<string, string> }[];
    };
    return {
        ...spec,
        recipe: {
            ...spec.recipe,
            variants: Object.fromEntries(
                Object.entries(recipe.variants ?? {}).map(([group, values]) => [
                    group,
                    Object.fromEntries(
                        Object.entries(values).filter(([value]) =>
                            kept(group, value),
                        ),
                    ),
                ]),
            ),
            ...(recipe.compoundVariants && {
                compoundVariants: recipe.compoundVariants.filter((compound) =>
                    Object.entries(compound.match).every(([group, value]) =>
                        kept(group, value),
                    ),
                ),
            }),
        },
    } as AnyComponentSpec;
};

// Whether a value holds an alias or a token path into a component outside `kept`.
const namesOtherComponent = (
    value: unknown,
    kept: readonly string[],
): boolean => {
    if (typeof value === "string") return false;
    if (Array.isArray(value))
        return value.some((v) => namesOtherComponent(v, kept));
    if (typeof value !== "object" || value === null) return false;
    const node = value as Record<string, unknown>;
    if (
        node["type"] === "alias" &&
        Array.isArray(node["path"]) &&
        node["path"][0] === "components"
    ) {
        return !kept.includes(String(node["path"][1]));
    }
    return Object.entries(node).some(([key, v]) => {
        const [root, name] = key.split(".");
        if (
            root === "components" &&
            name !== undefined &&
            !kept.includes(name)
        ) {
            return true;
        }
        return namesOtherComponent(v, kept);
    });
};

// The names among `names` that `value` mentions anywhere, as text: in an animation node, a raw
// rule, or a token. A substring match, so it errs toward keeping.
const mentioned = (value: unknown, names: readonly string[]): Set<string> => {
    const text = JSON.stringify(value) ?? "";
    return new Set(names.filter((name) => text.includes(name)));
};

// The keyframes to keep: those the left-out components or unselected variant values were the only
// users of go, as the components' own text names them. A keyframe nothing in the config mentions
// (an app's own, or one named by building a string) stays, and so does one the kept components
// still mention, or any other part of the config does.
const keptKeyframes = (
    config: CoreConfig,
    narrowed: CoreConfig,
): CoreConfig["keyframes"] => {
    const all = Object.keys(config.keyframes ?? {});
    if (all.length === 0) return config.keyframes;
    const owned = mentioned(config.components, all);
    const { keyframes: _own, components: _kept, ...rest } = narrowed;
    const used = new Set([
        ...mentioned(narrowed.components, all),
        ...mentioned(rest, all),
    ]);
    return Object.fromEntries(
        Object.entries(config.keyframes!).filter(
            ([name]) => !owned.has(name) || used.has(name),
        ),
    );
};

/** The config with only these components, each narrowed to the variant values in use: the values
 *  left out lose their styles, and so do the compound variants that match them. Tokens, themes,
 *  and everything else stay. For adapters that compile styles from the config (stylesheets,
 *  precomputed tables). Keyframes go that name a left-out component's tokens, or that only left-out
 *  components or unselected variant values used; one nothing in the config names stays. The factory modules keep reading the whole config. */
export const narrowConfig = (
    config: CoreConfig,
    components: readonly string[],
    variants: VariantUsage = {},
): CoreConfig => {
    const narrowed: CoreConfig = {
        ...config,
        components: Object.fromEntries(
            components.map((name) => [
                name,
                narrowSpec(name, config.components[name]!, variants),
            ]),
        ),
    };
    if (!config.keyframes) return narrowed;
    // Keyframes that name a left-out component's tokens go too.
    const named = Object.fromEntries(
        Object.entries(config.keyframes).filter(
            ([, stops]) => !namesOtherComponent(stops, components),
        ),
    );
    const pruned = keptKeyframes(
        { ...config, keyframes: named },
        { ...narrowed, keyframes: named },
    );
    return { ...narrowed, keyframes: pruned! };
};
