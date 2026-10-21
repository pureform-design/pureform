// The menu: `open`, by a click on its trigger (drawn as a button); Enter, Space, and the arrow
// keys up and down open it from the trigger and move focus into it. It isn't a form control, and
// has no disabled state of its own. Open, it's placed against the trigger in the browser, so its
// open renderings are client-only.

import { compositeTestIds, menuOverlayAnatomy } from "@pureform/anatomy";
import { userEvent } from "vitest/browser";

import { overlayParts } from "./overlay";
import type { ComponentCase, KeyCase } from "./types";
import { itemSources } from "./types";

const ids = compositeTestIds.menu;
const { content, trigger, read, click, shown, overlay } = overlayParts(ids);

const ITEMS = [
    { value: "cut", label: "Cut" },
    { value: "copy", label: "Copy" },
    { value: "paste", label: "Paste", disabled: true },
];

const opens: KeyCase = { key: "{ArrowDown}", does: "change" };

export const menu: ComponentCase = {
    component: "Menu",
    props: { trigger: "Edit", items: ITEMS },
    root: ids.root,
    examples: {
        closed: {},
        "secondary color": { color: "secondary" },
        compact: { density: "compact" },
    },
    opened: {
        plain: { defaultOpen: true },
        "with icons and shortcuts": {
            defaultOpen: true,
            items: [
                {
                    value: "cut",
                    label: "Cut",
                    leadingIcon: "✂",
                    trailingText: "⌘X",
                },
                {
                    value: "share",
                    label: "Share",
                    leadingIcon: "↗",
                    trailingIcon: "→",
                    mirrorTrailingIcon: true,
                },
            ],
        },
        "with a submenu": {
            defaultOpen: true,
            items: [
                { value: "cut", label: "Cut" },
                {
                    value: "share",
                    label: "Share",
                    items: [
                        { value: "mail", label: "Mail" },
                        { value: "link", label: "Copy link" },
                    ],
                },
            ],
        },
        "secondary color, compact": {
            defaultOpen: true,
            color: "secondary",
            density: "compact",
        },
        "with supporting text, vibrant": {
            defaultOpen: true,
            vibrant: true,
            items: [
                {
                    value: "cut",
                    label: "Cut",
                    supportingText: "To the clipboard",
                },
                {
                    value: "grid",
                    label: "Grid",
                    type: "checkbox",
                    checked: true,
                },
            ],
        },
        groups: {
            defaultOpen: true,
            items: [],
            groups: [
                { id: "edit", label: "Edit", items: ITEMS.slice(0, 2) },
                {
                    id: "view",
                    label: "View",
                    items: [
                        {
                            value: "grid",
                            label: "Grid",
                            type: "checkbox",
                            checked: true,
                        },
                        {
                            value: "list",
                            label: "List",
                            type: "checkbox",
                            checked: false,
                        },
                    ],
                },
            ],
        },
    },
    state: { prop: "open", from: false, to: true, act: click, read },
    keyboard: {
        // The menu takes focus while it's open.
        focusable: (host) => (shown(host) ? content(host) : trigger(host)),
        disables: false,
        keys: [
            { key: "{Enter}", does: "change" },
            { key: " ", does: "change" },
        ],
        arrows: {
            ltr: [
                opens,
                { key: "{ArrowUp}", does: "change" },
                { key: "{ArrowLeft}", does: "nothing" },
                { key: "{ArrowRight}", does: "nothing" },
            ],
            rtl: [
                opens,
                { key: "{ArrowUp}", does: "change" },
                { key: "{ArrowLeft}", does: "nothing" },
                { key: "{ArrowRight}", does: "nothing" },
            ],
        },
    },
    // Open; the menu has no disabled state of its own, and the keyboard highlights an item, which
    // shows as hovered.
    overlay: overlay(),
    indication: itemSources(menuOverlayAnatomy, ITEMS, {
        props: { defaultOpen: true },
        disabled: undefined,
        focus: async (host) => {
            content(host).focus();
            await userEvent.keyboard("{ArrowDown}");
        },
    }),
};
