// The pureform progress indicators: Material's linear and circular progress.
//
// A determinate linear indicator reads its value from the `value` token, a CSS var the app
// sets as a percentage (`--components-linearProgress-value: 40%`), alongside
// `aria-valuenow` on the element with `role="progressbar"`. Turn on `indeterminate` when
// the amount is unknown; the indicator then slides along the track. The circular indicator
// is indeterminate: a ring with two colored quarters that spins.
//
//   <div class={root} role="progressbar" aria-valuenow="40" style="--components-linearProgress-value: 40%">
//     <div class={indicator} />
//   </div>
//
//   <div class={circularProgress()} role="progressbar" aria-label="Loading" />

import { defineComponent, defineSlotComponent } from "@pureform/core";
import {
    absolute,
    animation,
    hidden,
    numeric,
    pct,
    px,
    relative,
    rotate,
    solid,
    transform,
    translateX,
    transparent,
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
} from "./shared";
import type { ColorGroups } from "./shared";

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
    value: pct(0),
    indeterminateWidth: pct(40),
});

/** Build the linear progress indicator with a `color` variant per group in `groups`. */
export const createLinearProgress = (groups: ColorGroups = COLOR_GROUPS) => {
    const { ref } = linear;
    return defineSlotComponent({
        name: "linearProgress",
        $meta: {
            description:
                "Material linear progress. Set the value token as a percentage, or turn on indeterminate.",
        },
        tokens: linear.tokens,
        slots: ["root", "indicator"],
        structure: { root: ["indicator"] },
        recipe: {
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
                    width: ref("value"),
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
        },
    });
};

export const linearProgress = createLinearProgress();

const circular = componentTokens("circularProgress", {
    activeColor: sys("primary"),
    size: px(48),
    thickness: px(4),
});

/** Build the circular progress indicator with a `color` variant per group in `groups`. */
export const createCircularProgress = (groups: ColorGroups = COLOR_GROUPS) => {
    const { ref } = circular;
    return defineComponent({
        name: "circularProgress",
        $meta: {
            description:
                "Material circular progress, indeterminate: a spinning ring. Give it role=progressbar and a label.",
        },
        tokens: circular.tokens,
        recipe: {
            // Two colored quarters of a bordered circle, turning.
            base: {
                width: ref("size"),
                height: ref("size"),
                borderRadius: radius("full"),
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
            variants: {
                color: colorVariant(groups, (g) => ({
                    borderBlockStartColor: g.main,
                    borderInlineEndColor: g.main,
                })),
            },
            defaultVariants: { color: DEFAULT_GROUP },
        },
    });
};

export const circularProgress = createCircularProgress();
