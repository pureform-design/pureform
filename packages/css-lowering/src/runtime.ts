// Runtime theming: a config's tokens as the CSS vars the components read.
//
// Adapters bake recipes, text styles, and utilities into static CSS at build time, but every
// token is a CSS var. Setting those vars on an element retheme everything inside it with no
// rebuild, as long as the new config has the same recipes. `themeVars` computes them.

import { tokenValue } from "@pureform/core";
import type { ConditionalNode, ValueNode } from "@pureform/core/ast";
import type { CoreConfig, Token } from "@pureform/core/types";

import { compileNodeToCSS } from "./compile-node";
import type { LowerCtx, VarPrefix } from "./context";
import { aliasTarget, tokenVarName, varTokenRef } from "./css";
import { springTokenEntries } from "./spring";

export interface ThemeVarsOptions {
    /** The token var prefix, if the adapter sets one (Panda's own `prefix`). Default none. */
    tokenPrefix?: string;
    /** The pureform component var prefix, as passed to the adapter. Default none. */
    prefix?: VarPrefix;
    /** Resolve scheme-dependent tokens for this scheme. Without it they are left out. */
    scheme?: "light" | "dark";
}

// A token that varies only by color scheme, resolved for one scheme. Any other condition
// leaves it unresolved.
const forScheme = (
    node: ConditionalNode,
    scheme: "light" | "dark",
): ValueNode | undefined => {
    let value: ValueNode = node.base;
    for (const c of node.cases) {
        if (c.on !== "dark" && c.on !== "light") return undefined;
        if (c.on === scheme) value = c.value;
    }
    return value;
};

/** Every token in `config` as a CSS var name and value, ready for `element.style.setProperty`.
 *  Values that reference other tokens spell the var, so they follow overrides too.
 *
 *  A token that varies by color scheme needs `scheme` to resolve, since the adapter declares it on
 *  the root and an override on a descendant would not reach it. Pass the scheme the page shows,
 *  and recompute when it changes. Other conditional tokens are left out. Text styles and
 *  utilities are not vars, so a provider that changes them needs a rebuild. */
export const themeVars = (
    config: CoreConfig,
    options: ThemeVarsOptions = {},
): Record<string, string> => {
    const ctx: LowerCtx = {
        config,
        prefix: options.prefix,
        target: "css",
        tokenRef: varTokenRef(options.tokenPrefix),
    };
    const vars: Record<string, string> = {};

    const add = (path: string[], entry: Token<ValueNode>) => {
        let node = tokenValue(entry) as ValueNode | undefined;
        if (node?.type === "conditional") {
            node = options.scheme ? forScheme(node, options.scheme) : undefined;
        }
        if (!node) return;
        const target = aliasTarget(path);
        if (target.kind !== "token") return;
        vars[tokenVarName(target.ref, options.tokenPrefix)] = compileNodeToCSS(
            node,
            ctx,
        );
    };

    const groups = (
        ns: string,
        tiers: Record<string, Record<string, Token<ValueNode>>> | undefined,
    ) => {
        for (const [group, entries] of Object.entries(tiers ?? {})) {
            for (const [name, entry] of Object.entries(entries)) {
                add([ns, group, name], entry);
            }
        }
    };

    groups("tokens", config.tokens);
    groups("semanticTokens", config.semanticTokens);
    for (const tier of ["fonts", "durations", "easings", "zIndices"] as const) {
        for (const [name, entry] of Object.entries(config[tier] ?? {})) {
            add([tier, name], entry as Token<ValueNode>);
        }
    }
    for (const [path, node] of springTokenEntries(config.springs)) {
        add(path, node);
    }
    return vars;
};
