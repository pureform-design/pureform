// Runtime theming: a config's tokens as the CSS vars Panda reads.
//
// Panda bakes recipes, text styles, and utilities into static CSS at build time, but every
// token is a CSS var. Setting those vars on an element retheme everything inside it with no
// rebuild, as long as the new config has the same recipes. `themeVars` computes them.

import { tokenValue } from "@pureform/core";
import type { ValueNode } from "@pureform/core/ast";
import type { CoreConfig, Token } from "@pureform/core/types";

import { compileNodeToCSS } from "./compile-node";
import { aliasTarget, tokenVarName } from "./css";
import type { CompileCtx } from "./options";

export interface ThemeVarsOptions {
    /** Panda's own `prefix`, if the Panda config sets one. Default none. */
    tokenPrefix?: string;
    /** The pureform component var prefix, as passed to `compilePreset`. Default none. */
    prefix?: CompileCtx["prefix"];
}

/** Every token in `config` as a CSS var name and value, ready for `element.style.setProperty`.
 *  Values that reference other tokens spell the var, so they follow overrides too.
 *
 *  A conditional semantic token (a color with a dark case) is left out: Panda already switches
 *  it by scheme, and it points at primitives this sets. Text styles and utilities are not vars,
 *  so a provider that changes them needs a rebuild. */
export const themeVars = (
    config: CoreConfig,
    options: ThemeVarsOptions = {},
): Record<string, string> => {
    const ctx: CompileCtx = {
        config,
        prefix: options.prefix,
        target: "css",
        refStyle: "var",
        ...(options.tokenPrefix ? { tokenPrefix: options.tokenPrefix } : {}),
    };
    const vars: Record<string, string> = {};

    const add = (path: string[], entry: Token<ValueNode>) => {
        const node = tokenValue(entry) as ValueNode;
        if (node.type === "conditional") return;
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
    return vars;
};
