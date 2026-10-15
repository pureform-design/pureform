// The pureform radio button: Material's radio button.
//
// Markup: a native radio laid over the control, and the ring holding the dot. Group radios
// with a shared `name`, as usual; errors take `aria-invalid="true"`.
//
//   <span class={root}>
//     <span class={touchTarget} />
//     <input class={input} type="radio" name="size" />
//     <span class={ring}><span class={dot} /></span>
//   </span>

import { defineSlotComponent } from "@pureform/core";
import {
    absolute,
    center,
    inlineFlex,
    none,
    pointer,
    px,
    scale,
    solid,
    transform,
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
import {
    componentTokens,
    disabledColor,
    stateTransition,
    sys,
    tweens,
} from "./shared";

const { tokens, ref } = componentTokens("radio", {
    size: sizeToken("controlMedium"),
    ringSize: px(20),
    dotSize: px(10),
    borderWidth: px(2),
    borderColor: sys("onSurfaceVariant"),
    checkedColor: sys("primary"),
    errorColor: sys("negative"),
});

// The ring and the dot share one color.
const color = (rest: ReturnType<typeof ref>) =>
    when()
        .on(CONTROL_CHECKED, ref("checkedColor"))
        .on(CONTROL_INVALID, ref("errorColor"))
        .on(CONTROL_DISABLED, disabledColor("disabledContent"))
        .else(rest);

export const radio = defineSlotComponent({
    name: "radio",
    $meta: {
        description:
            "Material radio button over a native input. Group radios with a shared name.",
    },
    tokens,
    slots: ["root", "touchTarget", "input", "ring", "dot"],
    structure: {
        root: ["touchTarget", "input", "ring"],
        ring: ["dot"],
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
            ring: {
                transition: stateTransition,
                position: absolute,
                display: inlineFlex,
                alignItems: center,
                justifyContent: center,
                width: ref("ringSize"),
                height: ref("ringSize"),
                borderRadius: radius("full"),
                borderStyle: solid,
                borderWidth: ref("borderWidth"),
                borderColor: color(ref("borderColor")),
                pointerEvents: none,
            },
            dot: {
                width: ref("dotSize"),
                height: ref("dotSize"),
                borderRadius: radius("full"),
                backgroundColor: color(ref("checkedColor")),
                transform: when()
                    .on(CONTROL_CHECKED, transform(scale(unitless(1))))
                    .else(transform(scale(unitless(0)))),
                transition: tweens("transform", "backgroundColor"),
            },
        },
    },
});
