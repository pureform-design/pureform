import { createMachine } from "@zag-js/core";
import { addDomEvent } from "@zag-js/dom-query";

import { trackFormControl } from "../form/control";
import * as dom from "./text-field.dom";
import type { TextFieldSchema } from "./text-field.types";

// Material's text field over a native input or text area. The input keeps its own text; the
// machine holds the value with Zag's controllable-state semantics, writes it back to the input
// when it changes from outside, follows the fieldsets around it by the browser's rule, and decides
// when the field shows as invalid. A form reset is the binding's: it calls `reset` once the
// browser has reset the input.
export const machine = createMachine<TextFieldSchema>({
    props({ props }) {
        return {
            ...props,
            defaultValue: props.defaultValue ?? "",
            placeholder: props.placeholder ?? " ",
        };
    },

    initialState() {
        return "idle";
    },

    context({ prop, bindable }) {
        return {
            value: bindable<string>(() => ({
                defaultValue: prop("defaultValue"),
                value: prop("value"),
                // React renders the owner's update before the input event ends, so a controlled
                // input the owner took doesn't jump back.
                sync: true,
                onChange(value) {
                    prop("onValueChange")?.({ value });
                },
            })),
            fieldsetDisabled: bindable<boolean>(() => ({
                defaultValue: false,
            })),
            interacted: bindable<boolean>(() => ({ defaultValue: false })),
            validationMessage: bindable<string>(() => ({ defaultValue: "" })),
        };
    },

    computed: {
        disabled: ({ prop, context }) =>
            !!prop("disabled") || context.get("fieldsetDisabled"),
        filled: ({ context }) => context.get("value") !== "",
        errorText: ({ prop, context }) => {
            const error = prop("error");
            if (error) return error;
            if (prop("validate") !== "native" || !context.get("interacted"))
                return undefined;
            return context.get("validationMessage") || undefined;
        },
        invalid: ({ prop, computed }) =>
            !!prop("invalid") || computed("errorText") !== undefined,
    },

    entry: ["syncCustomValidity", "syncValidity"],

    watch({ track, context, prop, action }) {
        track([() => context.get("value")], () => {
            action(["syncInputElement", "syncValidity"]);
        });
        track(
            [
                () => prop("error"),
                () => prop("required"),
                () => prop("disabled"),
                () => context.get("fieldsetDisabled"),
            ],
            () => {
                action(["syncCustomValidity", "syncValidity"]);
            },
        );
    },

    effects: ["trackFormControl", "trackInputEvents"],

    on: {
        "VALUE.SET": { actions: ["setValue"] },
        RESET: { actions: ["clearInteracted", "setValue", "syncValidity"] },
        COMMIT: { actions: ["markInteracted", "syncValidity"] },
        INVALID: { actions: ["markInteracted", "syncValidity"] },
    },

    states: {
        idle: {
            on: { FOCUS: { target: "focused" } },
        },
        focused: {
            on: { BLUR: { target: "idle", actions: ["syncValidity"] } },
        },
    },

    implementations: {
        effects: {
            trackFormControl({ context, scope }) {
                return trackFormControl(dom.getInputEl(scope), {
                    onFieldsetDisabledChange(disabled) {
                        context.set("fieldsetDisabled", disabled);
                    },
                });
            },
            // The native `change` event commits an edit, and `invalid` fires when the form checks
            // its controls: either one is the interaction `:user-invalid` waits for.
            trackInputEvents({ scope, send }) {
                const input = dom.getInputEl(scope);
                if (!input) return;
                const cleanups = [
                    addDomEvent(input, "change", () =>
                        send({ type: "COMMIT" }),
                    ),
                    addDomEvent(input, "invalid", () =>
                        send({ type: "INVALID" }),
                    ),
                ];
                return () => cleanups.forEach((cleanup) => cleanup());
            },
        },

        actions: {
            setValue({ context, event }) {
                context.set("value", String(event["value"] ?? ""));
            },
            markInteracted({ context }) {
                context.set("interacted", true);
            },
            clearInteracted({ context }) {
                context.set("interacted", false);
            },
            // Writes the value to the input when it changed from outside; an equal value is left
            // alone, so the caret stays where the user is typing.
            syncInputElement({ context, scope }) {
                const input = dom.getInputEl(scope);
                const value = context.get("value");
                if (input && input.value !== value) input.value = value;
            },
            syncCustomValidity({ prop, scope }) {
                dom.getInputEl(scope)?.setCustomValidity(prop("error") ?? "");
            },
            syncValidity({ context, scope }) {
                const input = dom.getInputEl(scope);
                if (input)
                    context.set("validationMessage", input.validationMessage);
            },
        },
    },
});
