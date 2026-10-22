// The select: `value`, chosen from a list that opens under the field; a hidden native select
// that submits, resets, and validates; Enter, Space, and the arrow keys up and down open the list,
// and the arrow keys sideways choose the option before or after, by direction.

import {
    compositeTestIds,
    selectMenuAnatomy,
    testIds,
} from "@pureform/anatomy";

import type { ActOptions, ComponentCase } from "../types";
import { byTestId, itemSources } from "../types";
import { userEvent } from "../user-event";

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

// Open: the list shows, and isn't on its way out.
const isOpen = (host: HTMLElement) =>
    !content(host).hidden && content(host).dataset.state !== "closed";

/** The chosen option's value, or `null`: the label the field shows, checked against the hidden
 *  select. */
const read = (host: HTMLElement): string | null => {
    const shown = input(host).value;
    const value = ITEMS.find((item) => item.label === shown)?.value ?? null;
    const submitted = hiddenSelect(host).selectedOptions[0]?.value ?? null;
    if (submitted !== value) {
        throw new Error(
            `the field shows ${JSON.stringify(shown)}, the hidden select holds ${JSON.stringify(submitted)}`,
        );
    }
    return value;
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
        await userEvent.click(input(host), options);
        if (!(await opened(host))) return;
        const item = [
            ...host.querySelectorAll<HTMLElement>(
                `[data-testid="${menu.item}"]`,
            ),
        ].find((element) => element.dataset.value === value);
        if (!item) throw new Error(`no option with the value ${value}`);
        await userEvent.click(item, options);
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
        focusable: (host) => (isOpen(host) ? content(host) : input(host)),
        keys: [
            { key: "{Enter}", does: "nothing" },
            { key: " ", does: "nothing" },
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
