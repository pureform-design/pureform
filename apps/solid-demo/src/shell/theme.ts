// What each setting does to the providers: the named themes, runtime seed themes, overrides,
// direction, motion, and indication the shell passes to its `PureformProvider`s.

import { seedTheme } from "@pureform/material/runtime-theme";
import {
    defineIndication,
    materialIndication,
    noIndication,
} from "@pureform/solid";
import type {
    Indication,
    ProviderTheme,
    ThemeOverrides,
} from "@pureform/solid";

import { COLORS } from "../lib/settings";
import type { Settings } from "../lib/settings";

const MATERIAL = materialIndication();

/** An app's own indication: Material's ripple over stronger state layers and a thicker focus
 *  ring. */
const BOLD = defineIndication({
    ...MATERIAL,
    name: "app:bold",
    tokens: {
        ...MATERIAL.tokens,
        stateHoverOpacity: 0.16,
        stateFocusOpacity: 0.2,
        statePressedOpacity: 0.24,
        focusIndicatorThickness: 4,
    },
});

const INDICATIONS: Record<Settings["indication"], Indication> = {
    material: MATERIAL,
    sparkle: materialIndication({ ripple: "ink-sparkle" }),
    "no-ripple": materialIndication({ ripple: false }),
    bold: BOLD,
    none: noIndication,
};

// Fonts are runtime overrides: the provider writes the font tokens' vars on its element.
const FONTS: Record<Settings["font"], ThemeOverrides | undefined> = {
    material: undefined,
    system: {
        "fonts.plain": "system-ui, sans-serif",
        "fonts.brand": "system-ui, sans-serif",
    },
    serif: { "fonts.brand": "Georgia, 'Times New Roman', serif" },
    mono: {
        "fonts.plain": "var(--fonts-mono)",
        "fonts.brand": "var(--fonts-mono)",
    },
};

/** The theme a color setting picks: the config's base palette (none), its named `teal` theme,
 *  or a Material palette generated at run time from a seed. */
export const colorTheme = (
    settings: Pick<Settings, "color" | "customSeed">,
): ProviderTheme | undefined => {
    if (settings.color === "baseline") return undefined;
    if (settings.color === "teal") return "teal";
    return seedTheme({
        seed:
            settings.color === "custom"
                ? settings.customSeed
                : COLORS.find((color) => color.value === settings.color)!.seed!,
    });
};

/** A swatch's theme: what the color would apply, with the base palette as its seed. */
export const swatchTheme = (
    color: (typeof COLORS)[number],
    customSeed: `#${string}`,
): ProviderTheme =>
    color.value === "teal"
        ? "teal"
        : seedTheme({ seed: color.seed ?? customSeed });

/** The named themes for shape and density; `undefined` is the base theme's. */
export const shapeTheme = (settings: Settings) =>
    settings.shape === "material" ? undefined : settings.shape;

export const densityTheme = (settings: Settings) =>
    settings.density === "default" ? undefined : settings.density;

export const fontOverrides = (settings: Settings) => FONTS[settings.font];

export const indication = (settings: Settings) =>
    INDICATIONS[settings.indication];
