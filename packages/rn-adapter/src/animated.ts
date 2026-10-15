// Animated styles: a component's styles where each property with a transition moves to its new
// value through React Native's Animated, which React Native Web runs too. Pass the slots'
// styles to `Animated.View` and `Animated.Text`.

import { useEffect, useLayoutEffect, useRef } from "react";
import { Animated, Easing } from "react-native";

import { animatable, blend, easingPoints, interpolates } from "./motion";
import { useRecipeWithTransitions } from "./react";
import type { State, Style } from "./select";
import type { Concrete, Transition } from "./values";

// One property in motion: where it's going from and to, and how far along it is.
interface Track {
    progress: Animated.Value;
    from: Concrete;
    to: Concrete;
    at: number;
    animation?: Animated.CompositeAnimation;
}

const curve = (easing: string) => {
    const points = easingPoints(easing);
    return points === "linear" ? Easing.linear : Easing.bezier(...points);
};

/** A component's styles per slot, with transitioned properties as animated values. */
export const useAnimatedRecipe = (
    name: string,
    variants: Record<string, string | boolean | undefined> = {},
    state: State = {},
): Record<string, Record<string, unknown>> => {
    const { styles, transitions } = useRecipeWithTransitions(
        name,
        variants,
        state,
    );
    const tracks = useRef(new Map<string, Track>());
    const pending = useRef<[Track, Transition][]>([]);

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
                const progress = new Animated.Value(1);
                track = { progress, from: to, to, at: 1 };
                progress.addListener(({ value }) => {
                    track!.at = value;
                });
                tracks.current.set(key, track);
            } else if (track.to !== to) {
                // Start from what's on screen, so an interrupted change doesn't jump.
                track.animation?.stop();
                track.from = blend(track.from, track.to, track.at);
                track.to = to;
                track.at = 0;
                track.progress.setValue(0);
                pending.current.push([track, transition]);
            }
            if (interpolates(track.from, track.to)) {
                animated[transition.property] = track.progress.interpolate({
                    inputRange: [0, 1],
                    // Both numbers or both strings, which `interpolates` checked.
                    outputRange: [track.from, track.to] as unknown as number[],
                });
            }
        }
        out[slot] = animated;
    }

    useLayoutEffect(() => {
        for (const [track, transition] of pending.current.splice(0)) {
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
