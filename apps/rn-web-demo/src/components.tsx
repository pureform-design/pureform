// The components the adapter covers, as React Native components, styled by the adapter. Each
// tracks its interaction state, asks for its slots' styles, and lays the slots out as the web
// markup does. The interactive ones animate their state changes and ripple when pressed.

import type { Transition } from "@pureform/rn-adapter";
import { curve } from "@pureform/rn-adapter/animated";
import {
    useComponentState,
    useComponentStyles,
    useTokens,
} from "@pureform/rn-adapter/react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Animated, Image, Text, View } from "react-native";
import type { ImageStyle } from "react-native";

import {
    MSvgDrawing,
    atext,
    aview,
    Glyph,
    MPressable,
    MText,
    MView,
    ownText,
    text,
    unselectable,
    useInk,
    useMotionStyles,
    usePress,
    view,
    withInk,
} from "./parts";
import type { Color, Group } from "./parts";

/** A few of Material's shapes, for the shaped components, and the config's two morphs, which
 *  change shape while pressed. */
export const SHAPES = [
    "none",
    "square",
    "cookie4Sided",
    "clover8Leaf",
    "sunny",
    "heart",
    "pentagon",
    "circleToSquare",
    "cookieToClover",
] as const;
export type Shape = (typeof SHAPES)[number];

export function Button(props: {
    label: string;
    variant?: "filled" | "tonal" | "outlined" | "text" | "elevated";
    color?: Color;
    disabled?: boolean;
    onPress?: () => void;
}) {
    const { state, handlers } = usePress({ disabled: props.disabled ?? false });
    const s = useMotionStyles(
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
        <MPressable
            {...withInk(handlers, ink)}
            role="button"
            disabled={props.disabled}
            onPress={props.onPress}
            style={aview({ ...s.root, ...unselectable })}
            testID={`button-${props.variant ?? "filled"}`}
        >
            <MView pointerEvents="none" style={aview(s.touchTarget)} />
            <MText selectable={false} style={atext(s.label)}>
                {props.label}
            </MText>
            {ink.layer}
        </MPressable>
    );
}

export function Chip(props: {
    label: string;
    variant?: "outlined" | "elevated";
    selected?: boolean;
    onPress?: () => void;
}) {
    const { state, handlers } = usePress({ selected: props.selected ?? false });
    const s = useMotionStyles("chip", { variant: props.variant }, state);
    const ink = useInk("chip", { variant: props.variant }, state);
    return (
        <MPressable
            {...withInk(handlers, ink)}
            role="button"
            onPress={props.onPress}
            style={aview({ ...s.root, ...unselectable })}
        >
            <MView pointerEvents="none" style={aview(s.touchTarget)} />
            <MText selectable={false} style={atext(s.label)}>
                {props.label}
            </MText>
            {ink.layer}
        </MPressable>
    );
}

export function Checkbox(props: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: string;
}) {
    const { state, handlers } = usePress({ checked: props.checked });
    const s = useMotionStyles("checkbox", {}, state);
    return (
        <MPressable
            {...handlers}
            role="checkbox"
            aria-checked={props.checked}
            aria-label={props.label}
            onPress={() => props.onChange(!props.checked)}
            style={aview({ ...s.root, ...unselectable })}
        >
            <MView pointerEvents="none" style={aview(s.touchTarget)} />
            <MView style={aview(s.box)}>
                <MView style={aview(s.checkIcon)} />
                <MView style={aview(s.indeterminateIcon)} />
            </MView>
        </MPressable>
    );
}

export function Switch(props: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: string;
}) {
    const { state, handlers } = usePress({ checked: props.checked });
    const s = useMotionStyles("switchControl", {}, state);
    return (
        <MPressable
            {...handlers}
            role="switch"
            aria-checked={props.checked}
            aria-label={props.label}
            onPress={() => props.onChange(!props.checked)}
            style={aview({ ...s.root, ...unselectable })}
        >
            <MView pointerEvents="none" style={aview(s.touchTarget)} />
            <MView style={aview(s.track)}>
                <MView style={aview(s.stateLayer)} />
                <MView style={aview(s.handle)}>
                    <MText selectable={false} style={atext(s.icon)}>
                        {props.checked ? "✓" : ""}
                    </MText>
                </MView>
            </MView>
        </MPressable>
    );
}

export function Card(props: {
    variant?: "elevated" | "filled" | "outlined";
    children: ReactNode;
}) {
    const s = useMotionStyles("card", { variant: props.variant });
    return <MView style={aview(s.root)}>{props.children}</MView>;
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
    const s = useComponentStyles("text", { style: props.style });
    const tokens = useTokens();
    return (
        <Text
            style={[{ color: String(tokens["colors.onSurface"]) }, text(s[""])]}
        >
            {props.children}
        </Text>
    );
}

