// What the demo's components share: casts for the adapter's styles, interaction state, press
// ripples, and glyphs standing in for icons.

import type { State, Style } from "@pureform/rn-adapter";
import { useAnimatedComponentStyles } from "@pureform/rn-adapter/animated";
import { pressableState, useComponentState } from "@pureform/rn-adapter/react";
import { useReanimatedComponentStyles } from "@pureform/rn-adapter/reanimated";
import {
    ReanimatedSvgDrawing,
    useReanimatedSvgRipple,
} from "@pureform/rn-adapter/reanimated-svg";
import { SvgDrawing, useSvgRipple } from "@pureform/rn-adapter/svg";
import { createContext, createElement, useContext, useState } from "react";
import type { ComponentProps, ComponentType } from "react";
import { Animated, Pressable, TextInput } from "react-native";
import type { TextStyle, ViewStyle } from "react-native";
import Reanimated from "react-native-reanimated";

// The adapter's styles are checked against React Native's types when lowered.
export const view = (style: Style | undefined) => style as ViewStyle;
export const text = (style: Style | undefined) => style as TextStyle;

// Animated styles hold animated values where a property transitions.
export type Animatable = Record<string, unknown> | undefined;
export const aview = (style: Animatable) =>
    style as Animated.WithAnimatedValue<ViewStyle>;
export const atext = (style: Animatable) =>
    style as Animated.WithAnimatedValue<TextStyle>;

/** The engine that runs the components' transitions and animations: React Native's
 *  Animated, through useAnimatedComponentStyles, or Reanimated, through
 *  useReanimatedComponentStyles. */
export type Motion = "Animated" | "Reanimated";

const MotionContext = createContext<Motion>("Animated");
export const MotionProvider = MotionContext.Provider;

/** A component's styles, from the engine the page picked. Both hooks run, so switching
 *  engines keeps the hooks in order. */
export const useMotionStyles = (
    ...args: Parameters<typeof useAnimatedComponentStyles>
): Record<string, Record<string, unknown>> => {
    const animated = useAnimatedComponentStyles(...args);
    const reanimated = useReanimatedComponentStyles(...args);
    return useContext(MotionContext) === "Reanimated" ? reanimated : animated;
};

// One of the components' animated parts, from the engine the page picked.
const either =
    <C extends ComponentType<any>>(animated: C, reanimated: unknown) =>
    (props: ComponentProps<C>) =>
        createElement(
            (useContext(MotionContext) === "Reanimated"
                ? reanimated
                : animated) as C,
            props,
        );

export const MView = either(Animated.View, Reanimated.View);
export const MSvgDrawing = either(SvgDrawing, ReanimatedSvgDrawing);
export const MText = either(Animated.Text, Reanimated.Text);
export const MTextInput = either(
    Animated.createAnimatedComponent(TextInput),
    Reanimated.createAnimatedComponent(TextInput),
);
const PressableBase = either(
    Animated.createAnimatedComponent(Pressable),
    Reanimated.createAnimatedComponent(Pressable),
);

/** An animated Pressable that starts a press at once, as React Native does on a device.
 *  React Native Web holds a press's start for 50ms by default, which delays the pressed
 *  state and the ripple. */
export const MPressable = (props: ComponentProps<typeof PressableBase>) => (
    // React Native's types call it unstable_pressDelay, and React Native Web reads delayPressIn.
    <PressableBase {...({ delayPressIn: 0 } as object)} {...props} />
);

// Controls aren't text to select. Native text isn't selectable unless asked, but React Native
// Web's is, and a drag across a control would select its parts.
export const unselectable = { userSelect: "none" } as const;

/** Pressable's interaction state, as handlers to spread on it. */
export const usePress = (
    own: Omit<State, "pressed" | "hover" | "focus" | "focusVisible" | "active">,
) => {
    const [pressed, setPressed] = useState(false);
    const [hovered, setHovered] = useState(false);
    const [focused, setFocused] = useState(false);
    return {
        state: pressableState({ pressed, hovered, focused }, own),
        handlers: {
            onPressIn: () => setPressed(true),
            onPressOut: () => setPressed(false),
            onHoverIn: () => setHovered(true),
            onHoverOut: () => setHovered(false),
            onFocus: () => setFocused(true),
            onBlur: () => setFocused(false),
        },
    };
};

/** Press ripples for a component, in the content color and corners of one of its slots. */
export const useInk = (
    name: string,
    variants: Record<string, string | undefined>,
    state: State,
    options: { slot?: string; centered?: boolean; disabled?: boolean } = {},
) => {
    const slot = options.slot ?? "root";
    const { styles, drawings } = useComponentState(name, variants, state);
    const own = styles[slot];
    const radius = own?.borderRadius;
    // Clipped to the surface's shape, where it draws one, and moved by the chosen engine.
    const ripple = {
        clip: drawings[slot],
        color: String(own?.color ?? "rgb(0, 0, 0)"),
        ...(typeof radius === "number" || typeof radius === "string"
            ? { radius }
            : {}),
        ...(options.centered ? { centered: true } : {}),
        ...(options.disabled ? { disabled: true } : {}),
    };
    const animated = useSvgRipple(ripple);
    const reanimated = useReanimatedSvgRipple(ripple);
    return useContext(MotionContext) === "Reanimated" ? reanimated : animated;
};

/** Pressable handlers with a ripple's added. */
export const withInk = (
    handlers: ReturnType<typeof usePress>["handlers"],
    ink: ReturnType<typeof useSvgRipple>,
) => ({
    ...handlers,
    onPressIn: (event: { nativeEvent: { pageX: number; pageY: number } }) => {
        handlers.onPressIn();
        ink.handlers.onPressIn(event);
    },
    onPressOut: () => {
        handlers.onPressOut();
        ink.handlers.onPressOut();
    },
});

export type Color = "primary" | "secondary" | "tertiary" | "error";

// Text properties a component sets on itself, for its own text, since a View passes none down.
const TEXT = [
    "color",
    "fontFamily",
    "fontSize",
    "fontWeight",
    "lineHeight",
    "letterSpacing",
];
export const ownText = (style: Style | undefined) =>
    Object.fromEntries(
        Object.entries(style ?? {}).filter(([key]) => TEXT.includes(key)),
    );

export type Group = Color | "success" | "warning" | "info";

/** A glyph standing in for an icon, in an icon slot's type and color. */
export const Glyph = (props: { style: Animatable; glyph: string }) => (
    <Animated.Text
        selectable={false}
        style={atext(ownText(props.style as Style))}
    >
        {props.glyph}
    </Animated.Text>
);
