// The core set as React Native components, styled by the adapter. Each tracks its interaction
// state, asks for its slots' styles, and lays the slots out as the web markup does.

import type { State, Style } from "@pureform/rn-adapter";
import {
    pressableState,
    useRecipe,
    useTokens,
} from "@pureform/rn-adapter/react";
import { useState } from "react";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import type { TextStyle, ViewStyle } from "react-native";

// The adapter's styles are checked against React Native's types when lowered.
const view = (style: Style | undefined) => style as ViewStyle;
const text = (style: Style | undefined) => style as TextStyle;

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
    const s = useRecipe(
        "button",
        { variant: props.variant, color: props.color },
        state,
    );
    return (
        <Pressable
            {...handlers}
            role="button"
            disabled={props.disabled}
            onPress={props.onPress}
            style={view(s.root)}
            testID={`button-${props.variant ?? "filled"}`}
        >
            <View pointerEvents="none" style={view(s.touchTarget)} />
            <Text style={text(s.label)}>{props.label}</Text>
        </Pressable>
    );
}

export function Chip(props: {
    label: string;
    variant?: "outlined" | "elevated";
    selected?: boolean;
    onPress?: () => void;
}) {
    const { state, handlers } = usePress({ selected: props.selected ?? false });
    const s = useRecipe("chip", { variant: props.variant }, state);
    return (
        <Pressable
            {...handlers}
            role="button"
            onPress={props.onPress}
            style={view(s.root)}
        >
            <View pointerEvents="none" style={view(s.touchTarget)} />
            <Text style={text(s.label)}>{props.label}</Text>
        </Pressable>
    );
}

export function Checkbox(props: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: string;
}) {
    const { state, handlers } = usePress({ checked: props.checked });
    const s = useRecipe("checkbox", {}, state);
    return (
        <Pressable
            {...handlers}
            role="checkbox"
            aria-checked={props.checked}
            aria-label={props.label}
            onPress={() => props.onChange(!props.checked)}
            style={view(s.root)}
        >
            <View pointerEvents="none" style={view(s.touchTarget)} />
            <View style={view(s.box)}>
                <Text style={text(s.checkIcon)}>✓</Text>
            </View>
        </Pressable>
    );
}

export function Switch(props: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: string;
}) {
    const { state, handlers } = usePress({ checked: props.checked });
    const s = useRecipe("switchControl", {}, state);
    return (
        <Pressable
            {...handlers}
            role="switch"
            aria-checked={props.checked}
            aria-label={props.label}
            onPress={() => props.onChange(!props.checked)}
            style={view(s.root)}
        >
            <View pointerEvents="none" style={view(s.touchTarget)} />
            <View style={view(s.track)}>
                <View style={view(s.stateLayer)} />
                <View style={view(s.handle)}>
                    <Text style={text(s.icon)}>{props.checked ? "✓" : ""}</Text>
                </View>
            </View>
        </Pressable>
    );
}

export function Card(props: {
    variant?: "elevated" | "filled" | "outlined";
    children: ReactNode;
}) {
    const s = useRecipe("card", { variant: props.variant });
    return <View style={view(s.root)}>{props.children}</View>;
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
