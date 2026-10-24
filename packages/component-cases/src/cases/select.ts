// The select: `value`, chosen from a list that opens under the field; a hidden native select
// that submits, resets, and validates; Enter, Space, the arrow keys up and down, and typing open the
// list (typing on the option starting with it), and the arrow keys sideways choose the option
// before or after, by direction.

import {
    compositeTestIds,
    selectMenuAnatomy,
    testIds,
} from "@pureform/anatomy";

import { byRole, choiceNamed, flagOf, textValueOf } from "../aria";
import type { ActOptions, ComponentCase } from "../types";
import { byTestId, itemSources } from "../types";
import { userEvent } from "../user-event";
import { drawn } from "./overlay";

const ids = testIds.select;
const menu = compositeTestIds.selectMenu;

const ITEMS = [
    { value: "s", label: "Small" },
    { value: "m", label: "Medium" },
    { value: "l", label: "Large" },
];

const input = (host: HTMLElement) =>
    byTestId<HTMLInputElement>(host, ids.input);

const hiddenSelect = (host: HTMLElement) =>
    byTestId<HTMLSelectElement>(host, ids.hiddenSelect);

const content = (host: HTMLElement) => byTestId(host, menu.root);

/** The element with the combobox role, which opens the list. */
const field = (host: HTMLElement) => byRole(host, "combobox");

// Open: the combobox says so.
const isOpen = (host: HTMLElement) => flagOf(field(host), "expanded");

/** The chosen option's value, or `null`: from the label the field shows. */
const read = (host: HTMLElement): string | null => {
    const shown = textValueOf(input(host));
    return ITEMS.find((item) => item.label === shown)?.value ?? null;
};

const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));

/** Waits for the list to open and be placed under the field; `false` if it doesn't open. */
const opened = async (host: HTMLElement): Promise<boolean> => {
    for (let i = 0; i < 10; i++) {
        await frame();
        if (isOpen(host)) {
            await frame();
            await frame();
            return true;
        }
    }
    return false;
};

/** Opens the list with a click and chooses the option with `value`. */
const choose =
    (value: string) =>
    async (host: HTMLElement, options: ActOptions = {}) => {
        await userEvent.click(field(host), options);
        if (!(await opened(host))) return;
        const label = ITEMS.find((item) => item.value === value)!.label;
        await userEvent.click(
            await drawn(() => choiceNamed(host, label)),
            options,
        );
    };

export const select: ComponentCase = {
    component: "Select",
    props: { label: "Size", items: ITEMS },
    root: ids.root,
    examples: {
        "nothing chosen": {},
        chosen: { defaultValue: "m" },
        outlined: { variant: "outlined", defaultValue: "m" },
        "outlined, nothing chosen": { variant: "outlined" },
        "secondary color": { color: "secondary", defaultValue: "s" },
        "leading icon": { leadingIcon: "★", defaultValue: "m" },
        "supporting text": { supportingText: "Fits most" },
        invalid: { invalid: true, defaultValue: "m" },
        error: { error: "Pick a size" },
        compact: { density: "compact", defaultValue: "l" },
        disabled: { disabled: true, defaultValue: "m" },
        required: { required: true, name: "size" },
        affixes: { prefixText: "EU", suffixText: "cm", defaultValue: "m" },
    },
    opened: {
        "option groups": {
            defaultOpen: true,
            items: [
                { value: "s", label: "Small", group: "Everyday" },
                { value: "m", label: "Medium", group: "Everyday" },
                { value: "xl", label: "Extra large", group: "Tall" },
            ],
        },
    },
    state: { prop: "value", from: "m", to: "l", act: choose("l"), read },
    // The list of options comes and goes with `open`.
    overlay: {
        surface: content,
        parts: (host) => [content(host).parentElement!],
    },
    form: {
        control: hiddenSelect,
        aria: input,
        disabled: (host) =>
            byTestId(host, ids.container).hasAttribute("data-disabled"),
        submits: {
            props: { name: "size", defaultValue: "l" },
            entries: [["size", "l"]],
        },
        omits: { name: "size" },
        resets: true,
        required: {
            props: { name: "size", required: true },
            satisfy: choose("l"),
        },
        invalid: { props: { invalid: true } },
        error: {
            props: { name: "size", error: "Pick a size" },
            message: "Pick a size",
        },
    },
    keyboard: {
        // The list takes focus while it's open.
        focusable: (host) => (isOpen(host) ? content(host) : field(host)),
        keys: [
            { key: "{Enter}", does: "nothing" },
            { key: " ", does: "nothing" },
            // Typed, it opens the list on the option starting with it, choosing nothing (APG's
            // select-only combobox).
            { key: "l", does: "nothing" },
        ],
        arrows: {
            ltr: [
                { key: "{ArrowRight}", does: "change", to: "l" },
                { key: "{ArrowLeft}", does: "change", to: "s" },
                { key: "{ArrowDown}", does: "nothing" },
                { key: "{ArrowUp}", does: "nothing" },
            ],
            rtl: [
                { key: "{ArrowLeft}", does: "change", to: "l" },
                { key: "{ArrowRight}", does: "change", to: "s" },
                { key: "{ArrowDown}", does: "nothing" },
                { key: "{ArrowUp}", does: "nothing" },
            ],
        },
    },
    // Open, by a click on the field; the keyboard highlights an option, which shows as hovered.
    indication: itemSources(selectMenuAnatomy, ITEMS, {
        open: async (host) => {
            await userEvent.click(input(host));
            await opened(host);
        },
        focus: async (host) => {
            content(host).focus();
            await userEvent.keyboard("{ArrowDown}");
        },
    }),
};
