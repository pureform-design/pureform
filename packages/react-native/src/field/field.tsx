// The plain form primitives on React Native: Field, Label, Input, Textarea, Description and
// ErrorText. Field connects the pieces inside it: the control is labelled by the label
// (`aria-labelledby`, the label's `nativeID`), and takes the disabled, invalid and required
// states. React Native has no `aria-describedby`, so the description and the error are read as
// the text after the control. It has no date or time input either: for a date or a time, use
// Material's `DatePicker` and `TimePicker`.

import {
    descriptionAnatomy,
    errorTextAnatomy,
    fieldAnatomy,
    inputAnatomy,
    labelAnatomy,
    textareaAnatomy,
} from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import {
    descriptionSelection,
    errorTextSelection,
    fieldControlProps,
    fieldIds,
    fieldLabelState,
    fieldSelection,
    fieldState,
    inputSelection,
    isPresent,
    labelSelection,
    REQUIRED_MARK,
    textareaSelection,
} from "@pureform/binding-core";
import type {
    DescriptionPart,
    ErrorTextPart,
    FieldContentProps,
    FieldPart,
    FieldRootOwnProps,
    FieldState,
    InputPart,
    InputRootOwnProps,
    LabelPart,
    LabelRootOwnProps,
    TextareaPart,
    TextareaRootOwnProps,
} from "@pureform/binding-core";
import { useTokens } from "@pureform/rn-adapter/react";
import { createContext, use, useId, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Platform } from "react-native";
import type { TextInputProps } from "react-native";

import { testIdOf, withEngine } from "../parts";
import { useComponentSlots } from "../styles";

/** React Native Web draws a field that isn't editable as `readonly`; a disabled one is
 *  `disabled` there instead, as the web bindings draw it. */
const WEB = Platform.OS === "web";

const FieldContext = createContext<FieldState | null>(null);

/** Field's props: its states, the control's id, the ready-made content, its tokens and
 *  `testId`. */
export interface FieldProps
    extends
        Omit<FieldRootOwnProps, "unstyled" | "testId">,
        FieldContentProps<ReactNode> {
    /** The pieces: a Label, an Input or a Textarea, a Description and an ErrorText. Left out,
     *  Field renders them from `label`, `description` and `error`. */
    readonly children?: ReactNode;
    readonly testId?: TestIdOverride<FieldPart> | undefined;
}

function FieldImpl(props: FieldProps): ReactNode {
    const generated = useId();
    const ids = useMemo(
        () => fieldIds(props.controlId ?? `${generated}-control`),
        [props.controlId, generated],
    );
    const state = fieldState(props, ids, { description: false, error: false });
    const { styles: s, views: v } = useComponentSlots<FieldPart>(
        "field",
        fieldSelection(props),
    );
    return (
        <FieldContext value={state}>
            <v.root.View
                style={s.root}
                testID={testIdOf(fieldAnatomy, "root", props.testId)}
            >
                {props.children ?? (
                    <>
                        {isPresent(props.label) && <Label>{props.label}</Label>}
                        <Input />
                        {isPresent(props.description) && (
                            <Description>{props.description}</Description>
                        )}
                        {isPresent(props.error) && (
                            <ErrorText>{props.error}</ErrorText>
                        )}
                    </>
                )}
            </v.root.View>
        </FieldContext>
    );
}

/** A column connecting the pieces inside it. */
export const Field = withEngine(FieldImpl, "Field");

export interface LabelProps extends Omit<
    LabelRootOwnProps,
    "unstyled" | "testId"
> {
    readonly children?: ReactNode;
    readonly testId?: TestIdOverride<LabelPart> | undefined;
}

function LabelImpl(props: LabelProps): ReactNode {
    const field = use(FieldContext);
    const state = fieldLabelState(field ?? undefined, props);
    const { styles: s, views: v } = useComponentSlots<LabelPart>(
        "label",
        labelSelection(props),
        state.disabled ? { disabled: true } : {},
    );
    return (
        <v.root.Text
            nativeID={field?.ids.label}
            aria-disabled={state.disabled || undefined}
            style={s.root}
            testID={testIdOf(labelAnatomy, "root", props.testId)}
        >
            {props.children}
            {state.required ? (
                <v.requiredIndicator.Text
                    aria-hidden
                    style={s.requiredIndicator}
                    testID={testIdOf(
                        labelAnatomy,
                        "requiredIndicator",
                        props.testId,
                    )}
                >
                    {REQUIRED_MARK}
                </v.requiredIndicator.Text>
            ) : null}
        </v.root.Text>
    );
}

/** The label: names the field's control, dims while it's disabled, and marks it required. */
export const Label = withEngine(LabelImpl, "Label");

