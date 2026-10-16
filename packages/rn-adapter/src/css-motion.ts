// A slot's transitions and keyframe animation as CSS's animation properties, which Reanimated 4
// takes on a view's style and runs on the UI thread. Kept apart from Reanimated, so it's plain
// data: the Reanimated entry turns the curves into its easing objects.

import type { Animation, Transition } from "./values";

/** CSS's transition and animation properties for a style, with curves as CSS writes them. */
export interface CssMotion {
    transitionProperty?: string[];
    transitionDuration?: number[];
    transitionTimingFunction?: string[];
    transitionDelay?: number[];
    animationName?: Record<string, Record<string, unknown>>;
    animationDuration?: number;
    animationTimingFunction?: string;
    animationDelay?: number;
    animationIterationCount?: number | "infinite";
    animationDirection?:
        | "normal"
        | "reverse"
        | "alternate"
        | "alternate-reverse";
}

const DIRECTIONS = {
    normal: "normal",
    reverse: "reverse",
    alternate: "alternate",
    alternateReverse: "alternate-reverse",
} as const;

/** A slot's motion as CSS's properties: its transitions, but for those of properties it
 *  doesn't draw on its view (a clip shape), and its animation's frames by percentage. */
export const cssMotion = (
    transitions: readonly Transition[],
    animation?: Animation,
    drawn: ReadonlySet<string> = new Set(["clipPath"]),
): CssMotion => {
    const own = transitions.filter((t) => !drawn.has(t.property));
    return {
        ...(own.length > 0
            ? {
                  transitionProperty: own.map((t) => t.property),
                  transitionDuration: own.map((t) => t.duration),
                  transitionTimingFunction: own.map((t) => t.easing),
                  transitionDelay: own.map((t) => t.delay),
              }
            : {}),
        ...(animation
            ? {
                  animationName: Object.fromEntries(
                      animation.frames.map((frame) => [
                          `${Math.round(frame.offset * 10000) / 100}%`,
                          frame.style,
                      ]),
                  ),
                  animationDuration: animation.duration,
                  animationTimingFunction: animation.easing,
                  animationDelay: animation.delay,
                  animationIterationCount:
                      animation.iterations < 0
                          ? "infinite"
                          : animation.iterations,
                  animationDirection: DIRECTIONS[animation.direction],
              }
            : {}),
    };
};
