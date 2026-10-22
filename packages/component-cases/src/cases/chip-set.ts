// The chip set: a row of chips that wraps, or scrolls on one line. A selectable set is a filter
// set: its `value` is the pressed chips' values, which a click on another replaces in a
// single-select set. Enter and Space click the focused chip.

import { chipAnatomy, testIds } from "@pureform/anatomy";

import type { ActOptions, ComponentCase } from "../types";
import { itemSources } from "../types";
import { userEvent } from "../user-event";

const ITEMS = [
    { value: "vegan", label: "Vegan" },
    { value: "nut-free", label: "Nut free", icon: "✓" },
    { value: "local", label: "Local", trailingIcon: "▾" },
];

const chips = (host: HTMLElement) => [
    ...host.querySelectorAll<HTMLButtonElement>(
        `[data-testid="${testIds.chip.root}"]`,
    ),
];

/** The pressed chips' values, from `aria-pressed`, which every chip of a selectable set has. */
const read = (host: HTMLElement): string[] =>
    chips(host).flatMap((chip, index) => {
        const pressed = chip.getAttribute("aria-pressed");
        if (pressed !== "true" && pressed !== "false") {
            throw new Error(`aria-pressed is ${String(pressed)}`);
        }
        return pressed === "true" ? [ITEMS[index]!.value] : [];
    });

export const chipSet: ComponentCase = {
    component: "ChipSet",
    props: { "aria-label": "Filters", items: ITEMS },
    root: testIds.chipSet.root,
    examples: {
        standard: {},
        elevated: { variant: "elevated" },
        "single line": { singleLine: true },
        "single select": { selectable: "single", defaultValue: ["nut-free"] },
        "multiple select, round": {
            selectable: "multiple",
            defaultValue: ["vegan", "local"],
            corner: "round",
        },
        disabled: { disabled: true, selectable: "multiple" },
    },
    state: {
        prop: "value",
        from: ["vegan"],
        to: ["nut-free"],
        props: { selectable: "single" },
        act: async (host: HTMLElement, options: ActOptions = {}) => {
            await userEvent.click(chips(host)[1]!, options);
        },
        read,
    },
    keyboard: {
        // A selectable set's arrow keys move focus between its chips (Zag marks the focused one
        // with `data-focus`), and change nothing.
        focusable: (host) =>
            chips(host).find((chip) => chip.hasAttribute("data-focus")) ??
            chips(host)[0]!,
        keys: [
            { key: "{Enter}", does: "click" },
            { key: " ", does: "click" },
        ],
    },
    indication: itemSources(chipAnatomy, ITEMS),
};
