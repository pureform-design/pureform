// What an app uses, for usage-based pruning: the components it draws and, per component, the
// variant values it selects. The bundler plugin finds it by scanning the app; `generate` narrows
// the components to it and hands adapters the variants, which they narrow their styles to.

import type { AnyComponentSpec, CoreConfig } from "@pureform/core/types";

import type { ComponentShape } from "./adapter";

/** Variant values in use, by component and group: `{ button: { variant: ["filled"] } }`. A
 *  component or a group left out keeps every value. */
export type VariantUsage = Readonly<
    Record<string, Readonly<Record<string, readonly string[]>>>
>;

/** What an app uses, as the bundler plugin's scan found it. */
export interface Usage {
    /** The components the app draws. The others are left out of the glue; names the config
     *  doesn't have are ignored. */
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
            const used = groups[group];
            if (!used) continue;
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

/** The config with only these components, each narrowed to the variant values in use: the values
 *  left out lose their styles, and so do the compound variants that match them. Tokens, themes,
 *  and everything else stay. For adapters that compile styles from the config (stylesheets,
 *  precomputed tables); the factory modules keep reading the whole config. */
export const narrowConfig = (
    config: CoreConfig,
    components: readonly string[],
    variants: VariantUsage = {},
): CoreConfig => ({
    ...config,
    components: Object.fromEntries(
        components.map((name) => [
            name,
            narrowSpec(name, config.components[name]!, variants),
        ]),
    ),
});
