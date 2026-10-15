// The lowering context: the config to resolve references against, and the hooks that set how a
// target spells what plain CSS and its tools write differently.

import type { PortableCondition } from "@pureform/core/ast";
import type { CoreConfig } from "@pureform/core/types";

/** Per-tier var prefix applied only at lowering. The config stays canonical and prefix-free;
 *  the adapter prepends this when it emits a CSS var, so vars can be namespaced to avoid
 *  collisions when a design system is embedded alongside others. A bare string prefixes every
 *  tier (`"pf"` gives `--pf-ui-*`, `--pf-components-*`, `--pf-global-*`); an object sets
 *  per-tier prefixes, with omitted tiers staying unprefixed. Default is no prefix. */
export type VarPrefix =
    | string
    | { ui?: string; components?: string; global?: string };

/** Everything the node and style compilers need. */
export interface LowerCtx {
    config: CoreConfig;
    /** The component var prefix. */
    prefix: VarPrefix | undefined;
    /** The target id read from `platform(...)` nodes and `rawRules`. */
    target: string;
    /** Spell a token reference, given as `category.name`: for example
     *  `var(--colors-brand)`. */
    tokenRef: (ref: string) => string;
    /** The prefix on every class name, which slot conditions select slots by. */
    classPrefix?: string;
    /** The key for a portable condition, when the target has its own; otherwise the plain
     *  selector or at-rule. */
    conditionKey?: (condition: PortableCondition) => string | undefined;
    /** The key for a viewport range from a breakpoint up, when the target names breakpoints;
     *  otherwise the media query. */
    breakpointKey?: (name: string) => string | undefined;
    /** The slot recipe and slot being compiled, for slot conditions, with the slot's
     *  ancestors from the component's structure, nearest first. */
    slot?: { className: string; name: string; ancestors?: string[] };
    /** Every slot's ancestors in the component being compiled. */
    slotAncestors?: Map<string, string[]>;
}