export function Avatar(props: {
    initials: string;
    size?: "small" | "medium" | "large";
    color?: Color;
    shape?: Shape;
}) {
    const { styles: s, drawings } = useComponentState("avatar", {
        size: props.size,
        color: props.color,
        shape: props.shape,
    });
    return (
        <View role="img" aria-label={props.initials} style={view(s[""])}>
            <MSvgDrawing drawing={drawings[""]} />
            <Text style={text(ownText(s[""]))}>{props.initials}</Text>
        </View>
    );
}

export function Icon(props: {
    glyph: string;
    size?: "small" | "medium" | "large";
    color?: Group;
}) {
    const s = useComponentStyles("icon", {
        size: props.size,
        color: props.color,
    });
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
    shape?: Shape;
    disabled?: boolean;
}) {
    const { state, handlers } = usePress({ disabled: props.disabled ?? false });
    const variants = {
        variant: props.variant,
        size: props.size,
        shape: props.shape,
    };
    const s = useMotionStyles("iconButton", variants, state);
    const { drawings } = useComponentState("iconButton", variants, state);
    const ink = useInk("iconButton", variants, state, {
        slot: "container",
        centered: true,
        disabled: props.disabled ?? false,
    });
    return (
        <MPressable
            {...withInk(handlers, ink)}
            role="button"
            aria-label={props.label}
            disabled={props.disabled}
            style={aview({ ...s.root, ...unselectable })}
        >
            <MView pointerEvents="none" style={aview(s.touchTarget)} />
            <MView style={aview(s.container)}>
                <MSvgDrawing drawing={drawings.container} />
                <MView style={aview(s.icon)}>
                    <Glyph style={s.icon} glyph={props.glyph} />
                </MView>
                {ink.layer}
            </MView>
            {props.variant === "outlined" && (
                <MView pointerEvents="none" style={aview(s.outline)}>
                    <MSvgDrawing drawing={drawings.outline} />
                </MView>
            )}
        </MPressable>
    );
}

export function Fab(props: {
    glyph: string;
    label?: string;
    variant?: "tonal" | "filled" | "surface";
    size?: "small" | "medium" | "large";
    shape?: Shape;
}) {
    const { state, handlers } = usePress({});
    const variants = {
        variant: props.variant,
        size: props.size,
        shape: props.shape,
        extended: props.label ? "true" : "false",
    };
    const s = useMotionStyles("fab", variants, state);
    const { drawings } = useComponentState("fab", variants, state);
    const ink = useInk("fab", variants, state, { slot: "container" });
    return (
        <MPressable
            {...withInk(handlers, ink)}
            role="button"
            aria-label={props.label ?? props.glyph}
            style={aview({ ...s.root, ...unselectable })}
        >
            <MView pointerEvents="none" style={aview(s.touchTarget)} />
            <MView style={aview(s.container)}>
                <MSvgDrawing drawing={drawings.container} />
                <MView style={aview(s.icon)}>
                    <Glyph style={s.icon} glyph={props.glyph} />
                </MView>
                {props.label && (
                    <MText selectable={false} style={atext(s.label)}>
                        {props.label}
                    </MText>
                )}
                {ink.layer}
            </MView>
        </MPressable>
    );
}

