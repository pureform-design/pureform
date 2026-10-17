// The pureform slider: Material's continuous slider over a native range input.
//
// The native input lies invisibly over the slider, so dragging, the keyboard, forms, and
// screen readers all work through it. The drawn track and handle follow the `value` token,
// a CSS var the app keeps in step with the input as a number from 0 to 100
// (`--components-slider-value: 40`).
//
//   <div class={root} style="--components-slider-value: 40">
//     <span class={track} />
//     <span class={activeTrack} />
//     <span class={stateLayer} />
//     <span class={handle} />
//     <input class={input} type="range" aria-label="Volume" />
//   </div>

import { typed } from "@pureform/core";
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

import { INDICATION_TOKENS } from "../state-layer";
import { controlInput } from "./control";
import {
    DEFAULT_GROUP,
    colorVariant,
    componentTokens,
    defaultGroups,
    disabledColor,
    focusRing,
    INDICATION_ROOT,
    mergeSlots,
    slotStateLayer,
    sys,
    tweens,
    variantsOf,
} from "./shared";
import type { ColorGroup, ColorGroups } from "./shared";

const { tokens, ref } = componentTokens("slider", {
    activeColor: sys("primary"),
    trackColor: sys("secondaryContainer"),
    stateLayerColor: sys("primary"),
    height: sizeToken("touchTarget"),
    trackHeight: px(4),
    handleSize: px(20),
    stateLayerSize: px(40),
    value: unitless(0),
    ...INDICATION_TOKENS,
});

const DISABLED = slot("root", "disabled");
const PRESSED = slot("root", "pressed");

// Movement eases for keyboard steps, but follows the pointer directly while it is down, so a
// drag doesn't trail behind it. Colors ease either way.
const follows = (property: "insetInlineStart" | "width") =>
    when()
        .on(PRESSED, tweens("backgroundColor"))
        .else(tweens(property, "backgroundColor"));

// Centered on the value along the track, and on the track across it.
const atValue = (size: ReturnType<typeof ref>) => ({
    position: absolute,
    top: pct(50),
    insetInlineStart: sub(mul(ref("value"), pct(1)), mul(size, unitless(0.5))),
    transform: transform(translateY(pct(-50))),
    width: size,
    height: size,
    borderRadius: radius("full"),
    pointerEvents: none,
    transition: follows("insetInlineStart"),
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
        backgroundColor: slotStateLayer(ref, "root", {
            base: transparent,
            content: active,
        }),
    },
});

const pf = typed();

/** Build the slider with a `color` variant per group in `groups`. */
export const createSlider = <const G extends string = ColorGroup>(
    groups: ColorGroups<G> = defaultGroups(),
) =>
    variantsOf<{ color: G | typeof DEFAULT_GROUP }>()(
        pf.slotComponent({
            name: "slider",
            $meta: {
                description:
                    "Material slider over a native range input. Keep the value token (0 to 100) in step with the input.",
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
            // A drag holds the press: the state layer shows it pressed.
            indication: [
                {
                    trigger: "input",
                    surface: "stateLayer",
                    centered: true,
                    focus: "handle",
                },
            ],
            variants: { color: groups as ColorGroups },
            recipe: () => ({
                base: mergeSlots(
                    {
                        root: {
                            ...INDICATION_ROOT,
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
                            width: mul(ref("value"), pct(1)),
                            height: ref("trackHeight"),
                            borderRadius: radius("full"),
                            transition: follows("width"),
                        },
                        stateLayer: atValue(ref("stateLayerSize")),
                        handle: {
                            ...atValue(ref("handleSize")),
                            ...focusRing(
                                ref,
                                slot("root", "focusVisibleWithin"),
                            ),
                        },
                        input: controlInput,
                    },
                    colored(ref("activeColor")),
                ),
                variants: {
                    color: colorVariant(groups, (g) => colored(g.main)),
                },
                defaultVariants: { color: DEFAULT_GROUP },
            }),
        }),
    );

export const slider = createSlider();
