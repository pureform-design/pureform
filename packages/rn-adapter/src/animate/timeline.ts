// Shared clocks and their derived channels. Numeric transforms/opacity run on Animated's
// native driver, including when a component otherwise uses Reanimated. RN Web uses Animated's
// JS driver; no React render or component-owned frame loop is involved on either platform.
import type {
    MotionChannel,
    MotionClock,
    MotionTimeline as Timeline,
} from "@pureform/animate-react-native";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Animated } from "react-native";

import type { Easing } from "../values";
import { curve, NATIVE_DRIVER } from "./curve";

export type TimelineClock = MotionClock<Easing>;

export type MotionTimeline = Timeline<
    | number
    | string
    | Animated.AnimatedInterpolation<number | string>
    | Animated.AnimatedAddition,
    typeof Animated.View
>;

interface Clock {
    readonly value: Animated.Value;
    key?: string | undefined;
    run?: Animated.CompositeAnimation | undefined;
}

/** Build a native-driver loop. Exported within the driver module for capability regression tests. */
export const timelineLoop = (
    value: Animated.Value,
    setting: TimelineClock,
): Animated.CompositeAnimation =>
    Animated.loop(
        Animated.timing(value, {
            toValue: 1,
            duration: setting.duration,
            easing: curve(setting.easing),
            useNativeDriver: NATIVE_DRIVER,
            isInteraction: false,
        }),
    );

/** One running value per named clock, shared by any number of derived channels. Geometry can
 *  change without restarting a clock. Disabled clocks reset to their first frame. */
export const useMotionTimeline = (
    settings: Readonly<Record<string, TimelineClock>>,
): MotionTimeline => {
    const clocks = useRef(new Map<string, Clock>()).current;
    for (const name of Object.keys(settings)) {
        if (!clocks.has(name))
            clocks.set(name, { value: new Animated.Value(0) });
    }
    useLayoutEffect(() => {
        for (const [name, clock] of clocks) {
            const setting = settings[name];
            const key = setting && JSON.stringify(setting);
            if (key === clock.key) continue;
            clock.run?.stop();
            clock.run = undefined;
            clock.key = key;
            clock.value.setValue(0);
            if (!setting) {
                clocks.delete(name);
                continue;
            }
            if (setting.enabled === false || setting.duration <= 0) continue;
            clock.run = timelineLoop(clock.value, setting);
            clock.run.start();
        }
    });
    useEffect(
        () => () => {
            for (const clock of clocks.values()) {
                clock.run?.stop();
                clock.key = undefined;
            }
        },
        [clocks],
    );
    return useMemo(
        () => ({
            View: Animated.View,
            driver: NATIVE_DRIVER ? "native" : "js",
            value(channel: MotionChannel) {
                const terms = (channel.terms ?? []).map((term) => {
                    const clock = clocks.get(term.clock);
                    if (!clock)
                        throw new Error(
                            `pureform: unknown timeline clock "${term.clock}"`,
                        );
                    return clock.value.interpolate({
                        inputRange:
                            "stops" in term
                                ? term.stops.map((stop) => stop.offset)
                                : [0, 1],
                        outputRange:
                            "stops" in term
                                ? term.stops.map((stop) => stop.value)
                                : [term.from, term.to],
                        ...("stops" in term
                            ? { extrapolate: "clamp" as const }
                            : {}),
                    });
                });
                const value = terms.reduce<
                    | number
                    | Animated.AnimatedInterpolation<number>
                    | Animated.AnimatedAddition
                >((sum, term) => Animated.add(sum, term), channel.offset ?? 0);
                return !channel.unit
                    ? value
                    : typeof value === "number"
                      ? `${value}${channel.unit}`
                      : value.interpolate({
                            inputRange: [0, 1],
                            outputRange: [
                                `0${channel.unit}`,
                                `1${channel.unit}`,
                            ],
                        });
            },
        }),
        [clocks],
    );
};
