// Generate a `@pureform/core` elevation fragment from the Material shadow model.
//
// Material elevation is several layered shadows (umbra, penumbra, ambient), not one. Each level
// becomes a composite `shadow(...)` of those layers with no tint, lowered the way a theme
// lowers the elevation contract: a shadow token per level and a `shadowElevation` utility, so
// a recipe applies `{ shadowElevation: "level1" }`. The geometry of each level is fixed by the
// Material model, but the shadow color and the per-layer opacities are tokens, so a theme can
// retint or soften every level without regenerating anything.

import {
    alias,
    colorMix,
    none,
    pct,
    px,
    shadow,
    transparent,
} from "@pureform/core/ast";
import type { ColorValue, ShadowLayer } from "@pureform/core/ast";
import type { CoreConfig } from "@pureform/core/types";
import { ELEVATION_LEVELS, elevationFragment } from "@pureform/theme";
import type { ElevationContract } from "@pureform/theme";

import { ShadowElevations } from "../elevation";
import type { BoxShadow } from "../elevation";
import type { Pixel } from "../types";

export interface ElevationOptions {
    /** Color every shadow layer is drawn in. Default the Material `shadow` system color that
     *  `palette()` emits, so compose a palette alongside or pass a color here. */
    shadowColor?: ColorValue;
}

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

/** Material's shadow model as an elevation contract: each level's layered shadow with no
 *  tint, plus the shadow color and layer opacity tokens the shadows read. */
export const elevationContract = (
    options: ElevationOptions = {},
): ElevationContract & {
    extra: Required<Pick<CoreConfig, "tokens" | "semanticTokens">>;
} => {
    const { shadowColor = alias("semanticTokens", "colors", "shadow") } =
        options;
    const shadows = ShadowElevations.create();

    const levels = {} as ElevationContract["levels"];
    for (const level of ELEVATION_LEVELS) {
        const elev = shadows.get(level);
        const isFlat =
            toPx(elev.umbra.blurRadius) === 0 &&
            toPx(elev.penumbra.blurRadius) === 0 &&
            toPx(elev.ambient.blurRadius) === 0;
        levels[level] = {
            shadow: isFlat
                ? none
                : shadow(
                      toLayer(elev.umbra, "elevationUmbra"),
                      toLayer(elev.penumbra, "elevationPenumbra"),
                      toLayer(elev.ambient, "elevationAmbient"),
                  ),
            tint: transparent,
        };
    }

    return {
        levels,
        extra: {
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
        },
    };
};

/** Build an elevation fragment: the layer opacity tokens, the shadow color, a shadow and a
 *  tint token per level, and the `shadowElevation` utility that reads them. Compose it over a
 *  base config: `mergeConfigs(baseConfig, palette(seed), elevation())`. */
export const elevation = (
    options: ElevationOptions = {},
): Pick<CoreConfig, "tokens" | "semanticTokens" | "utilities"> => {
    const { levels, extra } = elevationContract(options);
    const fragment = elevationFragment({ levels });
    return {
        tokens: extra.tokens,
        semanticTokens: {
            ...fragment.semanticTokens,
            colors: {
                ...fragment.semanticTokens.colors,
                ...extra.semanticTokens.colors,
            },
        },
        utilities: fragment.utilities,
    };
};
