// Keyframe animations: each slot's animation drives a looped Animated value, and each value
// and transform step its frames move interpolates through their offsets, the animation's curve
// easing each step between two frames, as CSS's timing function does.

import { useEffect, useLayoutEffect, useRef } from "react";
import { Animated } from "react-native";

import { channels } from "../motion";
import type { Style } from "../select";
import type { Animation } from "../values";
import { curve } from "./curve";

// A keyframe animation on one slot: its progress, and what drives it once started.
interface Loop {
    key: string;
    animation: Animation;
    progress: Animated.Value;
    running?: Animated.CompositeAnimation;
}

/** Drives a keyframe animation's progress from 0 to 1 each time through: backwards for
 *  `reverse`, there and back for `alternate`, as many times as it runs, after its delay. The
 *  progress is the directed one, through the frames' offsets, linear in time. */
export const runKeyframes = (
    progress: Animated.Value,
    animation: Pick<
        Animation,
        "direction" | "duration" | "iterations" | "delay"
    >,
): Animated.CompositeAnimation => {
    const backwards =
        animation.direction === "reverse" ||
        animation.direction === "alternateReverse";
    const alternate = animation.direction.startsWith("alternate");
    const [start, end] = backwards ? [1, 0] : [0, 1];
    const leg = (to: number) =>
        Animated.timing(progress, {
            toValue: to,
            duration: animation.duration,
            // Linear here: the curve eases each step between two frames, as CSS's does.
            easing: (t: number) => t,
            useNativeDriver: false,
        });
    const once = alternate
        ? Animated.sequence([leg(end), leg(start)])
        : Animated.sequence([
              Animated.timing(progress, {
                  toValue: start,
                  duration: 0,
                  useNativeDriver: false,
              }),
              leg(end),
          ]);
    const loop = Animated.loop(once, {
        iterations:
            animation.iterations < 0
                ? -1
                : alternate
                  ? Math.ceil(animation.iterations / 2)
                  : animation.iterations,
    });
    return animation.delay > 0
        ? Animated.sequence([Animated.delay(animation.delay), loop])
        : loop;
};

/** A function that puts a slot's keyframe animation into its animated style. A changed
 *  animation replaces the running one once the render commits. */
export const useKeyframes = () => {
    const loops = useRef(new Map<string, Loop>());
    const stale = useRef<Loop[]>([]);

    useLayoutEffect(() => {
        for (const loop of stale.current.splice(0)) loop.running?.stop();
        for (const loop of loops.current.values()) {
            if (loop.running) continue;
            loop.running = runKeyframes(loop.progress, loop.animation);
            loop.running.start();
        }
    });

    useEffect(
        () => () => {
            for (const loop of loops.current.values()) loop.running?.stop();
        },
        [],
    );

    return (
        slot: string,
        style: Style,
        animation: Animation | undefined,
        animated: Record<string, unknown>,
    ) => {
        const key = animation ? JSON.stringify(animation) : undefined;
        let loop = loops.current.get(slot);
        if (loop && loop.key !== key) {
            stale.current.push(loop);
            loops.current.delete(slot);
            loop = undefined;
        }
        if (animation && !loop) {
            loop = { key: key!, animation, progress: new Animated.Value(0) };
            loops.current.set(slot, loop);
        }
        if (!loop) return;
        const transform = Array.isArray(animated.transform ?? style.transform)
            ? (
                  (animated.transform ?? style.transform) as Record<
                      string,
                      unknown
                  >[]
              ).map((step) => ({ ...step }))
            : [];
        for (const channel of channels(loop.animation.frames, style)) {
            const value = loop.progress.interpolate({
                inputRange: channel.inputRange,
                outputRange: channel.outputRange as unknown as number[],
                easing: curve(loop.animation.easing),
            });
            if (channel.step) {
                const [index, name] = channel.step;
                transform[index] = { ...transform[index], [name]: value };
            } else {
                animated[channel.property] = value;
            }
        }
        if (transform.length > 0) animated.transform = transform;
    };
};
