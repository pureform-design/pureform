// The pureform slider: Material's continuous slider over a native range input. By default it's
// M3 Expressive's slider (`handleShape: "bar"`): a thick track split by a narrow bar handle, at
// sizes `xsmall` to `xlarge`. `handleShape: "round"` keeps the earlier round handle on a thin
// track with a state layer.
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
    add,
    max,
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
    entriesOf,
    focusRing,
    keysOf,
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
    // M3 Expressive's bar handle, with gaps cut into the tracks either side of it.
    barTrackHeight: px(16),
    barHandleWidth: px(4),
    barHandlePressedWidth: px(2),
    barHandleHeight: px(44),
    barRadius: radius("small"),
    // Half the theme's extra-small corner (2px in Material), so a shape theme rounds it too.
    barInnerRadius: mul(radius("extraSmall"), unitless(0.5)),
    handleGap: px(6),
    value: unitless(0),
    ...INDICATION_TOKENS,
});

const DISABLED = slot("root", "disabled");
const PRESSED = slot("root", "pressed");

// Movement eases for keyboard steps, but follows the pointer directly while it is down, so a
// drag doesn't trail behind it. Colors ease either way.
const follows = (property: "insetInlineStart" | "insetInlineEnd") =>
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

/** One of M3 Expressive's slider sizes: the track's thickness, the bar handle's height, and the
 *  track's outer corner radius. */
export const SLIDER_SIZES = {
    xsmall: { track: px(16), handle: px(44), radius: radius("small") },
    small: { track: px(24), handle: px(44), radius: radius("small") },
    medium: { track: px(40), handle: px(52), radius: radius("medium") },
    large: { track: px(56), handle: px(68), radius: radius("large") },
    xlarge: { track: px(96), handle: px(108), radius: radius("extraLarge") },
} as const;

const VALUE = mul(ref("value"), pct(1));
// From the value to either edge of the gap around the bar handle.
const CLEARANCE = add(
    mul(ref("barHandleWidth"), unitless(0.5)),
    ref("handleGap"),
);

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
                    "Material slider over a native range input. Keep the value token (0 to 100) in step with the input. handleShape bar (M3 Expressive, at sizes xsmall to xlarge) or round (the earlier slider).",
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
            variants: {
                color: groups as ColorGroups,
                handleShape: ["bar", "round"],
                size: keysOf(SLIDER_SIZES),
            },
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
                            // Its end inset rather than a width, so the bar slider's gap can
                            // take from it without a width going below zero.
                            insetInlineStart: px(0),
                            insetInlineEnd: sub(pct(100), VALUE),
                            height: ref("trackHeight"),
                            borderRadius: radius("full"),
                            transition: follows("insetInlineEnd"),
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
                    // `bar` is M3 Expressive's slider: a thick track, split by a narrow bar
                    // handle that narrows further while pressed, and no state layer. `round` is
                    // the earlier slider, with a round handle on a thin track.
                    handleShape: {
                        bar: {
                            root: {
                                height: max(
                                    ref("height"),
                                    ref("barHandleHeight"),
                                ),
                            },
                            track: {
                                insetInlineStart: add(VALUE, CLEARANCE),
                                height: ref("barTrackHeight"),
                                borderStartStartRadius: ref("barInnerRadius"),
                                borderEndStartRadius: ref("barInnerRadius"),
                                borderStartEndRadius: ref("barRadius"),
                                borderEndEndRadius: ref("barRadius"),
                                transition: follows("insetInlineStart"),
                            },
                            activeTrack: {
                                insetInlineEnd: add(
                                    sub(pct(100), VALUE),
                                    CLEARANCE,
                                ),
                                height: ref("barTrackHeight"),
                                borderStartStartRadius: ref("barRadius"),
                                borderEndStartRadius: ref("barRadius"),
                                borderStartEndRadius: ref("barInnerRadius"),
                                borderEndEndRadius: ref("barInnerRadius"),
                            },
                            stateLayer: { display: none },
                            handle: {
                                insetInlineStart: sub(
                                    VALUE,
                                    mul(ref("barHandleWidth"), unitless(0.5)),
                                ),
                                width: when()
                                    .on(PRESSED, ref("barHandlePressedWidth"))
                                    .else(ref("barHandleWidth")),
                                height: ref("barHandleHeight"),
                                borderRadius: ref("barInnerRadius"),
                                // It narrows smoothly on a press, and follows the pointer
                                // directly while it's down, as the tracks do.
                                transition: when()
                                    .on(
                                        PRESSED,
                                        tweens("width", "backgroundColor"),
                                    )
                                    .else(
                                        tweens(
                                            "insetInlineStart",
                                            "width",
                                            "backgroundColor",
                                        ),
                                    ),
                            },
                        },
                        round: {},
                    },
                    // The bar handle's sizes; the round handle has one.
                    size: Object.fromEntries(
                        entriesOf(SLIDER_SIZES).map(([name, s]) => [
                            name,
                            {
                                root: {
                                    tokens: {
                                        barTrackHeight: s.track,
                                        barHandleHeight: s.handle,
                                        barRadius: s.radius,
                                    },
                                },
                            },
                        ]),
                    ),
                },
                defaultVariants: {
                    color: DEFAULT_GROUP,
                    handleShape: "bar",
                    size: "xsmall",
                },
            }),
        }),
    );

export const slider = createSlider();
