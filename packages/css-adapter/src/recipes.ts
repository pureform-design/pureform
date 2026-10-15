// A config's components as class name functions, built at runtime, typed from the typed
// component specs.

import type { AnyComponentSpec, CoreConfig } from "@pureform/core/types";

import { className } from "./options";
import type { CssOptions } from "./options";
import { recipe } from "./runtime";
import type { RecipeFn, RecipeManifest } from "./runtime";

/** A component spec's variant values by group, from its typed spec, or open when untyped. */
export type VariantsOf<S> = S extends { $variants?: infer V }
    ? unknown extends V
        ? Record<string, string>
        : NonNullable<V>
    : Record<string, string>;

/** A slot component's slots. */
export type SlotsOf<S> = S extends {
    kind: "slotComponent";
    slots: readonly (infer X extends string)[];
}
    ? X
    : never;

/** A config's components as class name functions, by name. */
export type Recipes<C extends { components: object }> = {
    [K in keyof C["components"]]: RecipeFn<
        VariantsOf<C["components"][K]>,
        SlotsOf<C["components"][K]>
    >;
};

/** What the runtime needs to know about a component. */
export const manifestOf = (
    spec: AnyComponentSpec,
    options: Pick<CssOptions, "classPrefix"> = {},
): RecipeManifest => ({
    className: className(spec.name, options),
    ...(spec.kind === "slotComponent" ? { slots: spec.slots } : {}),
    variants: Object.fromEntries(
        Object.entries(spec.recipe.variants ?? {}).map(([group, values]) => [
            group,
            Object.keys(values),
        ]),
    ),
    defaultVariants: spec.recipe.defaultVariants ?? {},
});

/** Every component in a config as a class name function. Pass the same class prefix as to
 *  `compileCss`. */
export const recipes = <C extends Pick<CoreConfig, "components">>(
    config: C,
    options: Pick<CssOptions, "classPrefix"> = {},
): Recipes<C> =>
    Object.fromEntries(
        Object.entries(config.components).map(([name, spec]) => [
            name,
            recipe(manifestOf(spec as AnyComponentSpec, options)),
        ]),
    ) as Recipes<C>;
