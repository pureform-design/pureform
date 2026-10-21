// The pureform time picker: Material's time picker, in a dialog or on its own, with a clock dial
// or, in M3 Expressive's scroll mode, two scrolling fields.
//
// Markup: the surface holding the headline, the time (the hour and minute selectors around a
// separator, and the period selector in a 12-hour cycle), the dial, and the actions. In `dial`
// mode the selectors are toggle buttons choosing what the dial sets, and the dial is a slider:
// its labels sit on a ring, the handle over the selected one, the track from the centre to it.
// In `scroll` mode the selectors are spin buttons showing the values around the current one,
// and there's no dial.
//
//   <div class={root} role="group" aria-labelledby="headline">
//     <div class={headline} id="headline">Select time</div>
//     <div class={body}>
//       <button class={hourSelector} aria-pressed="true">9</button>
//       <span class={separator}>:</span>
//       <button class={minuteSelector} aria-pressed="false">30</button>
//       <div class={periodSelector} role="group">
//         <button class={period} aria-pressed="true">AM</button>
//         <button class={period} aria-pressed="false">PM</button>
//       </div>
//     </div>
//     <div class={dial} role="slider" aria-valuetext="9 hours">
//       <span class={dialTrack} /><span class={dialHandle} /><span class={dialCenter} />
//       <span class={dialLabel} aria-selected="true">9</span> …
//     </div>
//     <div class={actions}>…</div>
//   </div>
//
// The dial is geometry: it, its handle and its centre are circles whatever the shape theme, and
// its labels keep their places under `rtl`, since a clock doesn't mirror. The bindings place the
// labels, handle and track from the time (the machine's `dialLabels` and `dialHand`).

import { typed } from "@pureform/core";
import {
    absolute,
    auto,
    center,
    column,
    flex,
    hidden,
    mul,
    none,
    pointer,
    px,
    relative,
    transform,
    translate,
    transparent,
    tween,
    unitless,
} from "@pureform/core/ast";
import { duration, easing, spacing, textStyle } from "@pureform/theme";

import { cornerKeyword } from "../corners";
import { stateLayer } from "../state-layer";
import {
    circle,
    componentTokens,
    focusRing,
    motionTransition,
    pressableRoot,
    sys,
} from "./shared";
import { timeSlots, timeTokens } from "./time";

const { tokens, ref } = componentTokens("timePicker", {
    ...timeTokens(),
    // Material's 96 × 80 hour and minute selectors.
    fieldHeight: px(80),
    dialContainer: sys("surfaceContainerHighest"),
    dialContent: sys("onSurface"),
    dialSelectedContent: sys("onPrimary"),
    dialHandleColor: sys("primary"),
    dialSize: px(256),
    handleSize: px(48),
    trackWidth: px(2),
    centerSize: px(8),
    // How the hand turns to a new value.
    handDuration: duration("medium2"),
    handEasing: easing("emphasized"),
    // A scroll field's value and the one on each side of it.
    scrollItemHeight: px(56),
    scrollGap: spacing("1"),
});

const pf = typed();

// The selectors: the hour and minute, toggle buttons in dial mode.
const selector = {
    ...pressableRoot(ref),
    width: ref("fieldWidth"),
    height: ref("fieldHeight"),
    borderRadius: ref("fieldRadius"),
    textStyle: textStyle("displayLarge"),
    backgroundColor: stateLayer(ref, {
        base: ref("fieldContainer"),
        content: ref("fieldContent"),
    }),
    color: ref("fieldContent"),
    states: {
        ...pressableRoot(ref).states,
        selected: {
            backgroundColor: stateLayer(ref, {
                base: ref("fieldSelectedContainer"),
                content: ref("fieldSelectedContent"),
            }),
            color: ref("fieldSelectedContent"),
        },
    },
};

// In scroll mode a selector is a column of values: the one before, the current one, the one after.
const scrollSelector = {
    flexDirection: column,
    gap: ref("scrollGap"),
    height: mul(ref("scrollItemHeight"), unitless(3)),
    overflow: hidden,
    backgroundColor: stateLayer(ref, {
        base: transparent,
        content: ref("fieldContent"),
    }),
};

// A label, handle or centre dot, placed by its centre: the bindings set `left` and `top`.
const centered = (size: ReturnType<typeof ref>) => ({
    position: absolute,
    width: size,
    height: size,
    transform: transform(
        translate(mul(size, unitless(-0.5)), mul(size, unitless(-0.5))),
    ),
});

