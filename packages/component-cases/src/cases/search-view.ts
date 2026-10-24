// The search view: `open`, by a click on the search bar that opens it (its trigger); typing in the
// bar opens it too, carrying the key into the query, and focus moves to the view's input. The view
// is a modal dialog: focus stays in it and goes back to the bar when it closes. It isn't a form
// control, and its open renderings are client-only.

import { compositeTestIds, searchViewMenuAnatomy } from "@pureform/anatomy";

import { allByRole } from "../aria";
import type { ComponentCase } from "../types";
import { byTestId, itemSources } from "../types";
import { userEvent } from "../user-event";
import { overlayParts } from "./overlay";

const ids = compositeTestIds.searchView;

// The search bar that opens the view: a button that opens a dialog (the web's trigger itself,
// React Native's over the bar), saying whether it's open (`aria-expanded`). An open view hides
// it from assistive technology.
const bar = (host: HTMLElement): HTMLElement => {
    const found = allByRole(host, "button", { hidden: true }).filter(
        (element) => element.getAttribute("aria-haspopup") === "dialog",
    );
    if (found.length !== 1) {
        throw new Error(`${found.length} buttons open a dialog`);
    }
    return found[0]!;
};

const { read, click, shown, overlay, placed } = overlayParts(
    {
        trigger: ids.trigger,
        content: ids.surface,
    },
    { role: "dialog", trigger: bar },
);

const ITEMS = [
    { value: "inbox", label: "Inbox", supportingText: "Mail" },
    { value: "invoices", label: "Invoices" },
    { value: "drafts", label: "Drafts" },
];

const input = (host: HTMLElement) =>
    byTestId<HTMLInputElement>(host, ids.input);

export const searchView: ComponentCase = {
    component: "SearchView",
    props: { placeholder: "Search mail", items: ITEMS },
    root: ids.root,
    examples: {
        closed: {},
        docked: { variant: "docked" },
        contained: { variant: "contained" },
    },
    opened: {
        "full screen": { defaultOpen: true },
        docked: { defaultOpen: true, variant: "docked" },
        contained: { defaultOpen: true, variant: "contained" },
        "with a query": { defaultOpen: true, defaultInputValue: "in" },
    },
    state: { prop: "open", from: false, to: true, act: click, read },
    overlay: overlay(),
    keyboard: {
        // The view's input takes focus while it's open.
        focusable: (host) => (shown(host) ? input(host) : bar(host)),
        disables: false,
        keys: [
            { key: "{Enter}", does: "change" },
            { key: " ", does: "change" },
            { key: "a", does: "change" },
        ],
        // The down arrow opens it too, in either direction.
        arrows: {
            ltr: [{ key: "{ArrowDown}", does: "change" }],
            rtl: [{ key: "{ArrowDown}", does: "change" }],
        },
    },
    // Open, by a click on the bar; the keys highlight a suggestion, which shows as hovered.
    indication: itemSources(searchViewMenuAnatomy, ITEMS, {
        modal: true,
        open: async (host) => {
            await userEvent.click(bar(host));
            await placed(host);
        },
        focus: async (host) => {
            input(host).focus();
            await userEvent.keyboard("{ArrowDown}");
        },
    }),
};
