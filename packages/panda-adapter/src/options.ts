// Adapter options and shared compile context.

import type { CoreConfig } from "@pureform/core/types";

/** Per-tier var prefix applied only at lowering. The config stays canonical and prefix-free;
 *  the adapter prepends this when it emits a CSS var, so vars can be namespaced to avoid
 *  collisions when a design system is embedded alongside others. A bare string prefixes every
 *  tier (`"pf"` gives `--pf-ui-*`, `--pf-components-*`, `--pf-global-*`); an object sets
 *  per-tier prefixes, with omitted tiers staying unprefixed. Default is no prefix. */
export type VarPrefix =
    | string
    | { ui?: string; components?: string; global?: string };

export interface CompileOptions {
    /** Preset name. Default `"pureform"`. */
    name?: string;
    /** Var prefix policy. Default none. */
    prefix?: VarPrefix;
    /** Adapter target id read from `platform(...)` nodes. Fixed to `"css"` for web. */
    target?: string;
    /** The `prefix` in your Panda config, if any. Panda prefixes recipe class names with it,
     *  and slot conditions select slots by class. Default none. */
    pandaPrefix?: string;
}

/** Everything the node and style compilers need: the config to resolve refs against, the var
 *  prefix policy, and the target id.
 *
 *  `refStyle` picks how an aliased token reference is spelled. Panda resolves the function form
 *  `token(colors.brand)` only in style-value contexts (recipes, style maps). In a token or
 *  semantic-token DEFINITION it resolves only the curly form `{colors.brand}` (even inside a
 *  `var()` fallback), so token tiers compile with `refStyle: "curly"`. At runtime, outside
 *  Panda, `refStyle: "var"` spells the CSS var Panda emits for the token, using
 *  `tokenPrefix` (Panda's own `prefix`, not the component var prefix). */
export interface CompileCtx {
    config: CoreConfig;
    prefix: VarPrefix | undefined;
    target: string;
    refStyle: "fn" | "curly" | "var";
    tokenPrefix?: string;
    /** The slot recipe and slot being compiled, for slot conditions, with the slot's
     *  ancestors from the component's structure, nearest first. */
    slot?: { className: string; name: string; ancestors?: string[] };
    /** Every slot's ancestors in the component being compiled. */
    slotAncestors?: Map<string, string[]>;
}
