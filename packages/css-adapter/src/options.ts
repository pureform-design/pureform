// Adapter options, and the lowering context they set.

import type { PortableCondition } from "@pureform/core/ast";
import type { CoreConfig } from "@pureform/core/types";
import type { LowerCtx, VarPrefix } from "@pureform/css-lowering";
import { varTokenRef } from "@pureform/css-lowering";

/** The attribute named themes are scoped by when `themeAttribute` isn't set. */
export const DEFAULT_THEME_ATTRIBUTE = "data-theme";

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

// Color scheme and reduced motion conditions match more than one rule, so they lower to a
// placeholder key that the serializer expands to each rule.
export const DARK = "@scheme dark";
export const LIGHT = "@scheme light";
export const REDUCED_MOTION = "@motion reduce";

const SCHEME_KEY: Partial<Record<PortableCondition, string>> = {
    dark: DARK,
    light: LIGHT,
    reducedMotion: REDUCED_MOTION,
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

/** The attribute that scopes named themes under these options. */
export const themeAttributeOf = (options: Pick<CssOptions, "themeAttribute">) =>
    options.themeAttribute ?? DEFAULT_THEME_ATTRIBUTE;

/** A class name, after the class prefix. */
export const className = (name: string, options: CssOptions): string =>
    options.classPrefix ? `${options.classPrefix}-${name}` : name;
