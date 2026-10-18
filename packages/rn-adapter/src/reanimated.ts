// Reanimated 4 bindings: a component's styles with its transitions and keyframe animations as
// CSS's animation properties, which Reanimated runs on the UI thread. Put the styles on
// Reanimated's views (`Animated.View` from react-native-reanimated).

import { useMemo } from "react";
import { I18nManager, Platform } from "react-native";
import { cubicBezier } from "react-native-reanimated";

import { cssMotion } from "./css-motion";
import { easingPoints, presenceFrames } from "./motion";
import type {
    PresenceDriver,
    PresencePhase,
    PresenceStep,
    PresenceView,
} from "./motion";
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
} from "./motion";

/** A CSS curve as Reanimated's: a cubic Bézier as its easing object, `linear` as is. */
export const cssEasing = (curve: string) => {
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
): Record<string, Record<string, unknown>> => {
    const { styles, transitions, animations } = useComponentState(
        name,
        variants,
        state,
        tokens,
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
 *  keyframe animation between its frames, the exit holding its last, ending each step with the
 *  view's `onCSSAnimationEnd`. Spread the view's props on Reanimated's view. */
export const reanimatedPresence = (): PresenceDriver => {
    let done: (phase: PresencePhase) => void = () => {};
    const views = new WeakMap<PresenceStep, PresenceView>();
    // A changed animation restarts it, so each step keeps one style.
    const viewOf = (phase: PresencePhase, step: PresenceStep): PresenceView => {
        const [from, to] = presenceFrames(step);
        return {
            style: {
                animationName: { from, to },
                animationDuration: step.duration,
                animationTimingFunction: cssEasing(step.easing),
                // The enter shows its first frame from the start, the exit its last until the
                // overlay goes.
                animationFillMode: phase === "exit" ? "forwards" : "backwards",
            },
            props: { onCSSAnimationEnd: () => done(phase) },
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
        run: () => undefined,
    };
};
