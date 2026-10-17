import type {
    PointerKind,
    PressOrigin,
} from "@pureform/binding-core/interaction";
import { createMachine, type Machine } from "@zag-js/core";
import { addDomEvent } from "@zag-js/dom-query";

import { trackFormControl } from "../form/control";
import { emittersOf, withInteraction } from "../interaction";
import * as dom from "./slider.dom";
import type { SliderSchema } from "./slider.types";

const clamp = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), max);

/** The decimals of a number, so a snapped value doesn't carry float error (`0.1 * 3`). */
const decimals = (value: number) => {
    const [, fraction = ""] = String(value).split(".");
    return fraction.length;
};

/** The value clamped to the range and snapped to the nearest step from `min`, as the native range
 *  input does. */
export const snapValue = (
    value: number,
    { min, max, step }: { min: number; max: number; step: number },
): number => {
    const clamped = clamp(value, min, max);
    if (!(step > 0)) return clamped;
    const snapped = min + Math.round((clamped - min) / step) * step;
    const places = Math.max(decimals(step), decimals(min));
    return clamp(Number(snapped.toFixed(places)), min, max);
};

// Material's slider over a native range input, which already handles dragging, the keyboard,
// forms, and direction. The input keeps its own value; the machine holds it with Zag's
// controllable-state semantics, writes it back to the input when it changes from outside, follows
// the fieldsets around it by the browser's rule, and marks a drag while the pointer is down. A form
// reset is the binding's: it calls `reset` once the browser has reset the input. A drag emits a
// press and a drag to the interaction source, from where the pointer went down.
const slider = createMachine<SliderSchema>({
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

    watch({ track, context, action }) {
        track([() => context.get("value")], () => {
            action(["syncInputElement"]);
        });
    },

    effects: ["trackFormControl"],

    on: {
        "VALUE.SET": { actions: ["setValue"] },
        RESET: { actions: ["setValue"] },
    },

    states: {
        idle: {
            on: {
                "POINTER.DOWN": {
                    guard: "canDrag",
                    target: "dragging",
                    actions: ["emitDragStart"],
                },
            },
        },
        dragging: {
            effects: ["trackPointerUp"],
            on: {
                "POINTER.UP": { target: "idle", actions: ["emitDragStop"] },
            },
        },
    },

    implementations: {
        guards: {
            canDrag: ({ prop, computed }) =>
                !computed("disabled") && !prop("readOnly"),
        },

        effects: {
            trackFormControl({ context, scope }) {
                return trackFormControl(dom.getInputEl(scope), {
                    onFieldsetDisabledChange(disabled) {
                        context.set("fieldsetDisabled", disabled);
                    },
                });
            },
            // A drag ends wherever the pointer is let go, as `:active` does.
            trackPointerUp({ scope, send }) {
                const win = scope.getWin();
                const cleanups = [
                    addDomEvent(win, "pointerup", () =>
                        send({ type: "POINTER.UP" }),
                    ),
                    addDomEvent(win, "pointercancel", () =>
                        send({ type: "POINTER.UP", cancelled: true }),
                    ),
                ];
                return () => cleanups.forEach((cleanup) => cleanup());
            },
        },

        actions: {
            emitDragStart(params) {
                const { event, scope } = params;
                const emitter = emittersOf(params).own;
                const input = dom.getInputEl(scope);
                emitter.press(
                    event["origin"] as PressOrigin,
                    event["pointer"] as PointerKind,
                    input,
                );
                emitter.dragStart(input);
            },
            emitDragStop(params) {
                const { event, scope } = params;
                const emitter = emittersOf(params).own;
                const input = dom.getInputEl(scope);
                emitter.dragStop(input);
                if (event["cancelled"]) emitter.cancel(input);
                else emitter.release(input);
            },
            setValue({ context, event, prop }) {
                const value = Number(event["value"]);
                if (Number.isNaN(value)) return;
                context.set(
                    "value",
                    snapValue(value, {
                        min: prop("min"),
                        max: prop("max"),
                        step: prop("step"),
                    }),
                );
            },
            // Writes the value to the input when it changed from outside; the input already shows
            // a value the user moved it to.
            syncInputElement({ context, scope }) {
                const input = dom.getInputEl(scope);
                const value = String(context.get("value"));
                if (input && input.value !== value) input.value = value;
            },
        },
    },
});

/** The slider machine, ending what's in progress when it becomes disabled. */
export const machine: Machine<SliderSchema> = withInteraction<
    SliderSchema,
    object
>(slider, ({ track, computed }, emitters) => {
    track([() => computed("disabled")], () => {
        if (computed("disabled")) emitters.end();
    });
});
