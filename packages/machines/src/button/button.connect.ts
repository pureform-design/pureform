import type { Service } from "@zag-js/core";
import { dataAttr } from "@zag-js/dom-query";
import type { NormalizeProps, PropTypes } from "@zag-js/types";

import { parts } from "./button.anatomy";
import * as dom from "./button.dom";
import type { ButtonApi, ButtonSchema } from "./button.types";

const isPressKey = (key: string) => key === "Enter" || key === " ";

// Whether the browser shows a focus ring for this focus, which `:focus-visible` already decides.
const isFocusVisible = (element: Element) => {
    try {
        return element.matches(":focus-visible");
    } catch {
        return false;
    }
};

export function connect<T extends PropTypes>(
    service: Service<ButtonSchema>,
    normalize: NormalizeProps<T>,
): ButtonApi<T> {
    const { state, send, context, prop, computed, scope } = service;

    const disabled = computed("disabled");
    const toggle = prop("toggle");
    const pressed = state.matches("pressed");
    const focused = !disabled && context.get("focused");
    const focusVisible = !disabled && context.get("focusVisible");
    const hovered = !disabled && context.get("hovered");
    const selected = toggle && context.get("selected");

    const dataAttrs = {
        "data-active": dataAttr(pressed),
        "data-focus": dataAttr(focused),
        "data-focus-visible": dataAttr(focusVisible),
        "data-hover": dataAttr(hovered),
        "data-disabled": dataAttr(disabled),
        "data-state": toggle ? (selected ? "on" : "off") : undefined,
    };

    return {
        pressed,
        focused,
        focusVisible,
        hovered,
        disabled,
        toggle,
        selected,

        setSelected(next) {
            send({ type: "SELECTED.SET", selected: next });
        },
        toggleSelected() {
            send({ type: "SELECTED.TOGGLE" });
        },

        getRootProps() {
            return normalize.button({
                ...parts.root.attrs,
                ...dataAttrs,
                id: dom.getRootId(scope),
                dir: prop("dir"),
                type: prop("type"),
                name: prop("name"),
                value: prop("value"),
                form: prop("form"),
                disabled,
                "aria-pressed": toggle ? selected : undefined,
                onPointerDown(event) {
                    if (disabled || event.button !== 0) return;
                    send({ type: "PRESS.START", source: "pointer" });
                },
                onPointerMove(event) {
                    if (disabled || hovered || event.pointerType === "touch")
                        return;
                    send({ type: "CONTEXT.SET", context: { hovered: true } });
                },
                onPointerLeave() {
                    if (!hovered) return;
                    send({ type: "CONTEXT.SET", context: { hovered: false } });
                },
                onKeyDown(event) {
                    if (disabled || event.repeat || !isPressKey(event.key))
                        return;
                    send({ type: "PRESS.START", source: "keyboard" });
                },
                onKeyUp(event) {
                    if (!isPressKey(event.key)) return;
                    send({ type: "PRESS.END" });
                },
                onFocus(event) {
                    send({
                        type: "CONTEXT.SET",
                        context: {
                            focused: true,
                            focusVisible: isFocusVisible(event.currentTarget),
                        },
                    });
                },
                onBlur() {
                    send({
                        type: "CONTEXT.SET",
                        context: { focused: false, focusVisible: false },
                    });
                    send({ type: "BLUR" });
                },
                onClick() {
                    if (disabled || !toggle) return;
                    send({ type: "SELECTED.TOGGLE" });
                },
            });
        },

        getLabelProps() {
            return normalize.element({
                ...parts.label.attrs,
                ...dataAttrs,
                id: dom.getLabelId(scope),
                dir: prop("dir"),
            });
        },

        getIconProps() {
            return normalize.element({
                ...parts.icon.attrs,
                ...dataAttrs,
                dir: prop("dir"),
                "aria-hidden": true,
            });
        },
    };
}
