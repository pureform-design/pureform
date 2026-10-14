import type { BaseFontRole, BaseTextStyle } from "@pureform/theme";

export type { BaseFontRole } from "@pureform/theme";

/** Material's type roles, `displayLarge` through `labelSmall`. The names come from the
 *  typography contract in `@pureform/theme`. */
export type BaseTextStyleName = BaseTextStyle;

/** The CSS generic family a font stack falls back to. */
export type GenericFamily =
    | "sans-serif"
    | "serif"
    | "monospace"
    | "cursive"
    | "system-ui";

/** A font stack: the preferred families in order, then a generic fallback. */
export type FontStack = {
    readonly families: readonly string[];
    readonly generic: GenericFamily;
};

export type TextStyle<TFontRole extends string = never> = {
    /** The font role the style is set in. */
    readonly font: BaseFontRole | TFontRole;
    readonly lineHeight: string;
    readonly fontSize: string;
    readonly fontWeight: number;
    readonly letterSpacing: string;
};
