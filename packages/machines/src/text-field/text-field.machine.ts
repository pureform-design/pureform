import { createMachine } from "@zag-js/core";

import type { TextFieldSchema } from "./text-field.types";

// Stub: holds the value with Zag's controllable-state semantics and nothing else. p6b fills
// in focus, the floating label's states, form reset, fieldset tracking, and validation.
export const machine = createMachine<TextFieldSchema>({
    props({ props }) {
        return { ...props, defaultValue: props.defaultValue ?? "" };
    },

    initialState() {
        return "idle";
    },

    context({ prop, bindable }) {
        return {
            value: bindable<string>(() => ({
                defaultValue: prop("defaultValue"),
                value: prop("value"),
                onChange(value) {
                    prop("onValueChange")?.({ value });
                },
            })),
            focused: bindable<boolean>(() => ({ defaultValue: false })),
            fieldsetDisabled: bindable<boolean>(() => ({
                defaultValue: false,
            })),
        };
    },

    computed: {
        disabled: ({ prop, context }) =>
            !!prop("disabled") || context.get("fieldsetDisabled"),
        filled: ({ context }) => context.get("value") !== "",
    },

    on: {
        "VALUE.SET": { actions: ["setValue"] },
        "CONTEXT.SET": { actions: ["setContext"] },
    },

    states: {
        idle: {},
    },

    implementations: {
        actions: {
            setValue({ context, event }) {
                context.set("value", String(event["value"] ?? ""));
            },
            setContext({ context, event }) {
                const next = event["context"] as
                    | Partial<TextFieldSchema["context"]>
                    | undefined;
                if (next?.focused !== undefined)
                    context.set("focused", next.focused);
            },
        },
    },
});
