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
        "secondary color, compact": {
            defaultOpen: true,
            color: "secondary",
            density: "compact",
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