export const timePicker = pf.slotComponent({
    name: "timePicker",
    $meta: {
        description:
            "Material time picker: the headline, the hour and minute selectors and the period selector, a clock dial (mode dial) or two scrolling fields (mode scroll), and actions. color vibrant takes M3 Expressive's vibrant colors. The dial stays round and unmirrored.",
    },
    tokens,
    slots: [
        "root",
        "headline",
        "body",
        "hourSelector",
        "separator",
        "minuteSelector",
        "scrollItem",
        "periodSelector",
        "period",
        "dial",
        "dialTrack",
        "dialHandle",
        "dialCenter",
        "dialLabel",
        "actions",
    ],
    structure: {
        root: ["headline", "body", "dial", "actions"],
        body: ["hourSelector", "separator", "minuteSelector", "periodSelector"],
        hourSelector: ["scrollItem"],
        periodSelector: ["period"],
        dial: ["dialTrack", "dialHandle", "dialCenter", "dialLabel"],
    },
    indication: [
        {
            trigger: "hourSelector",
            surface: "hourSelector",
            centered: false,
            focus: "hourSelector",
        },
        {
            trigger: "minuteSelector",
            surface: "minuteSelector",
            centered: false,
            focus: "minuteSelector",
        },
        {
            trigger: "period",
            surface: "period",
            centered: false,
            focus: "period",
        },
    ],
    variants: {
        mode: ["dial", "scroll"],
        color: ["standard", "vibrant"],
    },
    recipe: () => {
        const shared = timeSlots(ref, ref("fieldHeight"));
        return {
            base: {
                ...shared,
                hourSelector: selector,
                minuteSelector: selector,
                scrollItem: {
                    display: flex,
                    width: ref("fieldWidth"),
                    alignItems: center,
                    justifyContent: center,
                    flexShrink: unitless(0),
                    height: ref("scrollItemHeight"),
                    borderRadius: ref("fieldRadius"),
                    textStyle: textStyle("displayMedium"),
                    color: ref("periodContent"),
                    cursor: pointer,
                    states: {
                        selected: {
                            backgroundColor: ref("fieldSelectedContainer"),
                            color: ref("fieldSelectedContent"),
                        },
                    },
                },
                dial: {
                    ...focusRing(ref),
                    position: relative,
                    flexShrink: unitless(0),
                    width: ref("dialSize"),
                    height: ref("dialSize"),
                    marginInlineStart: auto,
                    marginInlineEnd: auto,
                    borderRadius: circle,
                    cornerShape: cornerKeyword("round"),
                    backgroundColor: ref("dialContainer"),
                    color: ref("dialContent"),
                    cursor: pointer,
                },
                // From the centre to the handle: the bindings set its length, and turn it.
                dialTrack: {
                    position: absolute,
                    width: ref("trackWidth"),
                    backgroundColor: ref("dialHandleColor"),
                    pointerEvents: none,
                    transition: motionTransition(
                        tween(
                            "transform",
                            ref("handDuration"),
                            ref("handEasing"),
                        ),
                    ),
                },
                dialHandle: {
                    ...centered(ref("handleSize")),
                    borderRadius: circle,
                    cornerShape: cornerKeyword("round"),
                    backgroundColor: ref("dialHandleColor"),
                    pointerEvents: none,
                },
                dialCenter: {
                    ...centered(ref("centerSize")),
                    borderRadius: circle,
                    cornerShape: cornerKeyword("round"),
                    backgroundColor: ref("dialHandleColor"),
                    pointerEvents: none,
                },
                dialLabel: {
                    ...centered(ref("handleSize")),
                    display: flex,
                    alignItems: center,
                    justifyContent: center,
                    textStyle: textStyle("bodyLarge"),
                    color: ref("dialContent"),
                    pointerEvents: none,
                    states: {
                        selected: { color: ref("dialSelectedContent") },
                    },
                },
            },
            variants: {
                mode: {
                    dial: {},
                    scroll: {
                        hourSelector: scrollSelector,
                        minuteSelector: scrollSelector,
                        dial: { display: none },
                    },
                },
                // M3 Expressive's vibrant colors: the surface in the primary container.
                color: {
                    standard: {},
                    vibrant: {
                        root: {
                            tokens: {
                                container: sys("primaryContainer"),
                                headlineColor: sys("onPrimaryContainer"),
                                separatorColor: sys("onPrimaryContainer"),
                                fieldContainer: sys("surfaceContainerLowest"),
                                fieldSelectedContainer: sys("primary"),
                                fieldSelectedContent: sys("onPrimary"),
                                periodContent: sys("onPrimaryContainer"),
                                periodOutlineColor: sys("onPrimaryContainer"),
                                dialContainer: sys("surfaceContainerLowest"),
                            },
                        },
                    },
                },
            },
            defaultVariants: { mode: "dial", color: "standard" },
        };
    },
});
