// Animated styles: a component's styles where each property with a transition moves to its new
// value, and each keyframe animation runs, through React Native's Animated, which React
// Native Web runs too. Pass the slots' styles to `Animated.View` and `Animated.Text`.

import type { TokenVelocities } from "../motion";
import { useComponentState } from "../react";
import type { State } from "../select";
import type { ThemeValues } from "../values";
import { useKeyframes } from "./keyframes";
import { useTransitions } from "./transitions";

/** A component's styles per slot, with transitioned and keyframed properties as animated
 *  values. `tokens` gives this one instance its own token values. */
export const useAnimatedComponentStyles = (
    name: string,
    variants: Record<string, string | boolean | undefined> = {},
    state: State = {},
    tokens?: ThemeValues,
    velocities?: TokenVelocities,
): Record<string, Record<string, unknown>> => {
    const { styles, transitions, animations, parents } = useComponentState(
        name,
        variants,
        state,
        tokens,
        velocities,
    );
    const transition = useTransitions();
    const keyframes = useKeyframes();
    const out: Record<string, Record<string, unknown>> = {};
    for (const [slot, style] of Object.entries(styles)) {
        const animated: Record<string, unknown> = { ...style };
        const parent = parents[slot];
        transition(
            slot,
            style,
            transitions[slot] ?? [],
            animated,
            parent === undefined ? undefined : styles[parent],
        );
        keyframes(slot, style, animations[slot], animated);
        out[slot] = animated;
    }
    return out;
};
