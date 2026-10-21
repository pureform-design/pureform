// The time picker and the time input: the time as `HH:mm`, which a period, the dial, a selector's
// arrow keys and a field's typing change. The suites check their markup (axe, server rendering),
// direction (the row mirrors; the dial's labels, handle, track and centre keep their places, since
// a clock doesn't mirror), themes, the keyboard (Tab reaches the hour; the arrows step it, the left
// arrow forward under `rtl`), and indication on the selectors and the periods.

import {
    testIds,
    timeInputAnatomy,
    timePickerAnatomy,
} from "@pureform/anatomy";
import { userEvent } from "vitest/browser";

import type { ActOptions, ComponentCase } from "./types";
import { byTestId } from "./types";

const picker = testIds.timePicker;
const input = testIds.timeInput;

/** The time the hidden input submits. */
const read = (host: HTMLElement): string =>
    host.querySelector<HTMLInputElement>('input[type="hidden"]')!.value;

/** The PM button. */
const pm = (host: HTMLElement, id: string) =>
    host.querySelectorAll<HTMLButtonElement>(`[data-testid="${id}"]`)[1]!;

const arrows = (to: { up: string; down: string }, dir: "ltr" | "rtl") => {
    const forward = dir === "ltr" ? "{ArrowRight}" : "{ArrowLeft}";
    const back = dir === "ltr" ? "{ArrowLeft}" : "{ArrowRight}";
    return [
        { key: forward, does: "change", to: to.up },
        { key: back, does: "change", to: to.down },
        { key: "{ArrowUp}", does: "change", to: to.up },
        { key: "{ArrowDown}", does: "change", to: to.down },
    ] as const;
};

export const timePicker: ComponentCase = {
    component: "TimePicker",
    props: { hourCycle: 12, locale: "en-US", name: "alarm" },
    root: picker.root,
    examples: {
        "12-hour dial": { defaultValue: "09:30" },
        "24-hour dial": { defaultValue: "15:45", hourCycle: 24 },
        "the minutes": { defaultValue: "09:30", defaultView: "minute" },
        scroll: { defaultValue: "09:30", mode: "scroll" },
        vibrant: { defaultValue: "21:05", color: "vibrant" },
        disabled: { defaultValue: "09:30", disabled: true },
    },
    fixed: ["dial-track", "dial-handle", "dial-center", "dial-label"],
    state: {
        prop: "value",
        from: "09:30",
        to: "21:30",
        act: async (host, options: ActOptions = {}) => {
            await userEvent.click(pm(host, picker.period), options);
        },
        read,
    },
    keyboard: {
        focusable: (host) => byTestId(host, picker.hourSelector),
        keys: [
            { key: "{Enter}", does: "click" },
            { key: "{ArrowUp}", does: "change", to: "10:30" },
            { key: "{PageDown}", does: "change", to: "06:30" },
        ],
        arrows: {
            ltr: arrows({ up: "10:30", down: "08:30" }, "ltr"),
            rtl: arrows({ up: "10:30", down: "08:30" }, "rtl"),
        },
    },
    indication: { anatomy: timePickerAnatomy, disabled: { disabled: true } },
};

export const timeInput: ComponentCase = {
    component: "TimeInput",
    props: { hourCycle: 12, locale: "en-US", name: "alarm" },
    root: input.root,
    examples: {
        "12-hour": { defaultValue: "09:30" },
        "24-hour": { defaultValue: "15:45", hourCycle: 24 },
        disabled: { defaultValue: "09:30", disabled: true },
    },
    state: {
        prop: "value",
        from: "09:30",
        to: "21:30",
        act: async (host, options: ActOptions = {}) => {
            await userEvent.click(pm(host, input.period), options);
        },
        read,
    },
    keyboard: {
        focusable: (host) => byTestId(host, input.input),
        keys: [
            { key: "{Enter}", does: "nothing" },
            { key: "{ArrowUp}", does: "change", to: "10:30" },
        ],
        // A text field keeps the left and right arrows for its caret.
        arrows: {
            ltr: [
                { key: "{ArrowLeft}", does: "nothing" },
                { key: "{ArrowRight}", does: "nothing" },
                { key: "{ArrowUp}", does: "change", to: "10:30" },
                { key: "{ArrowDown}", does: "change", to: "08:30" },
            ],
            rtl: [
                { key: "{ArrowLeft}", does: "nothing" },
                { key: "{ArrowRight}", does: "nothing" },
                { key: "{ArrowUp}", does: "change", to: "10:30" },
                { key: "{ArrowDown}", does: "change", to: "08:30" },
            ],
        },
    },
    indication: { anatomy: timeInputAnatomy, disabled: { disabled: true } },
};
