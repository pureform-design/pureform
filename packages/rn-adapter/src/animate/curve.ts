// Easing curves for Animated, and whether it can run on the native thread.

import { linearEasingAt } from "@pureform/core";
import { Animated, Easing, Platform } from "react-native";

import { easingPoints } from "../motion";
import type { Easing as EasingValue, Spring } from "../values";

/** A transition's or animation's curve as an Animated easing: a cubic Bézier, a `linear(...)`
 *  curve interpolated through its points, or linear. */
export const curve = (easing: EasingValue) => {
    if (easing.kind === "linear")
        return (x: number) => linearEasingAt(easing.points, x);
    const points = easingPoints(easing);
    // oxlint-disable-next-line typescript/unbound-method -- React Native's easings are plain functions typed as methods; none reads `this`
    return points === "linear" ? Easing.linear : Easing.bezier(...points);
};

/** A timing as Animated runs it: a spring, where it has one, through `Animated.spring`, else
 *  its duration and curve through `Animated.timing`. */
export interface AnimatedTiming {
    readonly duration: number;
    readonly easing: EasingValue;
    readonly delay?: number | undefined;
    readonly spring?: Spring | undefined;
}

/** Where a spring starts moving: its progress per second as it starts, such as a released
 *  drag's speed. */
export type StartVelocity = number;

// How close to rest a spring stops, as the web's sampled curve settles: within a thousandth of
// the distance, which is 0 to 1 here.
const REST = 0.001;

/** `Animated.spring` of `value` to `toValue` on a spring's stiffness, damping coefficient, and
 *  mass, starting at `velocity` per second and stopping within `rest` of it (in the value's
 *  units, for both its distance and its speed). */
export const springTo = (
    value: Animated.Value,
    spring: Spring,
    options: {
        toValue: number;
        velocity: number;
        rest: number;
        delay?: number;
        useNativeDriver: boolean;
    },
): Animated.CompositeAnimation =>
    Animated.spring(value, {
        toValue: options.toValue,
        stiffness: spring.stiffness,
        damping: spring.damping,
        mass: spring.mass,
        velocity: options.velocity,
        ...(options.delay === undefined ? {} : { delay: options.delay }),
        restDisplacementThreshold: options.rest,
        restSpeedThreshold: options.rest,
        useNativeDriver: options.useNativeDriver,
    });

/** Animate `progress` to 1 on a timing: `Animated.spring` with the spring's stiffness, damping
 *  coefficient, and mass (starting at `velocity`, in progress per second), or `Animated.timing` with its duration and curve. */
export const animate = (
    progress: Animated.Value,
    timing: AnimatedTiming,
    useNativeDriver: boolean,
    velocity: StartVelocity = 0,
): Animated.CompositeAnimation =>
    timing.spring
        ? springTo(progress, timing.spring, {
              toValue: 1,
              velocity,
              delay: timing.delay ?? 0,
              rest: REST,
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
