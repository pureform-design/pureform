// Generate a `@pureform/core` text style fragment from the Material type scale.
//
// `typescaleContract` builds the typography contract from `Typography`: a font stack per role
// and every Material role plus any added in `custom`. `typescale` lowers it the way a theme
// does, so each style value is a token and the whole scale is CSS vars.

import { fontFamily, numeric, unitless } from "@pureform/core/ast";
import type { FontFamilyNode, NumericScalarNode } from "@pureform/core/ast";
import type { CoreConfig } from "@pureform/core/types";
import { BASE_TEXT_STYLES, typographyFragment } from "@pureform/theme";
import type { TextStyleNode, TypographyContract } from "@pureform/theme";

import { Typography } from "../typography";
import type { TypographyArgs } from "../typography";

export type TypescaleOptions<
    TCustomTextStyleName extends string = never,
    TFontRole extends string = never,
> = TypographyArgs<TCustomTextStyleName, TFontRole>;

/** Parse a type scale length, stored as a CSS string such as "1.25rem" or "14px". */
export const toLength = (value: string): NumericScalarNode => {
    const match = /^(-?[\d.]+)(px|rem|em)$/.exec(value);
    if (!match?.[1] || !match[2]) {
        throw new Error(`Unsupported type scale length: ${value}`);
    }
    return numeric(Number(match[1]), match[2] as "px" | "rem" | "em");
};

/** The Material type scale as a typography contract. */
export const typescaleContract = <
    TCustomTextStyleName extends string = never,
    TFontRole extends string = never,
>(
    options: TypescaleOptions<TCustomTextStyleName, TFontRole> = {},
): TypographyContract<TFontRole, TCustomTextStyleName> => {
    type Contract = TypographyContract<TFontRole, TCustomTextStyleName>;
    const scale = Typography.create<TCustomTextStyleName, TFontRole>(options);
    const names = new Set<string>([
        ...BASE_TEXT_STYLES,
        ...Object.keys(options.custom ?? {}),
    ]);

    const styles: Record<string, TextStyleNode<TFontRole>> = {};
    for (const name of names) {
        const style = scale.get(name as TCustomTextStyleName);
        styles[name] = {
            font: style.font,
            fontSize: toLength(style.fontSize),
            lineHeight: toLength(style.lineHeight),
            letterSpacing: toLength(style.letterSpacing),
            fontWeight: unitless(style.fontWeight),
        };
    }

    const fonts: Record<string, FontFamilyNode> = {};
    for (const role of scale.fontRoles) {
        const { families, generic } = scale.fonts[role];
        fonts[role] = fontFamily([...families], generic);
    }

    return {
        fonts: fonts as Contract["fonts"],
        styles: styles as Contract["styles"],
    };
};

/** Build a `fonts`, `tokens`, and `textStyles` fragment from the Material type scale. Compose it
 *  over a base config: `mergeConfigs(baseConfig, typescale())`. */
export const typescale = <
    TCustomTextStyleName extends string = never,
    TFontRole extends string = never,
>(
    options: TypescaleOptions<TCustomTextStyleName, TFontRole> = {},
): Pick<CoreConfig, "tokens" | "fonts" | "textStyles"> =>
    typographyFragment(typescaleContract(options));
