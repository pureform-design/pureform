// A component's shape, read from its spec in the config: what the generated declarations type
// and what adapters key their selection caches on.

import { isSpringToken, tokenValue } from "@pureform/core";
import type { AnyComponentSpec, CoreConfig } from "@pureform/core/types";

import type { ComponentShape } from "./adapter";

/** The shape of a component spec: its variant groups and values, defaults, slots, and
 *  instance tokens, with the spring-valued ones among them. Pass the config to follow a token
 *  that aliases another component's. */
export const componentShape = (
    spec: AnyComponentSpec,
    config?: CoreConfig,
): ComponentShape => {
    const variants: Record<string, readonly string[]> = {};
    for (const [group, values] of Object.entries(spec.recipe.variants ?? {})) {
        variants[group] = Object.keys(values);
    }
    const tokens = Object.entries(spec.tokens ?? {});
    return {
        variants,
        defaults: { ...spec.recipe.defaultVariants },
        slots: spec.kind === "slotComponent" ? [...spec.slots] : ["root"],
        tokens: tokens.map(([name]) => name),
        springs: tokens
            .filter(([, entry]) => isSpringToken(tokenValue(entry), { config }))
            .map(([name]) => name),
    };
};
