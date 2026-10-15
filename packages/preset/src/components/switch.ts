// The pureform switch: Material's switch.
//
// Markup: a native checkbox laid over the track, with `role="switch"` for screen readers, and
// the handle inside the track. The state layer is a circle that follows the handle. Render an
// icon in the handle if you want one; it shows when the switch is on.
//
//   <span class={root}>
//     <span class={touchTarget} />
//     <input class={input} type="checkbox" role="switch" />
//     <span class={track}>
//       <span class={stateLayer} />
//       <span class={handle}><span class={icon}>✓</span></span>
//     </span>
//   </span>

import { defineSlotComponent } from "@pureform/core";
import {
    absolute,
    center,
    inlineFlex,
    none,
    pct,
    pointer,
    px,
    relative,
    solid,
    transform,
    translate,
    unitless,
    when,
} from "@pureform/core/ast";
import { radius, size as sizeToken } from "@pureform/theme";

import {
    CONTROL_CHECKED,
    CONTROL_DISABLED,
    CONTROL_PRESSED,
    CONTROL_HOVER,
    controlInput,
    controlStateLayer,
    controlTouchTarget,
    CONTROL_FOCUS,
} from "./control";
import {
    componentTokens,
    disabledColor,
    stateTransition,
    sys,
    tweens,
    focusRing,
} from "./shared";

// Named switchControl, not switch: Panda names the generated recipe after the component, and
// `switch` is a reserved word.
const { tokens, ref } = componentTokens("switchControl", {
    trackWidth: px(52),
    trackHeight: px(32),
    outlineWidth: px(2),
    handleSize: px(16),
    handleSizeChecked: px(24),
    handleSizePressed: px(28),
    stateLayerSize: sizeToken("controlMedium"),
    iconSize: px(16),
    // Handle centers along the track: off at the start, on at the end.
    handleOff: px(16),
    handleOn: px(36),
    trackColor: sys("surfaceContainerHighest"),
    outlineColor: sys("outline"),
    handleColor: sys("outline"),
    handleHoverColor: sys("onSurfaceVariant"),
    checkedTrackColor: sys("primary"),
    checkedHandleColor: sys("onPrimary"),
    checkedHandleHoverColor: sys("primaryContainer"),
    iconColor: sys("onPrimaryContainer"),
});

// Where the handle and its state layer sit along the track.
const along = when()
    .on(CONTROL_CHECKED, ref("handleOn"))
    .else(ref("handleOff"));

const centered = transform(translate(pct(-50), pct(-50)));

export const switchControl = defineSlotComponent({
    name: "switchControl",
    $meta: {
        description:
            'Material switch over a native checkbox with role="switch". An icon in the handle shows when it is on.',
    },
    tokens,
    slots: [
        "root",
        "touchTarget",
        "input",
        "track",
        "stateLayer",
        "handle",
        "icon",
    ],
    structure: {
        root: ["touchTarget", "input", "track"],
        track: ["stateLayer", "handle"],
        handle: ["icon"],
    },
    recipe: {
        base: {
            root: {
                ...focusRing(CONTROL_FOCUS),
                borderRadius: radius("full"),
                position: relative,
                display: inlineFlex,
                cursor: pointer,
                width: ref("trackWidth"),
                height: ref("trackHeight"),
            },
            touchTarget: controlTouchTarget,
            // Above the track, so it takes every click.
            input: { ...controlInput, zIndex: unitless(1) },
            track: {
                transition: stateTransition,
                position: relative,
                width: pct(100),
                height: pct(100),
                borderRadius: radius("full"),
                outlineStyle: solid,
                outlineOffset: px(0),
                outlineWidth: ref("outlineWidth"),
                outlineColor: when()
                    .on(CONTROL_CHECKED, sys("primary"))
                    .on(CONTROL_DISABLED, disabledColor("disabledContainer"))
                    .else(ref("outlineColor")),
                // The outline sits inside the track, as a 2px border would.
                backgroundColor: when()
                    .on(CONTROL_CHECKED, ref("checkedTrackColor"))
                    .on(CONTROL_DISABLED, disabledColor("disabledContainer"))
                    .else(ref("trackColor")),
            },
            stateLayer: {
                position: absolute,
                top: pct(50),
                left: along,
                transform: centered,
                width: ref("stateLayerSize"),
                height: ref("stateLayerSize"),
                borderRadius: radius("full"),
                pointerEvents: none,
                backgroundColor: controlStateLayer(
                    sys("onSurface"),
                    sys("primary"),
                ),
                transition: tweens("left", "backgroundColor"),
            },
            handle: {
                position: absolute,
                top: pct(50),
                left: along,
                transform: centered,
                display: inlineFlex,
                alignItems: center,
                justifyContent: center,
                borderRadius: radius("full"),
                pointerEvents: none,
                width: when()
                    .on(CONTROL_CHECKED, ref("handleSizeChecked"))
                    .on(CONTROL_PRESSED, ref("handleSizePressed"))
                    .else(ref("handleSize")),
                height: when()
                    .on(CONTROL_CHECKED, ref("handleSizeChecked"))
                    .on(CONTROL_PRESSED, ref("handleSizePressed"))
                    .else(ref("handleSize")),
                backgroundColor: when()
                    .on(CONTROL_HOVER, ref("handleHoverColor"))
                    .on(CONTROL_CHECKED, ref("checkedHandleColor"))
                    .on(
                        [CONTROL_CHECKED, CONTROL_HOVER],
                        ref("checkedHandleHoverColor"),
                    )
                    .on(CONTROL_DISABLED, disabledColor("disabledContent"))
                    .on([CONTROL_CHECKED, CONTROL_DISABLED], sys("surface"))
                    .else(ref("handleColor")),
                transition: tweens(
                    "left",
                    "width",
                    "height",
                    "backgroundColor",
                ),
            },
            icon: {
                display: inlineFlex,
                fontSize: ref("iconSize"),
                lineHeight: unitless(1),
                color: ref("iconColor"),
                opacity: when()
                    .on(CONTROL_CHECKED, unitless(1))
                    .else(unitless(0)),
            },
        },
    },
});
