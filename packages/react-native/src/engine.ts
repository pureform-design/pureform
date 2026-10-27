// Motion engines: what runs a component's transitions, keyframe animations, and ripples, and
// draws its shapes. The provider holds one, and components render its views. `animated` (React
// Native's Animated, no SVG) is the default; `@pureform/react-native/svg`,
// `/reanimated`, and `/reanimated-svg` add the others, so an app only imports
// react-native-svg and Reanimated when it picks an engine that needs them.

import { claimEvent } from "@pureform/machines/interaction";
import {
    animatedPresence,
    useAnimatedComponentStyles,
    useAnimatedSlide,
    useRipple,
} from "@pureform/rn-adapter/animated";
import type {
    PresenceDriver,
    RippleOptions,
    Ripples,
    SlideMotion,
} from "@pureform/rn-adapter/animated";
import type { Drawing, State, ThemeValues } from "@pureform/rn-adapter/factory";
import type { TokenVelocities } from "@pureform/rn-adapter/react";
import type { SvgDrawingProps } from "@pureform/rn-adapter/svg";
import { createElement, useEffect, useRef } from "react";
import type { ComponentType, ReactNode } from "react";
import { Animated, Pressable, TextInput } from "react-native";

/** A component's styles per slot, with the properties that move as the engine's animated
 *  values. */
export type MotionStyles = Record<string, Record<string, unknown>>;

/** What a slot's drawing component takes: the slot's drawing, and an image to fill its shape. */
export type DrawingProps = SvgDrawingProps;

/** A ripple's options: the surface's content color and corners, and its drawing to clip to. */
export interface InkOptions extends RippleOptions {
    readonly clip?: Drawing | undefined;
}

/** What runs a component's motion and draws its shapes. Its functions are hooks and plain
 *  functions, called without the engine as `this`. */
export interface MotionEngine {
    /** The engine's name; components start over when it changes, since its hooks differ. */
    readonly name: string;
    /** Whether it draws shapes and gradients with SVG; selection returns drawings only then. */
    readonly svg: boolean;
    /** A component's styles per slot, transitions and keyframe animations running, for
     *  `variants`, `state`, and the instance's `tokens` by theme key, moving tokens starting at
     *  `velocities` (by theme key, in their units per second). */
    useStyles(
        this: void,
        name: string,
        variants: Record<string, string | boolean | undefined>,
        state: State,
        tokens: ThemeValues | undefined,
        velocities?: TokenVelocities,
    ): MotionStyles;
    /** Press ripples for a surface. */
    useRipple(this: void, options: InkOptions): Ripples;
    /** What runs one overlay's enter and exit, telling when each step ends. Without it,
     *  overlays show and go at once. */
    presence?(this: void): PresenceDriver;
    /** Whether the engine's slide runs a real spring (`useSlide` takes the motion's `spring`),
     *  rather than its duration and curve. */
    readonly slideSpring?: boolean;
    /** The style that slides an active indicator into its place from where another was drawn,
     *  for each new `motion` (a hook). Without it, the indicator moves at once. */
    useSlide?(
        this: void,
        motion: SlideMotion | undefined,
    ): Record<string, unknown> | undefined;
    /** The engine's views, which take its animated styles. */
    readonly View: ComponentType<any>;
    readonly Text: ComponentType<any>;
    readonly TextInput: ComponentType<any>;
    readonly Pressable: ComponentType<any>;
    /** Draws a slot's shape, fill, and gradient; none without SVG. */
    readonly Drawing?: ComponentType<DrawingProps>;
}

/** A pressable that starts a press at once, as React Native does on a device. React Native Web
 *  holds a press's start for 50ms by default, which delays the pressed state and the ripple. */
export const pressNow = (Base: ComponentType<any>): ComponentType<any> =>
    function PressNow(props: {
        disabled?: boolean;
        onPress?: (event: any) => void;
        onPressIn?: (event: any) => void;
        onPressOut?: (event: any) => void;
    }): ReactNode {
        const recent = useRef(false);
        const timer = useRef<ReturnType<typeof setTimeout> | undefined>(
            undefined,
        );
        useEffect(() => () => clearTimeout(timer.current), []);
        // React Native's types call it unstable_pressDelay, and React Native Web reads
        // delayPressIn.
        return createElement(Base, {
            delayPressIn: 0,
            ...props,
            onPressIn: (event: unknown) => {
                clearTimeout(timer.current);
                recent.current = true;
                props.onPressIn?.(event);
            },
            onPressOut: (event: unknown) => {
                props.onPressOut?.(event);
                timer.current = setTimeout(() => {
                    recent.current = false;
                }, 0);
            },
            onPress: (event: any) => {
                const native = event?.nativeEvent ?? event;
                // Native Web's click-only activation bypasses Pressable's press-in/out path.
                // Actual devices already provide that path. Preserve the action, and synthesize
                // only the missing interaction pair, not another activation callback.
                if (
                    !props.disabled &&
                    native?.type === "click" &&
                    native.detail === 0 &&
                    !recent.current &&
                    claimEvent(event)
                ) {
                    const virtual = {
                        ...event,
                        nativeEvent: { type: "click" },
                    };
                    props.onPressIn?.(virtual);
                    props.onPressOut?.(virtual);
                }
                recent.current = false;
                props.onPress?.(event);
            },
        });
    };

/** React Native's Animated, on the JavaScript thread, with no SVG: shapes take their rounded
 *  fallback, gradients drop, and ripples are solid discs. */
export const animated: MotionEngine = {
    name: "animated",
    svg: false,
    useStyles: useAnimatedComponentStyles,
    useRipple,
    presence: animatedPresence,
    useSlide: useAnimatedSlide,
    slideSpring: true,
    View: Animated.View,
    Text: Animated.Text,
    TextInput: Animated.createAnimatedComponent(TextInput),
    Pressable: pressNow(Animated.createAnimatedComponent(Pressable)),
};
