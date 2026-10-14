/** The font roles every type scale has. Material sets display, headline, and title styles in
 *  the brand typeface and body and label styles in the plain one. */
export type BaseFontRole = "brand" | "plain";

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

export type BaseTextStyleName =
    | "displayLarge"
    | "displayMedium"
    | "displaySmall"
    | "headlineLarge"
    | "headlineMedium"
    | "headlineSmall"
    | "titleLarge"
    | "titleMedium"
    | "titleSmall"
    | "bodyLarge"
    | "bodyMedium"
    | "bodySmall"
    | "labelLarge"
    | "labelMedium"
    | "labelSmall";
