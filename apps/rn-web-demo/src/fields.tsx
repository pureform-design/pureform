// Inputs: the text field, text area, select, search bar, and slider. Each tracks its own
// focus and value, which the field's container and label read as the web's :focus-within and
// a filled input.

import { pressableState, useComponentStyles } from "@pureform/rn-adapter/react";
import { useRef, useState } from "react";
import type { Ref } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import type { GestureResponderEvent } from "react-native";

import { Menu } from "./navigation";
import {
    atext,
    aview,
    Glyph,
    MPressable,
    MText,
    MTextInput,
    MView,
    unselectable,
    useMotionStyles,
    usePress,
} from "./parts";

// A view, read for where it sits on screen.
interface Measurable {
    measureInWindow: (
        done: (
            left: number,
            top: number,
            width: number,
            height: number,
        ) => void,
    ) => void;
}

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
        /** A select's menu is open: the field shows focus and turns its arrow. */
        expanded?: boolean;
        container?: Ref<Measurable>;
    },
) {
    const [ownFocus, setFocused] = useState(false);
    const focused = ownFocus || (props.expanded ?? false);
    const s = useMotionStyles(
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
            expanded: props.expanded ?? false,
        },
    );
    return (
        <MView style={aview(s.root)}>
            <MView ref={props.container as never} style={aview(s.container)}>
                {props.leading && (
                    <MView style={aview(s.leadingIcon)}>
                        <Glyph style={s.leadingIcon} glyph={props.leading} />
                    </MView>
                )}
                <MTextInput
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
                <MText
                    selectable={false}
                    pointerEvents="none"
                    style={atext(s.label)}
                >
                    {props.label}
                </MText>
                {props.trailing && (
                    <MView pointerEvents="none" style={aview(s.trailingIcon)}>
                        <Glyph style={s.trailingIcon} glyph={props.trailing} />
                    </MView>
                )}
            </MView>
            {props.supportingText && (
                <MText style={atext(s.supportingText)}>
                    {props.supportingText}
                </MText>
            )}
        </MView>
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
/** A select: pressing the field opens a menu of its options below it, over the page, and
 *  choosing one closes it. The arrow turns while it's open. */
export function Select(
    props: Omit<FieldProps, "trailing" | "onChange"> & {
        options: string[];
        onChange: (value: string) => void;
    },
) {
    const { options, onChange, ...field } = props;
    const [menu, setMenu] = useState<{
        left: number;
        top: number;
        width: number;
    }>();
    const container = useRef<Measurable>(null);
    const open = () =>
        container.current?.measureInWindow((left, top, width, height) =>
            setMenu({ left, top: top + height, width }),
        );
    return (
        <View>
            <Field
                {...field}
                name="select"
                trailing="▾"
                onChange={() => {}}
                expanded={menu !== undefined}
                container={container}
            />
            <Pressable
                role="combobox"
                aria-label={props.label}
                aria-expanded={menu !== undefined}
                disabled={props.disabled}
                onPress={open}
                style={StyleSheet.absoluteFill}
            />
            <Modal
                transparent
                visible={menu !== undefined}
                onRequestClose={() => setMenu(undefined)}
            >
                <Pressable
                    aria-label="Close"
                    style={StyleSheet.absoluteFill}
                    onPress={() => setMenu(undefined)}
                />
                {menu && (
                    <View style={{ position: "absolute", ...menu }}>
                        <Menu
                            items={options.map((label) => ({ label }))}
                            value={options.indexOf(props.value)}
                            onChange={(index) => {
                                onChange(options[index]!);
                                setMenu(undefined);
                            }}
                        />
                    </View>
                )}
            </Modal>
        </View>
    );
}

export function SearchBar(props: {
    value: string;
    onChange: (value: string) => void;
}) {
    const [focused, setFocused] = useState(false);
    const { state, handlers } = usePress({});
    const searchState = {
        ...state,
        focus: focused,
        focusVisible: focused,
        filled: props.value !== "",
    };
    const s = useMotionStyles("searchBar", {}, searchState);
    // A placeholder's color is a prop, so it takes the plain value rather than an animated one.
    const placeholder = useComponentStyles("searchBar", {}, searchState).input
        ?.color;
    return (
        <MPressable
            {...handlers}
            onFocus={undefined}
            onBlur={undefined}
            style={aview({ ...s.root, ...unselectable })}
        >
            <MView style={aview(s.leading)}>
                <Glyph style={s.leading} glyph="⌕" />
            </MView>
            <MTextInput
                value={props.value}
                onChangeText={props.onChange}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Search"
                placeholderTextColor={String(placeholder ?? "")}
                aria-label="Search"
                style={atext(s.input)}
            />
            <MView style={aview(s.trailing)}>
                <Glyph style={s.trailing} glyph="🎤" />
            </MView>
        </MPressable>
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
    // Where the track sits on the page, read when a drag starts; until then, none.
    const origin = useRef<{ x: number; width: number }>(undefined);
    const root = useRef<{
        getBoundingClientRect?: () => DOMRect;
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
    const s = useMotionStyles(
        "slider",
        {},
        {
            ...pressableState({ pressed: dragged, hovered }),
            dragged,
        },
        { "components.slider.value": props.value },
    );
    const move = (event: GestureResponderEvent) => {
        if (!origin.current) return;
        const { x, width } = origin.current;
        const ratio = (event.nativeEvent.pageX - x) / width;
        props.onChange(Math.round(Math.min(Math.max(ratio, 0), 1) * 100));
    };
    return (
        <MView
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
                const start = (x: number, width: number) => {
                    origin.current = { x, width };
                    move({ nativeEvent: { pageX } } as GestureResponderEvent);
                };
                // At once from the DOM on the web, so the first moves don't wait on measure,
                // which answers a turn later; through measure on a device.
                const rect = root.current?.getBoundingClientRect?.();
                if (rect) start(rect.left + window.scrollX, rect.width);
                else
                    root.current?.measure((_x, _y, width, _h, left) =>
                        start(left, width),
                    );
            }}
            onResponderMove={move}
            onResponderRelease={() => {
                origin.current = undefined;
                setDragged(false);
            }}
            onResponderTerminate={() => {
                origin.current = undefined;
                setDragged(false);
            }}
            style={aview({ ...s.root, ...unselectable })}
        >
            <MView pointerEvents="none" style={aview(s.track)} />
            <MView pointerEvents="none" style={aview(s.activeTrack)} />
            <MView pointerEvents="none" style={aview(s.stateLayer)} />
            <MView pointerEvents="none" style={aview(s.handle)} />
        </MView>
    );
}
