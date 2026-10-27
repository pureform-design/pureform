import type { Service } from "@zag-js/core";
import { dataAttr } from "@zag-js/dom-query";
import type { NormalizeProps, PropTypes } from "@zag-js/types";

import { claimEvent, isOwnFocusEvent, pointerKind } from "../interaction";
import { parts } from "./button.anatomy";
import * as dom from "./button.dom";
import type { ButtonApi, ButtonSchema } from "./button.types";

const isPressKey = (key: string) => key === "Enter" || key === " ";

export function connect<T extends PropTypes>(
    service: Service<ButtonSchema>,
    normalize: NormalizeProps<T>,
): ButtonApi<T> {
    const { send, context, prop, computed, scope, refs } = service;

    const disabled = computed("disabled");
    const toggle = prop("toggle");
    const interaction = context.get("interaction");
    const emitter = refs.get("interaction");
    const pressed = !disabled && interaction.pressed;
    const focused = !disabled && context.get("focused");
    const focusVisible = !disabled && interaction.focusVisible;
    const hovered = !disabled && interaction.hovered;
    const selected = toggle && context.get("selected");

    // Pressed, hovered, and focus-visible come from the interaction source, matched by the
    // element's own pseudo-classes or the binding's `data-pf-*` attributes, not marked here.
    const dataAttrs = {
        "data-focus": dataAttr(focused),
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
                // The innermost pressable claims a press, so a pressable inside another emits it
                // once.
                onPointerDown(event) {
                    if (disabled || event.button !== 0 || !claimEvent(event)) {
                        return;
                    }
                    send({
                        type: "PRESS.START",
                        source: "pointer",
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
                onKeyDown(event) {
                    if (
                        disabled ||
                        event.repeat ||
                        !isPressKey(event.key) ||
                        !claimEvent(event)
                    ) {
                        return;
                    }
                    send({
                        type: "PRESS.START",
                        source: "keyboard",
                        origin: "center",
                        pointer: "keyboard",
                    });
                },
                onKeyUp(event) {
                    if (!isPressKey(event.key)) return;
                    send({ type: "PRESS.END" });
                },
                onFocus(event) {
                    if (!isOwnFocusEvent(event)) return;
                    send({ type: "CONTEXT.SET", context: { focused: true } });
                    emitter.focusIn(event.currentTarget);
                },
                onBlur(event) {
                    if (!isOwnFocusEvent(event)) return;
                    send({ type: "CONTEXT.SET", context: { focused: false } });
                    emitter.blur(event.currentTarget);
                    send({ type: "BLUR" });
                },
                onClick(event) {
                    if (disabled) return;
                    emitter.click(event, event.currentTarget);
                    if (toggle) send({ type: "SELECTED.TOGGLE" });
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

        getSecondaryIconProps() {
            return normalize.element({
                ...parts.secondaryIcon.attrs,
                ...dataAttrs,
                dir: prop("dir"),
                "aria-hidden": true,
            });
        },
    };
}
