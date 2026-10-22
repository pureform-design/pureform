// A component's shape, read from its spec in the config: what the generated declarations type
// and what adapters key their selection caches on.

import { getByPath, tokenValue } from "@pureform/core";
import type { ValueNode } from "@pureform/core/ast";
import type { AnyComponentSpec, CoreConfig } from "@pureform/core/types";

import type { ComponentShape } from "./adapter";

// Whether a token's value is a spring: a literal one, an alias to a spring role, or (with the
// config to follow it) an alias to another spring token, also through a `dynamic` default or a
// platform's choice. Every platform's choice has to be one for the token to count.
const isSpring = (
    node: ValueNode | undefined,
    config: CoreConfig | undefined,
    seen: ReadonlySet<string> = new Set(),
): boolean => {
    if (!node) return false;
    switch (node.type) {
        case "spring":
            return true;
        case "alias": {
            if (node.path[0] === "springs") return true;
            const key = node.path.join(".");
            if (!config || seen.has(key)) return false;
            let target: ValueNode;
            try {
                target = tokenValue(getByPath(config, node.path));
            } catch {
                return false;
            }
            return isSpring(target, config, new Set([...seen, key]));
        }
        case "dynamic":
            return isSpring(node.default, config, seen);
        case "platform":
            return (
                isSpring(node.default, config, seen) &&
                Object.values(node.values).every((value) =>
                    isSpring(value, config, seen),
                )
            );
        default:
            return false;
    }
};

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
            .filter(([, entry]) => isSpring(tokenValue(entry), config))
            .map(([name]) => name),
    };
};
