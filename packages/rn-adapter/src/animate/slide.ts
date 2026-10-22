// An active indicator sliding into its place through Animated: a progress from 0 to 1 per slide, on a spring (`settle`) or a curve,
// the view's transform interpolating from the slide's offset to none. Transforms run on the
// native thread on a device.

import { useLayoutEffect, useMemo } from "react";
import { Animated } from "react-native";

import type { SlideMotion } from "../motion";
import { NATIVE_DRIVER, curve } from "./curve";
import { settle } from "./settle";

/** The style that slides a view into its place, for each new `motion`; `undefined` without one.
 *  The view is drawn at the slide's start from its first render, and the slide starts once that
 *  render commits. A new `motion` stops the one before. */
export const useAnimatedSlide = (
    motion: SlideMotion | undefined,
): Record<string, unknown> | undefined => {
    const progress = useMemo(
        () => (motion ? new Animated.Value(0) : undefined),
        [motion],
    );
    useLayoutEffect(() => {
        if (!motion || !progress) return;
        if (motion.spring) {
            // A real spring, carrying on the speed an interrupted slide had.
            const { spring, velocity = 0, delay } = motion;
            let stop = () => {};
            const start = () => {
                stop = settle(progress, velocity / 1000, spring, 1);
            };
            if (delay > 0) {
                const timer = setTimeout(start, delay);
                return () => {
                    clearTimeout(timer);
                    stop();
                };
            }
            start();
            return () => stop();
        }
        const animation = Animated.timing(progress, {
            toValue: 1,
            duration: motion.duration,
            delay: motion.delay,
            easing: curve(motion.easing),
            useNativeDriver: NATIVE_DRIVER,
        });
        animation.start();
        return () => animation.stop();
    }, [motion, progress]);
    return useMemo(() => {
        if (!motion || !progress) return undefined;
        const from = (start: number, end: number) =>
            progress.interpolate({
                inputRange: [0, 1],
                outputRange: [start, end],
            });
        return {
            transform: [
                { translateX: from(motion.from.translateX, 0) },
                { scaleX: from(motion.from.scaleX, 1) },
            ],
        };
    }, [motion, progress]);
};
