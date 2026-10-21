// The pureform loading indicator: M3 Expressive's indicator for a wait too short to measure. A
// shape that turns and morphs through Material's expressive shapes, on its own (uncontained) or
// on a round container (contained). It replaces most uses of an indeterminate circular progress.
//
//   <div class={root} role="progressbar" aria-label="Loading">
//     <span class={container}>
//       <span class={indicator} />
//     </span>
//   </div>
//
// The geometry is the shape: the container stays round and the indicator keeps Material's
// shapes under any shape theme (a theme that wants another sets `containerRadius`). Its colour,
// size and motion follow the theme. Where a target can't clip to a shape (React Native without
// an SVG engine, a browser without CSS `shape()`), the indicator is a turning circle.

import { typed } from "@pureform/core";
import {
    absolute,
    animation,
    center,
    clipShape,
    flex,
    inlineFlex,
    mul,
    numeric,
    pct,
    px,
    relative,
    rotate,
    transform,
    transparent,
    unitless,
    when,
} from "@pureform/core/ast";
import type { StyleMap } from "@pureform/core/ast";
import { duration, easing } from "@pureform/theme";

import { MATERIAL_SHAPES } from "../shapes";
import { morphSequence } from "./shape-paths";
import {
    DEFAULT_GROUP,
    circle,
    colorVariant,
    componentTokens,
    defaultGroups,
    stateTransition,
    sys,
    variantsOf,
} from "./shared";
import type { ColorGroup, ColorGroups } from "./shared";

const pf = typed();

/** The shapes the indicator morphs through, in order, as Compose's indeterminate loading
 *  indicator does. */
export const LOADING_INDICATOR_SHAPES = [
    "softBurst",
    "cookie9Sided",
    "pentagon",
    "pill",
    "sunny",
    "cookie4Sided",
    "oval",
] as const satisfies readonly (keyof typeof MATERIAL_SHAPES)[];

const MORPHS = morphSequence(
    LOADING_INDICATOR_SHAPES.map((name) => MATERIAL_SHAPES[name]),
);

// Two whole turns a cycle, so it loops without a jump.
const TURN_PER_STEP = 720 / MORPHS.length;

const turned = (degrees: number) =>
    transform(rotate(numeric(Math.round(degrees * 1000) / 1000, "deg")));

/** The keyframes the loading indicator animates with; `pureform()` adds them to the config.
 *  `loadingIndicatorMorph` turns through each shape in turn; `loadingIndicatorSpin` only turns,
 *  for reduced motion, where a shape doesn't change. */
export const LOADING_INDICATOR_KEYFRAMES: Record<
    string,
    Record<string, StyleMap>
> = {
    loadingIndicatorMorph: Object.fromEntries(
        [...MORPHS, MORPHS[0]!].map((shape, i) => [
            `${Math.round((i / MORPHS.length) * 10000) / 100}%`,
            {
                clipPath: clipShape(shape),
                transform: turned(i * TURN_PER_STEP),
            },
        ]),
    ),
    loadingIndicatorSpin: {
        from: { transform: turned(0) },
        to: { transform: turned(360) },
    },
};

const { tokens, ref } = componentTokens("loadingIndicator", {
    indicatorColor: sys("primary"),
    containerColor: sys("primaryContainer"),
    containedIndicatorColor: sys("onPrimaryContainer"),
    size: px(48),
    indicatorSize: px(38),
    // Half the size: the container is a circle. A fixed length, so a shape theme leaves it round.
    containerRadius: px(24),
});

// Each shape takes the long2 duration and eases into the next on the standard curve, so the
// cycle is seven of them.
const step = duration("long2");

const morphAnimation = animation({
    name: "loadingIndicatorMorph",
    duration: mul(step, unitless(MORPHS.length)),
    easing: easing("standard"),
    iterations: "infinite",
});

// Reduced motion keeps a turn (the only sign the wait goes on, as for indeterminate progress)
// and drops the reshaping, at the same pace.
const spinAnimation = animation({
    name: "loadingIndicatorSpin",
    duration: mul(step, unitless(MORPHS.length / 2)),
    easing: easing("linear"),
    iterations: "infinite",
});

/** Build the loading indicator with a `color` variant per group in `groups`. */
export const createLoadingIndicator = <const G extends string = ColorGroup>(
    groups: ColorGroups<G> = defaultGroups(),
) =>
    variantsOf<{ color: G | typeof DEFAULT_GROUP }>()(
        pf.slotComponent({
            name: "loadingIndicator",
            $meta: {
                description:
                    "M3 Expressive loading indicator: a shape that turns and morphs while a short wait goes on, uncontained or on a round container.",
            },
            tokens,
            slots: ["root", "container", "indicator"],
            structure: { root: ["container"], container: ["indicator"] },
            variants: {
                variant: ["uncontained", "contained"],
                color: groups as ColorGroups,
            },
            recipe: () => ({
                base: {
                    root: {
                        position: relative,
                        display: inlineFlex,
                        flexShrink: unitless(0),
                        width: ref("size"),
                        height: ref("size"),
                    },
                    container: {
                        position: absolute,
                        top: px(0),
                        insetInlineStart: px(0),
                        display: flex,
                        alignItems: center,
                        justifyContent: center,
                        width: pct(100),
                        height: pct(100),
                        borderRadius: ref("containerRadius"),
                        backgroundColor: transparent,
                        transition: stateTransition,
                    },
                    indicator: {
                        width: ref("indicatorSize"),
                        height: ref("indicatorSize"),
                        backgroundColor: ref("indicatorColor"),
                        // A circle where the target can't clip to a shape.
                        borderRadius: when("clipShape", px(0), circle),
                        clipPath: clipShape(MORPHS[0]!),
                        transition: stateTransition,
                        animation: when(
                            "reducedMotion",
                            spinAnimation,
                            morphAnimation,
                        ),
                    },
                },
                variants: {
                    variant: {
                        uncontained: {},
                        contained: {
                            container: {
                                backgroundColor: ref("containerColor"),
                            },
                            indicator: {
                                backgroundColor: ref("containedIndicatorColor"),
                            },
                        },
                    },
                    color: colorVariant(groups, (g) => ({
                        root: {
                            tokens: {
                                indicatorColor: g.main,
                                containerColor: g.container,
                                containedIndicatorColor: g.onContainer,
                            },
                        },
                    })),
                },
                defaultVariants: {
                    variant: "uncontained",
                    color: DEFAULT_GROUP,
                },
            }),
        }),
    );

export const loadingIndicator = createLoadingIndicator();
