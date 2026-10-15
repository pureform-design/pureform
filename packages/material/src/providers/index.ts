// Material's providers for each `@pureform/theme` contract.
//
// Each wraps a Material generator (the palette, the type scale, the shadow model) or Material's
// published values (the shape scale, state opacities, motion tokens), so a theme can take
// Material for some domains and its own providers for others.

import { cubicBezier, numeric, pct, px } from "@pureform/core/ast";
import type {
    ColorNode,
    CornerShapeKeyword,
    EasingNode,
    NumericScalarNode,
} from "@pureform/core/ast";
import { defineProvider, gridLayout } from "@pureform/theme";
import type {
    BaseColorGroup,
    ColorContract,
    ColorProvider,
    DurationRole,
    EasingRole,
    ElevationProvider,
    LayoutProvider,
    MotionProvider,
    ShapeProvider,
    ShapeRole,
    SizeRole,
    StateProvider,
    StateRole,
    TypographyProvider,
} from "@pureform/theme";

import { elevationContract } from "../core-config/elevation";
import type { ElevationOptions } from "../core-config/elevation";
import { palette, paletteColorGroups } from "../core-config/palette";
import type { PaletteOptions } from "../core-config/palette";
import { typescaleContract } from "../core-config/typescale";
import type { HexColor } from "../types";
import type { TypographyArgs } from "../typography";

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
        generate: () => typescaleContract(options),
    });

/** Material's layered shadows, with no tint. The shadow color and layer opacities stay tokens,
 *  so a theme can retint every level. */
export const materialElevation = (
    options: Pick<ElevationOptions, "shadowColor"> = {},
): ElevationProvider =>
    defineProvider({
        domain: "elevation",
        name: "material",
        generate: () => elevationContract(options),
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

/** Material's shape scale. `radii` changes or adds radii, in px; `corner` sets how corners
 *  curve, for example `squircle`. */
export const materialShape = (
    radii: Partial<Record<ShapeRole, number>> & Record<string, number> = {},
    { corner }: { corner?: CornerShapeKeyword } = {},
): ShapeProvider =>
    defineProvider({
        domain: "shape",
        name: "material",
        generate: () => ({
            radii: toPx({ ...MATERIAL_RADII, ...radii }),
            ...(corner ? { corner } : {}),
        }),
    });

/** Material's component sizes, in px. */
export const MATERIAL_SIZES: Record<
    Exclude<SizeRole, "densityOffset">,
    number
> = {
    iconSmall: 18,
    iconMedium: 24,
    controlSmall: 32,
    controlMedium: 40,
    controlLarge: 48,
    touchTarget: 48,
};

export interface MaterialLayoutOptions {
    /** The spacing grid unit, in px. Default `4`. */
    grid?: number;
    /** Change or add component sizes, in px. */
    sizes?: Partial<Record<SizeRole, number>> & Record<string, number>;
    /** The density steps components offer, by name: grid units added to a dense component's
     *  height, from `-3` up. Default Material's `"0"` to `"-3"`. */
    densities?: Record<string, number>;
    /** The theme's density: a step's name, or its grid units. Default `0`. */
    density?: string | number;
}

/** Material's 4px spacing grid and component sizes. */
export const materialLayout = (
    options: MaterialLayoutOptions = {},
): LayoutProvider => {
    const provider = gridLayout({
        grid: options.grid ?? 4,
        sizes: { ...MATERIAL_SIZES, ...options.sizes },
        ...(options.densities === undefined
            ? {}
            : { densities: options.densities }),
        ...(options.density === undefined ? {} : { density: options.density }),
    });
    return { ...provider, name: "material" };
};

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
