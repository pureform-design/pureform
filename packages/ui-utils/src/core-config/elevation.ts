// Generate a `@pureform/core` elevation utility from the Material shadow model.
//
// Material elevation is several layered shadows (umbra, penumbra, ambient), not one. This
// emits a static `shadowElevation` utility whose named steps each carry a composite
// `shadow(...)` of those layers, so a recipe applies `{ shadowElevation: "level1" }` and the
// adapter lowers it per target. It stays a plain fragment, generated the same way a
// hand-authored one would be.

import { defineStaticUtility } from "@pureform/core";
import { alpha, hex, none, px, shadow } from "@pureform/core/ast";
import type { ShadowLayer, StyleMap } from "@pureform/core/ast";
import type { CoreConfig } from "@pureform/core/types";

import { ShadowElevations } from "../elevation";
import type { BaseElevation, BoxShadow } from "../elevation";
import type { Pixel } from "../types";

export interface ElevationOptions {
    /** Named levels to emit, in order. Default `level0` through `level5`. */
    levels?: BaseElevation[];
}

const DEFAULT_LEVELS: BaseElevation[] = [
    "level0",
    "level1",
    "level2",
    "level3",
    "level4",
    "level5",
];

// Material shadow opacities per layer (black over the surface).
const UMBRA_ALPHA = 0.2;
const PENUMBRA_ALPHA = 0.14;
const AMBIENT_ALPHA = 0.12;

const toPx = (value: Pixel): number =>
    typeof value === "number" ? value : Number.parseInt(value, 10);

const toLayer = (box: BoxShadow, layerAlpha: number): ShadowLayer => ({
    x: px(toPx(box.offsetX)),
    y: px(toPx(box.offsetY)),
    blur: px(toPx(box.blurRadius)),
    spread: px(toPx(box.spreadRadius)),
    color: alpha(hex("#000000"), layerAlpha),
});

/** Build a `utilities` fragment with a static `shadowElevation` utility. Each level is a
 *  `StyleMap` setting `boxShadow`; `level0` resets to `none`. Compose it over a base config:
 *  `mergeConfigs(baseConfig, elevation())`. */
export const elevation = (
    options: ElevationOptions = {},
): Pick<CoreConfig, "utilities"> => {
    const { levels = DEFAULT_LEVELS } = options;
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
                      toLayer(elev.umbra, UMBRA_ALPHA),
                      toLayer(elev.penumbra, PENUMBRA_ALPHA),
                      toLayer(elev.ambient, AMBIENT_ALPHA),
                  ),
              };
    }

    return {
        utilities: {
            shadowElevation: defineStaticUtility({
                property: "boxShadow",
                values,
            }),
        },
    };
};
