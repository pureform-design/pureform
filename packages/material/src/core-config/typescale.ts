// Generate a `@pureform/core` text style fragment from the Material type scale.
//
// Each Material role (`displayLarge` through `labelSmall`) becomes a composite text style, so a
// recipe applies one through `textStyle: alias("textStyles", "labelLarge")`. Each style reads
// its family from the font token of its role (`brand`, `plain`, or an added one), so swapping a
// typeface is one override.

import { alias, fontFamily, numeric, unitless } from "@pureform/core/ast";
import type { NumericScalarNode, StyleMap } from "@pureform/core/ast";
import type { CoreConfig } from "@pureform/core/types";

import { Typography } from "../typography";
import type { BaseTextStyleName, TypographyArgs } from "../typography";

export type TypescaleOptions<
    TCustomTextStyleName extends string = never,
    TFontRole extends string = never,
> = TypographyArgs<TCustomTextStyleName, TFontRole>;

const ROLES: BaseTextStyleName[] = [
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
];

// The Material scale stores lengths as CSS strings such as "1.25rem" or "14px".
const toLength = (value: string): NumericScalarNode => {
    const match = /^(-?[\d.]+)(px|rem|em)$/.exec(value);
    if (!match?.[1] || !match[2]) {
        throw new Error(`Unsupported type scale length: ${value}`);
    }
    return numeric(Number(match[1]), match[2] as "px" | "rem" | "em");
};

/** Build a `fonts` and `textStyles` fragment from the Material type scale: a font token per
 *  role and a text style per Material role plus any added in `custom`. Compose it over a base
 *  config: `mergeConfigs(baseConfig, typescale())`. */
export const typescale = <
    TCustomTextStyleName extends string = never,
    TFontRole extends string = never,
>(
    options: TypescaleOptions<TCustomTextStyleName, TFontRole> = {},
): Pick<CoreConfig, "fonts" | "textStyles"> => {
    const scale = Typography.create<TCustomTextStyleName, TFontRole>(options);
    const styles = [
        ...ROLES,
        ...(Object.keys(options.custom ?? {}) as TCustomTextStyleName[]).filter(
            (name) => !ROLES.includes(name as BaseTextStyleName),
        ),
    ];

    const textStyles: Record<string, StyleMap> = {};
    for (const role of styles) {
        const style = scale.get(role);
        textStyles[role] = {
            fontFamily: alias("fonts", style.font),
            fontSize: toLength(style.fontSize),
            lineHeight: toLength(style.lineHeight),
            letterSpacing: toLength(style.letterSpacing),
            fontWeight: unitless(style.fontWeight),
        };
    }

    return {
        fonts: Object.fromEntries(
            scale.fontRoles.map((role) => {
                const { families, generic } = scale.fonts[role];
                return [role, fontFamily([...families], generic)];
            }),
        ),
        textStyles,
    };
};
