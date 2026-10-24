// The autocomplete: `value`, chosen from the suggestions the typed text keeps, in a list that
// opens under the field. The input is editable and submits its text; it resets and validates as
// a text input. Typing changes the text, not the value, until a suggestion is chosen. The text
// starts as the chosen suggestion's label, and the list filters only by what the user typed.

import {
    autocompleteMenuAnatomy,
    compositeTestIds,
    testIds,
} from "@pureform/anatomy";

import { choiceNamed, flagOf, textValueOf } from "../aria";
import type { ActOptions, ComponentCase } from "../types";
import { byTestId, itemSources } from "../types";
import { userEvent } from "../user-event";
import { drawn, expandingTrigger } from "./overlay";

const ids = testIds.autocomplete;
const menu = compositeTestIds.autocompleteMenu;

const ITEMS = [
    { value: "paris", label: "Paris" },
    { value: "prague", label: "Prague" },
    { value: "rome", label: "Rome" },
];

const input = (host: HTMLElement) =>
    byTestId<HTMLInputElement>(host, ids.input);

const content = (host: HTMLElement) => byTestId(host, menu.root);

// Open: the combobox says so.
const isOpen = (host: HTMLElement) => flagOf(input(host), "expanded");

/** The chosen suggestion's value, or `null`: the text the field shows, if it's a label. */
const read = (host: HTMLElement): string | null =>
    ITEMS.find((item) => item.label === textValueOf(input(host)))?.value ??
    null;

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

/** Opens the list with the arrow (the button saying `aria-expanded`) and chooses the suggestion with `value`. */
const choose =
    (value: string) =>
    async (host: HTMLElement, options: ActOptions = {}) => {
        await userEvent.click(expandingTrigger(host), options);
        if (!(await opened(host))) return;
        const label = ITEMS.find((item) => item.value === value)!.label;
        await userEvent.click(
            await drawn(() => choiceNamed(host, label)),
            options,
        );
    };

// Typing a city's first letters fills the field.
const type = async (host: HTMLElement) => {
    await userEvent.click(input(host));
    await userEvent.keyboard("Rome");
};

export const autocomplete: ComponentCase = {
    component: "Autocomplete",
    props: { label: "City", items: ITEMS },
    root: ids.root,
    examples: {
        empty: {},
        chosen: { defaultValue: "rome" },
        outlined: { variant: "outlined", defaultInputValue: "Rome" },
        "outlined, empty": { variant: "outlined" },
        "secondary color": { color: "secondary", defaultInputValue: "Paris" },
        "leading icon": { leadingIcon: "★", defaultInputValue: "Rome" },
        "supporting text": { supportingText: "Where you live" },
        invalid: { invalid: true, defaultInputValue: "Rome" },
        error: { error: "Pick a city" },
        compact: { density: "compact", defaultInputValue: "Rome" },
        disabled: { disabled: true, defaultInputValue: "Rome" },
        affixes: { prefixText: "in", suffixText: "FR", defaultInputValue: "P" },
    },
    opened: {
        suggestions: { defaultOpen: true },
        "grouped suggestions": {
            defaultOpen: true,
            items: [
                { value: "paris", label: "Paris", group: "France" },
                { value: "lyon", label: "Lyon", group: "France" },
                { value: "rome", label: "Rome", group: "Italy" },
            ],
        },
    },
    state: {
        prop: "value",
        from: "paris",
        to: "rome",
        act: choose("rome"),
        read,
    },
    overlay: {
        surface: content,
        parts: (host) => [content(host).parentElement!],
    },
    form: {
        control: input,
        disabled: (host) =>
            byTestId(host, ids.container).hasAttribute("data-disabled"),
        submits: {
            props: { name: "city", defaultInputValue: "Rome" },
            entries: [["city", "Rome"]],
        },
        resets: true,
        required: {
            props: { name: "city", required: true },
            satisfy: type,
        },
        invalid: { props: { invalid: true } },
        error: {
            props: { name: "city", error: "Pick a city" },
            message: "Pick a city",
        },
    },
    keyboard: {
        focusable: input,
        // A typed key changes the text, not the value.
        keys: [{ key: "{Enter}", does: "nothing" }],
    },
    // Open, by typing; the keys highlight a suggestion, which shows as hovered.
    indication: itemSources(autocompleteMenuAnatomy, ITEMS, {
        open: async (host) => {
            await userEvent.click(byTestId(host, ids.trailingIcon));
            await opened(host);
        },
        focus: async (host) => {
            input(host).focus();
            await userEvent.keyboard("{ArrowDown}");
        },
    }),
};
