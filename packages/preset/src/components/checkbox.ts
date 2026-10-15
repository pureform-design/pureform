// The pureform checkbox: Material's checkbox, checked, unchecked, or indeterminate.
//
// Markup: a native checkbox laid over the control, and the box holding both marks. Render your
// own check and dash icons (an svg or a glyph); each shows only in its state. Set the
// indeterminate state through the input's `indeterminate` property, and errors with
// `aria-invalid="true"`.
//
//   <span class={root}>
//     <span class={touchTarget} />
//     <input class={input} type="checkbox" />
//     <span class={box}>
//       <span class={checkIcon}>✓</span>
//       <span class={indeterminateIcon}>–</span>
//     </span>
//   </span>

import { defineSlotComponent } from "@pureform/core";
import {
    absolute,
    center,
    inlineFlex,
    none,
    pointer,
    px,
    slot,
    solid,
    transparent,
    unitless,
    when,
} from "@pureform/core/ast";
import { radius, size as sizeToken } from "@pureform/theme";

import {
    CONTROL_CHECKED,
    CONTROL_DISABLED,
    CONTROL_INVALID,
    controlInput,
    controlRoot,
    controlStateLayer,
    controlTouchTarget,
} from "./control";
import { componentTokens, disabledColor, stateTransition, sys } from "./shared";

const { tokens, ref } = componentTokens("checkbox", {
    size: sizeToken("controlMedium"),
    boxSize: px(18),
    boxRadius: px(2),
    borderWidth: px(2),
    iconSize: px(14),
    borderColor: sys("onSurfaceVariant"),
    checkedColor: sys("primary"),
    iconColor: sys("onPrimary"),
    errorColor: sys("negative"),
    errorIconColor: sys("onNegative"),
    disabledIconColor: sys("surface"),
});

const INDETERMINATE = slot("root", "indeterminate");
// Either mark fills the box.
const MARKED = [CONTROL_CHECKED, INDETERMINATE] as const;

const fill = when()
    .on(MARKED[0], ref("checkedColor"))
    .on(MARKED[1], ref("checkedColor"))
    .on([CONTROL_INVALID, MARKED[0]], ref("errorColor"))
    .on([CONTROL_INVALID, MARKED[1]], ref("errorColor"))
    .on([CONTROL_DISABLED, MARKED[0]], disabledColor("disabledContent"))
    .on([CONTROL_DISABLED, MARKED[1]], disabledColor("disabledContent"))
    .else(transparent);

const iconColor = when()
    .on(CONTROL_INVALID, ref("errorIconColor"))
    .on(CONTROL_DISABLED, ref("disabledIconColor"))
    .else(ref("iconColor"));

const icon = {
    position: absolute,
    display: inlineFlex,
    alignItems: center,
    justifyContent: center,
    width: ref("iconSize"),
    height: ref("iconSize"),
    fontSize: ref("iconSize"),
    lineHeight: unitless(1),
    color: iconColor,
    pointerEvents: none,
} as const;

export const checkbox = defineSlotComponent({
    name: "checkbox",
    $meta: {
        description:
            "Material checkbox over a native input. Render a check icon and an indeterminate icon; each shows in its state.",
    },
    tokens,
    slots: [
        "root",
        "touchTarget",
        "input",
        "box",
        "checkIcon",
        "indeterminateIcon",
    ],
    structure: {
        root: ["touchTarget", "input", "box"],
        box: ["checkIcon", "indeterminateIcon"],
    },
    recipe: {
        base: {
            root: {
                ...controlRoot(ref("size")),
                transition: stateTransition,
                borderRadius: radius("full"),
                cursor: pointer,
                backgroundColor: controlStateLayer(
                    sys("onSurface"),
                    ref("checkedColor"),
                ),
            },
            touchTarget: controlTouchTarget,
            input: controlInput,
            box: {
                transition: stateTransition,
                position: absolute,
                display: inlineFlex,
                alignItems: center,
                justifyContent: center,
                width: ref("boxSize"),
                height: ref("boxSize"),
                borderRadius: ref("boxRadius"),
                borderStyle: solid,
                borderWidth: ref("borderWidth"),
                pointerEvents: none,
                backgroundColor: fill,
                // A marked box is all fill; an unmarked one is all border.
                borderColor: when()
                    .on(CONTROL_INVALID, ref("errorColor"))
                    .on(CONTROL_DISABLED, disabledColor("disabledContent"))
                    .on(MARKED[0], transparent)
                    .on(MARKED[1], transparent)
                    .else(ref("borderColor")),
            },
            checkIcon: {
                ...icon,
                opacity: when()
                    .on(CONTROL_CHECKED, unitless(1))
                    .on(INDETERMINATE, unitless(0))
                    .else(unitless(0)),
            },
            indeterminateIcon: {
                ...icon,
                opacity: when()
                    .on(INDETERMINATE, unitless(1))
                    .else(unitless(0)),
            },
        },
    },
});
