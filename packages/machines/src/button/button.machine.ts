import { createGuards, createMachine } from "@zag-js/core";
import { addDomEvent } from "@zag-js/dom-query";

import { trackFormControl } from "../form/control";
import * as dom from "./button.dom";
import type { ButtonSchema } from "./button.types";

const { and, not } = createGuards<ButtonSchema>();

export const machine = createMachine<ButtonSchema>({
    props({ props }) {
        return {
            type: "button",
            ...props,
            toggle:
                props.toggle ??
                (props.selected !== undefined ||
                    props.defaultSelected !== undefined),
            defaultSelected: props.defaultSelected ?? false,
        };
    },

    initialState() {
        return "idle";
    },

    context({ prop, bindable }) {
        return {
            selected: bindable<boolean>(() => ({
                defaultValue: prop("defaultSelected"),
                value: prop("selected"),
                onChange(selected) {
                    prop("onSelectedChange")?.({ selected });
                },
            })),
            focused: bindable<boolean>(() => ({ defaultValue: false })),
            focusVisible: bindable<boolean>(() => ({ defaultValue: false })),
            hovered: bindable<boolean>(() => ({ defaultValue: false })),
            fieldsetDisabled: bindable<boolean>(() => ({
                defaultValue: false,
            })),
        };
    },

    refs() {
        return { pressSource: null };
    },

    computed: {
        disabled: ({ prop, context }) =>
            !!prop("disabled") || context.get("fieldsetDisabled"),
    },

    watch({ track, prop, context, computed, send, action }) {
        track(
            [() => prop("disabled"), () => context.get("fieldsetDisabled")],
            () => {
                if (!computed("disabled")) return;
                send({ type: "PRESS.CANCEL" });
                action(["clearInteraction"]);
            },
        );
    },

    effects: ["trackFormControl"],

    on: {
        "SELECTED.TOGGLE": {
            guard: and("isToggle", not("isDisabled")),
            actions: ["toggleSelected"],
        },
        "SELECTED.SET": {
            guard: "isToggle",
            actions: ["setSelected"],
        },
        "CONTEXT.SET": {
            actions: ["setContext"],
        },
    },

    states: {
        idle: {
            on: {
                "PRESS.START": {
                    guard: not("isDisabled"),
                    target: "pressed",
                    actions: ["setPressSource"],
                },
            },
        },
        pressed: {
            effects: ["trackPointerRelease"],
            exit: ["clearPressSource"],
            on: {
                "PRESS.END": { target: "idle" },
                "PRESS.CANCEL": { target: "idle" },
                BLUR: { guard: "isKeyboardPress", target: "idle" },
            },
        },
    },

    implementations: {
        guards: {
            isToggle: ({ prop }) => prop("toggle"),
            isDisabled: ({ computed }) => computed("disabled"),
            isKeyboardPress: ({ refs }) =>
                refs.get("pressSource") === "keyboard",
        },

        effects: {
            trackFormControl({ context, scope }) {
                return trackFormControl(dom.getRootEl(scope), {
                    onFieldsetDisabledChange(disabled) {
                        context.set("fieldsetDisabled", disabled);
                    },
                });
            },

            // A pointer press ends wherever the pointer is released, as `:active` does.
            trackPointerRelease({ refs, scope, send }) {
                if (refs.get("pressSource") !== "pointer") return;
                const win = scope.getWin();
                const cleanups = [
                    addDomEvent(win, "pointerup", () =>
                        send({ type: "PRESS.END" }),
                    ),
                    addDomEvent(win, "pointercancel", () =>
                        send({ type: "PRESS.CANCEL" }),
                    ),
                ];
                return () => cleanups.forEach((cleanup) => cleanup());
            },
        },

        actions: {
            setPressSource({ refs, event }) {
                if (event.type === "PRESS.START") {
                    refs.set("pressSource", event.source);
                }
            },
            clearPressSource({ refs }) {
                refs.set("pressSource", null);
            },
            clearInteraction({ context }) {
                context.set("focused", false);
                context.set("focusVisible", false);
                context.set("hovered", false);
            },
            setContext({ context, event }) {
                if (event.type !== "CONTEXT.SET") return;
                for (const key of Object.keys(event.context) as Array<
                    keyof typeof event.context
                >) {
                    const value = event.context[key];
                    if (value !== undefined) context.set(key, value);
                }
            },
            setSelected({ context, event }) {
                if (event.type === "SELECTED.SET") {
                    context.set("selected", event.selected);
                }
            },
            toggleSelected({ context }) {
                context.set("selected", (selected) => !selected);
            },
        },
    },
});
