// State layers: the Material way of showing interaction on a surface.
//
// Hovering, focusing, or pressing a component tints its container with its own content color
// at a small opacity. Core has no notion of this; it only offers `colorMix` and conditional
// values. `stateLayer()` composes those into a background color.
//
// The opacities, and the focus indicator's thickness, offset, and color, are the component's
// indication tokens. Each defaults to the theme's value, so a theme strengthens or softens every
// component at once, and a component's own tokens (an indication on one component) change only
// that component.
//
// Where the focus indicator sits is a theme-level choice, not a component's: a theme's state
// provider (`materialState(..., { focusRing: "inset" })`) moves the outer offset inside the
// element, and every component's focus part follows through its `focusIndicatorOuterOffset`.

import { colorMix, when } from "@pureform/core/ast";
import type {
    AliasNode,
    ColorValue,
    ConditionalNode,
    ValueNode,
} from "@pureform/core/ast";
import { colorRole, focusIndicator, opacity } from "@pureform/theme";

export type { FocusRing } from "@pureform/material";

/** The indication tokens every interactive component has: the state layer's opacity per state,
 *  and the focus indicator's thickness, outer offset, and color. */
export type IndicationToken =
    | "stateHoverOpacity"
    | "stateFocusOpacity"
    | "statePressedOpacity"
    | "stateDraggedOpacity"
    | "focusIndicatorThickness"
    | "focusIndicatorOuterOffset"
    | "focusIndicatorColor";

/** Each indication token's default: the theme's state opacities and focus indicator lengths,
 *  and the secondary color. A component's tokens default to these, and its root sets them back
 *  to these, so a nested component of the same kind doesn't inherit its parent's. */
export const INDICATION_TOKENS = {
    stateHoverOpacity: opacity("stateHover"),
    stateFocusOpacity: opacity("stateFocus"),
    statePressedOpacity: opacity("statePressed"),
    stateDraggedOpacity: opacity("stateDragged"),
    focusIndicatorThickness: focusIndicator("focusIndicatorThickness"),
    focusIndicatorOuterOffset: focusIndicator("focusIndicatorOuterOffset"),
    focusIndicatorColor: colorRole("secondary"),
} as const satisfies Record<IndicationToken, ValueNode>;

/** Reads a component's indication tokens: its recipe's `token` helper, or its tokens' `ref`. */
export type IndicationRef = (token: IndicationToken) => AliasNode;

/** The theme's values themselves, for a surface outside any component's tokens. */
export const themeIndication: IndicationRef = (token) =>
    INDICATION_TOKENS[token];

export interface StateLayerOptions {
    /** The container color the layer tints. */
    base: ColorValue;
    /** The color drawn over the container, usually the component's content color. */
    content: ColorValue;
}

/** The opacity token each state's tint reads. */
export const STATE_LAYER_OPACITY = {
    hover: "stateHoverOpacity",
    focus: "stateFocusOpacity",
    pressed: "statePressedOpacity",
    dragged: "stateDraggedOpacity",
} as const satisfies Record<string, IndicationToken>;

/** A background color that tints `base` with `content` on hover, keyboard focus, press, and
 *  drag, at the opacities `token` reads (the component's indication tokens). Panda writes the
 *  later rules after the earlier ones, so a pressed component shows the press tint while the
 *  pointer is over it, and a dragged one shows the drag tint. Drag code marks the element with
 *  `data-pf-dragging`. */
export const stateLayer = (
    token: IndicationRef,
    { base, content }: StateLayerOptions,
): ConditionalNode => {
    const tint = (state: keyof typeof STATE_LAYER_OPACITY) =>
        colorMix(base, content, token(STATE_LAYER_OPACITY[state]));
    return when()
        .on("hover", tint("hover"))
        .on("focusVisible", tint("focus"))
        .on("pressed", tint("pressed"))
        .on("dragged", tint("dragged"))
        .else(base);
};
