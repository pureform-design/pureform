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

import { optionalFlagOf, textValueOf } from "../aria";
import type { ActOptions, ComponentCase } from "../types";
import { byTestId } from "../types";
import { userEvent } from "../user-event";

const picker = testIds.timePicker;
const input = testIds.timeInput;

const pad = (n: number) => String(n).padStart(2, "0");

/** The time the parts show, as `HH:mm`: the hour and the minute (a selector's text, a field's
 *  value) and, on a 12-hour clock, the period pressed (`aria-pressed` on PM). */
const timeOf =
    (parts: (host: HTMLElement) => readonly HTMLElement[], period: string) =>
    (host: HTMLElement): string => {
        const [hourPart, minutePart] = parts(host);
        const hour = Number(textValueOf(hourPart!).trim());
        const minute = Number(textValueOf(minutePart!).trim());
        const periods = [
            ...host.querySelectorAll<HTMLElement>(`[data-testid="${period}"]`),
        ];
        if (periods.length === 0) return `${pad(hour)}:${pad(minute)}`;
        const after = optionalFlagOf(periods[1]!, "pressed");
        return `${pad((hour % 12) + (after ? 12 : 0))}:${pad(minute)}`;
    };

const all = (id: string) => (host: HTMLElement) => [
    ...host.querySelectorAll<HTMLElement>(`[data-testid="${id}"]`),
];

const readPicker = timeOf(
    (host) => [
        byTestId(host, picker.hourSelector),
        byTestId(host, picker.minuteSelector),
    ],
    picker.period,
);

const readInput = timeOf(all(input.input), input.period);

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
        read: readPicker,
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
        read: readInput,
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
