import {
    createInteractionSource,
    IDLE_INTERACTION_STATE,
    type InteractionState,
    type MutableInteractionSource,
} from "@pureform/binding-core/interaction";
import { createGuards, createMachine } from "@zag-js/core";
import { addDomEvent } from "@zag-js/dom-query";

import { trackFormControl } from "../form/control";
import { InteractionEmitter } from "../interaction";
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
            fieldsetDisabled: bindable<boolean>(() => ({
                defaultValue: false,
            })),
            interaction: bindable<InteractionState>(() => ({
                defaultValue: IDLE_INTERACTION_STATE,
            })),
        };
    },

    refs({ prop }) {
        // A source of its own, made when it first emits, for a button run without one.
        let own: MutableInteractionSource | undefined;
        return {
            pressSource: null,
            interaction: new InteractionEmitter(
                () =>
                    prop("interactionSource") ??
                    (own ??= createInteractionSource()),
            ),
        };
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

    effects: ["trackFormControl", "trackInteractionSource"],

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
                    actions: ["setPressSource", "emitPress"],
                },
            },
        },
        pressed: {
            effects: ["trackPointerRelease"],
            exit: ["clearPressSource"],
            on: {
                "PRESS.END": { target: "idle", actions: ["emitRelease"] },
                "PRESS.CANCEL": { target: "idle", actions: ["emitCancel"] },
                BLUR: {
                    guard: "isKeyboardPress",
                    target: "idle",
                    actions: ["emitCancel"],
                },
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

            // The API reads the source's state, which may change from another component sharing
            // it. Stopping ends what the button has in progress, so a shared source doesn't stay
            // pressed.
            trackInteractionSource({ refs, context, scope }) {
                const emitter = refs.get("interaction");
                const source = emitter.source();
                if (!source) return;
                context.set("interaction", source.state);
                const unsubscribe = source.subscribe((_, state) =>
                    context.set("interaction", state),
                );
                return () => {
                    emitter.end(dom.getRootEl(scope));
                    unsubscribe();
                };
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
            emitPress({ refs, event, scope }) {
                if (event.type !== "PRESS.START") return;
                refs.get("interaction").press(
                    event.origin,
                    event.pointer,
                    dom.getRootEl(scope),
                );
            },
            emitRelease({ refs, scope }) {
                refs.get("interaction").release(dom.getRootEl(scope));
            },
            emitCancel({ refs, scope }) {
                refs.get("interaction").cancel(dom.getRootEl(scope));
            },
            // Ends what's in progress, as a disabled button can't be hovered, focused, or pressed.
            clearInteraction({ context, refs, scope }) {
                context.set("focused", false);
                refs.get("interaction").end(dom.getRootEl(scope));
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
