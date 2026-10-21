// The date pickers: the modal date picker (`open`, from a trigger drawn as a button; a calendar in
// a dialog that holds a draft until OK), the docked date picker (`value`, chosen from a calendar
// that opens under the field) and the date input (the date typed into segments). February 2026
// starts on a Sunday and fills four weeks, so in `en-US` the calendar's first cell is a day of
// the month, not one hidden outside it.

import {
    calendarCellAnatomy,
    compositeTestIds,
    testIds,
} from "@pureform/anatomy";
import { userEvent } from "vitest/browser";

import { overlayParts } from "./overlay";
import type { ActOptions, ComponentCase } from "./types";
import { byTestId } from "./types";

const modal = compositeTestIds.datePicker;
const docked = compositeTestIds.dockedDatePicker;
const input = testIds.dateInput;
const cell = testIds.calendarCell;

const DATE = ["2026-02-11"];

const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));

/** The day cell's trigger for an ISO date. */
const day = (host: HTMLElement, value: string) => {
    const found = [
        ...host.querySelectorAll<HTMLElement>(
            `[data-testid="${cell.trigger}"]`,
        ),
    ].find((element) => element.dataset.value?.startsWith(value));
    if (!found) throw new Error(`no day ${value}`);
    return found;
};

const modalParts = overlayParts(modal);

/** The day the arrow keys start from: the one in the tab order. */
const focusedDay = (host: HTMLElement) => {
    const found = host.querySelector<HTMLElement>(
        `[data-testid="${cell.trigger}"][tabindex="0"]`,
    );
    if (!found) throw new Error("no day in the tab order");
    return found;
};

/** Keyboard focus on the first day, the surface the indication suite checks. */
const focusDay = async (host: HTMLElement) => {
    await userEvent.keyboard("{Shift}");
    byTestId(host, cell.trigger).focus();
};

export const datePicker: ComponentCase = {
    component: "DatePicker",
    props: { trigger: "Pick a date", locale: "en-US", defaultValue: DATE },
    root: modal.root,
    examples: { closed: {} },
    opened: {
        plain: { defaultOpen: true },
        "week from Monday": { defaultOpen: true, locale: "en-GB" },
        range: {
            defaultOpen: true,
            selectionMode: "range",
            defaultValue: ["2026-02-10", "2026-02-13"],
        },
        "mode toggle": { defaultOpen: true, onModeToggle: () => {} },
    },
    state: {
        prop: "open",
        from: false,
        to: true,
        act: modalParts.click,
        read: modalParts.read,
    },
    overlay: modalParts.overlay({
        also: (host) => [
            byTestId(host, compositeTestIds.datePickerBackdrop.root),
        ],
    }),
    keyboard: {
        // Open, focus is on the chosen day, which the arrow keys move.
        focusable: (host) =>
            modalParts.shown(host)
                ? focusedDay(host)
                : modalParts.trigger(host),
        disables: false,
        keys: [
            { key: "{Enter}", does: "change" },
            { key: " ", does: "change" },
        ],
    },
    indication: {
        anatomy: calendarCellAnatomy,
        // Focus opens on the chosen day, not the first one the suite checks.
        props: { defaultOpen: true },
        focus: focusDay,
        modal: true,
    },
};

const dockedInput = (host: HTMLElement) =>
    byTestId<HTMLInputElement>(host, docked.input);

const dockedOpen = (host: HTMLElement) => {
    const content = byTestId(host, docked.content);
    return !content.hidden && content.dataset.state !== "closed";
};

/** Waits for the calendar to open and be placed under the field. */
const placed = async (host: HTMLElement) => {
    for (let i = 0; i < 10; i++) {
        await frame();
        if (dockedOpen(host)) {
            await frame();
            await frame();
            return true;
        }
    }
    return false;
};

/** Opens the calendar with its button and chooses a day. */
const choose =
    (value: string) =>
    async (host: HTMLElement, options: ActOptions = {}) => {
        await userEvent.click(byTestId(host, docked.trailingIcon), options);
        if (!(await placed(host))) return;
        await userEvent.click(day(host, value), options);
    };

/** The date the field shows, as an ISO date (`en-US`'s `mm/dd/yyyy`). */
const readDocked = (host: HTMLElement): string => {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dockedInput(host).value);
    return match ? `${match[3]}-${match[1]}-${match[2]}` : "";
};

export const dockedDatePicker: ComponentCase = {
    component: "DockedDatePicker",
    props: { label: "Date", locale: "en-US" },
    root: docked.root,
    examples: {
        empty: {},
        chosen: { defaultValue: DATE },
        filled: { variant: "filled", defaultValue: DATE },
        "secondary color": { color: "secondary", defaultValue: DATE },
        error: { error: "Pick a weekday" },
        compact: { density: "compact", defaultValue: DATE },
    },
    opened: {
        calendar: { defaultOpen: true, defaultValue: DATE },
        "week from Monday": {
            defaultOpen: true,
            defaultValue: DATE,
            locale: "en-GB",
        },
    },
    state: {
        prop: "value",
        from: ["2026-02-11"],
        to: ["2026-02-12"],
        act: choose("2026-02-12"),
        read: (host) => [readDocked(host)],
    },
    overlay: {
        surface: (host) => byTestId(host, docked.content),
        parts: (host) => [byTestId(host, docked.positioner)],
    },
    keyboard: {
        focusable: dockedInput,
        // Typing changes the text; the value follows once the field loses focus.
        keys: [{ key: "{Enter}", does: "nothing" }],
    },
    indication: {
        anatomy: calendarCellAnatomy,
        props: { defaultValue: DATE },
        focus: focusDay,
        open: async (host) => {
            await userEvent.click(byTestId(host, docked.trailingIcon));
            await placed(host);
        },
    },
};

/** The date input's editable segment at `index`. */
const segment = (index: number) => (host: HTMLElement) => {
    const found = [
        ...host.querySelectorAll<HTMLElement>(
            `[data-testid="${input.segment}"][role="spinbutton"]`,
        ),
    ][index];
    if (!found) throw new Error(`no segment ${index}`);
    return found;
};

export const dateInput: ComponentCase = {
    component: "DateInput",
    props: { label: "Date", locale: "en-US" },
    root: input.root,
    examples: {
        empty: {},
        typed: { defaultValue: DATE },
        filled: { variant: "filled", defaultValue: DATE },
        "secondary color": { color: "secondary", defaultValue: DATE },
        error: { error: "Pick a weekday" },
        "day first": { locale: "en-GB", defaultValue: DATE },
    },
    opened: { "mode toggle": { onModeToggle: () => {} } },
    keyboard: {
        focusable: segment(0),
        keys: [{ key: "{Enter}", does: "nothing" }],
        // The arrow keys move between the segments in reading order.
        arrows: {
            ltr: [
                { key: "{ArrowRight}", does: "nothing", focuses: segment(1) },
                { key: "{ArrowLeft}", does: "nothing" },
            ],
            rtl: [
                { key: "{ArrowLeft}", does: "nothing", focuses: segment(1) },
                { key: "{ArrowRight}", does: "nothing" },
            ],
        },
    },
};