export function Radio(props: {
    checked: boolean;
    onChange: () => void;
    label: string;
}) {
    const { state, handlers } = usePress({ checked: props.checked });
    const s = useMotionStyles("radio", {}, state);
    return (
        <MPressable
            {...handlers}
            role="radio"
            aria-checked={props.checked}
            aria-label={props.label}
            onPress={props.onChange}
            style={aview({ ...s.root, ...unselectable })}
        >
            <MView pointerEvents="none" style={aview(s.touchTarget)} />
            <MView style={aview(s.ring)}>
                <MView style={aview(s.dot)} />
            </MView>
        </MPressable>
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
    const s = useMotionStyles(
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
            <MText selectable={false} style={atext(s[slot])}>
                {value}
            </MText>
        );
    return (
        <MPressable
            {...(interactive ? withInk(handlers, ink) : {})}
            role={interactive ? "button" : "listitem"}
            {...(interactive ? { onPress: props.onPress } : { disabled: true })}
            style={aview({ ...s.root, ...unselectable })}
        >
            {props.leading && (
                <MView style={aview(s.leading)}>
                    <Glyph style={s.leading} glyph={props.leading} />
                </MView>
            )}
            <MView style={aview(s.content)}>
                {line("overline", props.overline)}
                {line("headline", props.headline)}
                {line("supportingText", props.supportingText)}
            </MView>
            {line("trailingText", props.trailingText)}
            {ink.layer}
        </MPressable>
    );
}

export function Separator(props: { inset?: "none" | "start" | "middle" }) {
    const s = useComponentStyles("separator", { inset: props.inset });
    return <View role="separator" style={view(s[""])} />;
}

/** A progress indicator, indeterminate without a value. */
export function LinearProgress(props: {
    value?: number | undefined;
    color?: Group;
}) {
    const s = useMotionStyles(
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
        <MView
            role="progressbar"
            aria-valuenow={props.value}
            style={aview(s.root)}
        >
            <MView style={aview(s.indicator)} />
        </MView>
    );
}

// A number moving to each new target over a transition, a frame at a time.
function useTweened(target: number, timing: Transition | undefined) {
    const [now, setNow] = useState(target);
    const [value] = useState(() => new Animated.Value(target));
    useEffect(() => {
        const id = value.addListener(({ value: v }) => setNow(v));
        return () => value.removeListener(id);
    }, [value]);
    useEffect(() => {
        if (!timing) {
            value.setValue(target);
            return;
        }
        const run = Animated.timing(value, {
            toValue: target,
            duration: timing.duration,
            delay: timing.delay,
            easing: curve(timing.easing),
            useNativeDriver: false,
        });
        run.start();
        return () => run.stop();
    }, [target]);
    return now;
}

export function CircularProgress(props: {
    value?: number | undefined;
    color?: Group;
}) {
    const variants = {
        color: props.color,
        indeterminate: props.value === undefined ? "true" : "false",
    };
    // The value moves, rather than each half's arc: turning both arcs at once would draw the
    // second half before the first fills, leaving a gap between them.
    const timing = useComponentState("circularProgress", variants).transitions
        .endArc?.[0];
    const value = useTweened(props.value ?? 0, timing);
    const { styles: s } = useComponentState(
        "circularProgress",
        variants,
        {},
        {
            "components.circularProgress.value": value,
        },
    );
    return (
        <MView
            role="progressbar"
            aria-valuenow={props.value}
            style={aview(useMotionStyles("circularProgress", variants).root)}
        >
            <View style={view(s.endHalf)}>
                <View style={view(s.endArc)} />
            </View>
            <View style={view(s.startHalf)}>
                <View style={view(s.startArc)} />
            </View>
        </MView>
    );
}

export function SupportingText(props: {
    tone?: "neutral" | "error" | "success" | "warning";
    children: ReactNode;
}) {
    const s = useComponentStyles("supportingText", { tone: props.tone });
    return <Text style={text(s[""])}>{props.children}</Text>;
}

/** A layer dimming what sits behind it, over the whole of its parent. */
export function Scrim() {
    const s = useComponentStyles("scrim");
    return <View pointerEvents="none" style={view(s.root)} />;
}

// A picture to show in media: a gradient drawn as an svg, so the demo needs no network. React
// Native Web escapes inline svg markup itself, so it goes in as is. It covers whatever box it's
// drawn in itself, since a browser fits an svg picture by its own aspect ratio rule, not that
// of the svg image showing it.
const PICTURE = `data:image/svg+xml;utf8,${'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 3" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="g" x2="1" y2="1"><stop offset="0" stop-color="#6750A4"/><stop offset="1" stop-color="#7D5260"/></linearGradient></defs><rect width="4" height="3" fill="url(#g)"/><circle cx="3" cy="0.9" r="0.45" fill="#FFD8E4"/></svg>'}`;

export function Media(props: {
    aspect?: "square" | "landscape" | "portrait";
    shape?: Shape;
}) {
    const { styles, drawings } = useComponentState("media", {
        aspect: props.aspect,
        shape: props.shape,
    });
    const { objectFit, ...style } = styles[""]!;
    // A shaped picture is drawn clipped to its shape; React Native's Image can't clip to one.
    if (drawings[""]) {
        return (
            <View
                role="img"
                aria-label=""
                style={view(style as typeof styles.root)}
            >
                <MSvgDrawing
                    drawing={drawings[""]}
                    image={{
                        uri: PICTURE,
                        fit: objectFit === "contain" ? "contain" : "cover",
                    }}
                />
            </View>
        );
    }
    return (
        <Image
            source={{ uri: PICTURE }}
            accessibilityLabel=""
            resizeMode={objectFit === "contain" ? "contain" : "cover"}
            style={style as ImageStyle}
        />
    );
}

/** The config's panel: roomy in a wide container, compact in a narrow one. */
export function Panel(props: { children: ReactNode }) {
    const s = useComponentStyles("panel")[""];
    return (
        <View style={view(s)}>
            <Text style={text(ownText(s))}>{props.children}</Text>
        </View>
    );
}

/** The config's gradient swatch, drawn with SVG. */
export function Swatch(props: { kind: "linear" | "radial" | "conic" }) {
    const { styles, drawings } = useComponentState("swatch", {
        kind: props.kind,
    });
    return (
        <View
            role="img"
            aria-label={`${props.kind} gradient`}
            style={view(styles[""])}
        >
            <MSvgDrawing drawing={drawings[""]} />
        </View>
    );
}
