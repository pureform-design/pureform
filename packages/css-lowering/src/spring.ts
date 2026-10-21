// Springs on the web, which has none: a spring token is written as two vars, its settle
// duration and its sampled `linear()` curve, and a transition or animation timed by a spring
// reads both. A literal spring is sampled in place. `sampleSpring` in `@pureform/core` does the
// sampling, so every web adapter writes the same curve.

import {
    formatLinearEasing,
    getByPath,
    sampleSpring,
    tokenValue,
} from "@pureform/core";
import type {
    LinearEasingNode,
    NumericScalarNode,
    SpringNode,
    SpringValue,
    ValueNode,
} from "@pureform/core/ast";
import type { Token } from "@pureform/core/types";

import type { LowerCtx } from "./context";

/** The two tokens a spring is written as on the web: its settle duration in ms, and its curve
 *  as a `linear()` easing. */
export interface SpringVars {
    duration: NumericScalarNode;
    easing: LinearEasingNode;
}

/** A spring's web tokens, from the core sampler. */
export const springVars = (spring: SpringNode): SpringVars => {
    const { duration, points } = sampleSpring(spring);
    return {
        duration: { type: "numeric", value: duration, unit: "ms" },
        easing: { type: "easing", kind: "linear", points },
    };
};

/** Each spring token as the two token entries the web writes, by alias path:
 *  `["springs", name, "duration"]` and `["springs", name, "easing"]`. */
export const springTokenEntries = (
    springs: Record<string, Token<SpringNode>> | undefined,
): [path: string[], node: ValueNode][] =>
    Object.entries(springs ?? {}).flatMap(([name, entry]) => {
        const vars = springVars(tokenValue(entry));
        return [
            [["springs", name, "duration"], vars.duration],
            [["springs", name, "easing"], vars.easing],
        ];
    });

/** The spring tokens as nested groups, `name: { duration, easing }`, for a target that nests
 *  token groups (Panda). */
export const springTokenGroups = (
    springs: Record<string, Token<SpringNode>> | undefined,
): Record<string, Record<string, ValueNode>> =>
    Object.fromEntries(
        Object.entries(springs ?? {}).map(([name, entry]) => {
            const vars = springVars(tokenValue(entry));
            return [name, { duration: vars.duration, easing: vars.easing }];
        }),
    );

/** A spring timing's duration and curve as CSS: a spring token's two vars, or a literal
 *  spring's sampled duration and `linear()` curve. */
export const compileSpring = (
    value: SpringValue,
    ctx: LowerCtx,
): [duration: string, easing: string] => {
    switch (value.type) {
        case "spring": {
            const { duration, points } = sampleSpring(value);
            return [`${duration}ms`, formatLinearEasing(points)];
        }
        case "alias": {
            const [ns, ...rest] = value.path;
            if (ns === "springs") {
                const ref = `springs.${rest.join(".")}`;
                return [
                    ctx.tokenRef(`${ref}.duration`),
                    ctx.tokenRef(`${ref}.easing`),
                ];
            }
            return compileSpring(
                tokenValue(getByPath(ctx.config, value.path)) as SpringValue,
                ctx,
            );
        }
        case "platform":
            return compileSpring(
                (value.values[ctx.target] ?? value.default) as SpringValue,
                ctx,
            );
        case "conditional":
            return compileSpring(value.base as SpringValue, ctx);
        default:
            throw new Error(
                `a spring must be a spring or an alias to one, not a ${value.type} value`,
            );
    }
};
