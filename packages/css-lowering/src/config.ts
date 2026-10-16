// Facts about a config that every adapter lowers the same way: whether it varies by color
// scheme, a theme's component token vars, and how a component's slots nest.

import { tokenValue } from "@pureform/core";
import type { ValueNode, ValueType } from "@pureform/core/ast";
import type { CoreConfig, ThemeOverride } from "@pureform/core/types";

import { compileNodeToCSS } from "./compile-node";
import type { LowerCtx } from "./context";
import { varName } from "./css";

const hasSchemeCase = (node: ValueNode): boolean =>
    node.type === "conditional" &&
    node.cases.some((c) =>
        (Array.isArray(c.on) ? c.on : [c.on]).some(
            (on) => on === "dark" || on === "light",
        ),
    );

/** Whether some semantic token varies by color scheme, so the page should declare the schemes
 *  it supports. */
export const usesColorScheme = (config: CoreConfig): boolean =>
    Object.values(config.semanticTokens).some((group) =>
        Object.values(group).some((entry) =>
            hasSchemeCase(tokenValue(entry) as ValueNode),
        ),
    );

/** A theme's component token overrides as the components' vars, by var name. */
export const componentTokenVars = (
    override: ThemeOverride,
    ctx: LowerCtx,
): Record<string, string> => {
    const vars: Record<string, string> = {};
    for (const [component, { tokens = {} }] of Object.entries(
        override.components ?? {},
    )) {
        for (const [token, entry] of Object.entries(tokens)) {
            vars[varName(["components", component, token], ctx.prefix)] =
                compileNodeToCSS(tokenValue(entry) as ValueNode, ctx);
        }
    }
    return vars;
};

// CSS's `@property` syntax for each value type.
const SYNTAX: Record<ValueType, string> = {
    number: "<number>",
    length: "<length>",
    percentage: "<percentage>",
    lengthPercentage: "<length-percentage>",
    angle: "<angle>",
    time: "<time>",
    color: "<color>",
};

/** A registered custom property: a component token with a value type, which CSS can
 *  transition once it's registered with `@property`. */
export interface RegisteredProperty {
    name: string;
    syntax: string;
    initialValue: string;
}

/** The component tokens with a value type, to register as CSS custom properties. They
 *  inherit, so a value set and moving on one element moves its descendants too. */
export const registeredProperties = (
    config: CoreConfig,
    ctx: LowerCtx,
): RegisteredProperty[] =>
    Object.values(config.components ?? {}).flatMap((component) =>
        Object.values(component.tokens ?? {}).flatMap((entry) => {
            const node = tokenValue(entry) as ValueNode;
            if (node.type !== "dynamic" || !node.valueType) return [];
            return [
                {
                    name: varName(node.path, ctx.prefix),
                    syntax: SYNTAX[node.valueType],
                    initialValue: node.default
                        ? compileNodeToCSS(node.default, ctx)
                        : "",
                },
            ];
        }),
    );

/** Each slot's ancestors in a component's structure, nearest first. */
export const slotAncestors = (
    structure: Record<string, string[]>,
): Map<string, string[]> => {
    const parent = new Map<string, string>();
    for (const [outer, inner] of Object.entries(structure)) {
        for (const child of inner) parent.set(child, outer);
    }
    const out = new Map<string, string[]>();
    for (const child of parent.keys()) {
        const chain: string[] = [];
        for (let p = parent.get(child); p !== undefined; p = parent.get(p)) {
            if (chain.includes(p)) break;
            chain.push(p);
        }
        out.set(child, chain);
    }
    return out;
};
