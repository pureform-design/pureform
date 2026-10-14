// Providers that are not Material's, one per domain where an alternative system is common.
//
// Each shows a contract filled a different way: elevation by tint instead of shadow, a type
// scale from a ratio instead of a table, and radii from a single base size.

import {
    colorMix,
    fontFamily,
    linearGradient,
    none,
    pct,
    px,
    rem,
    stop,
    transparent,
    unitless,
} from "@pureform/core/ast";
import type { FontFamilyNode, StyleMap } from "@pureform/core/ast";

import { ELEVATION_LEVELS, SHAPE_ROLES } from "../contracts/foundations";
import type { ElevationLevel, ShapeRole } from "../contracts/foundations";
import { BASE_TEXT_STYLES } from "../contracts/typography";
import type {
    BaseFontRole,
    BaseTextStyle,
    TextStyleNode,
    TypographyContract,
} from "../contracts/typography";
import { defineProvider } from "../provider";
import type {
    ElevationProvider,
    ShapeProvider,
    TypographyProvider,
} from "../provider";
import { colorRole } from "../refs";

const byName = <K extends string, V>(
    names: readonly K[],
    value: (name: K, index: number) => V,
) =>
    Object.fromEntries(
        names.map((name, i) => [name, value(name, i)]),
    ) as Record<K, V>;

export interface TonalElevationOptions {
    /** The color group whose color tints raised surfaces. Default `primary`. */
    group?: string;
    /** Tint strength per level, in percent. Default Material's surface tint steps. */
    tints?: Record<ElevationLevel, number>;
}

/** Elevation as a tint over the surface instead of a shadow, as Material 3's tonal
 *  elevation does. Each level overlays the group color at its strength. */
export const tonalElevation = (
    options: TonalElevationOptions = {},
): ElevationProvider =>
    defineProvider({
        domain: "elevation",
        name: "tonal",
        generate: ({ color }) => {
            const group = options.group ?? color.groups[0] ?? "primary";
            const tints = options.tints ?? {
                level0: 0,
                level1: 5,
                level2: 8,
                level3: 11,
                level4: 12,
                level5: 14,
            };
            return {
                levels: byName(ELEVATION_LEVELS, (level): StyleMap => {
                    const tint = colorMix(
                        transparent,
                        colorRole(group),
                        pct(tints[level]),
                    );
                    return {
                        boxShadow: none,
                        backgroundImage: linearGradient([
                            stop(tint),
                            stop(tint),
                        ]),
                    };
                }),
            };
        },
    });

/** Elevation with no visual change at any level, for flat designs. */
export const flatElevation = (): ElevationProvider =>
    defineProvider({
        domain: "elevation",
        name: "flat",
        generate: () => ({
            levels: byName(ELEVATION_LEVELS, () => ({ boxShadow: none })),
        }),
    });

// Steps from the base size per text style. With the default ratio of 1.2 the sizes land close
// to Material's table: bodyLarge is the base and displayLarge is about 57px.
const STEPS: Record<BaseTextStyle, number> = {
    displayLarge: 7,
    displayMedium: 6,
    displaySmall: 5,
    headlineLarge: 4,
    headlineMedium: 3,
    headlineSmall: 2,
    titleLarge: 1,
    titleMedium: 0,
    titleSmall: -1,
    bodyLarge: 0,
    bodyMedium: -1,
    bodySmall: -1.5,
    labelLarge: -1,
    labelMedium: -1.5,
    labelSmall: -2,
};

const isHeading = (style: BaseTextStyle) =>
    /^(display|headline|title)/.test(style);

export interface ModularScaleOptions<TFont extends string = never> {
    /** The bodyLarge size, in rem. Default `1`. */
    base?: number;
    /** The factor between steps. Default `1.2`. */
    ratio?: number;
    /** Line height as a multiple of the size, for display, headline, and title styles and for
     *  body and label styles. Rounded up to a 4px grid. Default `1.25` and `1.5`. */
    lineHeight?: { heading?: number; text?: number };
    /** Font stacks per role. `brand` and `plain` default to the system font; add roles freely.
     *  Display, headline, and title styles use `brand`; body and label styles use `plain`. */
    fonts?: Partial<Record<BaseFontRole, FontFamilyNode>> &
        Record<TFont, FontFamilyNode>;
}

/** A type scale computed from a base size and a ratio rather than a fixed table. */
export const modularScale = <const TFont extends string = never>(
    options: ModularScaleOptions<TFont> = {},
): TypographyProvider<TFont> =>
    defineProvider({
        domain: "typography",
        name: "modular",
        generate: () => {
            const { base = 1, ratio = 1.2 } = options;
            const heading = options.lineHeight?.heading ?? 1.25;
            const text = options.lineHeight?.text ?? 1.5;
            const system = fontFamily(["system-ui"], "sans-serif");
            const styles = byName(
                BASE_TEXT_STYLES,
                (style): TextStyleNode<TFont> => {
                    const size = base * ratio ** STEPS[style];
                    const leading = isHeading(style) ? heading : text;
                    const line = Math.ceil((size * leading * 16) / 4) / 4;
                    return {
                        font: isHeading(style) ? "brand" : "plain",
                        fontSize: rem(Math.round(size * 1000) / 1000),
                        lineHeight: rem(line),
                        letterSpacing: rem(0),
                        fontWeight: unitless(
                            /^(label|title)/.test(style) &&
                                style !== "titleLarge"
                                ? 500
                                : 400,
                        ),
                    };
                },
            );
            return {
                fonts: {
                    brand: system,
                    plain: system,
                    ...options.fonts,
                } as TypographyContract<TFont>["fonts"],
                styles: styles as TypographyContract<TFont>["styles"],
            };
        },
    });

// Multiples of the base per role. With a base of 4px this is Material's shape scale.
const SHAPE_MULTIPLES: Record<ShapeRole, number> = {
    none: 0,
    extraSmall: 1,
    small: 2,
    medium: 3,
    large: 4,
    extraLarge: 7,
    full: 0,
};

/** Radii scaled from one base size, in px. `full` stays fully round. */
export const roundedShape = ({
    base = 4,
}: { base?: number } = {}): ShapeProvider =>
    defineProvider({
        domain: "shape",
        name: "rounded",
        generate: () => ({
            radii: byName(SHAPE_ROLES, (role) =>
                px(role === "full" ? 9999 : base * SHAPE_MULTIPLES[role]),
            ),
        }),
    });
