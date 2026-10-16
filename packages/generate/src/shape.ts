// A component's shape, read from its spec in the config: what the generated declarations type
// and what adapters key their selection caches on.

import type { AnyComponentSpec } from "@pureform/core/types";

import type { ComponentShape } from "./adapter";

/** The shape of a component spec: its variant groups and values, defaults, slots, and
 *  instance tokens. */
export const componentShape = (spec: AnyComponentSpec): ComponentShape => {
    const variants: Record<string, readonly string[]> = {};
    for (const [group, values] of Object.entries(spec.recipe.variants ?? {})) {
        variants[group] = Object.keys(values);
    }
    return {
        variants,
        defaults: { ...spec.recipe.defaultVariants },
        slots: spec.kind === "slotComponent" ? [...spec.slots] : ["root"],
        tokens: Object.keys(spec.tokens ?? {}),
    };
};
