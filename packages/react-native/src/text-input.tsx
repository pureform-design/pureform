// The text inputs' shared field: a container holding the leading icon, the input, the floating
// label, and the trailing icon, with supporting text under it. It tracks its own focus and value,
// which the container and label read as the web's :focus-within and a filled input.

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
    ChangeDetails,
    TextAreaPart,
    TextAreaVariantProps,
    TextFieldContentProps,
    TextFieldPart,
    TextFieldVariantProps,
} from "@pureform/binding-core";
import { useState } from "react";
import type { ReactNode, Ref } from "react";
import type { TextInputProps } from "react-native";

import { IconSlot, iconSlot } from "./icon-style";
import { useControllable, withEngine } from "./parts";
import { useEngine } from "./provider";
import { useComponentSlots } from "./styles";

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
    /** React Native's own `TextInput` props, such as `keyboardType` or `placeholder`. */
    readonly inputProps?: TextInputProps | undefined;
}

type FieldPart = TextFieldPart & TextAreaPart;

/** The field the text field, text area, and select render. */
export interface FieldOptions extends FieldProps {
    readonly name: "textField" | "textArea" | "select";
    readonly selection: Record<string, unknown>;
    readonly testId: (part: FieldPart) => string;
    readonly lines?: number | undefined;
    /** A select's menu is open: the field shows focus and turns its arrow. */
    readonly expanded?: boolean | undefined;
    /** The input takes no typing (a select). */
    readonly display?: boolean | undefined;
    readonly container?: Ref<unknown> | undefined;
}

function FieldImpl(props: FieldOptions): ReactNode {
    const engine = useEngine();
    const [ownFocus, setFocused] = useState(false);
    const [value, setValue] = useControllable(
        props.name,
        "value",
        props.value,
        props.defaultValue,
        props.onValueChange,
        "",
    );
    const focused = ownFocus || (props.expanded ?? false);
    const mirrored = props.mirrorLeadingIcon || props.mirrorTrailingIcon;
    const { styles: s, selected } = useComponentSlots(
        props.name,
        props.selection,
        {
            focus: focused,
            focusVisible: focused,
            filled: value !== "",
            invalid: props.invalid ?? false,
            disabled: props.disabled ?? false,
            expanded: props.expanded ?? false,
            ...(props.readOnly ? { readOnly: true } : {}),
            ...(mirrored ? { mirrored: true } : {}),
        },
    );
    const id = props.testId;
    const icon = (part: "leadingIcon" | "trailingIcon", node: ReactNode) =>
        isPresent(node) ? (
            <engine.View
                {...(part === "trailingIcon" ? { pointerEvents: "none" } : {})}
                style={s[part]}
                testID={id(part)}
            >
                <IconSlot {...iconSlot(selected, part)} motion={s[part]}>
                    {node}
                </IconSlot>
            </engine.View>
        ) : null;
    return (
        <engine.View style={s.root} testID={id("root")}>
            <engine.View
                ref={props.container as never}
                style={s.container}
                testID={id("container")}
            >
                {icon("leadingIcon", props.leadingIcon)}
                <engine.TextInput
                    {...props.inputProps}
                    value={value}
                    onChangeText={setValue}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    editable={
                        !props.disabled && !props.readOnly && !props.display
                    }
                    {...(typeof props.label === "string"
                        ? { "aria-label": props.label }
                        : {})}
                    aria-invalid={props.invalid}
                    multiline={props.name === "textArea"}
                    numberOfLines={props.lines}
                    style={s.input}
                    testID={id("input")}
                />
                <engine.Text
                    selectable={false}
                    pointerEvents="none"
                    style={s.label}
                    testID={id("label")}
                >
                    {props.label}
                </engine.Text>
                {icon("trailingIcon", props.trailingIcon)}
            </engine.View>
            {isPresent(props.supportingText) ? (
                <engine.Text
                    style={s.supportingText}
                    testID={id("supportingText")}
                >
                    {props.supportingText}
                </engine.Text>
            ) : null}
        </engine.View>
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
        Omit<TextFieldVariantProps, "leadingIcon" | "trailingIcon">,
        FieldProps {
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
                trailingIcon: isPresent(props.trailingIcon),
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
