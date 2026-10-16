import type { Service } from "@zag-js/core";
import { dataAttr } from "@zag-js/dom-query";
import type { NormalizeProps, PropTypes } from "@zag-js/types";

import { parts } from "./slider.anatomy";
import * as dom from "./slider.dom";
import type { SliderApi, SliderSchema } from "./slider.types";

// Stub: the parts' basic wiring only; p6e fills in the rest.
export function connect<T extends PropTypes>(
    service: Service<SliderSchema>,
    normalize: NormalizeProps<T>,
): SliderApi<T> {
    const { send, context, prop, computed, scope } = service;
    const value = context.get("value");
    const disabled = computed("disabled");

    return {
        value,
        fraction: computed("fraction"),
        disabled,
        setValue(next) {
            send({ type: "VALUE.SET", value: next });
        },
        getRootProps() {
            return normalize.element({
                ...parts.root.attrs,
                "data-disabled": dataAttr(disabled),
                id: dom.getRootId(scope),
                dir: prop("dir"),
            });
        },
        getInputProps() {
            return normalize.input({
                ...parts.input.attrs,
                id: dom.getInputId(scope),
                type: "range",
                dir: prop("dir"),
                name: prop("name"),
                form: prop("form"),
                min: prop("min"),
                max: prop("max"),
                step: prop("step"),
                value: String(value),
                disabled,
                "aria-invalid": !!prop("invalid"),
                onChange(event) {
                    if (prop("readOnly")) return;
                    send({
                        type: "VALUE.SET",
                        value: event.currentTarget.valueAsNumber,
                    });
                },
            });
        },
    };
}
