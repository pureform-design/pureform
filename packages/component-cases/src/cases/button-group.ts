// The button group: a row of buttons and icon buttons. Standard and connected, and selectable: a
// single-select group's `value` is the pressed buttons' values, which a click on another replaces.
// Enter and Space click the focused button.

import { buttonAnatomy, testIds } from "@pureform/anatomy";

import type { ActOptions, ComponentCase } from "../types";
import { itemSources } from "../types";
import { userEvent } from "../user-event";

const ITEMS = [
    { value: "day", label: "Day" },
    { value: "week", label: "Week", icon: "▦" },
    { value: "month", icon: "▤", "aria-label": "Month" },
];

const buttons = (host: HTMLElement) => [
    ...host.querySelectorAll<HTMLButtonElement>(
        `[data-testid="${testIds.button.root}"], [data-testid="${testIds.iconButton.root}"]`,
    ),
];

/** The pressed buttons' values, from `aria-pressed`, which every button of a selectable group
 *  has. */
const read = (host: HTMLElement): string[] =>
    buttons(host).flatMap((button, index) => {
        const pressed = button.getAttribute("aria-pressed");
        if (pressed !== "true" && pressed !== "false") {
            throw new Error(`aria-pressed is ${String(pressed)}`);
        }
        return pressed === "true" ? [ITEMS[index]!.value] : [];
    });

export const buttonGroup: ComponentCase = {
    component: "ButtonGroup",
    props: { "aria-label": "Range", items: ITEMS },
    root: testIds.buttonGroup.root,
    examples: {
        standard: {},
        "standard, large tonal": { size: "large", variant: "tonal" },
        connected: { connected: true },
        "connected, outlined, square": {
            connected: true,
            variant: "outlined",
            corner: "square",
        },
        "single select": {
            connected: true,
            selectable: "single",
            defaultValue: ["week"],
        },
        "multiple select": {
            selectable: "multiple",
            defaultValue: ["day", "month"],
            variant: "tonal",
        },
        disabled: { disabled: true, connected: true },
    },
    state: {
        prop: "value",
        from: ["day"],
        to: ["week"],
        props: { selectable: "single", connected: true },
        act: async (host: HTMLElement, options: ActOptions = {}) => {
            await userEvent.click(buttons(host)[1]!, options);
        },
        read,
    },
    keyboard: {
        // A selectable group's arrow keys move focus between its buttons (Zag marks the focused
        // one with `data-focus`), and change nothing.
        focusable: (host) =>
            buttons(host).find((button) => button.hasAttribute("data-focus")) ??
            buttons(host)[0]!,
        keys: [
            { key: "{Enter}", does: "click" },
            { key: " ", does: "click" },
        ],
    },
    indication: itemSources(buttonAnatomy, ITEMS),
};
