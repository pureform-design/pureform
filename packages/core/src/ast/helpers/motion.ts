// Motion: easing, springs, transitions, animations.
import type {
    AnimationNode,
    AnimationRun,
    CubicBezierEasingNode,
    DynamicNode,
    EasingValue,
    KeywordEasingNode,
    LinearEasingNode,
    LinearEasingPoint,
    NumericValue,
    SpringNode,
    StepsEasingNode,
    Timing,
    TransitionNode,
    TransitionPart,
} from "../nodes";

/** Keyword easing, for example `easeInOut`. */
export const easing = (name: KeywordEasingNode["name"]): KeywordEasingNode => ({
    type: "easing",
    kind: "keyword",
    name,
});
export const cubicBezier = (
    points: [number, number, number, number],
): CubicBezierEasingNode => ({ type: "easing", kind: "cubicBezier", points });
export const steps = (
    count: number,
    jump?: "start" | "end",
): StepsEasingNode => ({
    type: "easing",
    kind: "steps",
    steps: { count, ...(jump ? { jump } : {}) },
});

/** A piecewise-linear easing through `points` (CSS's `linear()`): each an output, and where
 *  along the input it sits in percent (left out, it sits halfway between its neighbours). */
export const linearEasing = (
    ...points: (LinearEasingPoint | number)[]
): LinearEasingNode => ({
    type: "easing",
    kind: "linear",
    points: points.map((p) => (typeof p === "number" ? [p] : p)),
});

/** A spring by its physics (`stiffness`, `damping` as a ratio of critical, `mass`, default 1),
 *  or by how it feels: a perceptual `duration` in ms and a `bounce` from -1 to 1 (0 settles
 *  without overshoot, more bounces, less is over-damped), converted at build time as SwiftUI
 *  and Motion do: `stiffness = (2π / duration)²`, `damping = 1 - bounce` (or
 *  `1 / (1 + bounce)` below 0), mass 1. */
export const spring = (
    options:
        | { stiffness: number; damping: number; mass?: number }
        | { duration: number; bounce?: number },
): SpringNode => {
    if ("duration" in options) {
        const { duration, bounce = 0 } = options;
        const seconds = duration / 1000;
        return {
            type: "spring",
            stiffness: (2 * Math.PI) ** 2 / (seconds * seconds),
            damping: bounce >= 0 ? 1 - bounce : 1 / (1 + bounce),
            mass: 1,
        };
    }
    return {
        type: "spring",
        stiffness: options.stiffness,
        damping: options.damping,
        mass: options.mass ?? 1,
    };
};

/** One transition leg; `property` is a style-property name or `"all"`. Either a `duration` (a
 *  numeric or an alias into `durations`), an `ease` (an `EasingNode` or an `easings` alias),
 *  and a `delay`; or a `Timing` object, which may be a spring:
 *  `tween("transform", { spring: alias("springs", "spatialFast") })`. */
export function tween(
    property: string | DynamicNode,
    timing: Timing,
): TransitionPart;
export function tween(
    property: string | DynamicNode,
    duration: NumericValue,
    ease?: EasingValue,
    delay?: NumericValue,
): TransitionPart;
export function tween(
    property: string | DynamicNode,
    duration: NumericValue | Timing,
    ease?: EasingValue,
    delay?: NumericValue,
): TransitionPart {
    if (!("type" in duration)) return { property, ...duration };
    return {
        property,
        duration,
        ...(ease ? { easing: ease } : {}),
        ...(delay ? { delay } : {}),
    };
}
export const transition = (...parts: TransitionPart[]): TransitionNode => ({
    type: "transition",
    parts,
});
/** A keyframe animation: its run (`name`, iterations, direction, fill) and its `Timing`, a
 *  duration and easing or a spring. */
export const animation = (opts: AnimationRun & Timing): AnimationNode => ({
    type: "animation",
    ...opts,
});
/** Keyframe animations that run together, each on its own timing (CSS's comma-separated
 *  `animation` list): `animations(animation({ name: "scaleIn", spring }), animation({ name:
 *  "fadeIn", duration, easing }))`. One alone is itself. */
export const animations = (
    first: AnimationNode,
    ...rest: AnimationNode[]
): AnimationNode => (rest.length > 0 ? { ...first, alongside: rest } : first);
