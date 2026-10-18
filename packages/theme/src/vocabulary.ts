// The names a resolved theme's config holds, as a type: what `typed(theme.config)` offers. It
// lists the contract roles every theme has (and the color groups, font roles, and text styles
// the theme was built with), not a provider's extra primitives, such as a palette's tones.

import type {
    FontFamilyNode,
    NumericScalarNode,
    ScalarNode,
    StyleMap,
    ValueNode,
    EasingNode,
} from "@pureform/core/ast";
import type { StaticUtilityDef } from "@pureform/core/types";

import type { ColorRole } from "./contracts/color";
import type {
    DurationRole,
    EasingRole,
    ElevationLevel,
    FocusIndicatorRole,
    ShapeRole,
    SizeRole,
    SpacingStep,
    StackingRole,
    StateRole,
} from "./contracts/foundations";
import type { BaseFontRole, BaseTextStyle } from "./contracts/typography";
import type { ELEVATION_FILTER_UTILITY, ELEVATION_UTILITY } from "./refs";

// The declared names, plus an index signature for a provider's extras. `typed()` offers the
// declared names; the extras stay readable.
type Tokens<K extends string, V> = { [Name in K]: V } & Record<string, V>;
type Tiers<T> = T & Record<string, Record<string, unknown>>;

type ElevationUtility = Omit<StaticUtilityDef, "values"> & {
    values: Tokens<ElevationLevel, StyleMap>;
};

/** The names in a theme's config, by tier: its color roles, radii, spacing, sizes, opacities,
 *  durations, easings, stacking layers, fonts, text styles (and each style's values), and the elevation
 *  utilities with their levels. */
export interface ThemeVocabulary<
    G extends string = string,
    TFont extends string = never,
    TStyle extends string = never,
> {
    tokens: Tiers<{
        radii: Tokens<ShapeRole, ScalarNode>;
        spacing: Tokens<SpacingStep, ScalarNode>;
        sizes: Tokens<SizeRole | FocusIndicatorRole, ScalarNode>;
        opacity: Tokens<StateRole, ScalarNode>;
        fontSize: Tokens<BaseTextStyle | TStyle, ScalarNode>;
        lineHeight: Tokens<BaseTextStyle | TStyle, ScalarNode>;
        letterSpacing: Tokens<BaseTextStyle | TStyle, ScalarNode>;
        fontWeight: Tokens<BaseTextStyle | TStyle, ScalarNode>;
    }>;
    semanticTokens: Tiers<{
        colors: Tokens<
            ColorRole<G> | `elevationTint${Capitalize<ElevationLevel>}`,
            ValueNode
        >;
        shadows: Tokens<ElevationLevel, ValueNode>;
    }>;
    fonts: Tokens<BaseFontRole | TFont, FontFamilyNode>;
    textStyles: Tokens<BaseTextStyle | TStyle, StyleMap>;
    durations: Tokens<DurationRole, NumericScalarNode>;
    easings: Tokens<EasingRole, EasingNode>;
    zIndices: Tokens<StackingRole, NumericScalarNode>;
    utilities: {
        [ELEVATION_UTILITY]: ElevationUtility;
        [ELEVATION_FILTER_UTILITY]: ElevationUtility;
    } & Record<string, unknown>;
}
