import type { Service } from "@zag-js/core";
import { dataAttr } from "@zag-js/dom-query";
import type { NormalizeProps, PropTypes } from "@zag-js/types";

import {
    claimEvent,
    emittersOf,
    isOwnFocusEvent,
    pointerKind,
} from "../interaction";
import { parts } from "./slider.anatomy";
import * as dom from "./slider.dom";
import type { SliderApi, SliderSchema } from "./slider.types";

export function connect<T extends PropTypes>(
    service: Service<SliderSchema>,
    normalize: NormalizeProps<T>,
): SliderApi<T> {
    const { state, send, context, prop, computed, scope } = service;
    const value = context.get("value");
    const disabled = computed("disabled");
    const fraction = computed("fraction");
    const dragging = !disabled && state.matches("dragging");
    const readOnly = !!prop("readOnly");
    const invalid = !!prop("invalid");
    const emitter = emittersOf(service).own;

    const dataAttrs = {
        "data-disabled": dataAttr(disabled),
        "data-dragging": dataAttr(dragging),
        "data-invalid": dataAttr(invalid),
        "data-readonly": dataAttr(readOnly),
    };

    return {
        value,
        fraction,
        percent: fraction * 100,
        dragging,
        disabled,
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
        // `defaultValue` carries the current value, as Zag's hidden inputs do: the server renders
        // it, and React leaves the input to the user.
        getInputProps() {
            return normalize.input({
                ...parts.input.attrs,
                ...dataAttrs,
                id: dom.getInputId(scope),
                type: "range",
                dir: prop("dir"),
                name: prop("name"),
                form: prop("form"),
                min: prop("min"),
                max: prop("max"),
                step: prop("step"),
                defaultValue: String(value),
                disabled,
                "aria-invalid": invalid ? true : undefined,
                "aria-readonly": readOnly ? true : undefined,
                onPointerDown(event) {
                    if (event.button !== 0 || disabled || readOnly) return;
                    if (!claimEvent(event)) return;
                    send({
                        type: "POINTER.DOWN",
                        origin: { x: event.clientX, y: event.clientY },
                        pointer: pointerKind(event.pointerType),
                    });
                },
                onPointerMove(event) {
                    if (disabled) return;
                    emitter.pointerOver(event, event.currentTarget);
                },
                onPointerLeave(event) {
                    emitter.hoverExit(event.currentTarget);
                },
                onFocus(event) {
                    if (!isOwnFocusEvent(event)) return;
                    emitter.focusIn(event.currentTarget);
                },
                onBlur(event) {
                    if (!isOwnFocusEvent(event)) return;
                    emitter.blur(event.currentTarget);
                },
                onChange(event) {
                    if (readOnly) return;
                    send({
                        type: "VALUE.SET",
                        value: event.currentTarget.valueAsNumber,
                    });
                },
            });
        },
    };
}
