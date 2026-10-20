// The FAB menu: `open`, by a click on its FAB, which turns into the close button while it's open;
// Enter, Space, and the arrow keys up and down open it from the FAB and move focus into the list.
// It has no form and no disabled state of its own. Open, its list is placed above the FAB in the
// browser, so its open renderings are client-only.

import { fabMenuAnatomy, testIds } from "@pureform/anatomy";
import { userEvent } from "vitest/browser";

import { overlayParts } from "./overlay";
import type { ComponentCase, KeyCase } from "./types";
import { byTestId, itemSources } from "./types";

const ids = testIds.fabMenu;
const { content, trigger, read, click, shown, overlay } = overlayParts({
    trigger: ids.closeTrigger,
    content: ids.list,
});

const ITEMS = [
    { value: "message", label: "Message", icon: "✉" },
    { value: "call", label: "Call", icon: "☎" },
    { value: "video", label: "Video", icon: "▶", disabled: true },
];

const [CLOSE_TRIGGER, ITEM] = fabMenuAnatomy.indication;

/** Places it as an app does, fixed at the screen's bottom end, so its list opens above it on the
 *  page. */
const place = (host: HTMLElement) => {
    Object.assign(byTestId(host, ids.root).style, {
        position: "fixed",
        insetBlockEnd: "16px",
        insetInlineEnd: "16px",
    });
};

const opens: KeyCase = { key: "{ArrowDown}", does: "change" };

export const fabMenu: ComponentCase = {
    component: "FabMenu",
    props: { icon: "+", fabLabel: "Create", items: ITEMS },
    root: ids.root,
    examples: {
        closed: {},
        "secondary color": { color: "secondary" },
        large: { size: "large" },
    },
    opened: {
        plain: { defaultOpen: true },
        "tertiary color": { defaultOpen: true, color: "tertiary" },
        "with a mirrored icon": {
            defaultOpen: true,
            items: [
                {
                    value: "share",
                    label: "Share",
                    icon: "→",
                    mirrorIcon: true,
                },
            ],
        },
    },
    state: { prop: "open", from: false, to: true, act: click, read },
    keyboard: {
        // The list takes focus while it's open.
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
    overlay: { ...overlay(), parts: () => [], place },
    // The FAB, which Tab reaches; the ready-made FAB menu takes no source for it, and it has no
    // disabled state. Its items are `fabMenuItems`.
    indication: { anatomy: { ...fabMenuAnatomy, indication: [CLOSE_TRIGGER] } },
};

/** The FAB menu open, for its items' indication: the keyboard highlights an item, which shows as
 *  hovered. */
export const fabMenuItems: ComponentCase = {
    ...fabMenu,
    opened: undefined,
    overlay: undefined,
    examples: { "large, tertiary": { size: "large", color: "tertiary" } },
    indication: itemSources({ ...fabMenuAnatomy, indication: [ITEM] }, ITEMS, {
        props: { defaultOpen: true },
        open: async (host) => place(host),
        disabled: undefined,
        focus: async (host) => {
            content(host).focus();
            await userEvent.keyboard("{ArrowDown}");
        },
    }),
};
