// The pureform slider: Material's continuous slider over a native range input.
//
// The native input lies invisibly over the slider, so dragging, the keyboard, forms, and
// screen readers all work through it. The drawn track and handle follow the `value` token,
// a CSS var the app keeps in step with the input as a percentage
// (`--components-slider-value: 40%`).
//
//   <div class={root} style="--components-slider-value: 40%">
//     <span class={track} />
//     <span class={activeTrack} />
//     <span class={stateLayer} />
//     <span class={handle} />
//     <input class={input} type="range" aria-label="Volume" />
//   </div>

import { defineSlotComponent } from "@pureform/core";
import {
    absolute,
    center,
    flex,
    mul,
    none,
    pct,
    px,
    relative,
    slot,
    sub,
    transform,
    translateY,
    transparent,
    unitless,
    when,
} from "@pureform/core/ast";
import type { ColorValue } from "@pureform/core/ast";
import { radius, size as sizeToken } from "@pureform/theme";

import { controlInput } from "./control";
import {
    COLOR_GROUPS,
    DEFAULT_GROUP,
    colorVariant,
    componentTokens,
    disabledColor,
    focusRing,
    mergeSlots,
    slotStateLayer,
    sys,
    tweens,
} from "./shared";
import type { ColorGroups } from "./shared";

const { tokens, ref } = componentTokens("slider", {
    activeColor: sys("primary"),
    trackColor: sys("secondaryContainer"),
    stateLayerColor: sys("primary"),
    height: sizeToken("touchTarget"),
    trackHeight: px(4),
    handleSize: px(20),
    stateLayerSize: px(40),
    value: pct(0),
});

const DISABLED = slot("root", "disabled");

// Centered on the value along the track, and on the track across it.
const atValue = (size: ReturnType<typeof ref>) => ({
    position: absolute,
    top: pct(50),
    insetInlineStart: sub(ref("value"), mul(size, unitless(0.5))),
    transform: transform(translateY(pct(-50))),
    width: size,
    height: size,
    borderRadius: radius("full"),
    pointerEvents: none,
    transition: tweens("insetInlineStart", "backgroundColor"),
});

const unlessDisabled = (
    color: ColorValue,
    level: "disabledContent" | "disabledContainer",
) => ({
    backgroundColor: when().on(DISABLED, disabledColor(level)).else(color),
});

// Every property that depends on the color group.
const colored = (active: ColorValue) => ({
    activeTrack: unlessDisabled(active, "disabledContent"),
    handle: unlessDisabled(active, "disabledContent"),
    stateLayer: {
        backgroundColor: slotStateLayer("root", {
            base: transparent,
            content: active,
        }),
    },
});

/** Build the slider with a `color` variant per group in `groups`. */
export const createSlider = (groups: ColorGroups = COLOR_GROUPS) =>
    defineSlotComponent({
        name: "slider",
        $meta: {
            description:
                "Material slider over a native range input. Keep the value token in step with the input as a percentage.",
        },
        tokens,
        slots: [
            "root",
            "track",
            "activeTrack",
            "stateLayer",
            "handle",
            "input",
        ],
        structure: {
            root: ["track", "activeTrack", "stateLayer", "handle", "input"],
        },
        recipe: {
            base: mergeSlots(
                {
                    root: {
                        position: relative,
                        display: flex,
                        alignItems: center,
                        width: pct(100),
                        height: ref("height"),
                    },
                    track: {
                        position: absolute,
                        insetInlineStart: px(0),
                        insetInlineEnd: px(0),
                        height: ref("trackHeight"),
                        borderRadius: radius("full"),
                        ...unlessDisabled(
                            ref("trackColor"),
                            "disabledContainer",
                        ),
                    },
                    activeTrack: {
                        position: absolute,
                        insetInlineStart: px(0),
                        width: ref("value"),
                        height: ref("trackHeight"),
                        borderRadius: radius("full"),
                        transition: tweens("width", "backgroundColor"),
                    },
                    stateLayer: atValue(ref("stateLayerSize")),
                    handle: {
                        ...atValue(ref("handleSize")),
                        ...focusRing(slot("root", "focusVisibleWithin")),
                    },
                    input: controlInput,
                },
                colored(ref("activeColor")),
            ),
            variants: {
                color: colorVariant(groups, (g) => colored(g.main)),
            },
            defaultVariants: { color: DEFAULT_GROUP },
        },
    });

export const slider = createSlider();
