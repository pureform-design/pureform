// What Input and Textarea share: a `TextInput` in the theme's box, labelled by the Field's label,
// taking the field's states and pureform's controllable value alongside React Native's own props.

import type { TestIdOverride } from "@pureform/anatomy";
import { fieldControlProps } from "@pureform/binding-core";
import type { PlainTextProps } from "@pureform/binding-core";
import { useTokens } from "@pureform/rn-adapter/react";
import { useState } from "react";
import type { ReactNode } from "react";
import { Platform } from "react-native";
import type { TextInputProps } from "react-native";

import { useControllable } from "../parts";
import { useComponentSlots } from "../styles";
import { useField } from "./context";

/** React Native Web draws a field that isn't editable as `readonly`; a disabled one is
 *  `disabled` there instead, as the web bindings draw it. */
const WEB = Platform.OS === "web";

/** What Input and Textarea take: the field's states over its own, the value, the tokens, and
 *  React Native's own `TextInput` props. */
export type TextControlProps<P extends string> = Omit<
    TextInputProps,
    "testID" | "value" | "defaultValue"
> &
    PlainTextProps & {
        readonly invalid?: boolean | undefined;
        readonly disabled?: boolean | undefined;
        readonly required?: boolean | undefined;
        readonly testId?: TestIdOverride<P> | undefined;
    };

export function useTextControl(
    name: "input" | "plainTextarea",
    component: string,
    props: TextControlProps<string> & { readonly tokens?: unknown },
    selection: Record<string, unknown>,
    testID: string,
): ReactNode {
    const field = useField()?.state;
    const [focused, setFocused] = useState(false);
    const control = fieldControlProps(field, props);
    const tokens = useTokens();
    // Uncontrolled, it keeps its own text; controlled, it shows `value` and only moves with it.
    // React Native has no form to reset it.
    const [text, setText] = useControllable<"value", string>(
        component,
        "value",
        props.value,
        props.defaultValue,
        props.onValueChange,
        "",
    );
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
        value: _value,
        defaultValue: _defaultValue,
        onValueChange: _onValueChange,
        ...rest
    } = props;
    return (
        <v.root.TextInput
            {...rest}
            value={text}
            onChangeText={(next: string) => {
                if (next !== text) setText(next);
                rest.onChangeText?.(next);
            }}
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
