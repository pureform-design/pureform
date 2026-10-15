// The parts Material's selection controls share: the checkbox, the radio button, and the switch.
//
// Each control is a root holding a native input, laid invisibly over the whole control so
// clicks, the keyboard, forms, and screen readers all work through it, and the visible parts
// drawn beside it. The visible parts follow the input through slot conditions on the root:
// `checked`, `focusVisibleWithin`, `invalid`, and `disabled` all read the input inside.

import {
    absolute,
    center,
    colorMix,
    inlineFlex,
    pct,
    pointer,
    px,
    relative,
    slot,
    transparent,
    unitless,
    when,
} from "@pureform/core/ast";
import type { ColorValue, StyleMap } from "@pureform/core/ast";
import { opacity } from "@pureform/theme";

import { disabledColor, touchTarget } from "./shared";

/** The selection control slots every control has, in markup order. */
export const CONTROL_SLOTS = ["root", "input", "touchTarget"] as const;

export const CONTROL_HOVER = slot("root", "hover");
export const CONTROL_FOCUS = slot("root", "focusVisibleWithin");
export const CONTROL_PRESSED = slot("root", "pressed");
export const CONTROL_CHECKED = slot("root", "checked");
export const CONTROL_INVALID = slot("root", "invalid");
export const CONTROL_DISABLED = slot("root", "disabled");

const tint = (
    content: ColorValue,
    level: "stateHover" | "stateFocus" | "statePressed",
) => colorMix(transparent, content, opacity(level));

/** A state layer over a transparent surface: the content color at the hover, focus, or
 *  pressed opacity, read from the control's root. Material tints it with the unselected
 *  content color, or the selected one once the control is checked. */
export const controlStateLayer = (
    content: ColorValue,
    checkedContent: ColorValue,
) =>
    when()
        .on(CONTROL_HOVER, tint(content, "stateHover"))
        .on(
            [CONTROL_CHECKED, CONTROL_HOVER],
            tint(checkedContent, "stateHover"),
        )
        .on(CONTROL_FOCUS, tint(content, "stateFocus"))
        .on(
            [CONTROL_CHECKED, CONTROL_FOCUS],
            tint(checkedContent, "stateFocus"),
        )
        .on(CONTROL_PRESSED, tint(content, "statePressed"))
        .on(
            [CONTROL_CHECKED, CONTROL_PRESSED],
            tint(checkedContent, "statePressed"),
        )
        .on(CONTROL_DISABLED, transparent)
        .else(transparent);

/** The control's root: positioned for the input, sized by `size`, and centered. */
export const controlRoot = (
    size: NonNullable<StyleMap["width"]>,
): StyleMap => ({
    position: relative,
    display: inlineFlex,
    alignItems: center,
    justifyContent: center,
    width: size,
    height: size,
});

/** The native input, invisible over the whole control and taking every interaction. */
export const controlInput: StyleMap = {
    position: absolute,
    top: px(0),
    left: px(0),
    width: pct(100),
    height: pct(100),
    opacity: unitless(0),
    cursor: pointer,
};

/** The touch target the controls share with the buttons. */
export const controlTouchTarget = touchTarget;

/** A color that dims with the control when it is disabled. */
export const unlessDisabled = (
    color: ColorValue,
    level: "disabledContainer" | "disabledContent" = "disabledContent",
) => when().on(CONTROL_DISABLED, disabledColor(level)).else(color);
