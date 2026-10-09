// Lower component specs to Panda recipes.
//
// A single-slot `ComponentSpec` becomes a `defineRecipe`-shaped object; a `SlottedComponentSpec`
// becomes a `defineSlotRecipe`-shaped object. `componentBaseStyles` merges in at lowest
// precedence (into the root slot for slot recipes). The class name and JSX binding come from
// `$meta.platformHints.panda`, defaulting to the component name.

import type { StyleMap } from "@pureform/core/ast";
import type {
    AnyComponentSpec,
    ComponentSpec,
    SlottedComponentSpec,
} from "@pureform/core/types";

import type { CompileCtx } from "./options";
import { compileStyleMap } from "./style-map";

const capitalize = (s: string): string =>
    s.charAt(0).toUpperCase() + s.slice(1);

interface PandaHints {
    className?: string;
    jsx?: string[];
}

const hints = (spec: AnyComponentSpec): PandaHints => {
    const h = spec.$meta?.platformHints?.panda as PandaHints | undefined;
    return {
        className: h?.className ?? spec.name,
        jsx: h?.jsx ?? [capitalize(spec.name)],
    };
};

const compoundOf = (
    match: Record<string, string>,
    css: Record<string, unknown>,
): Record<string, unknown> => ({ ...match, css });

const compileRecipe = (spec: ComponentSpec, ctx: CompileCtx) => {
    const { className, jsx } = hints(spec);
    const base: StyleMap = {
        ...ctx.config.componentBaseStyles,
        ...spec.recipe.base,
    };
    const variants = Object.fromEntries(
        Object.entries(spec.recipe.variants ?? {}).map(([group, values]) => [
            group,
            Object.fromEntries(
                Object.entries(values).map(([value, style]) => [
                    value,
                    compileStyleMap(style, ctx),
                ]),
            ),
        ]),
    );
    return {
        className,
        jsx,
        base: compileStyleMap(base, ctx),
        variants,
        compoundVariants: (spec.recipe.compoundVariants ?? []).map((cv) =>
            compoundOf(cv.match, compileStyleMap(cv.style, ctx)),
        ),
        defaultVariants: spec.recipe.defaultVariants ?? {},
    };
};

const compileSlotStyles = (
    bySlot: Record<string, StyleMap>,
    ctx: CompileCtx,
): Record<string, Record<string, unknown>> =>
    Object.fromEntries(
        Object.entries(bySlot).map(([slot, style]) => [
            slot,
            compileStyleMap(style, ctx),
        ]),
    );

const compileSlotRecipe = (spec: SlottedComponentSpec, ctx: CompileCtx) => {
    const { className, jsx } = hints(spec);
    // Shared base styles land on the root slot (or the first slot if there is no `root`).
    const rootSlot = spec.slots.includes("root") ? "root" : spec.slots[0];
    const base: Record<string, StyleMap> = { ...spec.recipe.base };
    if (ctx.config.componentBaseStyles && rootSlot) {
        base[rootSlot] = {
            ...ctx.config.componentBaseStyles,
            ...base[rootSlot],
        };
    }
    const variants = Object.fromEntries(
        Object.entries(spec.recipe.variants ?? {}).map(([group, values]) => [
            group,
            Object.fromEntries(
                Object.entries(values).map(([value, bySlot]) => [
                    value,
                    compileSlotStyles(bySlot, ctx),
                ]),
            ),
        ]),
    );
    return {
        className,
        jsx,
        slots: spec.slots,
        base: compileSlotStyles(base, ctx),
        variants,
        compoundVariants: (spec.recipe.compoundVariants ?? []).map((cv) =>
            compoundOf(cv.match, compileSlotStyles(cv.style, ctx)),
        ),
        defaultVariants: spec.recipe.defaultVariants ?? {},
    };
};

/** Split the config's components into Panda `recipes` (single-slot) and `slotRecipes`
 *  (multi-slot), keyed by component name. */
export const compileRecipes = (
    ctx: CompileCtx,
): {
    recipes: Record<string, unknown>;
    slotRecipes: Record<string, unknown>;
} => {
    const recipes: Record<string, unknown> = {};
    const slotRecipes: Record<string, unknown> = {};
    for (const [name, spec] of Object.entries(ctx.config.components)) {
        if (spec.kind === "slotComponent") {
            slotRecipes[name] = compileSlotRecipe(spec, ctx);
        } else {
            recipes[name] = compileRecipe(spec, ctx);
        }
    }
    return { recipes, slotRecipes };
};
