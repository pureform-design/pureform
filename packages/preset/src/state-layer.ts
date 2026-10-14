// State layers: the Material way of showing interaction on a surface.
//
// Hovering, focusing, or pressing a component tints its container with its own content color
// at a small opacity. Core has no notion of this; it only offers `colorMix` and conditional
// values. `stateLayer()` composes those into a background color, and `stateLayerTokens()`
// supplies the opacities as tokens so a theme can strengthen or soften every state at once.

import { alias, colorMix, pct, when } from "@pureform/core/ast";
import type { ColorValue, ConditionalNode } from "@pureform/core/ast";
import type { CoreConfig } from "@pureform/core/types";

/** Opacity token per interaction state, with Material's defaults in percent. */
export const STATE_LAYER_OPACITIES = {
    stateHover: 8,
    stateFocus: 10,
    statePressed: 10,
    stateDragged: 16,
} as const;

export interface StateLayerOptions {
    /** The container color the layer tints. */
    base: ColorValue;
    /** The color drawn over the container, usually the component's content color. */
    content: ColorValue;
}

const tint = (
    base: ColorValue,
    content: ColorValue,
    opacity: keyof typeof STATE_LAYER_OPACITIES,
) => colorMix(base, content, alias("tokens", "opacity", opacity));

/** A background color that tints `base` with `content` on hover, keyboard focus, press, and
 *  drag. Each state reads its opacity from the `stateLayerTokens()` fragment. Panda writes the
 *  later rules after the earlier ones, so a pressed component shows the press tint while the
 *  pointer is over it, and a dragged one shows the drag tint. Drag code marks the element with
 *  `data-dragging`. */
export const stateLayer = ({
    base,
    content,
}: StateLayerOptions): ConditionalNode =>
    when()
        .on("hover", tint(base, content, "stateHover"))
        .on("focusVisible", tint(base, content, "stateFocus"))
        .on("pressed", tint(base, content, "statePressed"))
        .on("dragged", tint(base, content, "stateDragged"))
        .else(base);

/** The opacity tokens `stateLayer()` reads. Compose it into any config that uses state
 *  layers. */
export const stateLayerTokens = (): Pick<CoreConfig, "tokens"> => ({
    tokens: {
        opacity: Object.fromEntries(
            Object.entries(STATE_LAYER_OPACITIES).map(([name, value]) => [
                name,
                pct(value),
            ]),
        ),
    },
});
