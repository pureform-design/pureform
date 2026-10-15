// A theme's token values for one color scheme: every token and component token override,
// resolved to concrete values, so styles can be evaluated against them.

import { tokenValue } from "@pureform/core";
import type { ValueNode } from "@pureform/core/ast";
import type { CoreConfig, ThemeOverride, Token } from "@pureform/core/types";

import { lowerToken, refKey } from "./lower";
import type { RnOptions } from "./lower";
import { dependencies, evaluate } from "./values";
import type { Concrete, ThemeValues, Value } from "./values";

export type Scheme = "light" | "dark";

export interface ThemeOptions extends Pick<
    RnOptions,
    "target" | "remBase" | "fontStack"
> {
    scheme: Scheme;
    /** A named theme from `config.themes`. Default none, the base theme. */
    theme?: string;
}

type Tiered = Record<string, Record<string, Token<ValueNode>> | undefined>;
type Flat = Record<string, Token<ValueNode>> | undefined;

// Every token's node by theme key, the named theme's overrides after the base's.
const tokenNodes = (
    config: CoreConfig,
    override: ThemeOverride | undefined,
) => {
    const nodes = new Map<string, ValueNode>();
    const tiered = (
        ns: "tokens" | "semanticTokens",
        tiers: Tiered | undefined,
    ) => {
        for (const [group, entries] of Object.entries(tiers ?? {})) {
            for (const [name, entry] of Object.entries(entries ?? {})) {
                nodes.set(
                    refKey([ns, group, name])!,
                    tokenValue(entry) as ValueNode,
                );
            }
        }
    };
    const flat = (ns: string, entries: Flat) => {
        for (const [name, entry] of Object.entries(entries ?? {})) {
            nodes.set(refKey([ns, name])!, tokenValue(entry) as ValueNode);
        }
    };
    for (const source of [config, override ?? {}] as ThemeOverride[]) {
        tiered("tokens", source.tokens as Tiered);
        tiered("semanticTokens", source.semanticTokens as Tiered);
        flat("fonts", source.fonts as Flat);
        flat("durations", source.durations as Flat);
        flat("easings", source.easings as Flat);
        flat("zIndices", (source as CoreConfig).zIndices as Flat);
    }
    for (const [component, { tokens = {} }] of Object.entries(
        override?.components ?? {},
    )) {
        for (const [token, entry] of Object.entries(tokens)) {
            nodes.set(
                `components.${component}.${token}`,
                tokenValue(entry) as ValueNode,
            );
        }
    }
    return nodes;
};

/** Resolve a scheme's token values, in the base theme or a named one. Tokens React Native
 *  can't use (easings, for one) are left out. */
export const resolveTheme = (
    config: CoreConfig,
    options: ThemeOptions,
    /** Filled with the formula of each token that reads others, by key, so an override of
     *  what it reads can recompute it. */
    formulas?: Record<string, Value>,
): ThemeValues => {
    const override = options.theme ? config.themes?.[options.theme] : undefined;
    if (options.theme && !override)
        throw new Error(`unknown theme "${options.theme}"`);
    const nodes = tokenNodes(config, override);
    const values: ThemeValues = {};
    const pending = new Set<string>();
    const get = (key: string): Concrete | undefined => {
        if (key in values) return values[key];
        const node = nodes.get(key);
        if (!node) return undefined;
        if (pending.has(key))
            throw new Error(`token "${key}" refers to itself`);
        pending.add(key);
        try {
            const template = lowerToken(node, config, options.scheme, options);
            const value = evaluate(template, theme);
            if (formulas && dependencies(template).size > 0) {
                formulas[key] = template;
            }
            if (typeof value === "number" || typeof value === "string")
                values[key] = value;
            return values[key];
        } finally {
            pending.delete(key);
        }
    };
    // Tokens read each other through this, resolving on demand.
    const theme = new Proxy({} as ThemeValues, {
        get: (_, key) => get(String(key)),
    });
    for (const key of nodes.keys()) {
        try {
            get(key);
        } catch {
            // Not a React Native value: an easing, a duration in a unit it has no use for.
        }
    }
    return values;
};
