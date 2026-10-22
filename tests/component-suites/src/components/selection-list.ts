// The selection list: a listbox whose options are list items. Its `value` is the selected
// options' values (`aria-selected`), which a click on an option adds to, or in single mode
// replaces. The list takes focus, and the keyboard highlights an option, which shows as hovered.

import { listItemAnatomy, testIds } from "@pureform/anatomy";
import { userEvent } from "vitest/browser";

import type { ActOptions, ComponentCase } from "./types";
import { byTestId, itemSources } from "./types";

const ITEMS = [
    { value: "inbox", headline: "Inbox", leading: "✉" },
    { value: "starred", headline: "Starred", leading: "★" },
    { value: "sent", headline: "Sent", leading: "➤" },
];

const list = (host: HTMLElement) => byTestId(host, testIds.list.root);

const options = (host: HTMLElement) => [
    ...host.querySelectorAll<HTMLElement>(
        `[data-testid="${testIds.listItem.root}"]`,
    ),
];

/** The selected options' values, from `aria-selected`, which every option has. */
const read = (host: HTMLElement): string[] =>
    options(host).flatMap((option, index) => {
        const selected = option.getAttribute("aria-selected");
        if (selected !== "true" && selected !== "false") {
            throw new Error(`aria-selected is ${String(selected)}`);
        }
        return selected === "true" ? [ITEMS[index]!.value] : [];
    });

export const selectionList: ComponentCase = {
    component: "SelectionList",
    props: { "aria-label": "Folders", items: ITEMS },
    root: testIds.list.root,
    examples: {
        multiple: { defaultValue: ["inbox", "sent"] },
        single: { selectionMode: "single", defaultValue: ["starred"] },
        "segmented, secondary color": {
            variant: "segmented",
            color: "secondary",
            defaultValue: ["starred"],
        },
        disabled: { disabled: true },
    },
    state: {
        prop: "value",
        from: ["inbox"],
        to: ["starred"],
        props: { selectionMode: "single" },
        act: async (host: HTMLElement, options_: ActOptions = {}) => {
            await userEvent.click(options(host)[1]!, options_);
        },
        read,
    },
    keyboard: {
        focusable: list,
        keys: [],
    },
    // Focus on the list highlights the first option, which shows as hovered.
    indication: itemSources(listItemAnatomy, ITEMS, {
        focus: async (host) => {
            list(host).focus();
        },
    }),
};
