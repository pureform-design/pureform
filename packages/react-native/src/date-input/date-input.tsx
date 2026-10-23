// The date input: the modal picker's surface with a text field in place of the calendar. Its
// `value` follows the field's text: the date when the text is a whole, real date the picker
// allows, else none. Cancel calls `onCancel`, OK calls `onConfirm` with the date.

import { dateInputAnatomy } from "@pureform/anatomy";
import {
    dateFormatHint,
    dateInputSelection,
    formatDateText,
    isPresent,
    isSelectableDate,
    parseDateText,
    pickerLocale,
    selectedDateText,
} from "@pureform/binding-core";
import type {
    DateInputContentProps,
    DateInputPart,
    DateInputRootOwnProps,
} from "@pureform/binding-core";
import { useState } from "react";
import type { ReactNode } from "react";

import { Button } from "../button/button";
import { IconButton } from "../icon-button/icon-button";
import { IconSlot, iconSlot } from "../icon-style";
import { useControllable, withEngine } from "../parts";
import { useComponentSlots } from "../styles";
import { partId } from "../text-input";

const NONE: readonly string[] = [];

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
    const [text, setText] = useState(() =>
        value[0] ? formatDateText(value[0], locale) : "",
    );
    const [focused, setFocused] = useState(false);
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
            filled: text !== "",
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
    const onText = (next: string) => {
        setText(next);
        const iso = parseDateText(next, locale);
        const parsed = iso && isSelectableDate(iso, props) ? [iso] : [];
        if (parsed[0] !== value[0]) setValue(parsed);
    };
    const hint = dateFormatHint(locale);
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
        <v.root.View role="dialog" style={s.root} testID={id("root")}>
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
                    <v.input.TextInput
                        value={text}
                        onChangeText={onText}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        editable={!props.disabled && !props.readOnly}
                        aria-label={
                            typeof props.label === "string"
                                ? props.label
                                : "Date"
                        }
                        aria-invalid={invalid}
                        placeholder={focused ? hint : undefined}
                        inputMode="numeric"
                        style={s.input}
                        testID={id("input")}
                    />
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
