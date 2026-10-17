import type { Service } from "@zag-js/core";
import { dataAttr } from "@zag-js/dom-query";
import type { NormalizeProps, PropTypes } from "@zag-js/types";

import { parts } from "./text-field.anatomy";
import * as dom from "./text-field.dom";
import type { TextFieldApi, TextFieldSchema } from "./text-field.types";

export function connect<T extends PropTypes>(
    service: Service<TextFieldSchema>,
    normalize: NormalizeProps<T>,
): TextFieldApi<T> {
    const { state, send, context, prop, computed, scope } = service;
    const value = context.get("value");
    const disabled = computed("disabled");
    const invalid = computed("invalid");
    const focused = !disabled && state.matches("focused");
    const filled = computed("filled");
    const readOnly = !!prop("readOnly");

    const dataAttrs = {
        "data-disabled": dataAttr(disabled),
        "data-focus": dataAttr(focused),
        "data-invalid": dataAttr(invalid),
        "data-readonly": dataAttr(readOnly),
    };

    // What the input and the text area share. `defaultValue` carries the current value, as Zag's
    // hidden inputs do: the server renders it, and React leaves the input to the user.
    const control = {
        ...dataAttrs,
        id: dom.getInputId(scope),
        dir: prop("dir"),
        name: prop("name"),
        form: prop("form"),
        defaultValue: value,
        placeholder: prop("placeholder"),
        disabled,
        readOnly,
        required: prop("required"),
        "aria-invalid": invalid ? true : undefined,
        onFocus() {
            send({ type: "FOCUS" });
        },
        onBlur() {
            send({ type: "BLUR" });
        },
        onChange(event: { currentTarget: { value: string } }) {
            send({ type: "VALUE.SET", value: event.currentTarget.value });
        },
    };

    return {
        value,
        focused,
        filled,
        disabled,
        invalid,
        errorText: computed("errorText"),
        setValue(next) {
            send({ type: "VALUE.SET", value: next });
        },
        reset(next) {
            send({ type: "RESET", value: next });
        },
        focus() {
            dom.getInputEl(scope)?.focus();
        },
        getRootProps() {
            return normalize.element({
                ...parts.root.attrs,
                ...dataAttrs,
                id: dom.getRootId(scope),
                dir: prop("dir"),
            });
        },
        getLabelProps() {
            return normalize.label({
                ...parts.label.attrs,
                ...dataAttrs,
                id: dom.getLabelId(scope),
                htmlFor: dom.getInputId(scope),
                dir: prop("dir"),
            });
        },
        getInputProps() {
            return normalize.input({ ...parts.input.attrs, ...control });
        },
        getTextAreaProps() {
            return normalize.textarea({ ...parts.input.attrs, ...control });
        },
        getSupportingTextProps() {
            return normalize.element({
                ...parts.supportingText.attrs,
                ...dataAttrs,
                id: dom.getSupportingTextId(scope),
                dir: prop("dir"),
            });
        },
    };
}
