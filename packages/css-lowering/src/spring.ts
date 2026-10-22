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
import { varName } from "./css";

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
        case "dynamic": {
            // A component token holding a spring: its two vars, falling back to its default's.
            const [duration, easing] = springVarNames(value.path, ctx);
            if (!value.default) return [`var(${duration})`, `var(${easing})`];
            const [d, e] = compileSpring(value.default as SpringValue, ctx);
            return [`var(${duration}, ${d})`, `var(${easing}, ${e})`];
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

/** The two vars a spring-valued token at `path` is written as: `<token>-duration` and
 *  `<token>-easing`. */
export const springVarNames = (
    path: string[],
    ctx: LowerCtx,
): [duration: string, easing: string] => {
    const name = varName(path, ctx.prefix);
    return [`${name}-duration`, `${name}-easing`];
};

/** Whether a token's value is a spring: a literal one, or an alias to a spring role, also
 *  through a platform's choice. */
export const isSpringValue = (node: ValueNode, ctx: LowerCtx): boolean => {
    switch (node.type) {
        case "spring":
            return true;
        case "alias":
            return node.path[0] === "springs";
        case "platform":
            return isSpringValue(node.values[ctx.target] ?? node.default, ctx);
        default:
            return false;
    }
};

/** A token set to a spring, as its two vars: each of the spring's, so an alias to a spring role
 *  still follows a theme's change of that role. */
export const springTokenVars = (
    path: string[],
    value: SpringValue,
    ctx: LowerCtx,
): Record<string, string> => {
    const names = springVarNames(path, ctx);
    const values = compileSpring(value, ctx);
    return { [names[0]]: values[0], [names[1]]: values[1] };
};
