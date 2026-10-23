// Springs on the web, which has none: a spring token is written as two vars, its settle
// duration and its sampled `linear()` curve, and a transition or animation timed by a spring
// reads both. Its exact parameters (stiffness, damping ratio, mass) are written beside them, so
// a settle from a release speed (binding-core's `settleTransition`) samples the spring itself
// again rather than fitting one to the curve. A literal spring is sampled in place. `sampleSpring` in `@pureform/core` does the
// sampling, so every web adapter writes the same curve.

import {
    formatLinearEasing,
    getByPath,
    isSpringToken,
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
import { unitless } from "@pureform/core/ast";
import type { Token } from "@pureform/core/types";

import type { LowerCtx } from "./context";
import { varName } from "./css";

/** The tokens a spring is written as on the web: its settle duration in ms and its curve as a
 *  `linear()` easing, which transitions read, and its own parameters, which a settle from a
 *  release speed reads. */
export interface SpringVars {
    duration: NumericScalarNode;
    easing: LinearEasingNode;
    stiffness: NumericScalarNode;
    damping: NumericScalarNode;
    mass: NumericScalarNode;
}

/** The spring's parameters among its vars, by the var's suffix. */
export const SPRING_PARAMS = ["stiffness", "damping", "mass"] as const;

/** A spring's web tokens, from the core sampler. */
export const springVars = (spring: SpringNode): SpringVars => {
    const { duration, points } = sampleSpring(spring);
    return {
        duration: { type: "numeric", value: duration, unit: "ms" },
        easing: { type: "easing", kind: "linear", points },
        stiffness: unitless(spring.stiffness),
        damping: unitless(spring.damping),
        mass: unitless(spring.mass),
    };
};

/** The spring tokens as nested groups, `name: { duration, easing, stiffness, damping, mass }`,
 *  for a target that nests token groups (Panda). */
export const springTokenGroups = (
    springs: Record<string, Token<SpringNode>> | undefined,
): Record<string, Record<keyof SpringVars, ValueNode>> =>
    Object.fromEntries(
        Object.entries(springs ?? {}).map(([name, entry]) => [
            name,
            { ...springVars(tokenValue(entry)) },
        ]),
    );

/** Each spring token as the token entries the web writes, by alias path:
 *  `["springs", name, "duration"]`, `["springs", name, "easing"]` and its parameters'. */
export const springTokenEntries = (
    springs: Record<string, Token<SpringNode>> | undefined,
): [path: string[], node: ValueNode][] =>
    Object.entries(springTokenGroups(springs)).flatMap(([name, group]) =>
        Object.entries(group).map(([field, node]): [string[], ValueNode] => [
            ["springs", name, field],
            node,
        ]),
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

/** A spring timing's parameters as CSS, in `SPRING_PARAMS`' order: a spring token's vars, or a
 *  literal spring's numbers. A component token without a default leaves them unset. */
export const compileSpringParams = (
    value: SpringValue,
    ctx: LowerCtx,
): string[] | undefined => {
    switch (value.type) {
        case "spring":
            return SPRING_PARAMS.map((param) => String(value[param]));
        case "alias": {
            const [ns, ...rest] = value.path;
            if (ns === "springs") {
                const ref = `springs.${rest.join(".")}`;
                return SPRING_PARAMS.map((param) =>
                    ctx.tokenRef(`${ref}.${param}`),
                );
            }
            return compileSpringParams(
                tokenValue(getByPath(ctx.config, value.path)) as SpringValue,
                ctx,
            );
        }
        case "dynamic": {
            const name = varName(value.path, ctx.prefix);
            const fallback =
                value.default &&
                compileSpringParams(value.default as SpringValue, ctx);
            return SPRING_PARAMS.map((param, i) =>
                fallback
                    ? `var(${name}-${param}, ${fallback[i]})`
                    : `var(${name}-${param})`,
            );
        }
        case "platform":
            return compileSpringParams(
                (value.values[ctx.target] ?? value.default) as SpringValue,
                ctx,
            );
        case "conditional":
            return compileSpringParams(value.base as SpringValue, ctx);
        default:
            return undefined;
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

// The value at an alias's path, or `undefined` where there's none (compiling it reports that).
/** Whether a token's value is a spring for the context's target: a literal one, an alias to a
 *  spring role, or a component token holding one (or an alias to it, such as another
 *  component's), also through a platform's choice (core's `isSpringToken`). */
export const isSpringValue = (node: ValueNode, ctx: LowerCtx): boolean =>
    isSpringToken(node, { config: ctx.config, target: ctx.target });

/** A token set to a spring, as its vars (its duration, curve and parameters): each of the
 *  spring's, so an alias to a spring role still follows a theme's change of that role. */
export const springTokenVars = (
    path: string[],
    value: SpringValue,
    ctx: LowerCtx,
): Record<string, string> => {
    const names = springVarNames(path, ctx);
    const values = compileSpring(value, ctx);
    const out: Record<string, string> = {
        [names[0]]: values[0],
        [names[1]]: values[1],
    };
    const params = compileSpringParams(value, ctx);
    const name = varName(path, ctx.prefix);
    if (params) {
        SPRING_PARAMS.forEach((param, i) => {
            out[`${name}-${param}`] = params[i]!;
        });
    }
    return out;
};
