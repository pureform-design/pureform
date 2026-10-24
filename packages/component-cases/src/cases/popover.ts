// The popover: `open`, by a click on its trigger (drawn as a button); Enter and Space open it from
// the trigger and move focus into it. It isn't a form control, and has no disabled state of its
// own. Open, it's placed against the trigger in the browser, so its open renderings are
// client-only.

import { compositeTestIds } from "@pureform/anatomy";

import type { ComponentCase } from "../types";
import { overlayParts } from "./overlay";

const ids = compositeTestIds.popover;
const { content, trigger, read, click, shown, overlay } = overlayParts(ids, {
    role: "dialog",
    name: "Filters",
});

export const popover: ComponentCase = {
    component: "Popover",
    props: {
        trigger: "Filters",
        heading: "Filters",
        body: "Show only the items that match.",
    },
    root: ids.root,
    examples: {
        closed: {},
        caret: { caret: true },
    },
    opened: {
        plain: { defaultOpen: true },
        caret: { defaultOpen: true, caret: true },
        "with actions": {
            defaultOpen: true,
            actions: "Apply",
        },
    },
    state: { prop: "open", from: false, to: true, act: click, read },
    overlay: overlay(),
    keyboard: {
        // The popover takes focus while it's open.
        focusable: (host) => (shown(host) ? content(host) : trigger(host)),
        disables: false,
        keys: [
            { key: "{Enter}", does: "change" },
            { key: " ", does: "change" },
        ],
    },
};
