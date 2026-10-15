// Inputs: the text field, text area, select, search bar, and slider. Each tracks its own
// focus and value, which the field's container and label read as the web's :focus-within and
// a filled input.

import { useAnimatedRecipe } from "@pureform/rn-adapter/animated";
import { pressableState } from "@pureform/rn-adapter/react";
import { useRef, useState } from "react";
import { Animated, TextInput } from "react-native";
import type { GestureResponderEvent } from "react-native";

import {
    AnimatedPressable,
    Glyph,
    aview,
    atext,
    unselectable,
    usePress,
} from "./components";

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

const TEXT_STYLE = [
    "color",
    "fontFamily",
    "fontSize",
    "fontWeight",
    "lineHeight",
    "letterSpacing",
];

// A slot's text style, for the text inside it.
const textOf = (style: Record<string, unknown> | undefined) =>
    Object.fromEntries(
        Object.entries(style ?? {}).filter(([key]) => TEXT_STYLE.includes(key)),
    );

interface FieldProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    variant?: "filled" | "outlined";
    supportingText?: string;
    invalid?: boolean;
    disabled?: boolean;
    leading?: string;
    trailing?: string;
}

function Field(
    props: FieldProps & {
        name: "textField" | "textArea" | "select";
        lines?: number;
    },
) {
    const [focused, setFocused] = useState(false);
    const s = useAnimatedRecipe(
        props.name,
        {
            variant: props.variant,
            leadingIcon: props.leading ? "true" : "false",
            trailingIcon: props.trailing ? "true" : "false",
        },
        {
            focus: focused,
            focusVisible: focused,
            filled: props.value !== "",
            invalid: props.invalid ?? false,
            disabled: props.disabled ?? false,
            expanded: props.name === "select" && focused,
        },
    );
    return (
        <Animated.View style={aview(s.root)}>
            <Animated.View style={aview(s.container)}>
                {props.leading && (
                    <Animated.View style={aview(s.leadingIcon)}>
                        <Glyph style={s.leadingIcon} glyph={props.leading} />
                    </Animated.View>
                )}
                <AnimatedTextInput
                    value={props.value}
                    onChangeText={props.onChange}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    editable={!props.disabled && props.name !== "select"}
                    aria-label={props.label}
                    aria-invalid={props.invalid}
                    multiline={props.name === "textArea"}
                    numberOfLines={props.lines}
                    style={atext(s.input)}
                />
                <Animated.Text
                    selectable={false}
                    pointerEvents="none"
                    style={atext(s.label)}
                >
                    {props.label}
                </Animated.Text>
                {props.trailing && (
                    <Animated.View
                        pointerEvents="none"
                        style={aview(s.trailingIcon)}
                    >
                        <Glyph style={s.trailingIcon} glyph={props.trailing} />
                    </Animated.View>
                )}
            </Animated.View>
            {props.supportingText && (
                <Animated.Text style={atext(s.supportingText)}>
                    {props.supportingText}
                </Animated.Text>
            )}
        </Animated.View>
    );
}

export const TextField = (props: FieldProps) => (
    <Field {...props} name="textField" />
);

export const TextArea = (props: FieldProps & { lines?: number }) => (
    <Field {...props} name="textArea" lines={props.lines ?? 3} />
);

/** A select: a read-only field whose trailing arrow turns while it has focus, standing in
 *  for an open menu. */
export const Select = (props: Omit<FieldProps, "trailing" | "onChange">) => (
    <Field {...props} name="select" trailing="▾" onChange={() => {}} />
);

export function SearchBar(props: {
    value: string;
    onChange: (value: string) => void;
}) {
    const [focused, setFocused] = useState(false);
    const { state, handlers } = usePress({});
    const s = useAnimatedRecipe(
        "searchBar",
        {},
        {
            ...state,
            focus: focused,
            focusVisible: focused,
            filled: props.value !== "",
        },
    );
    return (
        <AnimatedPressable
            {...handlers}
            onFocus={undefined}
            onBlur={undefined}
            style={aview({ ...s.root, ...unselectable })}
        >
            <Animated.View style={aview(s.leading)}>
                <Glyph style={s.leading} glyph="⌕" />
            </Animated.View>
            <AnimatedTextInput
                value={props.value}
                onChangeText={props.onChange}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Search"
                placeholderTextColor={String(textOf(s.input).color ?? "")}
                aria-label="Search"
                style={atext(s.input)}
            />
            <Animated.View style={aview(s.trailing)}>
                <Glyph style={s.trailing} glyph="🎤" />
            </Animated.View>
        </AnimatedPressable>
    );
}

/** A slider dragged by pointer or touch, keeping its value from 0 to 100. */
export function Slider(props: {
    value: number;
    onChange: (value: number) => void;
    label: string;
}) {
    const [dragged, setDragged] = useState(false);
    const [hovered, setHovered] = useState(false);
    const origin = useRef({ x: 0, width: 1 });
    // The view, read for where it sits on the page when a drag starts.
    const root = useRef<{
        measure: (
            done: (
                x: number,
                y: number,
                width: number,
                height: number,
                left: number,
            ) => void,
        ) => void;
    }>(null);
    const s = useAnimatedRecipe(
        "slider",
        {},
        {
            ...pressableState({ pressed: dragged, hovered }),
            dragged,
        },
        { "components.slider.value": props.value },
    );
    const move = (event: GestureResponderEvent) => {
        const { x, width } = origin.current;
        const ratio = (event.nativeEvent.pageX - x) / width;
        props.onChange(Math.round(Math.min(Math.max(ratio, 0), 1) * 100));
    };
    return (
        <Animated.View
            ref={root as never}
            role="slider"
            aria-label={props.label}
            aria-valuenow={props.value}
            aria-valuemin={0}
            aria-valuemax={100}
            onPointerEnter={() => setHovered(true)}
            onPointerLeave={() => setHovered(false)}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={(event) => {
                setDragged(true);
                const pageX = event.nativeEvent.pageX;
                root.current?.measure((_x, _y, width, _h, left) => {
                    origin.current = { x: left, width };
                    move({ nativeEvent: { pageX } } as GestureResponderEvent);
                });
            }}
            onResponderMove={move}
            onResponderRelease={() => setDragged(false)}
            onResponderTerminate={() => setDragged(false)}
            style={aview({ ...s.root, ...unselectable })}
        >
            <Animated.View pointerEvents="none" style={aview(s.track)} />
            <Animated.View pointerEvents="none" style={aview(s.activeTrack)} />
            <Animated.View pointerEvents="none" style={aview(s.stateLayer)} />
            <Animated.View pointerEvents="none" style={aview(s.handle)} />
        </Animated.View>
    );
}
