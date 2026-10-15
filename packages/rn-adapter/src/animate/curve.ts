// Easing curves for Animated, and whether it can run on the native thread.

import { Easing, Platform } from "react-native";

import { easingPoints } from "../motion";

/** A transition's or animation's curve as an Animated easing. */
export const curve = (easing: string) => {
    const points = easingPoints(easing);
    return points === "linear" ? Easing.linear : Easing.bezier(...points);
};

/** Whether transforms and opacity can animate on the native thread: on a device, not on the
 *  web, which has no native driver. */
export const NATIVE_DRIVER = Platform.OS !== "web";
