// The date input: the modal picker's surface with a text field in place of the calendar, its
// input a row of segments as the web's: the month, the day and the year in the locale's order,
// each a numeric `TextInput` (a spin button to assistive technology) with its placeholder ("mm"),
// and the locale's separators between. A full segment moves on to the next; Backspace in an empty
// one goes back; on the web the arrow keys move along the row by direction and step a segment up
// and down. Its `value` follows the segments: the date when they make a whole, real date the
// picker allows, else none; a controlled `value` changed later rewrites the digits (focus stays
// where it is). Cancel calls `onCancel`, OK calls `onConfirm` with the date.

import { dateInputAnatomy } from "@pureform/anatomy";
import {
    dateFormatHint,
    dateFromSegments,
    dateInputSelection,
    dateSegmentStep,
    dateSegmentTexts,
    dateTextSegments,
    isPresent,
    isSelectableDate,
    pickerLocale,
    selectedDateText,
} from "@pureform/binding-core";
import type {
    DateInputContentProps,
    DateInputPart,
    DateInputRootOwnProps,
    DateSegmentKind,
} from "@pureform/binding-core";
import { useTokens } from "@pureform/rn-adapter/react";
import type { Selection } from "@pureform/styling";
import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { TextInputKeyPressEvent } from "react-native";

import { Button } from "../button/button";
import { IconButton } from "../icon-button/icon-button";
import { IconSlot, iconSlot, ownText } from "../icon-style";
import { useControllable, withEngine } from "../parts";
import { useDirection } from "../provider";
import { useComponentSlots } from "../styles";
import { partId } from "../text-input";

const NONE: readonly string[] = [];

// A segment's input, as far as moving focus goes.
interface Focusable {
    focus(): void;
}

const SEGMENT_LABEL: Record<DateSegmentKind, string> = {
    month: "month",
    day: "day",
    year: "year",
};

interface SegmentOptions {
    readonly kind: DateSegmentKind;
    readonly placeholder: string;
    readonly length: number;
    readonly text: string;
    readonly selection: Selection<"dateInput">;
    readonly invalid: boolean;
    readonly disabled: boolean;
    readonly readOnly: boolean;
    readonly testID: string;
    readonly inputRef: (input: Focusable | null) => void;
    readonly onText: (text: string) => void;
    readonly onKey: (key: string) => boolean;
    readonly onFocus: (focused: boolean) => void;
}

// One segment, with its own focus: the focused one shows the focus color behind its digits.
function Segment(options: SegmentOptions): ReactNode {
    const [focused, setFocused] = useState(false);
    const tokens = useTokens();
    const {
        styles: s,
        selected,
        views: v,
    } = useComponentSlots<DateInputPart>(
        "dateInput",
        options.selection,
        {
            focus: focused,
            focusVisible: focused,
            filled: true,
            invalid: options.invalid,
            disabled: options.disabled,
            ...(options.readOnly ? { readOnly: true } : {}),
        },
    );
    const value = options.text === "" ? undefined : Number(options.text);
    const text = ownText(s.input);
    const look = { ...text, ...s.segment };
    // Its digits, or its placeholder while it has none, unseen: what sizes the segment, so it hugs
    // them as the web's does.
    return (
        <View>
            <Text aria-hidden style={{ ...look, opacity: 0 }}>
                {options.text === "" ? options.placeholder : options.text}
            </Text>
            <v.segment.TextInput
                ref={options.inputRef}
                value={options.text}
                onChangeText={(text: string) => {
                    const digits = text.replace(/\D/g, "");
                    // Typing into a full segment starts it over with the new digits.
                    options.onText(
                        (digits.length > options.length &&
                        digits.startsWith(options.text)
                            ? digits.slice(options.text.length)
                            : digits
                        ).slice(0, options.length),
                    );
                }}
                onKeyPress={(event: TextInputKeyPressEvent) => {
                    if (options.onKey(event.nativeEvent.key))
                        (
                            event as { preventDefault?: () => void }
                        ).preventDefault?.();
                }}
                onFocus={() => {
                    setFocused(true);
                    options.onFocus(true);
                }}
                onBlur={() => {
                    setFocused(false);
                    options.onFocus(false);
                }}
                editable={!options.disabled && !options.readOnly}
                inputMode="numeric"
                keyboardType="number-pad"
                placeholder={options.placeholder}
                // In the segment's own color, as the web's: the focused empty segment's
                // placeholder reads on the focus color.
                placeholderTextColor={String(
                    selected.styles.segment?.color ??
                        tokens["colors.onSurfaceVariant"],
                )}
                role="spinbutton"
                aria-label={SEGMENT_LABEL[options.kind]}
                aria-valuemin={1}
                aria-valuemax={
                    options.kind === "month"
                        ? 12
                        : options.kind === "day"
                          ? 31
                          : 9999
                }
                {...(value === undefined
                    ? { "aria-valuetext": "Empty" }
                    : { "aria-valuenow": value })}
                aria-invalid={options.invalid}
                style={{
                    ...look,
                    ...(StyleSheet.absoluteFill as object),
                    textAlign: "center",
                }}
                testID={options.testID}
            />
        </View>
    );
}

