// The pureform progress indicators: Material's linear and circular progress.
//
// Both read their value from the `value` token, a CSS var the app sets as a number from 0 to
// 100 (`--components-linearProgress-value: 40`), alongside `aria-valuenow` on the element
// with `role="progressbar"`. Turn on `indeterminate` when the amount is unknown: the linear
// indicator then slides along its track, and the circular one spins.
//
//   <div class={root} role="progressbar" aria-valuenow="40" style="--components-linearProgress-value: 40">
//     <div class={indicator} />
//   </div>
//
//   <div class={root} role="progressbar" aria-valuenow="40" style="--components-circularProgress-value: 40">
//     <span class={endHalf}><span class={endArc} /></span>
//     <span class={startHalf}><span class={startArc} /></span>
//   </div>

import { typed } from "@pureform/core";
import {
    absolute,
    add,
    animation,
    clamp,
    hidden,
    max,
    min,
    mul,
    none,
    numeric,
    pct,
    px,
    relative,
    rotate,
    solid,
    sub,
    transform,
    translateX,
    transparent,
    unitless,
} from "@pureform/core/ast";
import type { StyleMap } from "@pureform/core/ast";
import { duration, easing, radius } from "@pureform/theme";

import {
    COLOR_GROUPS,
    DEFAULT_GROUP,
    colorVariant,
    componentTokens,
    sys,
    tweens,
    circle,
} from "./shared";
import type { ColorGroups } from "./shared";

const pf = typed();

/** The keyframes the progress indicators animate with; `pureform()` adds them to the
 *  config. */
export const PROGRESS_KEYFRAMES: Record<string, Record<string, StyleMap>> = {
    // The indicator enters from the start and leaves past the end; translate is relative to
    // its own width, a fraction of the track's.
    linearProgressSlide: {
        from: { transform: transform(translateX(pct(-100))) },
        to: { transform: transform(translateX(pct(250))) },
    },
    circularProgressSpin: {
        from: { transform: transform(rotate(numeric(0, "deg"))) },
        to: { transform: transform(rotate(numeric(360, "deg"))) },
    },
};

const linear = componentTokens("linearProgress", {
    activeColor: sys("primary"),
    trackColor: sys("secondaryContainer"),
    height: px(4),
    value: unitless(0),
    indeterminateWidth: pct(40),
});

/** Build the linear progress indicator with a `color` variant per group in `groups`. */
export const createLinearProgress = (groups: ColorGroups = COLOR_GROUPS) => {
    const { ref } = linear;
    return pf.slotComponent({
        name: "linearProgress",
        $meta: {
            description:
                "Material linear progress. Set the value token (0 to 100), or turn on indeterminate.",
        },
        tokens: linear.tokens,
        slots: ["root", "indicator"],
        structure: { root: ["indicator"] },
        variants: {
            indeterminate: ["true", "false"],
            color: groups,
        },
        recipe: () => ({
            base: {
                root: {
                    position: relative,
                    overflow: hidden,
                    width: pct(100),
                    height: ref("height"),
                    borderRadius: radius("full"),
                    backgroundColor: ref("trackColor"),
                },
                indicator: {
                    position: absolute,
                    top: px(0),
                    insetInlineStart: px(0),
                    height: pct(100),
                    width: mul(ref("value"), pct(1)),
                    borderRadius: radius("full"),
                    backgroundColor: ref("activeColor"),
                    transition: tweens("width"),
                },
            },
            variants: {
                indeterminate: {
                    true: {
                        indicator: {
                            width: ref("indeterminateWidth"),
                            animation: animation({
                                name: "linearProgressSlide",
                                duration: duration("extraLong4"),
                                easing: easing("standard"),
                                iterations: "infinite",
                            }),
                        },
                    },
                    false: {},
                },
                color: colorVariant(groups, (g) => ({
                    root: { backgroundColor: g.container },
                    indicator: { backgroundColor: g.main },
                })),
            },
            defaultVariants: { indeterminate: "false", color: DEFAULT_GROUP },
        }),
    });
};

