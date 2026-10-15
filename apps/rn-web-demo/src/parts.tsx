// What the demo's components share: casts for the adapter's styles, interaction state, press
// ripples, and glyphs standing in for icons.

import type { State, Style } from "@pureform/rn-adapter";
import { useRipple } from "@pureform/rn-adapter/animated";
import { pressableState, useComponentStyles } from "@pureform/rn-adapter/react";
import { useState } from "react";
import type { ComponentProps } from "react";
import { Animated, Pressable } from "react-native";
import type { TextStyle, ViewStyle } from "react-native";

// The adapter's styles are checked against React Native's types when lowered.
export const view = (style: Style | undefined) => style as ViewStyle;
export const text = (style: Style | undefined) => style as TextStyle;

// Animated styles hold animated values where a property transitions.
export type Animatable = Record<string, unknown> | undefined;
export const aview = (style: Animatable) =>
    style as Animated.WithAnimatedValue<ViewStyle>;
export const atext = (style: Animatable) =>
    style as Animated.WithAnimatedValue<TextStyle>;

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

/** An animated Pressable that starts a press at once, as React Native does on a device.
 *  React Native Web holds a press's start for 50ms by default, which delays the pressed
 *  state and the ripple. */
export const AnimatedPressable = (
    props: ComponentProps<typeof AnimatedPressableBase>,
) => (
    // React Native's types call it unstable_pressDelay, and React Native Web reads delayPressIn.
    <AnimatedPressableBase {...({ delayPressIn: 0 } as object)} {...props} />
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
    const own = useComponentStyles(name, variants, state)[
        options.slot ?? "root"
    ];
    const radius = own?.borderRadius;
    return useRipple({
        color: String(own?.color ?? "rgb(0, 0, 0)"),
        ...(typeof radius === "number" || typeof radius === "string"
            ? { radius }
            : {}),
        ...(options.centered ? { centered: true } : {}),
        ...(options.disabled ? { disabled: true } : {}),
    });
};

/** Pressable handlers with a ripple's added. */
export const withInk = (
    handlers: ReturnType<typeof usePress>["handlers"],
    ink: ReturnType<typeof useRipple>,
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
