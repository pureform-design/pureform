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
}

/** Everything the node and style compilers need: the config to resolve refs against, the var
 *  prefix policy, and the target id. */
export interface CompileCtx {
    config: CoreConfig;
    prefix: VarPrefix | undefined;
    target: string;
}
