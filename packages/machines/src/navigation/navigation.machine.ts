import { createMachine } from "@zag-js/core";

import type { NavigationSchema } from "./navigation.types";

export const machine = createMachine<NavigationSchema>({
    initialState() {
        return "idle";
    },

    context({ prop, bindable }) {
        return {
            value: bindable<string | null>(() => ({
                defaultValue: prop("defaultValue") ?? null,
                value: prop("value"),
                onChange(value) {
                    prop("onValueChange")?.({ value });
                },
            })),
        };
    },

    on: {
        "ITEM.CLICK": { guard: "isEnabled", actions: ["setValue"] },
        "VALUE.SET": { actions: ["setValue"] },
    },

    states: { idle: {} },

    implementations: {
        guards: {
            isEnabled: ({ prop }) => !prop("disabled"),
        },
        actions: {
            setValue({ context, event }) {
                context.set("value", event.value);
            },
        },
    },
});
