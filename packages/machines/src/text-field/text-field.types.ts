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

/** How the field decides it's invalid besides `invalid` and `error`: `"native"` lets the input's
 *  own constraints (`required`, `pattern`, `minLength`, …) decide, once the user has changed the
 *  value or tried to submit, as `:user-invalid` does. */
export type ValidateMode = "native";

export interface TextFieldProps extends DirectionProperty, CommonProperties {
    /** The ids of the elements in the text field. Useful for composition. */
    ids?: ElementIds | undefined;
    /** The controlled value. */
    value?: string | undefined;
    /** The value the field starts with, and resets to, when `value` isn't controlled. */
    defaultValue?: string | undefined;
    /** Called when the user changes the value, with the value it asks for. */
    onValueChange?: ((details: ValueChangeDetails) => void) | undefined;
    /** A disabled fieldset around the input disables it too. */
    disabled?: boolean | undefined;
    readOnly?: boolean | undefined;
    required?: boolean | undefined;
    /** Marks the field invalid (`aria-invalid`); nothing else changes. */
    invalid?: boolean | undefined;
    /** An error message: marks the field invalid, is the supporting text's, and is the input's
     *  custom validity, so the browser blocks submitting. */
    error?: string | undefined;
    /** Let the native constraints decide whether the field is invalid. */
    validate?: ValidateMode | undefined;
    /** The input's placeholder. The label floats while the placeholder isn't shown, so an empty
     *  field needs one: a single space by default. */
    placeholder?: string | undefined;
    /** The name the input submits its value under. */
    name?: string | undefined;
    /** The id of the form the input belongs to, for a field outside it. */
    form?: string | undefined;
}

type PropsWithDefault = "defaultValue" | "placeholder";

export interface TextFieldSchema {
    state: "idle" | "focused";
    props: RequiredBy<TextFieldProps, PropsWithDefault>;
    context: {
        value: string;
        fieldsetDisabled: boolean;
        /** The user changed the value or tried to submit: native validation shows from now. */
        interacted: boolean;
        /** The input's `validationMessage`, read after each change. */
        validationMessage: string;
    };
    computed: {
        disabled: boolean;
        filled: boolean;
        invalid: boolean;
        errorText: string | undefined;
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
    /** `invalid`, an `error`, or a native constraint the user broke under `validate="native"`. */
    invalid: boolean;
    /** The message the supporting text shows instead of its own: `error`, or the browser's
     *  `validationMessage` under `validate="native"`. */
    errorText: string | undefined;
    setValue: (value: string) => void;
    /** Puts the value back after a form reset, and forgets the user's interaction. */
    reset: (value: string) => void;
    focus: () => void;
    getRootProps: () => T["element"];
    getLabelProps: () => T["label"];
    getInputProps: () => T["input"];
    getTextAreaProps: () => T["textarea"];
    getSupportingTextProps: () => T["element"];
}
