import { createMachine, type Machine } from "@zag-js/core";

import { withInteraction } from "../interaction";
import type { NavigationSchema } from "./navigation.types";

const navigation = createMachine<NavigationSchema>({
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

/** The navigation machine, keeping an interaction emitter per destination and ending what they
 *  have in progress when it becomes disabled. */
export const machine: Machine<NavigationSchema> = withInteraction<
    NavigationSchema,
    object
>(navigation, ({ track, prop }, emitters) => {
    track([() => !!prop("disabled")], () => {
        if (prop("disabled")) emitters.end();
    });
});
