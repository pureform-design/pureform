import type { Service } from "@zag-js/core";
import { dataAttr } from "@zag-js/dom-query";
import type { NormalizeProps, PropTypes } from "@zag-js/types";

import { parts } from "./text-field.anatomy";
import * as dom from "./text-field.dom";
import type { TextFieldApi, TextFieldSchema } from "./text-field.types";

// Stub: the parts' basic wiring only; p6b fills in the rest.
export function connect<T extends PropTypes>(
    service: Service<TextFieldSchema>,
    normalize: NormalizeProps<T>,
): TextFieldApi<T> {
    const { send, context, prop, computed, scope } = service;
    const value = context.get("value");
    const disabled = computed("disabled");
    const invalid = !!prop("invalid");
    const focused = !disabled && context.get("focused");
    const filled = computed("filled");

    const dataAttrs = {
        "data-disabled": dataAttr(disabled),
        "data-focus": dataAttr(focused),
        "data-invalid": dataAttr(invalid),
    };

    return {
        value,
        focused,
        filled,
        disabled,
        invalid,
        setValue(next) {
            send({ type: "VALUE.SET", value: next });
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
            return normalize.input({
                ...parts.input.attrs,
                ...dataAttrs,
                id: dom.getInputId(scope),
                dir: prop("dir"),
                name: prop("name"),
                form: prop("form"),
                value,
                disabled,
                readOnly: prop("readOnly"),
                required: prop("required"),
                "aria-invalid": invalid,
                "aria-describedby": dom.getSupportingTextId(scope),
                onFocus() {
                    send({ type: "CONTEXT.SET", context: { focused: true } });
                },
                onBlur() {
                    send({ type: "CONTEXT.SET", context: { focused: false } });
                },
                onChange(event) {
                    send({
                        type: "VALUE.SET",
                        value: event.currentTarget.value,
                    });
                },
            });
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
