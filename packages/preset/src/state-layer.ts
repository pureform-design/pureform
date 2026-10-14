// State layers: the Material way of showing interaction on a surface.
//
// Hovering, focusing, or pressing a component tints its container with its own content color
// at a small opacity. Core has no notion of this; it only offers `colorMix` and conditional
// values. `stateLayer()` composes those into a background color. The opacities come from the
// theme's state contract, so a theme can strengthen or soften every state at once.

import { colorMix, when } from "@pureform/core/ast";
import type { ColorValue, ConditionalNode } from "@pureform/core/ast";
import { opacity } from "@pureform/theme";
import type { StateRole } from "@pureform/theme";

export interface StateLayerOptions {
    /** The container color the layer tints. */
    base: ColorValue;
    /** The color drawn over the container, usually the component's content color. */
    content: ColorValue;
}

const tint = (base: ColorValue, content: ColorValue, role: StateRole) =>
    colorMix(base, content, opacity(role));

/** A background color that tints `base` with `content` on hover, keyboard focus, press, and
 *  drag. Each state reads its opacity from the theme's state contract. Panda writes the
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
