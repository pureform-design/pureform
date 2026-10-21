import { createMachine } from "@zag-js/core";

import * as dom from "./time-picker.dom";
import {
    formatTime,
    localeHourCycle,
    localePeriods,
    MIDNIGHT,
    parseField,
    parseTime,
    periodOf,
    withPeriod,
} from "./time-picker.time";
import type { Time, TimeView } from "./time-picker.time";
import type { TimePickerSchema } from "./time-picker.types";

const sameTime = (a: Time, b: Time | undefined) =>
    a.hour === b?.hour && a.minute === b.minute;

// Material's time picker and time input, pureform's own machine: no Zag machine covers them. It
// holds the time (hours 0 to 23 and minutes) with Zag's controllable semantics, what the dial
// sets (the hour or the minute), and what the user is typing into the input's fields until it
// reads as a time. A pointer on the dial picks the value under it as it drags; letting go of an
// hour moves on to the minutes, as Material's dial does.
export const machine = createMachine<TimePickerSchema>({
    props({ props }) {
        return {
            ...props,
            defaultValue: props.defaultValue ?? "00:00",
            defaultView: props.defaultView ?? "hour",
        };
    },

    initialState() {
        return "idle";
    },

    context({ prop, bindable }) {
        return {
            value: bindable<Time>(() => ({
                defaultValue: parseTime(prop("defaultValue")) ?? MIDNIGHT,
                value:
                    prop("value") === undefined
                        ? undefined
                        : (parseTime(prop("value")) ?? MIDNIGHT),
                isEqual: sameTime,
                onChange(time) {
                    prop("onValueChange")?.({ value: formatTime(time), time });
                },
            })),
            view: bindable<TimeView>(() => ({
                defaultValue: prop("defaultView"),
                value: prop("view"),
                onChange(view) {
                    prop("onViewChange")?.({ view });
                },
            })),
            hourText: bindable<string | null>(() => ({ defaultValue: null })),
            minuteText: bindable<string | null>(() => ({ defaultValue: null })),
        };
    },

    computed: {
        hourCycle: ({ prop }) =>
            prop("hourCycle") ?? localeHourCycle(prop("locale")),
        periods: ({ prop }) => localePeriods(prop("locale")),
        translations: ({ prop }) => {
            const given = prop("translations");
            return {
                hour: given?.hour ?? "Hour",
                minute: given?.minute ?? "Minute",
                period: given?.period ?? "Period",
            };
        },
        interactive: ({ prop }) => !prop("disabled") && !prop("readOnly"),
    },

    on: {
        "VALUE.SET": { guard: "isInteractive", actions: ["setValue"] },
        "VIEW.SET": { actions: ["setView"] },
        "PERIOD.SET": { guard: "isInteractive", actions: ["setPeriod"] },
        "FIELD.TYPE": { actions: ["typeField"] },
        "FIELD.BLUR": { actions: ["clearField"] },
    },

    states: {
        idle: {
            on: {
                "DIAL.POINTER_DOWN": {
                    guard: "isInteractive",
                    target: "dragging",
                    actions: ["setValue"],
                },
            },
        },
        // A pointer holds the dial: each move picks the value under it.
        dragging: {
            effects: ["trackPointerMove"],
            on: {
                "DIAL.POINTER_MOVE": { actions: ["setValue"] },
                "DIAL.POINTER_UP": {
                    target: "idle",
                    actions: ["setValue", "moveToMinutes"],
                },
                "DIAL.POINTER_CANCEL": { target: "idle" },
            },
        },
    },

    implementations: {
        guards: {
            isInteractive: ({ computed }) => computed("interactive"),
        },

        effects: {
            // The move and up events reach the dial while the pointer is captured; outside the
            // browser's capture, the document still sees them.
            trackPointerMove({ scope, send, event }) {
                const doc = scope.getDoc();
                const pointerId = event["pointerId"];
                const point = (e: PointerEvent) =>
                    dom.pointOnDial(scope, e.clientX, e.clientY);
                const move = (e: PointerEvent) => {
                    if (e.pointerId !== pointerId) return;
                    const at = point(e);
                    if (at) send({ type: "DIAL.POINTER_MOVE", point: at });
                };
                const up = (e: PointerEvent) => {
                    if (e.pointerId !== pointerId) return;
                    send({ type: "DIAL.POINTER_UP", point: point(e) });
                };
                const cancel = (e: PointerEvent) => {
                    if (e.pointerId === pointerId)
                        send({ type: "DIAL.POINTER_CANCEL" });
                };
                doc.addEventListener("pointermove", move);
                doc.addEventListener("pointerup", up);
                doc.addEventListener("pointercancel", cancel);
                return () => {
                    doc.removeEventListener("pointermove", move);
                    doc.removeEventListener("pointerup", up);
                    doc.removeEventListener("pointercancel", cancel);
                };
            },
        },

        actions: {
            // From a time, or a point on the dial (in percent of its box).
            setValue({ context, computed, event }) {
                const time = event["time"] as Time | undefined;
                if (time) {
                    context.set("value", time);
                    return;
                }
                const point = event["point"] as
                    | { x: number; y: number }
                    | undefined;
                if (!point) return;
                context.set(
                    "value",
                    dom.timeAtDialPoint(
                        context.get("value"),
                        context.get("view"),
                        computed("hourCycle"),
                        point,
                    ),
                );
            },
            setView({ context, event }) {
                context.set("view", event["view"] as TimeView);
            },
            moveToMinutes({ context }) {
                if (context.get("view") === "hour")
                    context.set("view", "minute");
            },
            setPeriod({ context, event }) {
                context.set(
                    "value",
                    withPeriod(
                        context.get("value"),
                        event["period"] as "am" | "pm",
                    ),
                );
            },
            // The text a field holds while the user types: once it reads as the view's value, the
            // time takes it.
            typeField({ context, computed, event }) {
                const view = event["view"] as TimeView;
                const text = String(event["text"] ?? "");
                context.set(view === "hour" ? "hourText" : "minuteText", text);
                if (!computed("interactive")) return;
                const time = context.get("value");
                const value = parseField(
                    text,
                    view,
                    computed("hourCycle"),
                    periodOf(time.hour),
                );
                if (value === undefined) return;
                context.set(
                    "value",
                    view === "hour"
                        ? { ...time, hour: value }
                        : { ...time, minute: value },
                );
            },
            clearField({ context, event }) {
                context.set(
                    event["view"] === "hour" ? "hourText" : "minuteText",
                    null,
                );
            },
        },
    },
});
