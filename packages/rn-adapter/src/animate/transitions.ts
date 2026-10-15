// State transitions: each property with a transition moves from the value on screen to its
// new one through Animated, and each step of a transform moves on its own.

import { useEffect, useLayoutEffect, useRef } from "react";
import { Animated } from "react-native";

import { animatable, blend, interpolates, sameUnits, stops } from "../motion";
import type { Style } from "../select";
import type { Concrete, Transition } from "../values";
import { curve } from "./curve";

// One value in motion: where it's going from and to, and how far along it is.
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

/** A function that puts a slot's transitioned values into its animated style. Changes start
 *  once the render commits, since a live animated value can't change during render (the
 *  views bound to it would update mid-render). */
export const useTransitions = () => {
    const tracks = useRef(new Map<string, Track>());
    const pending = useRef<Pending[]>([]);

    // One value under a transition: the animated value, or the target where it can't move.
    const drive = (
        key: string,
        target: Concrete,
        transition: Transition,
        parent: Style | undefined,
    ): unknown => {
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
            // Start from what's on screen, so an interrupted change doesn't jump.
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
        const [from, end] = sameUnits(
            transition.property,
            track.from,
            track.to,
            parent,
        );
        if (!interpolates(from, end)) return target;
        const { inputRange, outputRange } = stops(from, end);
        return track.progress.interpolate({
            inputRange,
            // Both numbers or both strings, which `interpolates` checked.
            outputRange: outputRange as unknown as number[],
        });
    };

    useLayoutEffect(() => {
        for (const {
            track,
            transition,
            previous,
            previousProgress,
        } of pending.current.splice(0)) {
            previous?.stop();
            previousProgress.removeAllListeners();
            // Colors and layout can't use the native driver, so transitions stay in JS.
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

    return (
        slot: string,
        style: Style,
        transitions: readonly Transition[],
        animated: Record<string, unknown>,
        /** The parent slot's style, for percentages that move to or from pixels. */
        parent?: Style,
    ) => {
        // A property out from under its transition (a slider's handle while it's dragged)
        // forgets where it was, so when the transition returns it starts from where it is.
        const moving = new Set(transitions.map((t) => `${slot}.${t.property}`));
        for (const [key, track] of tracks.current) {
            if (!key.startsWith(`${slot}.`)) continue;
            const property = key.slice(slot.length + 1).split(".")[0]!;
            if (moving.has(`${slot}.${property}`)) continue;
            track.animation?.stop();
            track.progress.removeAllListeners();
            tracks.current.delete(key);
        }
        for (const transition of transitions) {
            const target = style[transition.property];
            const key = `${slot}.${transition.property}`;
            if (typeof target === "number" || typeof target === "string") {
                animated[transition.property] = drive(
                    key,
                    target,
                    transition,
                    parent,
                );
            } else if (
                transition.property === "transform" &&
                Array.isArray(target)
            ) {
                // Each step moves on its own, as CSS interpolates transforms of one shape.
                animated.transform = (target as Record<string, Concrete>[]).map(
                    (step, index) =>
                        Object.fromEntries(
                            Object.entries(step).map(([name, value]) => [
                                name,
                                drive(
                                    `${key}.${index}.${name}`,
                                    value,
                                    transition,
                                    parent,
                                ),
                            ]),
                        ),
                );
            }
        }
    };
};
