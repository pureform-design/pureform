// The text inputs' shared field: a container holding the leading icon, the prefix, the input, the
// suffix, the floating label, and the trailing icon, with supporting text and a counter under
// it. It tracks its own focus and value, which the container and label read as the web's
// :focus-within and a filled input.

import {
    partTestId,
    textAreaAnatomy,
    textFieldAnatomy,
} from "@pureform/anatomy";
import type {
    ComponentAnatomy,
    PartName,
    TestIdOverride,
} from "@pureform/anatomy";
import {
    isPresent,
    textAreaSelection,
    textFieldSelection,
} from "@pureform/binding-core";
import type {
    TextFieldAffixProps,
    ChangeDetails,
    TextAreaPart,
    TextAreaVariantProps,
    TextFieldContentProps,
    TextFieldPart,
    TextFieldVariantProps,
} from "@pureform/binding-core";
import { useState } from "react";
import type { ReactNode, Ref } from "react";
import { Platform, Pressable } from "react-native";
import type { TextInputProps } from "react-native";

import { IconSlot, iconSlot } from "./icon-style";
import { useControllable, withEngine } from "./parts";
import { useComponentSlots } from "./styles";

/** React Native Web draws a field that isn't editable as `readonly`; a disabled one is
 *  `disabled` there instead, as the web bindings draw it (React Native Web forwards it). */
const WEB_DISABLED = Platform.OS === "web";

/** What every text input takes. */
export interface FieldProps extends TextFieldContentProps<ReactNode> {
    /** The text. Controlled when defined. */
    readonly value?: string | undefined;
    readonly defaultValue?: string | undefined;
    readonly onValueChange?:
        | ((details: ChangeDetails<"value", string>) => void)
        | undefined;
    readonly invalid?: boolean | undefined;
    readonly disabled?: boolean | undefined;
    readonly readOnly?: boolean | undefined;
    /** The most characters the counter allows: it shows `count / counterMax`, and a longer
     *  value marks the field invalid. */
    readonly counterMax?: number | undefined;
    /** React Native's own `TextInput` props, such as `keyboardType` or `placeholder`. */
    readonly inputProps?: TextInputProps | undefined;
}

type FieldPart = TextFieldPart | TextAreaPart;

/** The field the text field, text area, and select render. */
export interface FieldOptions
    extends FieldProps, TextFieldAffixProps<ReactNode> {
    readonly name:
        | "textField"
        | "textArea"
        | "select"
        | "autocomplete"
        | "dockedDatePicker";
    readonly selection: Record<string, unknown>;
    readonly testId: (part: FieldPart) => string;
    readonly lines?: number | undefined;
    /** A select's menu is open: the field shows focus and turns its arrow. */
    readonly expanded?: boolean | undefined;
    /** The input takes no typing (a select). */
    readonly display?: boolean | undefined;
    readonly container?: Ref<unknown> | undefined;
    /** A secure (password) field: the trailing icon shows or hides the text. */
    readonly secure?: boolean | undefined;
    /** The visibility toggle's accessible name. @default "Show password" */
    readonly revealLabel?: string | undefined;
}

