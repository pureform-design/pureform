// Material's providers for each `@pureform/theme` contract.
//
// Each wraps a Material generator (the palette, the type scale, the shadow model) or Material's
// published values (the shape scale, state opacities, motion tokens), so a theme can take
// Material for some domains and its own providers for others.

import {
    cubicBezier,
    fontFamily,
    numeric,
    pct,
    px,
    unitless,
} from "@pureform/core/ast";
import type {
    ColorNode,
    EasingNode,
    NumericScalarNode,
} from "@pureform/core/ast";
import { defineProvider } from "@pureform/theme";
import type {
    BaseColorGroup,
    ColorContract,
    ColorProvider,
    DurationRole,
    EasingRole,
    ElevationContract,
    ElevationProvider,
    MotionProvider,
    ShapeProvider,
    ShapeRole,
    StateProvider,
    StateRole,
    TextStyleNode,
    TypographyContract,
    TypographyProvider,
} from "@pureform/theme";

import { elevation } from "../core-config/elevation";
import type { ElevationOptions } from "../core-config/elevation";
import { palette, paletteColorGroups } from "../core-config/palette";
import type { PaletteOptions } from "../core-config/palette";
import { toLength } from "../core-config/typescale";
import type { HexColor } from "../types";
import { Typography } from "../typography";
import type { BaseTextStyleName, TypographyArgs } from "../typography";

export interface MaterialColorOptions<
    TCustomColorGroups extends string = never,
> extends PaletteOptions<TCustomColorGroups> {
    /** Seed color the whole palette is generated from. Default Material's baseline purple. */
    seed?: HexColor;
}

const DEFAULT_SEED: HexColor = "#6750A4";

/** Material's generated palette. Every new group in `customSeeds` becomes a color group, so
 *  components offer it through their `color` variant. Primitives are `oklch` by default, which
 *  adapters can render; pass `space: "hct"` for a target that renders HCT. */
export const materialColor = <TCustomColorGroups extends string = never>(
    options: MaterialColorOptions<TCustomColorGroups> = {},
): ColorProvider<BaseColorGroup | TCustomColorGroups> =>
    defineProvider({
        domain: "color",
        name: "material",
        generate: () => {
            const { seed = DEFAULT_SEED, ...rest } = options;
            const { tokens, semanticTokens } = palette(seed, {
                space: "oklch",
                ...rest,
            });
            type G = BaseColorGroup | TCustomColorGroups;
            return {
                groups: paletteColorGroups(options.customSeeds) as G[],
                roles: semanticTokens.colors as ColorContract<G>["roles"],
                primitives: (tokens.colors ?? {}) as Record<string, ColorNode>,
            };
        },
    });

