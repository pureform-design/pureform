// The typography contract: font stacks per role and Material's type scale.
//
// `brand` and `plain` always exist, and a provider may add font roles (`mono`). All fifteen
// Material text styles are required, and a provider may add styles (`code`) that set their
// font through any declared role.

import type { FontFamilyNode, NumericValue } from "@pureform/core/ast";

export const BASE_FONT_ROLES = ["brand", "plain"] as const;

export type BaseFontRole = (typeof BASE_FONT_ROLES)[number];

export const BASE_TEXT_STYLES = [
    "displayLarge",
    "displayMedium",
    "displaySmall",
    "headlineLarge",
    "headlineMedium",
    "headlineSmall",
    "titleLarge",
    "titleMedium",
    "titleSmall",
    "bodyLarge",
    "bodyMedium",
    "bodySmall",
    "labelLarge",
    "labelMedium",
    "labelSmall",
] as const;

export type BaseTextStyle = (typeof BASE_TEXT_STYLES)[number];

/** One text style. `font` names a font role; the rest are lengths and a unitless weight. */
export interface TextStyleNode<TFont extends string = never> {
    font: BaseFontRole | TFont;
    fontSize: NumericValue;
    lineHeight: NumericValue;
    letterSpacing: NumericValue;
    fontWeight: NumericValue;
}

export interface TypographyContract<
    TFont extends string = never,
    TStyle extends string = never,
> {
    fonts: Record<BaseFontRole | TFont, FontFamilyNode>;
    styles: Record<BaseTextStyle | TStyle, TextStyleNode<NoInfer<TFont>>>;
}
