// Reanimated 4 bindings: a component's styles with its transitions and keyframe animations as
// CSS's animation properties, which Reanimated runs on the UI thread. Put the styles on
// Reanimated's views (`Animated.View` from react-native-reanimated).

import { useMemo } from "react";
import { I18nManager, Platform } from "react-native";
import { cubicBezier } from "react-native-reanimated";

import { cssMotion } from "./css-motion";
import { easingPoints } from "./motion";
import { useComponentState } from "./react";
import type { State } from "./select";
import type { ThemeValues } from "./values";

export { cssMotion } from "./css-motion";
export type { CssMotion } from "./css-motion";

// A CSS curve as Reanimated's: a cubic Bézier as its easing object, `linear` as is.
const easing = (curve: string) => {
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
                                              easing,
                                          ),
                                  }
                                : {}),
                            ...(motion.animationTimingFunction
                                ? {
                                      animationTimingFunction: easing(
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
