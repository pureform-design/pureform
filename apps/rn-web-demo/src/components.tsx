// The core set as React Native components, styled by the adapter. Each tracks its interaction
// state, asks for its slots' styles, and lays the slots out as the web markup does. The
// interactive ones animate their state changes.

import type { State, Style } from "@pureform/rn-adapter";
import { useAnimatedRecipe } from "@pureform/rn-adapter/animated";
import {
    pressableState,
    useRecipe,
    useTokens,
} from "@pureform/rn-adapter/react";
import { useState } from "react";
import type { ReactNode } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import type { TextStyle, ViewStyle } from "react-native";

// The adapter's styles are checked against React Native's types when lowered.
const view = (style: Style | undefined) => style as ViewStyle;
const text = (style: Style | undefined) => style as TextStyle;

// Animated styles hold animated values where a property transitions.
type Animatable = Record<string, unknown> | undefined;
const aview = (style: Animatable) =>
    style as Animated.WithAnimatedValue<ViewStyle>;
const atext = (style: Animatable) =>
    style as Animated.WithAnimatedValue<TextStyle>;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Pressable's interaction state, as handlers to spread on it. */
const usePress = (
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

type Color = "primary" | "secondary" | "tertiary" | "error";

export function Button(props: {
    label: string;
    variant?: "filled" | "tonal" | "outlined" | "text" | "elevated";
    color?: Color;
    disabled?: boolean;
    onPress?: () => void;
}) {
    const { state, handlers } = usePress({ disabled: props.disabled ?? false });
    const s = useAnimatedRecipe(
        "button",
        { variant: props.variant, color: props.color },
        state,
    );
    return (
        <AnimatedPressable
            {...handlers}
            role="button"
            disabled={props.disabled}
            onPress={props.onPress}
            style={aview(s.root)}
            testID={`button-${props.variant ?? "filled"}`}
        >
            <Animated.View pointerEvents="none" style={aview(s.touchTarget)} />
            <Animated.Text style={atext(s.label)}>{props.label}</Animated.Text>
        </AnimatedPressable>
    );
}

export function Chip(props: {
    label: string;
    variant?: "outlined" | "elevated";
    selected?: boolean;
    onPress?: () => void;
}) {
    const { state, handlers } = usePress({ selected: props.selected ?? false });
    const s = useAnimatedRecipe("chip", { variant: props.variant }, state);
    return (
        <AnimatedPressable
            {...handlers}
            role="button"
            onPress={props.onPress}
            style={aview(s.root)}
        >
            <Animated.View pointerEvents="none" style={aview(s.touchTarget)} />
            <Animated.Text style={atext(s.label)}>{props.label}</Animated.Text>
        </AnimatedPressable>
    );
}

export function Checkbox(props: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: string;
}) {
    const { state, handlers } = usePress({ checked: props.checked });
    const s = useAnimatedRecipe("checkbox", {}, state);
    return (
        <AnimatedPressable
            {...handlers}
            role="checkbox"
            aria-checked={props.checked}
            aria-label={props.label}
            onPress={() => props.onChange(!props.checked)}
            style={aview(s.root)}
        >
            <Animated.View pointerEvents="none" style={aview(s.touchTarget)} />
            <Animated.View style={aview(s.box)}>
                <Animated.Text style={atext(s.checkIcon)}>✓</Animated.Text>
            </Animated.View>
        </AnimatedPressable>
    );
}

export function Switch(props: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: string;
}) {
    const { state, handlers } = usePress({ checked: props.checked });
    const s = useAnimatedRecipe("switchControl", {}, state);
    return (
        <AnimatedPressable
            {...handlers}
            role="switch"
            aria-checked={props.checked}
            aria-label={props.label}
            onPress={() => props.onChange(!props.checked)}
            style={aview(s.root)}
        >
            <Animated.View pointerEvents="none" style={aview(s.touchTarget)} />
            <Animated.View style={aview(s.track)}>
                <Animated.View style={aview(s.stateLayer)} />
                <Animated.View style={aview(s.handle)}>
                    <Animated.Text style={atext(s.icon)}>
                        {props.checked ? "✓" : ""}
                    </Animated.Text>
                </Animated.View>
            </Animated.View>
        </AnimatedPressable>
    );
}

export function Card(props: {
    variant?: "elevated" | "filled" | "outlined";
    children: ReactNode;
}) {
    const s = useAnimatedRecipe("card", { variant: props.variant });
    return (
        <Animated.View style={aview(s.root)}>{props.children}</Animated.View>
    );
}

type TextStyleName =
    | "headlineMedium"
    | "titleLarge"
    | "titleMedium"
    | "bodyMedium"
    | "labelLarge";

/** Text in a type style. Without CSS inheritance from the page, it takes the surface's text
 *  color unless it sits in a component that sets its own. */
export function Type(props: { style: TextStyleName; children: ReactNode }) {
    const s = useRecipe("text", { style: props.style });
    const tokens = useTokens();
    return (
        <Text
            style={[{ color: String(tokens["colors.onSurface"]) }, text(s[""])]}
        >
            {props.children}
        </Text>
    );
}

// Text properties a component sets on itself, for its own text, since a View passes none down.
const TEXT = [
    "color",
    "fontFamily",
    "fontSize",
    "fontWeight",
    "lineHeight",
    "letterSpacing",
];
const ownText = (style: Style | undefined) =>
    Object.fromEntries(
        Object.entries(style ?? {}).filter(([key]) => TEXT.includes(key)),
    );

export function Avatar(props: {
    initials: string;
    size?: "small" | "medium" | "large";
    color?: Color;
}) {
    const s = useRecipe("avatar", { size: props.size, color: props.color });
    return (
        <View role="img" aria-label={props.initials} style={view(s[""])}>
            <Text style={text(ownText(s[""]))}>{props.initials}</Text>
        </View>
    );
}
