// Motion: easing, transitions, animations.
import type {
    AnimationNode,
    CubicBezierEasingNode,
    DynamicNode,
    EasingValue,
    KeywordEasingNode,
    NumericValue,
    StepsEasingNode,
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

/** One transition leg; `property` is a style-property name or `"all"`. `duration` and
 *  `delay` accept a numeric or an alias into `durations`; `ease` an `EasingNode` or an
 *  `easings` alias. */
export const tween = (
    property: string | DynamicNode,
    duration: NumericValue,
    ease?: EasingValue,
    delay?: NumericValue,
): TransitionPart => ({
    property,
    duration,
    ...(ease ? { easing: ease } : {}),
    ...(delay ? { delay } : {}),
});
export const transition = (...parts: TransitionPart[]): TransitionNode => ({
    type: "transition",
    parts,
});
export const animation = (
    opts: Omit<AnimationNode, "type">,
): AnimationNode => ({
    type: "animation",
    ...opts,
});