export interface DateInputProps
    extends
        Omit<
            DateInputRootOwnProps,
            | "unstyled"
            | "leadingIcon"
            | "trailingIcon"
            | "prefixText"
            | "suffixText"
        >,
        DateInputContentProps<ReactNode> {}

function DateInputImpl(props: DateInputProps): ReactNode {
    const locale = pickerLocale(props);
    const [value, setValue] = useControllable<"value", readonly string[]>(
        "DateInput",
        "value",
        props.value,
        props.defaultValue,
        props.onValueChange,
        NONE,
    );
    const [texts, setTexts] = useState(() => dateSegmentTexts(value[0]));
    // The last digits written, which keys typed before the next render build on.
    const latest = useRef(texts);
    // A value set from outside (a controlled `value` changed later) rewrites the digits; one the
    // segments made (or a partial date's empty one) leaves them, and focus, as they are.
    const [seen, setSeen] = useState(value[0]);
    if (seen !== value[0]) {
        setSeen(value[0]);
        if (dateFromSegments(latest.current) !== (value[0] ?? null)) {
            latest.current = dateSegmentTexts(value[0]);
            setTexts(latest.current);
        }
    }
    const [focused, setFocused] = useState(false);
    const segments = dateTextSegments(locale);
    const order = segments.flatMap((segment) =>
        segment.kind === "literal" ? [] : [segment.kind],
    );
    const inputs = useRef(new Map<DateSegmentKind, Focusable>());
    const rtl = useDirection() === "rtl";
    const invalid = props.error !== undefined || !!props.invalid;
    const {
        styles: s,
        selected,
        views: v,
    } = useComponentSlots<DateInputPart>(
        "dateInput",
        dateInputSelection({
            ...props,
            leadingIcon: isPresent(props.leadingIcon),
            trailingIcon: isPresent(props.trailingIcon),
            prefixText: isPresent(props.prefixText),
            suffixText: isPresent(props.suffixText),
        }),
        {
            focus: focused,
            focusVisible: focused,
            // Always filled, as the web's: the label stays floated over the placeholders.
            filled: true,
            invalid,
            disabled: props.disabled ?? false,
            ...(props.readOnly ? { readOnly: true } : {}),
            ...(props.mirrorLeadingIcon || props.mirrorTrailingIcon
                ? { mirrored: true }
                : {}),
        },
    );
    const id = (part: DateInputPart) =>
        partId(dateInputAnatomy, part, props.testId);
    const update = (
        kind: DateSegmentKind,
        digits: (texts: Record<DateSegmentKind, string>) => string,
    ) => {
        const next = { ...latest.current, [kind]: digits(latest.current) };
        latest.current = next;
        setTexts(next);
        const iso = dateFromSegments(next);
        const parsed = iso && isSelectableDate(iso, props) ? [iso] : [];
        if (parsed[0] !== value[0]) setValue(parsed);
    };
    const focusAt = (kind: DateSegmentKind, step: number) => {
        const next = order[order.indexOf(kind) + step];
        if (next) inputs.current.get(next)?.focus();
    };
    const onKey = (kind: DateSegmentKind, key: string): boolean => {
        switch (key) {
            case "Backspace":
                if (latest.current[kind] !== "") return false;
                focusAt(kind, -1);
                return true;
            case "ArrowRight":
            case "ArrowLeft":
                focusAt(kind, (key === "ArrowRight") !== rtl ? 1 : -1);
                return true;
            case "ArrowUp":
            case "ArrowDown":
                if (props.disabled || props.readOnly) return true;
                update(kind, (now) =>
                    dateSegmentStep(
                        kind,
                        now[kind],
                        key === "ArrowUp" ? 1 : -1,
                        new Date().getFullYear(),
                    ),
                );
                return true;
        }
        return false;
    };
    const hint = dateFormatHint(locale);
    const selection = dateInputSelection({
        ...props,
        leadingIcon: isPresent(props.leadingIcon),
        trailingIcon: isPresent(props.trailingIcon),
        prefixText: isPresent(props.prefixText),
        suffixText: isPresent(props.suffixText),
    });
    const label = typeof props.label === "string" ? props.label : "Date";
    const icon = (part: "leadingIcon" | "trailingIcon", node: ReactNode) => {
        if (!isPresent(node)) return null;
        const Slot = v[part];
        return (
            <Slot.View
                {...(part === "trailingIcon" ? { pointerEvents: "none" } : {})}
                style={s[part]}
                testID={id(part)}
            >
                <IconSlot {...iconSlot(selected, part)} motion={s[part]}>
                    {node}
                </IconSlot>
            </Slot.View>
        );
    };
    const affix = (part: "prefixText" | "suffixText", node: ReactNode) => {
        if (!isPresent(node)) return null;
        const Slot = v[part];
        return (
            <Slot.Text selectable={false} style={s[part]} testID={id(part)}>
                {node}
            </Slot.Text>
        );
    };
    return (
        <v.root.View
            role="dialog"
            aria-label={
                typeof props.headline === "string"
                    ? props.headline
                    : "Select date"
            }
            style={s.root}
            testID={id("root")}
        >
            <v.header.View style={s.header} testID={id("header")}>
                <v.headline.Text style={s.headline} testID={id("headline")}>
                    {props.headline ?? "Select date"}
                </v.headline.Text>
                <v.selectedDate.Text
                    style={s.selectedDate}
                    testID={id("selectedDate")}
                >
                    {selectedDateText(value, locale) ??
                        props.placeholder ??
                        "Enter date"}
                </v.selectedDate.Text>
                {props.onModeToggle ? (
                    <v.modeToggle.View
                        style={s.modeToggle}
                        testID={id("modeToggle")}
                    >
                        <IconButton
                            aria-label={
                                props.modeToggleLabel ?? "Switch to calendar"
                            }
                            icon="📅"
                            onPress={props.onModeToggle}
                        />
                    </v.modeToggle.View>
                ) : null}
            </v.header.View>
            <v.divider.View style={s.divider} testID={id("divider")} />
            <v.field.View style={s.field} testID={id("field")}>
                <v.container.View style={s.container} testID={id("container")}>
                    {icon("leadingIcon", props.leadingIcon)}
                    {affix("prefixText", props.prefixText)}
                    <v.input.View
                        role="group"
                        aria-label={label}
                        style={s.input}
                        testID={id("input")}
                    >
                        {segments.map((segment, index) =>
                            segment.kind === "literal" ? (
                                <v.input.Text
                                    key={index}
                                    selectable={false}
                                    aria-hidden
                                    style={ownText(s.input)}
                                >
                                    {segment.text}
                                </v.input.Text>
                            ) : (
                                <Segment
                                    key={segment.kind}
                                    kind={segment.kind}
                                    placeholder={segment.placeholder}
                                    length={segment.length}
                                    text={texts[segment.kind]}
                                    selection={selection}
                                    invalid={invalid}
                                    disabled={props.disabled ?? false}
                                    readOnly={props.readOnly ?? false}
                                    testID={id("segment")}
                                    inputRef={(input) => {
                                        if (input)
                                            inputs.current.set(
                                                segment.kind,
                                                input,
                                            );
                                        else
                                            inputs.current.delete(segment.kind);
                                    }}
                                    onText={(digits) => {
                                        update(segment.kind, () => digits);
                                        if (digits.length === segment.length)
                                            focusAt(segment.kind, 1);
                                    }}
                                    onKey={(key) => onKey(segment.kind, key)}
                                    onFocus={setFocused}
                                />
                            ),
                        )}
                    </v.input.View>
                    {affix("suffixText", props.suffixText)}
                    <v.label.Text
                        selectable={false}
                        pointerEvents="none"
                        style={s.label}
                        testID={id("label")}
                    >
                        {props.label ?? "Date"}
                    </v.label.Text>
                    {icon("trailingIcon", props.trailingIcon)}
                </v.container.View>
                <v.supportingText.Text
                    style={s.supportingText}
                    testID={id("supportingText")}
                >
                    {props.error ?? props.supportingText ?? hint}
                </v.supportingText.Text>
            </v.field.View>
            <v.actions.View style={s.actions} testID={id("actions")}>
                <Button
                    variant="text"
                    label={props.cancelLabel ?? "Cancel"}
                    onPress={() => props.onCancel?.()}
                />
                <Button
                    variant="text"
                    label={props.confirmLabel ?? "OK"}
                    disabled={props.disabled || props.readOnly}
                    onPress={() => props.onConfirm?.(value)}
                />
            </v.actions.View>
        </v.root.View>
    );
}

/** Material's date input: `<DateInput locale="en-US" onConfirm={(value) => …} />`. */
export const DateInput = withEngine(DateInputImpl, "DateInput");