export const linearProgress = createLinearProgress();

// The value is a number that transitions, so both halves' arcs draw from one moving value
// and meet at every frame; turning each arc on its own transition would open a gap between
// them.
const circular = componentTokens(
    "circularProgress",
    {
        activeColor: sys("primary"),
        size: px(48),
        thickness: px(4),
        value: unitless(0),
    },
    { value: "number" },
);

const DEG_PER_PERCENT = numeric(3.6, "deg");

/** Build the circular progress indicator with a `color` variant per group in `groups`. */
export const createCircularProgress = (groups: ColorGroups = COLOR_GROUPS) => {
    const { ref } = circular;

    // A half of the circle, clipping a ring whose two colored sides make a half-circle arc.
    // The ring turns from `start` by `sweep`: hidden at 0, filling its half at 180 degrees.
    const half = (side: "Start" | "End"): StyleMap => ({
        position: absolute,
        top: px(0),
        [`insetInline${side}`]: px(0),
        width: pct(50),
        height: pct(100),
        overflow: hidden,
    });
    const arc = (
        side: "Start" | "End",
        start: number,
        sweep: ReturnType<typeof min>,
    ): StyleMap => ({
        position: absolute,
        top: px(0),
        [`insetInline${side}`]: px(0),
        width: pct(200),
        height: pct(100),
        borderRadius: circle,
        borderStyle: solid,
        borderWidth: ref("thickness"),
        borderColor: transparent,
        borderBlockStartColor: ref("activeColor"),
        borderInlineEndColor: ref("activeColor"),
        transform: transform(
            rotate(add(numeric(start, "deg"), mul(sweep, DEG_PER_PERCENT))),
        ),
        // Hidden until it has a share to show, so its anti-aliased edge never shows at the seam.
        opacity: clamp(unitless(0), sweep, unitless(1)),
    });

    return pf.slotComponent({
        name: "circularProgress",
        $meta: {
            description:
                "Material circular progress. Set the value token (0 to 100), or turn on indeterminate for a spinner.",
        },
        tokens: circular.tokens,
        slots: ["root", "endHalf", "endArc", "startHalf", "startArc"],
        structure: {
            root: ["endHalf", "startHalf"],
            endHalf: ["endArc"],
            startHalf: ["startArc"],
        },
        variants: {
            indeterminate: ["true", "false"],
            color: groups,
        },
        recipe: () => ({
            base: {
                root: {
                    position: relative,
                    width: ref("size"),
                    height: ref("size"),
                    borderRadius: circle,
                    transition: tweens(circular.own("value")),
                },
                // The end half shows the first 50%, the start half the rest.
                endHalf: half("End"),
                endArc: arc("End", -135, min(ref("value"), unitless(50))),
                startHalf: half("Start"),
                startArc: arc(
                    "Start",
                    45,
                    max(sub(ref("value"), unitless(50)), unitless(0)),
                ),
            },
            variants: {
                // Two colored quarters of a bordered circle, turning; the halves stay hidden.
                indeterminate: {
                    true: {
                        root: {
                            borderStyle: solid,
                            borderWidth: ref("thickness"),
                            borderColor: transparent,
                            borderBlockStartColor: ref("activeColor"),
                            borderInlineEndColor: ref("activeColor"),
                            animation: animation({
                                name: "circularProgressSpin",
                                duration: duration("long2"),
                                easing: easing("linear"),
                                iterations: "infinite",
                            }),
                        },
                        endHalf: { display: none },
                        startHalf: { display: none },
                    },
                    false: {},
                },
                color: colorVariant(groups, (g) => {
                    const sides = {
                        borderBlockStartColor: g.main,
                        borderInlineEndColor: g.main,
                    };
                    return { root: sides, endArc: sides, startArc: sides };
                }),
            },
            defaultVariants: { indeterminate: "false", color: DEFAULT_GROUP },
        }),
    });
};

export const circularProgress = createCircularProgress();
