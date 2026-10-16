import type { Machine, Service } from "@zag-js/core";
import type {
    CommonProperties,
    DirectionProperty,
    PropTypes,
    RequiredBy,
} from "@zag-js/types";

export interface ValueChangeDetails {
    value: string;
}

export interface ElementIds {
    root?: string | undefined;
    input?: string | undefined;
    label?: string | undefined;
    supportingText?: string | undefined;
}

export interface TextFieldProps extends DirectionProperty, CommonProperties {
    /** The ids of the elements in the text field. Useful for composition. */
    ids?: ElementIds | undefined;
    /** The controlled value. */
    value?: string | undefined;
    /** The value the field starts with, and resets to, when `value` isn't controlled. */
    defaultValue?: string | undefined;
    /** Called when the user changes the value, with the value it asks for. */
    onValueChange?: ((details: ValueChangeDetails) => void) | undefined;
    disabled?: boolean | undefined;
    readOnly?: boolean | undefined;
    required?: boolean | undefined;
    invalid?: boolean | undefined;
    /** The name the input submits its value under. */
    name?: string | undefined;
    /** The id of the form the input belongs to, for a field outside it. */
    form?: string | undefined;
}

type PropsWithDefault = "defaultValue";

export interface TextFieldSchema {
    state: "idle";
    props: RequiredBy<TextFieldProps, PropsWithDefault>;
    context: {
        value: string;
        focused: boolean;
        fieldsetDisabled: boolean;
    };
    computed: {
        disabled: boolean;
        filled: boolean;
    };
    event: { type: string; [key: string]: unknown };
    action: string;
    effect: string;
    guard: string;
}

export type TextFieldService = Service<TextFieldSchema>;
export type TextFieldMachine = Machine<TextFieldSchema>;

export interface TextFieldApi<T extends PropTypes = PropTypes> {
    value: string;
    focused: boolean;
    /** Whether the field holds a value, which floats the label. */
    filled: boolean;
    disabled: boolean;
    invalid: boolean;
    setValue: (value: string) => void;
    getRootProps: () => T["element"];
    getLabelProps: () => T["label"];
    getInputProps: () => T["input"];
    getSupportingTextProps: () => T["element"];
}
