// Adapter options, and the lowering context they set.

import type { PortableCondition } from "@pureform/core/ast";
import type { CoreConfig } from "@pureform/core/types";
import type { LowerCtx, VarPrefix } from "@pureform/css-lowering";
import { varTokenRef } from "@pureform/css-lowering";

export interface CssOptions {
    /** The component var prefix, as in the Panda adapter. Default none. */
    prefix?: VarPrefix;
    /** Prefixes every token var: `"pf"` gives `--pf-colors-primary`. Default none. */
    tokenPrefix?: string;
    /** Prefixes every class: `"pf"` gives `.pf-button`. Default none. */
    classPrefix?: string;
    /** The attribute that switches named themes: `[data-theme=teal]`. Default `data-theme`. */
    themeAttribute?: string;
    /** The cascade layer everything sits in, or `false` for none. Default `pureform`. */
    layer?: string | false;
    /** The target id read from `platform(...)` nodes and `rawRules`. Default `css`. */
    target?: string;
}

// Color scheme conditions match more than one rule, so they lower to a placeholder key that
// the serializer expands to each rule.
export const DARK = "@scheme dark";
export const LIGHT = "@scheme light";

const SCHEME_KEY: Partial<Record<PortableCondition, string>> = {
    dark: DARK,
    light: LIGHT,
};

/** The lowering context for the CSS adapter. */
export const cssContext = (
    config: CoreConfig,
    options: CssOptions = {},
): LowerCtx => ({
    config,
    prefix: options.prefix,
    target: options.target ?? "css",
    tokenRef: varTokenRef(options.tokenPrefix),
    ...(options.classPrefix ? { classPrefix: options.classPrefix } : {}),
    conditionKey: (condition) => SCHEME_KEY[condition],
});

/** A class name, after the class prefix. */
export const className = (name: string, options: CssOptions): string =>
    options.classPrefix ? `${options.classPrefix}-${name}` : name;
