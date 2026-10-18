// Motion engines: what runs a component's transitions, keyframe animations, and ripples, and
// draws its shapes. The provider holds one, and components render its views. `animated` (React
// Native's Animated, no SVG) is the default; `@pureform/react-native/svg`,
// `/reanimated`, and `/reanimated-svg` add the others, so an app only imports
// react-native-svg and Reanimated when it picks an engine that needs them.

import {
    animatedPresence,
    useAnimatedComponentStyles,
    useRipple,
} from "@pureform/rn-adapter/animated";
import type {
    PresenceDriver,
    RippleOptions,
    Ripples,
} from "@pureform/rn-adapter/animated";
import type { Drawing, State, ThemeValues } from "@pureform/rn-adapter/factory";
import type { SvgDrawingProps } from "@pureform/rn-adapter/svg";
import { createElement } from "react";
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

/** What runs a component's motion and draws its shapes. */
export interface MotionEngine {
    /** The engine's name; components start over when it changes, since its hooks differ. */
    readonly name: string;
    /** Whether it draws shapes and gradients with SVG; selection returns drawings only then. */
    readonly svg: boolean;
    /** A component's styles per slot, transitions and keyframe animations running, for
     *  `variants`, `state`, and the instance's `tokens` by theme key. */
    useStyles(
        name: string,
        variants: Record<string, string | boolean | undefined>,
        state: State,
        tokens: ThemeValues | undefined,
    ): MotionStyles;
    /** Press ripples for a surface. */
    useRipple(options: InkOptions): Ripples;
    /** What runs one overlay's enter and exit, telling when each step ends. Without it,
     *  overlays show and go at once. */
    presence?(): PresenceDriver;
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
    function PressNow(props: object): ReactNode {
        // React Native's types call it unstable_pressDelay, and React Native Web reads
        // delayPressIn.
        return createElement(Base, { delayPressIn: 0, ...props });
    };

/** React Native's Animated, on the JavaScript thread, with no SVG: shapes take their rounded
 *  fallback, gradients drop, and ripples are solid discs. */
export const animated: MotionEngine = {
    name: "animated",
    svg: false,
    useStyles: useAnimatedComponentStyles,
    useRipple,
    presence: animatedPresence,
    View: Animated.View,
    Text: Animated.Text,
    TextInput: Animated.createAnimatedComponent(TextInput),
    Pressable: pressNow(Animated.createAnimatedComponent(Pressable)),
};
