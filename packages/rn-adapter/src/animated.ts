// Animated styles: a component's styles where each property with a transition moves to its new
// value through React Native's Animated, which React Native Web runs too. Pass the slots'
// styles to `Animated.View` and `Animated.Text`.

import { useEffect, useLayoutEffect, useRef } from "react";
import { Animated, Easing } from "react-native";

import { animatable, blend, easingPoints, interpolates, stops } from "./motion";
import { useRecipeWithTransitions } from "./react";
import type { State, Style } from "./select";
import type { Concrete, ThemeValues, Transition } from "./values";

// One property in motion: where it's going from and to, and how far along it is.
interface Track {
    progress: Animated.Value;
    from: Concrete;
    to: Concrete;
    at: number;
    animation?: Animated.CompositeAnimation | undefined;
}

// A change waiting to start once the render commits.
interface Pending {
    track: Track;
    transition: Transition;
    previous: Animated.CompositeAnimation | undefined;
    previousProgress: Animated.Value;
}

// A progress value whose listener keeps its track's `at` current, for interruptions.
const progressOf = (start: number, track: () => Track): Animated.Value => {
    const progress = new Animated.Value(start);
    progress.addListener(({ value }) => {
        if (track().progress === progress) track().at = value;
    });
    return progress;
};

const curve = (easing: string) => {
    const points = easingPoints(easing);
    return points === "linear" ? Easing.linear : Easing.bezier(...points);
};

/** A component's styles per slot, with transitioned properties as animated values. */
export const useAnimatedRecipe = (
    name: string,
    variants: Record<string, string | boolean | undefined> = {},
    state: State = {},
    tokens?: ThemeValues,
): Record<string, Record<string, unknown>> => {
    const { styles, transitions } = useRecipeWithTransitions(
        name,
        variants,
        state,
        tokens,
    );
    const tracks = useRef(new Map<string, Track>());
    const pending = useRef<Pending[]>([]);

    const out: Record<string, Record<string, unknown>> = {};
    for (const [slot, style] of Object.entries(styles)) {
        const animated: Record<string, unknown> = { ...style };
        for (const transition of transitions[slot] ?? []) {
            const target = style[transition.property];
            if (typeof target !== "number" && typeof target !== "string")
                continue;
            const key = `${slot}.${transition.property}`;
            const to = animatable(target);
            let track = tracks.current.get(key);
            if (!track) {
                track = {
                    progress: progressOf(1, () => track!),
                    from: to,
                    to,
                    at: 1,
                };
                tracks.current.set(key, track);
            } else if (track.to !== to) {
                // Start from what's on screen, so an interrupted change doesn't jump. A live
                // animated value can't change during render (the views bound to it would
                // update mid-render), so the change gets a new one, started after render, and
                // the old one stops then.
                const current = track;
                pending.current.push({
                    track: current,
                    transition,
                    previous: current.animation,
                    previousProgress: current.progress,
                });
                current.from = blend(current.from, current.to, current.at);
                current.to = to;
                current.at = 0;
                current.progress = progressOf(0, () => current);
                current.animation = undefined;
            }
            if (interpolates(track.from, track.to)) {
                const { inputRange, outputRange } = stops(track.from, track.to);
                animated[transition.property] = track.progress.interpolate({
                    inputRange,
                    // Both numbers or both strings, which `interpolates` checked.
                    outputRange: outputRange as unknown as number[],
                });
            }
        }
        out[slot] = animated;
    }

    useLayoutEffect(() => {
        for (const {
            track,
            transition,
            previous,
            previousProgress,
        } of pending.current.splice(0)) {
            previous?.stop();
            previousProgress.removeAllListeners();
            track.animation = Animated.timing(track.progress, {
                toValue: 1,
                duration: transition.duration,
                delay: transition.delay,
                easing: curve(transition.easing),
                useNativeDriver: false,
            });
            track.animation.start();
        }
    });

    useEffect(
        () => () => {
            for (const track of tracks.current.values()) {
                track.animation?.stop();
                track.progress.removeAllListeners();
            }
        },
        [],
    );

    return out;
};

export type { State, Style };
