// Adapter options, and the lowering hooks that spell pureform's CSS the way Panda reads it.

import type { PortableCondition } from "@pureform/core/ast";
import type { CoreConfig } from "@pureform/core/types";
import type { LowerCtx, VarPrefix } from "@pureform/css-lowering";

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

export type CompileCtx = LowerCtx;

/** Panda resolves the function form `token(colors.brand)` only in style values (recipes,
 *  style maps). */
export const tokenFn = (ref: string): string => `token(${ref})`;

/** In a token or semantic token definition Panda resolves only the curly form
 *  `{colors.brand}`, even inside a `var()` fallback. */
export const tokenCurly = (ref: string): string => `{${ref}}`;

// Conditions Panda builds in, by their `_` keys. pureform's dark and light are Panda conditions
// the preset declares.
const CONDITION_KEY: Partial<Record<PortableCondition, string>> = {
    hover: "_hover",
    focus: "_focus",
    focusVisible: "_focusVisible",
    active: "_active",
    pressed: "_active",
    disabled: "_disabled",
    checked: "_checked",
    invalid: "_invalid",
    readOnly: "_readOnly",
    dark: "_dark",
    light: "_light",
    ltr: "_ltr",
    rtl: "_rtl",
    reducedMotion: "_motionReduce",
};

/** The context hooks for Panda: its condition keys, and breakpoints by name. */
export const pandaHooks = {
    conditionKey: (condition: PortableCondition) => CONDITION_KEY[condition],
    breakpointKey: (name: string) => name,
} satisfies Partial<LowerCtx>;

/** The lowering context for Panda style values, as `compilePreset` builds it, for lowering a
 *  style map or value on its own. */
export const pandaContext = (
    config: CoreConfig,
    options: CompileOptions = {},
): CompileCtx => ({
    config,
    prefix: options.prefix,
    ...(options.pandaPrefix ? { classPrefix: options.pandaPrefix } : {}),
    target: options.target ?? "css",
    tokenRef: tokenFn,
    ...pandaHooks,
});
