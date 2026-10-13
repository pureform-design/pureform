// Generate a `@pureform/core` text style fragment from the Material type scale.
//
// Each Material role (`displayLarge` through `labelSmall`) becomes a composite text style, so a
// recipe applies one through `textStyle: alias("textStyles", "labelLarge")`. The family is a
// font token rather than a value repeated per role, so swapping the typeface is one override.

import { alias, fontFamily, numeric, unitless } from "@pureform/core/ast";
import type { NumericScalarNode, StyleMap } from "@pureform/core/ast";
import type { CoreConfig } from "@pureform/core/types";

import { Typography } from "../typography";
import type { BaseTextStyleName } from "../typography";

/** Font token every generated text style reads its family from. */
export const TYPESCALE_FONT = "plain";

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

/** Build a `fonts` and `textStyles` fragment from the Material type scale. Compose it over a
 *  base config: `mergeConfigs(baseConfig, typescale())`. */
export const typescale = (): Pick<CoreConfig, "fonts" | "textStyles"> => {
    const scale = Typography.create();

    const textStyles: Record<string, StyleMap> = {};
    for (const role of ROLES) {
        const style = scale.get(role);
        textStyles[role] = {
            fontFamily: alias("fonts", TYPESCALE_FONT),
            fontSize: toLength(style.fontSize),
            lineHeight: toLength(style.lineHeight),
            letterSpacing: toLength(style.letterSpacing),
            fontWeight: unitless(Number(style.fontWeight)),
        };
    }

    return {
        fonts: { [TYPESCALE_FONT]: fontFamily(["Roboto"], "sans-serif") },
        textStyles,
    };
};
