// The tags input: a text field whose values are input chips, laid before the input in the
// container's wrapping row. Submitting (or typing the delimiter) adds the typed text as a chip;
// Backspace on an empty input removes the last one, and each chip's remove button removes it.

import { inputChipAnatomy, tagsInputAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import {
    inputChipSelection,
    isPresent,
    tagsInputChipTestId,
    tagsInputFilled,
    tagsInputSelection,
} from "@pureform/binding-core";
import type {
    IndicationProps,
    InputChipPart,
    TagsInputBehaviorProps,
    TagsInputContentProps,
    TagsInputPart,
    TagsInputVariantProps,
} from "@pureform/binding-core";
import { useState } from "react";
import type { ReactNode } from "react";
import type { TextInputKeyPressEvent, TextInputProps } from "react-native";

import { IconSlot, iconSlot } from "../icon-style";
import { useSurfaceIndication } from "../indication";
import { testIdOf, unselectable, useControllable, withEngine } from "../parts";
import { useComponentSlots } from "../styles";

// The chip's and its remove button's.
const INDICATIONS = Object.fromEntries(
    inputChipAnatomy.indication.map((entry) => [entry.trigger, entry]),
);

export interface TagsInputProps
    extends
        Omit<TagsInputVariantProps, "leadingIcon" | "trailingIcon">,
        Pick<
            TagsInputBehaviorProps,
            | "value"
            | "defaultValue"
            | "onValueChange"
            | "disabled"
            | "invalid"
            | "error"
            | "readOnly"
            | "placeholder"
            | "max"
            | "maxLength"
            | "delimiter"
            | "allowDuplicates"
            | "validate"
            | "removeLabel"
        >,
        TagsInputContentProps<ReactNode>,
        IndicationProps {
    /** React Native's own `TextInput` props, such as `autoCapitalize`. */
    readonly inputProps?: TextInputProps | undefined;
    /** A prefix for every part's test id (`tags` → `tags-input`), or ids by part. The chips'
     *  parts take the prefix too (`tags-chip-label`). */
    readonly testId?: TestIdOverride<TagsInputPart> | undefined;
}

interface ChipOptions {
    readonly props: TagsInputProps;
    readonly value: string;
    readonly onRemove: () => void;
}

const chipId = (part: InputChipPart, props: TagsInputProps) =>
    testIdOf(inputChipAnatomy, part, tagsInputChipTestId(props.testId));

function RemoveImpl(options: ChipOptions): ReactNode {
    const { props, value } = options;
    const indication = useSurfaceIndication(INDICATIONS["remove"]!, {
        indication: props.indication,
        disabled: props.disabled || props.readOnly,
    });
    const {
        styles: s,
        selected,
        views: v,
    } = useComponentSlots<InputChipPart>(
        "inputChip",
        indication.select(inputChipSelection(props.chip)),
        indication.states(props.disabled ? { disabled: true } : {}),
    );
    return (
        <v.remove.Pressable
            {...indication.handlers}
            role="button"
            aria-label={props.removeLabel?.(value) ?? `Delete tag ${value}`}
            disabled={props.disabled || props.readOnly}
            onPress={options.onRemove}
            style={{ ...s.remove, ...unselectable }}
            testID={chipId("remove", props)}
        >
            <IconSlot {...iconSlot(selected, "remove")} motion={s.remove}>
                {isPresent(props.removeIcon) ? props.removeIcon : "✕"}
            </IconSlot>
            {indication.layer(selected)}
        </v.remove.Pressable>
    );
}

const Remove = withEngine(RemoveImpl, "TagsInputChipRemove");

function ChipImpl(options: ChipOptions): ReactNode {
    const { props, value } = options;
    const indication = useSurfaceIndication(INDICATIONS["root"]!, {
        indication: props.indication,
        disabled: props.disabled,
    });
    const {
        styles: s,
        selected,
        views: v,
    } = useComponentSlots<InputChipPart>(
        "inputChip",
        indication.select(inputChipSelection(props.chip)),
        indication.states(props.disabled ? { disabled: true } : {}),
    );
    const avatar = props.chipAvatar?.(value);
    const icon = props.chipIcon?.(value);
    return (
        <v.root.Pressable
            {...indication.handlers}
            disabled={props.disabled}
            style={{ ...s.root, ...unselectable }}
            testID={chipId("root", props)}
        >
            <v.touchTarget.View
                pointerEvents="none"
                style={s.touchTarget}
                testID={chipId("touchTarget", props)}
            />
            {isPresent(avatar) ? (
                <v.avatar.View
                    style={s.avatar}
                    testID={chipId("avatar", props)}
                >
                    {avatar}
                </v.avatar.View>
            ) : isPresent(icon) ? (
                <v.icon.View style={s.icon} testID={chipId("icon", props)}>
                    <IconSlot {...iconSlot(selected, "icon")} motion={s.icon}>
                        {icon}
                    </IconSlot>
                </v.icon.View>
            ) : null}
            <v.label.Text
                selectable={false}
                style={s.label}
                testID={chipId("label", props)}
            >
                {value}
            </v.label.Text>
            <Remove {...options} />
            {indication.layer(selected)}
        </v.root.Pressable>
    );
}

const Chip = withEngine(ChipImpl, "TagsInputChip");

function TagsInputImpl(props: TagsInputProps): ReactNode {
    const [values, setValues] = useControllable<"value", string[]>(
        "TagsInput",
        "value",
        props.value,
        props.defaultValue,
        props.onValueChange,
        [],
    );
    const [text, setText] = useState("");
    const [focused, setFocused] = useState(false);
    const invalid = (props.invalid ?? false) || props.error !== undefined;
    const editable = !props.disabled && !props.readOnly;
    const {
        styles: s,
        selected,
        views: v,
    } = useComponentSlots<TagsInputPart>(
        "tagsInput",
        tagsInputSelection({
            ...props,
            leadingIcon: isPresent(props.leadingIcon),
            trailingIcon: isPresent(props.trailingIcon),
        }),
        {
            focus: focused,
            focusVisible: focused,
            filled: tagsInputFilled(values.length, text),
            invalid,
            disabled: props.disabled ?? false,
            ...(props.readOnly ? { readOnly: true } : {}),
        },
    );
    const id = (part: TagsInputPart) =>
        testIdOf(tagsInputAnatomy, part, props.testId);

    // The values with each of `entries` added that may be, or `current` when none may.
    const added = (current: string[], entries: readonly string[]) => {
        let next = current;
        for (const entry of entries) {
            const value = entry.trim();
            if (value === "") continue;
            if (!props.allowDuplicates && next.includes(value)) continue;
            if (props.max !== undefined && next.length >= props.max) continue;
            if (
                props.validate &&
                !props.validate({ inputValue: value, value: next })
            )
                continue;
            next = [...next, value];
        }
        return next;
    };
    const commit = (entries: readonly string[], rest: string) => {
        const next = added(values, entries);
        if (next !== values) setValues(next);
        setText(rest);
    };
    const onChangeText = (typed: string) => {
        const delimiter = props.delimiter ?? ",";
        const pieces = typed.split(delimiter);
        if (pieces.length < 2) return setText(typed);
        commit(pieces.slice(0, -1), pieces.at(-1) ?? "");
    };
    const remove = (index: number) =>
        setValues(values.filter((_, at) => at !== index));

    const icon = (part: "leadingIcon" | "trailingIcon", node: ReactNode) => {
        const Slot = v[part];
        return isPresent(node) ? (
            <Slot.View
                {...(part === "trailingIcon" ? { pointerEvents: "none" } : {})}
                style={s[part]}
                testID={id(part)}
            >
                <IconSlot {...iconSlot(selected, part)} motion={s[part]}>
                    {node}
                </IconSlot>
            </Slot.View>
        ) : null;
    };
    const supporting = props.error ?? props.supportingText;
    return (
        <v.root.View style={s.root} testID={id("root")}>
            <v.container.View style={s.container} testID={id("container")}>
                {icon("leadingIcon", props.leadingIcon)}
                {values.map((value, index) => (
                    <Chip
                        // Duplicates may repeat a value, so its place keys it too.
                        key={`${index}:${value}`}
                        props={props}
                        value={value}
                        onRemove={() => remove(index)}
                    />
                ))}
                <v.input.TextInput
                    {...props.inputProps}
                    value={text}
                    onChangeText={onChangeText}
                    onSubmitEditing={() => commit([text], "")}
                    submitBehavior="submit"
                    blurOnSubmit={false}
                    onKeyPress={(event: TextInputKeyPressEvent) => {
                        if (
                            event.nativeEvent.key === "Backspace" &&
                            text === "" &&
                            values.length > 0
                        )
                            remove(values.length - 1);
                    }}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    editable={editable}
                    placeholder={props.placeholder ?? " "}
                    maxLength={props.maxLength}
                    {...(typeof props.label === "string"
                        ? { "aria-label": props.label }
                        : {})}
                    aria-invalid={invalid}
                    style={s.input}
                    testID={id("input")}
                />
                <v.label.Text
                    selectable={false}
                    pointerEvents="none"
                    style={s.label}
                    testID={id("label")}
                >
                    {props.label}
                </v.label.Text>
                {icon("trailingIcon", props.trailingIcon)}
            </v.container.View>
            {isPresent(supporting) ? (
                <v.supportingText.Text
                    style={s.supportingText}
                    testID={id("supportingText")}
                >
                    {supporting}
                </v.supportingText.Text>
            ) : null}
        </v.root.View>
    );
}

/** Material's input chips in a text field: `<TagsInput label="Tags" defaultValue={["red"]} />`.
 *  Submitting or typing the delimiter adds a chip; Backspace on an empty input removes the last. */
export const TagsInput = withEngine(TagsInputImpl, "TagsInput");