const BASE_TEXT_STYLES: BaseTextStyleName[] = [
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

/** Material's type scale. `fonts` changes or adds font stacks, and `custom` changes or adds
 *  text styles, as for `Typography.create()`. */
export const materialTypescale = <
    TCustomTextStyleName extends string = never,
    TFontRole extends string = never,
>(
    options: TypographyArgs<TCustomTextStyleName, TFontRole> = {},
): TypographyProvider<TFontRole, TCustomTextStyleName> =>
    defineProvider({
        domain: "typography",
        name: "material",
        generate: () => {
            const scale = Typography.create<TCustomTextStyleName, TFontRole>(
                options,
            );
            type Contract = TypographyContract<TFontRole, TCustomTextStyleName>;
            const names = [
                ...BASE_TEXT_STYLES,
                ...Object.keys(options.custom ?? {}),
            ];
            const styles: Record<string, TextStyleNode<TFontRole>> = {};
            for (const name of new Set(names)) {
                const style = scale.get(name as TCustomTextStyleName);
                styles[name] = {
                    font: style.font,
                    fontSize: toLength(style.fontSize),
                    lineHeight: toLength(style.lineHeight),
                    letterSpacing: toLength(style.letterSpacing),
                    fontWeight: unitless(style.fontWeight),
                };
            }
            const fonts: Record<
                string,
                Contract["fonts"][keyof Contract["fonts"]]
            > = {};
            for (const role of scale.fontRoles) {
                const { families, generic } = scale.fonts[role];
                fonts[role] = fontFamily([...families], generic);
            }
            return {
                fonts: fonts as Contract["fonts"],
                styles: styles as Contract["styles"],
            };
        },
    });

/** Material's layered shadows. The shadow color and layer opacities stay tokens, so a theme
 *  can retint every level. */
export const materialElevation = (
    options: Pick<ElevationOptions, "shadowColor"> = {},
): ElevationProvider =>
    defineProvider({
        domain: "elevation",
        name: "material",
        generate: () => {
            const { tokens, semanticTokens, utilities } = elevation(options);
            const utility = utilities?.shadowElevation;
            return {
                levels: (utility?.kind === "static"
                    ? utility.values
                    : {}) as ElevationContract["levels"],
                extra: { tokens, semanticTokens },
            };
        },
    });

const toPx = <K extends string>(values: Record<K, number>) =>
    Object.fromEntries(
        Object.entries<number>(values).map(([name, value]) => [
            name,
            px(value),
        ]),
    ) as Record<K, NumericScalarNode>;

/** Material's shape scale, in px. */
export const MATERIAL_RADII: Record<ShapeRole, number> = {
    none: 0,
    extraSmall: 4,
    small: 8,
    medium: 12,
    large: 16,
    extraLarge: 28,
    full: 9999,
};

/** Material's shape scale. `radii` changes or adds radii, in px. */
export const materialShape = (
    radii: Partial<Record<ShapeRole, number>> & Record<string, number> = {},
): ShapeProvider =>
    defineProvider({
        domain: "shape",
        name: "material",
        generate: () => ({ radii: toPx({ ...MATERIAL_RADII, ...radii }) }),
    });

/** Material's state opacities, in percent: the state layer tints, the disabled strengths,
 *  and the scrim. */
export const MATERIAL_OPACITIES: Record<StateRole, number> = {
    stateHover: 8,
    stateFocus: 10,
    statePressed: 10,
    stateDragged: 16,
    disabledContainer: 12,
    disabledContent: 38,
    scrim: 32,
};

/** Material's state opacities. `opacities` changes or adds opacities, in percent. */
export const materialState = (
    opacities: Partial<Record<StateRole, number>> & Record<string, number> = {},
): StateProvider =>
    defineProvider({
        domain: "state",
        name: "material",
        generate: () => ({
            opacities: Object.fromEntries(
                Object.entries({ ...MATERIAL_OPACITIES, ...opacities }).map(
                    ([name, value]) => [name, pct(value)],
                ),
            ) as Record<StateRole, NumericScalarNode>,
        }),
    });

/** Material's duration tokens, in ms. */
export const MATERIAL_DURATIONS: Record<DurationRole, number> = {
    short1: 50,
    short2: 100,
    short3: 150,
    short4: 200,
    medium1: 250,
    medium2: 300,
    medium3: 350,
    medium4: 400,
    long1: 450,
    long2: 500,
    long3: 550,
    long4: 600,
    extraLong1: 700,
    extraLong2: 800,
    extraLong3: 900,
    extraLong4: 1000,
};

/** Material's easing tokens. CSS has no path easing, so `emphasized` uses the standard curve,
 *  as Material's web components do. */
export const MATERIAL_EASINGS: Record<EasingRole, EasingNode> = {
    standard: cubicBezier([0.2, 0, 0, 1]),
    standardAccelerate: cubicBezier([0.3, 0, 1, 1]),
    standardDecelerate: cubicBezier([0, 0, 0, 1]),
    emphasized: cubicBezier([0.2, 0, 0, 1]),
    emphasizedAccelerate: cubicBezier([0.3, 0, 0.8, 0.15]),
    emphasizedDecelerate: cubicBezier([0.05, 0.7, 0.1, 1]),
    linear: cubicBezier([0, 0, 1, 1]),
};

export interface MaterialMotionOptions {
    /** Change or add durations, in ms. */
    durations?: Partial<Record<DurationRole, number>> & Record<string, number>;
    /** Change or add easings. */
    easings?: Partial<Record<EasingRole, EasingNode>> &
        Record<string, EasingNode>;
}

/** Material's motion tokens. */
export const materialMotion = (
    options: MaterialMotionOptions = {},
): MotionProvider =>
    defineProvider({
        domain: "motion",
        name: "material",
        generate: () => ({
            durations: Object.fromEntries(
                Object.entries({
                    ...MATERIAL_DURATIONS,
                    ...options.durations,
                }).map(([name, value]) => [name, numeric(value, "ms")]),
            ) as Record<DurationRole, NumericScalarNode>,
            easings: { ...MATERIAL_EASINGS, ...options.easings },
        }),
    });
