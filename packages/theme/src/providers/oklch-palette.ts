// A color provider from hues alone, without Material's generator.
//
// Each role takes a fixed OKLCH lightness per scheme and its group's hue, with chroma scaled
// per role, so a palette is a handful of hues. OKLCH lightness is perceptual, so the same
// lightness gives every hue a similar contrast against the surfaces.

import { alias, oklch, when } from "@pureform/core/ast";
import type { ColorNode } from "@pureform/core/ast";

import type { ColorContract, GroupRole, NeutralRole } from "../contracts/color";
import { defineProvider } from "../provider";
import type { ColorProvider } from "../provider";
import { PATHS } from "../refs";

/** Lightness in light and dark, and the share of the group chroma a role keeps. */
type Tone = { light: number; dark: number; chroma: number };

const GROUP_TONES: Record<"base" | "on" | "container" | "onContainer", Tone> = {
    base: { light: 0.5, dark: 0.8, chroma: 1 },
    on: { light: 0.99, dark: 0.25, chroma: 0.15 },
    container: { light: 0.9, dark: 0.35, chroma: 0.5 },
    onContainer: { light: 0.25, dark: 0.92, chroma: 0.6 },
};

const NEUTRAL_TONES: Record<NeutralRole, Tone> = {
    surface: { light: 0.985, dark: 0.16, chroma: 1 },
    surfaceDim: { light: 0.9, dark: 0.16, chroma: 1 },
    surfaceBright: { light: 0.985, dark: 0.3, chroma: 1 },
    surfaceContainerLowest: { light: 1, dark: 0.13, chroma: 0 },
    surfaceContainerLow: { light: 0.965, dark: 0.19, chroma: 1 },
    surfaceContainer: { light: 0.95, dark: 0.21, chroma: 1 },
    surfaceContainerHigh: { light: 0.93, dark: 0.24, chroma: 1 },
    surfaceContainerHighest: { light: 0.91, dark: 0.27, chroma: 1 },
    onSurface: { light: 0.2, dark: 0.92, chroma: 1 },
    surfaceVariant: { light: 0.91, dark: 0.3, chroma: 2 },
    onSurfaceVariant: { light: 0.42, dark: 0.8, chroma: 2 },
    inverseSurface: { light: 0.3, dark: 0.92, chroma: 1 },
    inverseOnSurface: { light: 0.96, dark: 0.3, chroma: 1 },
    outline: { light: 0.56, dark: 0.62, chroma: 2 },
    outlineVariant: { light: 0.8, dark: 0.4, chroma: 2 },
    scrim: { light: 0, dark: 0, chroma: 0 },
    shadow: { light: 0, dark: 0, chroma: 0 },
};

export interface OklchHue {
    /** Hue angle in degrees. */
    hue: number;
    /** Peak chroma of the group's main role. Default `0.14`. */
    chroma?: number;
}

export interface OklchPaletteOptions<G extends string> {
    /** A hue per color group. */
    groups: Record<G, OklchHue>;
    /** The hue and chroma the surfaces lean toward. Default a near-gray `{ hue: 270,
     *  chroma: 0.006 }`. */
    neutral?: OklchHue;
    /** Change any role's lightness per scheme. */
    tones?: Partial<Record<NeutralRole, Partial<Tone>>>;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** A light and dark palette from a hue per group. Each role is a pair of primitives
 *  (`primaryLight`, `primaryDark`) and a semantic role that picks one by scheme. */
export const oklchPalette = <const G extends string>(
    options: OklchPaletteOptions<G>,
): ColorProvider<G> =>
    defineProvider({
        domain: "color",
        name: "oklch",
        generate: () => {
            const primitives: Record<string, ColorNode> = {};
            const roles: Record<string, ReturnType<typeof when>> = {};
            const add = (
                role: string,
                tone: Tone,
                { hue, chroma }: Required<OklchHue>,
            ) => {
                const c = Math.round(chroma * tone.chroma * 1000) / 1000;
                primitives[`${role}Light`] = oklch(tone.light, c, hue);
                primitives[`${role}Dark`] = oklch(tone.dark, c, hue);
                roles[role] = when(
                    "dark",
                    alias(...PATHS.primitive, `${role}Dark`),
                    alias(...PATHS.primitive, `${role}Light`),
                );
            };

            const neutral = { hue: 270, chroma: 0.006, ...options.neutral };
            for (const [role, tone] of Object.entries<Tone>(NEUTRAL_TONES)) {
                add(
                    role,
                    { ...tone, ...options.tones?.[role as NeutralRole] },
                    neutral,
                );
            }

            const groups = Object.keys(options.groups) as G[];
            for (const group of groups) {
                const hue = { chroma: 0.14, ...options.groups[group] };
                const name = capitalize(group);
                add(group, GROUP_TONES.base, hue);
                add(`on${name}`, GROUP_TONES.on, hue);
                add(`${group}Container`, GROUP_TONES.container, hue);
                add(`on${name}Container`, GROUP_TONES.onContainer, hue);
            }

            return {
                groups,
                roles: roles as ColorContract<G>["roles"] &
                    Record<GroupRole<G>, ReturnType<typeof when>>,
                primitives,
            };
        },
    });
