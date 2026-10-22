// Reanimated 4 bindings: a component's styles with its transitions and keyframe animations as
// CSS's animation properties, which Reanimated runs on the UI thread. Put the styles on
// Reanimated's views (`Animated.View` from react-native-reanimated).

import { parseLinearEasing } from "@pureform/core";
import { useMemo } from "react";
import { I18nManager, Platform } from "react-native";
import { cubicBezier, linear } from "react-native-reanimated";

import { cssMotion } from "./css-motion";
import { easingPoints, presenceFrames, slideFrames } from "./motion";
import type {
    PresenceDriver,
    PresencePhase,
    PresenceStep,
    PresenceTiming,
    PresenceView,
    SlideMotion,
} from "./motion";
import type { TokenVelocities } from "./motion";
import { useComponentState } from "./react";
import type { State } from "./select";
import type { ThemeValues } from "./values";

export { cssMotion } from "./css-motion";
export type { CssMotion } from "./css-motion";
export type {
    PresenceDriver,
    PresenceFrame,
    PresenceMotion,
    PresencePhase,
    PresenceStep,
    PresenceView,
    SlideMotion,
} from "./motion";

/** A CSS curve as Reanimated's: a cubic Bézier or a `linear(...)` curve (a sampled spring) as
 *  its easing object, `linear` as is. Reanimated's CSS animations have no springs, so a spring
 *  runs here as its sampled duration and curve, the web's. */
export const cssEasing = (curve: string) => {
    const stops = parseLinearEasing(curve);
    if (stops) {
        return linear(
            ...stops.map(([output, input]) =>
                input === undefined
                    ? output
                    : ([output, `${input}%`] as [number, `${number}%`]),
            ),
        );
    }
    const points = easingPoints(curve);
    return points === "linear" ? "linear" : cubicBezier(...points);
};

// React Native's logical properties, as React Native Web writes them on the page, left to right.
// Reanimated transitions CSS's properties there, so a transition names the one written.
const PHYSICAL: Record<string, readonly [ltr: string, rtl: string]> = {
    start: ["left", "right"],
    end: ["right", "left"],
    marginStart: ["marginLeft", "marginRight"],
    marginEnd: ["marginRight", "marginLeft"],
    paddingStart: ["paddingLeft", "paddingRight"],
    paddingEnd: ["paddingRight", "paddingLeft"],
    borderStartWidth: ["borderLeftWidth", "borderRightWidth"],
    borderEndWidth: ["borderRightWidth", "borderLeftWidth"],
    borderStartColor: ["borderLeftColor", "borderRightColor"],
    borderEndColor: ["borderRightColor", "borderLeftColor"],
    borderTopStartRadius: ["borderTopLeftRadius", "borderTopRightRadius"],
    borderTopEndRadius: ["borderTopRightRadius", "borderTopLeftRadius"],
    borderBottomStartRadius: [
        "borderBottomLeftRadius",
        "borderBottomRightRadius",
    ],
    borderBottomEndRadius: [
        "borderBottomRightRadius",
        "borderBottomLeftRadius",
    ],
};

const onPage = (property: string) => {
    const sides = Platform.OS === "web" ? PHYSICAL[property] : undefined;
    return sides ? sides[I18nManager.isRTL ? 1 : 0] : property;
};

/** A component's styles per slot, as `useComponentStyles` gives them, each with its
 *  transitions and keyframe animation for Reanimated to run. `tokens` gives this instance its
 *  own token values. */
export const useReanimatedComponentStyles = (
    name: string,
    variants: Record<string, string | boolean | undefined> = {},
    state: State = {},
    tokens?: ThemeValues,
    velocities?: TokenVelocities,
): Record<string, Record<string, unknown>> => {
    const { styles, transitions, animations } = useComponentState(
        name,
        variants,
        state,
        tokens,
        velocities,
    );
    return useMemo(
        () =>
            Object.fromEntries(
                Object.entries(styles).map(([slot, style]) => {
                    const motion = cssMotion(
                        transitions[slot] ?? [],
                        animations[slot],
                    );
                    return [
                        slot,
                        {
                            ...style,
                            ...motion,
                            ...(motion.transitionProperty
                                ? {
                                      transitionProperty:
                                          motion.transitionProperty.map(onPage),
                                  }
                                : {}),
                            ...(motion.transitionTimingFunction
                                ? {
                                      transitionTimingFunction:
                                          motion.transitionTimingFunction.map(
                                              cssEasing,
                                          ),
                                  }
                                : {}),
                            ...(motion.animationTimingFunction
                                ? {
                                      animationTimingFunction: cssEasing(
                                          motion.animationTimingFunction,
                                      ),
                                  }
                                : {}),
                        },
                    ];
                }),
            ),
        [styles, transitions, animations],
    );
};

/** An overlay's enter and exit as Reanimated's CSS animations on the UI thread: each step a
 *  keyframe animation between its frames (with its own fade, two: the movement on its timing,
 *  the opacity on the fade's), the exit holding its last, ending each step with the view's
 *  `onCSSAnimationEnd` once every animation of it has. Spread the view's props on Reanimated's
 *  view. */
export const reanimatedPresence = (): PresenceDriver => {
    let done: (phase: PresencePhase) => void = () => {};
    const views = new WeakMap<PresenceStep, PresenceView>();
    // How many of the running step's animations have ended.
    const finished: Record<PresencePhase, number> = { enter: 0, exit: 0 };
    // A changed animation restarts it, so each step keeps one style.
    const viewOf = (phase: PresencePhase, step: PresenceStep): PresenceView => {
        const [from, to] = presenceFrames(step);
        // The enter shows its first frame from the start, the exit its last until the overlay
        // goes.
        const fillMode = phase === "exit" ? "forwards" : "backwards";
        const fade = step.fade;
        const style = fade
            ? {
                  animationName: [
                      {
                          from: { transform: from.transform },
                          to: { transform: to.transform },
                      },
                      {
                          from: { opacity: from.opacity },
                          to: { opacity: to.opacity },
                      },
                  ],
                  animationDuration: [step.duration, fade.duration],
                  animationTimingFunction: [
                      cssEasing(step.easing),
                      cssEasing(fade.easing),
                  ],
                  animationFillMode: fillMode,
              }
            : {
                  animationName: { from, to },
                  animationDuration: step.duration,
                  animationTimingFunction: cssEasing(step.easing),
                  animationFillMode: fillMode,
              };
        const count = fade ? 2 : 1;
        return {
            style,
            props: {
                onCSSAnimationEnd: () => {
                    finished[phase] += 1;
                    if (finished[phase] >= count) done(phase);
                },
            },
        };
    };
    return {
        view(phase, motion, ended) {
            done = ended;
            const step = motion[phase];
            let view = views.get(step);
            if (!view) {
                view = viewOf(phase, step);
                views.set(step, view);
            }
            return view;
        },
        run: (phase) => {
            finished[phase] = 0;
            return undefined;
        },
    };
};

/** The style that slides a view into its place, for each new `motion`, as a CSS keyframe
 *  animation Reanimated runs on the UI thread; `undefined` without one. The style stays the same
 *  object while `motion` does, since a changed animation starts again. */
export const useReanimatedSlide = (
    motion: SlideMotion | undefined,
): Record<string, unknown> | undefined =>
    useMemo(() => {
        if (!motion) return undefined;
        const [from, to] = slideFrames(motion);
        return {
            animationName: { from, to },
            animationDuration: motion.duration,
            animationDelay: motion.delay,
            animationTimingFunction: cssEasing(motion.easing),
            // The slide's start shows through its delay.
            animationFillMode: "backwards",
        };
    }, [motion]);
