// Generate a `@pureform/core` elevation fragment from the Material shadow model.
//
// Material elevation is several layered shadows (umbra, penumbra, ambient), not one. This
// emits a static `shadowElevation` utility whose named steps each carry a composite
// `shadow(...)` of those layers, so a recipe applies `{ shadowElevation: "level1" }` and the
// adapter lowers it per target. The geometry of each level is fixed by the Material model, but
// the shadow color and the per-layer opacities are tokens, so a theme can retint or soften
// every level without regenerating the utility. Material's surface tint is left out.

import { defineStaticUtility } from "@pureform/core";
import {
    alias,
    colorMix,
    none,
    pct,
    px,
    shadow,
    transparent,
} from "@pureform/core/ast";
import type { ColorValue, ShadowLayer, StyleMap } from "@pureform/core/ast";
import type { CoreConfig } from "@pureform/core/types";

import { ShadowElevations } from "../elevation";
import type { BaseElevation, BoxShadow } from "../elevation";
import type { Pixel } from "../types";

export interface ElevationOptions {
    /** Named levels to emit, in order. Default `level0` through `level5`. */
    levels?: BaseElevation[];
    /** Color every shadow layer is drawn in. Default the Material `shadow` system color that
     *  `palette()` emits, so compose a palette alongside or pass a color here. */
    shadowColor?: ColorValue;
}

const DEFAULT_LEVELS: BaseElevation[] = [
    "level0",
    "level1",
    "level2",
    "level3",
    "level4",
    "level5",
];

/** Semantic color every elevation layer is drawn in. */
export const ELEVATION_SHADOW_COLOR = "elevationShadow";

/** Opacity token per shadow layer, with the Material defaults in percent. */
export const ELEVATION_OPACITIES = {
    elevationUmbra: 20,
    elevationPenumbra: 14,
    elevationAmbient: 12,
} as const;

type LayerOpacity = keyof typeof ELEVATION_OPACITIES;

const toPx = (value: Pixel): number =>
    typeof value === "number" ? value : Number.parseInt(value, 10);

const toLayer = (box: BoxShadow, opacity: LayerOpacity): ShadowLayer => ({
    x: px(toPx(box.offsetX)),
    y: px(toPx(box.offsetY)),
    blur: px(toPx(box.blurRadius)),
    spread: px(toPx(box.spreadRadius)),
    color: colorMix(
        transparent,
        alias("semanticTokens", "colors", ELEVATION_SHADOW_COLOR),
        alias("tokens", "opacity", opacity),
    ),
});

/** Build an elevation fragment: the layer opacity tokens, the shadow color, and a static
 *  `shadowElevation` utility. Each level is a `StyleMap` setting `boxShadow`; `level0` resets
 *  to `none`. Compose it over a base config: `mergeConfigs(baseConfig, palette(seed),
 *  elevation())`. */
export const elevation = (
    options: ElevationOptions = {},
): Pick<CoreConfig, "tokens" | "semanticTokens" | "utilities"> => {
    const {
        levels = DEFAULT_LEVELS,
        shadowColor = alias("tokens", "colors", "shadow"),
    } = options;
    const shadows = ShadowElevations.create();

    const values: Record<string, StyleMap> = {};
    for (const level of levels) {
        const elev = shadows.get(level);
        const isFlat =
            toPx(elev.umbra.blurRadius) === 0 &&
            toPx(elev.penumbra.blurRadius) === 0 &&
            toPx(elev.ambient.blurRadius) === 0;
        values[level] = isFlat
            ? { boxShadow: none }
            : {
                  boxShadow: shadow(
                      toLayer(elev.umbra, "elevationUmbra"),
                      toLayer(elev.penumbra, "elevationPenumbra"),
                      toLayer(elev.ambient, "elevationAmbient"),
                  ),
              };
    }

    return {
        tokens: {
            opacity: Object.fromEntries(
                Object.entries(ELEVATION_OPACITIES).map(([name, value]) => [
                    name,
                    pct(value),
                ]),
            ),
        },
        semanticTokens: {
            colors: { [ELEVATION_SHADOW_COLOR]: shadowColor },
        },
        utilities: {
            shadowElevation: defineStaticUtility({
                property: "boxShadow",
                values,
            }),
        },
    };
};
