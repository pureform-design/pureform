import { createMachine } from "@zag-js/core";

import type { SliderSchema } from "./slider.types";

const clamp = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), max);

// Stub: holds the value with Zag's controllable-state semantics and nothing else. p6e fills
// in dragging, form reset, fieldset tracking, and the value tokens.
export const machine = createMachine<SliderSchema>({
    props({ props }) {
        const min = props.min ?? 0;
        return {
            max: 100,
            step: 1,
            ...props,
            min,
            defaultValue: props.defaultValue ?? min,
        };
    },

    initialState() {
        return "idle";
    },

    context({ prop, bindable }) {
        return {
            value: bindable<number>(() => ({
                defaultValue: prop("defaultValue"),
                value: prop("value"),
                onChange(value) {
                    prop("onValueChange")?.({ value });
                },
            })),
            fieldsetDisabled: bindable<boolean>(() => ({
                defaultValue: false,
            })),
        };
    },

    computed: {
        disabled: ({ prop, context }) =>
            !!prop("disabled") || context.get("fieldsetDisabled"),
        fraction: ({ prop, context }) => {
            const min = prop("min");
            const range = prop("max") - min;
            if (range <= 0) return 0;
            return clamp((context.get("value") - min) / range, 0, 1);
        },
    },

    on: {
        "VALUE.SET": { actions: ["setValue"] },
    },

    states: {
        idle: {},
    },

    implementations: {
        actions: {
            setValue({ context, event, prop }) {
                const value = Number(event["value"]);
                if (Number.isNaN(value)) return;
                context.set("value", clamp(value, prop("min"), prop("max")));
            },
        },
    },
});
