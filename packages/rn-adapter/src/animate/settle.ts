// A dragged view going back to rest once let go: `Animated.spring` from where the drag left it,
// carrying the drag's release velocity, as Compose's anchored draggables settle.

import { Animated } from "react-native";

import type { Spring } from "../values";
import { NATIVE_DRIVER, springTo } from "./curve";

// How close to rest, in pixels and pixels per second, a settle stops.
const REST = 0.5;

/** Springs `offset` back to `to` (0 by default) from where it is, starting at `velocity` in
 *  pixels per millisecond (a `PanResponder` gesture's `vy`), on `spring`'s stiffness, damping
 *  coefficient, and mass. Without a spring (reduced motion, or no time at all) it's there at
 *  once. Returns what stops it. */
export const settle = (
    offset: Animated.Value,
    velocity: number,
    spring: Spring | undefined,
    to = 0,
): (() => void) => {
    if (!spring) {
        offset.setValue(to);
        return () => {};
    }
    const animation = springTo(offset, spring, {
        toValue: to,
        // Animated takes a spring's velocity per second.
        velocity: velocity * 1000,
        rest: REST,
        useNativeDriver: NATIVE_DRIVER,
    });
    animation.start();
    return () => animation.stop();
};