/** What Input and Textarea take: the field's states over its own, the tokens, and React
 *  Native's own `TextInput` props. */
type ControlProps<P extends string> = Omit<TextInputProps, "testID"> & {
    readonly invalid?: boolean | undefined;
    readonly disabled?: boolean | undefined;
    readonly required?: boolean | undefined;
    readonly testId?: TestIdOverride<P> | undefined;
};

export type InputProps = ControlProps<InputPart> &
    Omit<InputRootOwnProps, "unstyled" | "testId">;
export type TextareaProps = ControlProps<TextareaPart> &
    Omit<TextareaRootOwnProps, "unstyled" | "testId">;

/** The control both draw: a `TextInput` in the theme's box, labelled by the field's label. */
function useControl(
    name: "input" | "textarea",
    props: InputProps | TextareaProps,
    selection: Record<string, unknown>,
    testID: string,
): ReactNode {
    const field = use(FieldContext);
    const [focused, setFocused] = useState(false);
    const control = fieldControlProps(field ?? undefined, props);
    const tokens = useTokens();
    const { styles: s, views: v } = useComponentSlots<"root">(name, selection, {
        focus: focused,
        focusVisible: focused,
        invalid: control["aria-invalid"] === "true",
        disabled: control.disabled ?? false,
    });
    const {
        invalid: _invalid,
        disabled: _disabled,
        required: _required,
        tokens: _tokens,
        testId: _testId,
        ...rest
    } = props;
    return (
        <v.root.TextInput
            {...rest}
            {...(field ? { "aria-labelledby": field.ids.label } : {})}
            aria-invalid={control["aria-invalid"] === "true"}
            aria-required={control.required}
            editable={(WEB || !control.disabled) && rest.editable !== false}
            {...(WEB && control.disabled ? ({ disabled: true } as object) : {})}
            placeholderTextColor={
                rest.placeholderTextColor ??
                String(tokens["colors.onSurfaceVariant"])
            }
            onFocus={(event: never) => {
                setFocused(true);
                rest.onFocus?.(event);
            }}
            onBlur={(event: never) => {
                setFocused(false);
                rest.onBlur?.(event);
            }}
            style={[s.root, rest.style]}
            testID={testID}
        />
    );
}

function InputImpl(props: InputProps): ReactNode {
    return useControl(
        "input",
        props,
        inputSelection(props),
        testIdOf(inputAnatomy, "root", props.testId),
    );
}

/** A plain input in the theme's box. React Native has no date or time input: use Material's
 *  `DatePicker` and `TimePicker`. */
export const Input = withEngine(InputImpl, "Input");

function TextareaImpl(props: TextareaProps): ReactNode {
    return useControl(
        "textarea",
        {
            multiline: true,
            numberOfLines: 3,
            textAlignVertical: "top",
            ...props,
        },
        textareaSelection(props),
        testIdOf(textareaAnatomy, "root", props.testId),
    );
}

/** A plain textarea in Input's box, for several lines. */
export const Textarea = withEngine(TextareaImpl, "Textarea");

export interface DescriptionProps {
    readonly children?: ReactNode;
    readonly tokens?: Parameters<typeof descriptionSelection>[0]["tokens"];
    readonly testId?: TestIdOverride<DescriptionPart> | undefined;
}

function DescriptionImpl(props: DescriptionProps): ReactNode {
    const field = use(FieldContext);
    const { styles: s, views: v } = useComponentSlots<"root">(
        "description",
        descriptionSelection(props),
    );
    return (
        <v.root.Text
            nativeID={field?.ids.description}
            style={s.root}
            testID={testIdOf(descriptionAnatomy, "root", props.testId)}
        >
            {props.children}
        </v.root.Text>
    );
}

/** The supporting text under the field's control. */
export const Description = withEngine(DescriptionImpl, "Description");

export interface ErrorTextProps {
    readonly children?: ReactNode;
    readonly tokens?: Parameters<typeof errorTextSelection>[0]["tokens"];
    readonly testId?: TestIdOverride<ErrorTextPart> | undefined;
}

function ErrorTextImpl(props: ErrorTextProps): ReactNode {
    const field = use(FieldContext);
    const { styles: s, views: v } = useComponentSlots<"root">(
        "errorText",
        errorTextSelection(props),
    );
    return (
        <v.root.Text
            nativeID={field?.ids.error}
            style={s.root}
            testID={testIdOf(errorTextAnatomy, "root", props.testId)}
        >
            {props.children}
        </v.root.Text>
    );
}

/** The error under the field's control, while it's invalid. */
export const ErrorText = withEngine(ErrorTextImpl, "ErrorText");
