// The components the adapter covers, as React Native components, styled by the adapter. Each tracks its interaction
// state, asks for its slots' styles, and lays the slots out as the web markup does. The
// interactive ones animate their state changes.

import type { State, Style } from "@pureform/rn-adapter";
import { useAnimatedRecipe, useRipple } from "@pureform/rn-adapter/animated";
import {
    pressableState,
    useRecipe,
    useTokens,
} from "@pureform/rn-adapter/react";
import { useState } from "react";
import type { ReactNode } from "react";
import { Animated, Image, Pressable, Text, View } from "react-native";
import type { ImageStyle, TextStyle, ViewStyle } from "react-native";

// The adapter's styles are checked against React Native's types when lowered.
export const view = (style: Style | undefined) => style as ViewStyle;
export const text = (style: Style | undefined) => style as TextStyle;

// Animated styles hold animated values where a property transitions.
export type Animatable = Record<string, unknown> | undefined;
export const aview = (style: Animatable) =>
    style as Animated.WithAnimatedValue<ViewStyle>;
export const atext = (style: Animatable) =>
    style as Animated.WithAnimatedValue<TextStyle>;

export const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
    const own = useRecipe(name, variants, state)[options.slot ?? "root"];
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
    const ink = useInk(
        "button",
        { variant: props.variant, color: props.color },
        state,
        { disabled: props.disabled ?? false },
    );
    return (
        <AnimatedPressable
            {...withInk(handlers, ink)}
            role="button"
            disabled={props.disabled}
            onPress={props.onPress}
            style={aview({ ...s.root, ...unselectable })}
            testID={`button-${props.variant ?? "filled"}`}
        >
            <Animated.View pointerEvents="none" style={aview(s.touchTarget)} />
            <Animated.Text selectable={false} style={atext(s.label)}>
                {props.label}
            </Animated.Text>
            {ink.layer}
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
    const ink = useInk("chip", { variant: props.variant }, state);
    return (
        <AnimatedPressable
            {...withInk(handlers, ink)}
            role="button"
            onPress={props.onPress}
            style={aview({ ...s.root, ...unselectable })}
        >
            <Animated.View pointerEvents="none" style={aview(s.touchTarget)} />
            <Animated.Text selectable={false} style={atext(s.label)}>
                {props.label}
            </Animated.Text>
            {ink.layer}
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
            style={aview({ ...s.root, ...unselectable })}
        >
            <Animated.View pointerEvents="none" style={aview(s.touchTarget)} />
            <Animated.View style={aview(s.box)}>
                <Animated.View style={aview(s.checkIcon)} />
                <Animated.View style={aview(s.indeterminateIcon)} />
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
            style={aview({ ...s.root, ...unselectable })}
        >
            <Animated.View pointerEvents="none" style={aview(s.touchTarget)} />
            <Animated.View style={aview(s.track)}>
                <Animated.View style={aview(s.stateLayer)} />
                <Animated.View style={aview(s.handle)}>
                    <Animated.Text selectable={false} style={atext(s.icon)}>
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
export const ownText = (style: Style | undefined) =>
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

export function Icon(props: {
    glyph: string;
    size?: "small" | "medium" | "large";
    color?: Group;
}) {
    const s = useRecipe("icon", { size: props.size, color: props.color });
    const tokens = useTokens();
    return (
        <View role="img" style={view(s[""])}>
            <Text
                selectable={false}
                style={[
                    { color: String(tokens["colors.onSurface"]) },
                    text(ownText(s[""])),
                ]}
            >
                {props.glyph}
            </Text>
        </View>
    );
}

export function IconButton(props: {
    glyph: string;
    label: string;
    variant?: "filled" | "tonal" | "outlined" | "standard" | "elevated";
    size?: "small" | "medium" | "large";
    disabled?: boolean;
}) {
    const { state, handlers } = usePress({ disabled: props.disabled ?? false });
    const s = useAnimatedRecipe(
        "iconButton",
        { variant: props.variant, size: props.size },
        state,
    );
    const ink = useInk(
        "iconButton",
        { variant: props.variant, size: props.size },
        state,
        {
            slot: "container",
            centered: true,
            disabled: props.disabled ?? false,
        },
    );
    return (
        <AnimatedPressable
            {...withInk(handlers, ink)}
            role="button"
            aria-label={props.label}
            disabled={props.disabled}
            style={aview({ ...s.root, ...unselectable })}
        >
            <Animated.View pointerEvents="none" style={aview(s.touchTarget)} />
            <Animated.View style={aview(s.container)}>
                <Animated.View style={aview(s.icon)}>
                    <Glyph style={s.icon} glyph={props.glyph} />
                </Animated.View>
                {ink.layer}
            </Animated.View>
            {props.variant === "outlined" && (
                <Animated.View pointerEvents="none" style={aview(s.outline)} />
            )}
        </AnimatedPressable>
    );
}

export function Fab(props: {
    glyph: string;
    label?: string;
    variant?: "tonal" | "filled" | "surface";
    size?: "small" | "medium" | "large";
}) {
    const { state, handlers } = usePress({});
    const s = useAnimatedRecipe(
        "fab",
        {
            variant: props.variant,
            size: props.size,
            extended: props.label ? "true" : "false",
        },
        state,
    );
    const ink = useInk(
        "fab",
        {
            variant: props.variant,
            size: props.size,
            extended: props.label ? "true" : "false",
        },
        state,
        { slot: "container" },
    );
    return (
        <AnimatedPressable
            {...withInk(handlers, ink)}
            role="button"
            aria-label={props.label ?? props.glyph}
            style={aview({ ...s.root, ...unselectable })}
        >
            <Animated.View pointerEvents="none" style={aview(s.touchTarget)} />
            <Animated.View style={aview(s.container)}>
                <Animated.View style={aview(s.icon)}>
                    <Glyph style={s.icon} glyph={props.glyph} />
                </Animated.View>
                {props.label && (
                    <Animated.Text selectable={false} style={atext(s.label)}>
                        {props.label}
                    </Animated.Text>
                )}
                {ink.layer}
            </Animated.View>
        </AnimatedPressable>
    );
}

export function Radio(props: {
    checked: boolean;
    onChange: () => void;
    label: string;
}) {
    const { state, handlers } = usePress({ checked: props.checked });
    const s = useAnimatedRecipe("radio", {}, state);
    return (
        <AnimatedPressable
            {...handlers}
            role="radio"
            aria-checked={props.checked}
            aria-label={props.label}
            onPress={props.onChange}
            style={aview({ ...s.root, ...unselectable })}
        >
            <Animated.View pointerEvents="none" style={aview(s.touchTarget)} />
            <Animated.View style={aview(s.ring)}>
                <Animated.View style={aview(s.dot)} />
            </Animated.View>
        </AnimatedPressable>
    );
}

export function ListItem(props: {
    headline: string;
    overline?: string;
    supportingText?: string;
    leading?: string;
    trailingText?: string;
    selected?: boolean;
    onPress?: () => void;
}) {
    const interactive = props.onPress !== undefined;
    const { state, handlers } = usePress({ selected: props.selected ?? false });
    const lines =
        props.overline && props.supportingText
            ? "three"
            : props.overline || props.supportingText
              ? "two"
              : "one";
    const s = useAnimatedRecipe(
        "listItem",
        { lines, interactive: interactive ? "true" : "false" },
        interactive ? state : {},
    );
    const ink = useInk(
        "listItem",
        { lines, interactive: interactive ? "true" : "false" },
        state,
        { disabled: !interactive },
    );
    const line = (slot: string, value: string | undefined) =>
        value !== undefined && (
            <Animated.Text selectable={false} style={atext(s[slot])}>
                {value}
            </Animated.Text>
        );
    return (
        <AnimatedPressable
            {...(interactive ? withInk(handlers, ink) : {})}
            role={interactive ? "button" : "listitem"}
            {...(interactive ? { onPress: props.onPress } : { disabled: true })}
            style={aview({ ...s.root, ...unselectable })}
        >
            {props.leading && (
                <Animated.View style={aview(s.leading)}>
                    <Glyph style={s.leading} glyph={props.leading} />
                </Animated.View>
            )}
            <Animated.View style={aview(s.content)}>
                {line("overline", props.overline)}
                {line("headline", props.headline)}
                {line("supportingText", props.supportingText)}
            </Animated.View>
            {line("trailingText", props.trailingText)}
            {ink.layer}
        </AnimatedPressable>
    );
}

export function Separator(props: { inset?: "none" | "start" | "middle" }) {
    const s = useRecipe("separator", { inset: props.inset });
    return <View role="separator" style={view(s[""])} />;
}

/** A progress indicator, indeterminate without a value. */
export function LinearProgress(props: {
    value?: number | undefined;
    color?: Group;
}) {
    const s = useAnimatedRecipe(
        "linearProgress",
        {
            color: props.color,
            indeterminate: props.value === undefined ? "true" : "false",
        },
        {},
        {
            "components.linearProgress.value": props.value ?? 0,
        },
    );
    return (
        <Animated.View
            role="progressbar"
            aria-valuenow={props.value}
            style={aview(s.root)}
        >
            <Animated.View style={aview(s.indicator)} />
        </Animated.View>
    );
}

export function CircularProgress(props: {
    value?: number | undefined;
    color?: Group;
}) {
    const s = useAnimatedRecipe(
        "circularProgress",
        {
            color: props.color,
            indeterminate: props.value === undefined ? "true" : "false",
        },
        {},
        {
            "components.circularProgress.value": props.value ?? 0,
        },
    );
    return (
        <Animated.View
            role="progressbar"
            aria-valuenow={props.value}
            style={aview(s.root)}
        >
            <Animated.View style={aview(s.endHalf)}>
                <Animated.View style={aview(s.endArc)} />
            </Animated.View>
            <Animated.View style={aview(s.startHalf)}>
                <Animated.View style={aview(s.startArc)} />
            </Animated.View>
        </Animated.View>
    );
}

export function SupportingText(props: {
    tone?: "neutral" | "error" | "success" | "warning";
    children: ReactNode;
}) {
    const s = useRecipe("supportingText", { tone: props.tone });
    return <Text style={text(s[""])}>{props.children}</Text>;
}

/** A layer dimming what sits behind it, over the whole of its parent. */
export function Scrim() {
    const s = useRecipe("scrim");
    return <View pointerEvents="none" style={view(s.root)} />;
}

// A picture to show in media: a gradient drawn as an svg, so the demo needs no network. React
// Native Web escapes inline svg markup itself, so it goes in as is.
const PICTURE = `data:image/svg+xml;utf8,${'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 3"><defs><linearGradient id="g" x2="1" y2="1"><stop offset="0" stop-color="#6750A4"/><stop offset="1" stop-color="#7D5260"/></linearGradient></defs><rect width="4" height="3" fill="url(#g)"/><circle cx="3" cy="0.9" r="0.45" fill="#FFD8E4"/></svg>'}`;

export function Media(props: { aspect?: "square" | "landscape" | "portrait" }) {
    const { objectFit, ...style } = useRecipe("media", {
        aspect: props.aspect,
    })[""]!;
    return (
        <Image
            source={{ uri: PICTURE }}
            accessibilityLabel=""
            resizeMode={objectFit === "contain" ? "contain" : "cover"}
            style={style as ImageStyle}
        />
    );
}
