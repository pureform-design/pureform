// Easing curves for Animated, and whether it can run on the native thread.

import { linearEasingAt, parseLinearEasing } from "@pureform/core";
import { Animated, Easing, Platform } from "react-native";

import { easingPoints } from "../motion";
import type { Spring } from "../values";

/** A transition's or animation's curve as an Animated easing: a cubic Bézier, a `linear(...)`
 *  curve interpolated through its points, or linear. */
export const curve = (easing: string) => {
    const stops = parseLinearEasing(easing);
    if (stops) return (x: number) => linearEasingAt(stops, x);
    const points = easingPoints(easing);
    return points === "linear" ? Easing.linear : Easing.bezier(...points);
};

/** A timing as Animated runs it: a spring, where it has one, through `Animated.spring`, else
 *  its duration and curve through `Animated.timing`. */
export interface AnimatedTiming {
    readonly duration: number;
    readonly easing: string;
    readonly delay?: number;
    readonly spring?: Spring | undefined;
}

// How close to rest a spring stops, as the web's sampled curve settles: within a thousandth of
// the distance, which is 0 to 1 here.
const REST = 0.001;

/** Animate `progress` to 1 on a timing: `Animated.spring` with the spring's stiffness, damping
 *  coefficient, and mass, or `Animated.timing` with its duration and curve. */
export const animate = (
    progress: Animated.Value,
    timing: AnimatedTiming,
    useNativeDriver: boolean,
): Animated.CompositeAnimation =>
    timing.spring
        ? Animated.spring(progress, {
              toValue: 1,
              stiffness: timing.spring.stiffness,
              damping: timing.spring.damping,
              mass: timing.spring.mass,
              delay: timing.delay ?? 0,
              restDisplacementThreshold: REST,
              restSpeedThreshold: REST,
              useNativeDriver,
          })
        : Animated.timing(progress, {
              toValue: 1,
              duration: timing.duration,
              delay: timing.delay ?? 0,
              easing: curve(timing.easing),
              useNativeDriver,
          });

/** Whether transforms and opacity can animate on the native thread: on a device, not on the
 *  web, which has no native driver. */
export const NATIVE_DRIVER = Platform.OS !== "web";