function FieldImpl(props: FieldOptions): ReactNode {
    const [ownFocus, setFocused] = useState(false);
    const [value, setValue] = useControllable(
        props.name,
        "value",
        props.value,
        props.defaultValue,
        props.onValueChange,
        "",
    );
    const [revealed, setRevealed] = useState(false);
    const focused = ownFocus || (props.expanded ?? false);
    const counterText =
        props.counterMax === undefined
            ? undefined
            : `${value.length} / ${props.counterMax}`;
    const invalid =
        (props.invalid ?? false) ||
        (props.counterMax !== undefined && value.length > props.counterMax);
    const mirrored = props.mirrorLeadingIcon || props.mirrorTrailingIcon;
    const {
        styles: s,
        selected,
        views: v,
    } = useComponentSlots<FieldPart>(props.name, props.selection, {
        focus: focused,
        focusVisible: focused,
        filled: value !== "",
        invalid,
        disabled: props.disabled ?? false,
        expanded: props.expanded ?? false,
        ...(props.readOnly ? { readOnly: true } : {}),
        ...(mirrored ? { mirrored: true } : {}),
    });
    const id = props.testId;
    const icon = (part: "leadingIcon" | "trailingIcon", node: ReactNode) => {
        const Slot = v[part];
        // A secure field's trailing icon is the button that shows or hides the text.
        if (part === "trailingIcon" && props.secure)
            return (
                <Pressable
                    role="button"
                    aria-label={props.revealLabel ?? "Show password"}
                    aria-pressed={revealed}
                    disabled={props.disabled}
                    onPress={() => setRevealed(!revealed)}
                    style={s[part]}
                    testID={id(part)}
                >
                    <IconSlot {...iconSlot(selected, part)} motion={s[part]}>
                        {isPresent(node) ? node : revealed ? "◡" : "◉"}
                    </IconSlot>
                </Pressable>
            );
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
    const affix = (part: "prefixText" | "suffixText", node: ReactNode) => {
        if (props.name === "textArea" || !isPresent(node)) return null;
        const Slot = v[part];
        return (
            <Slot.Text selectable={false} style={s[part]} testID={id(part)}>
                {node}
            </Slot.Text>
        );
    };
    const supporting = isPresent(props.supportingText) ? (
        <v.supportingText.Text
            style={s.supportingText}
            testID={id("supportingText")}
        >
            {props.supportingText}
        </v.supportingText.Text>
    ) : null;
    return (
        <v.root.View style={s.root} testID={id("root")}>
            <v.container.View
                ref={props.container as never}
                style={s.container}
                testID={id("container")}
            >
                {icon("leadingIcon", props.leadingIcon)}
                {affix("prefixText", props.prefixText)}
                <v.input.TextInput
                    {...props.inputProps}
                    value={value}
                    onChangeText={setValue}
                    onFocus={() => setFocused(true)}
                    onBlur={(event: unknown) => {
                        setFocused(false);
                        props.inputProps?.onBlur?.(event as never);
                    }}
                    editable={
                        !(props.disabled && !WEB_DISABLED) &&
                        !props.readOnly &&
                        !props.display
                    }
                    {...(WEB_DISABLED && props.disabled
                        ? ({ disabled: true } as object)
                        : {})}
                    {...(typeof props.label === "string"
                        ? { "aria-label": props.label }
                        : {})}
                    aria-invalid={invalid}
                    {...(props.secure ? { secureTextEntry: !revealed } : {})}
                    multiline={props.name === "textArea"}
                    numberOfLines={props.lines}
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
                    {props.label}
                </v.label.Text>
                {icon("trailingIcon", props.trailingIcon)}
            </v.container.View>
            {supporting}
            {counterText !== undefined ? (
                <v.counter.Text style={s.counter} testID={id("counter")}>
                    {counterText}
                </v.counter.Text>
            ) : null}
        </v.root.View>
    );
}

/** A part's test id in any of the fields' anatomies, which share their part names. */
export const partId = <A extends ComponentAnatomy>(
    anatomy: A,
    part: string,
    testId: TestIdOverride<PartName<A>> | undefined,
): string => partTestId(anatomy, part as PartName<A>, testId);

/** The field the text inputs render. */
export const Field = withEngine(FieldImpl, "Field");

export interface TextFieldProps
    extends
        Omit<
            TextFieldVariantProps,
            "leadingIcon" | "trailingIcon" | "prefixText" | "suffixText"
        >,
        FieldProps,
        TextFieldAffixProps<ReactNode> {
    /** The visibility toggle's accessible name in a `secure` field. @default "Show password" */
    readonly revealLabel?: string | undefined;
    readonly testId?: TestIdOverride<TextFieldPart> | undefined;
}

/** Material's text field: `<TextField label="Name" defaultValue="" variant="outlined" />`. */
export function TextField(props: TextFieldProps): ReactNode {
    return (
        <Field
            {...props}
            name="textField"
            selection={textFieldSelection({
                ...props,
                leadingIcon: isPresent(props.leadingIcon),
                trailingIcon: isPresent(props.trailingIcon) || !!props.secure,
                prefixText: isPresent(props.prefixText),
                suffixText: isPresent(props.suffixText),
            })}
            testId={(part) => partId(textFieldAnatomy, part, props.testId)}
        />
    );
}

export interface TextAreaProps
    extends
        Omit<TextAreaVariantProps, "leadingIcon" | "trailingIcon">,
        FieldProps {
    /** How many lines it shows. Default 3. */
    readonly lines?: number | undefined;
    readonly testId?: TestIdOverride<TextAreaPart> | undefined;
}

/** Material's text area: a text field for several lines. */
export function TextArea(props: TextAreaProps): ReactNode {
    return (
        <Field
            {...props}
            name="textArea"
            lines={props.lines ?? 3}
            selection={textAreaSelection({
                ...props,
                leadingIcon: isPresent(props.leadingIcon),
                trailingIcon: isPresent(props.trailingIcon),
            })}
            testId={(part) => partId(textAreaAnatomy, part, props.testId)}
        />
    );
}
