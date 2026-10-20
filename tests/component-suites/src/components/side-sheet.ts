// The side sheet: `open`, by a click on its trigger (drawn as a button); Enter and Space open it
// from the trigger and move focus into it, to its first button. Like the dialog it isn't a form
// control and has no disabled state, and its open renderings are client-only. A modal sheet's
// backdrop, drawn by the scrim, comes and goes with it.

import { compositeTestIds } from "@pureform/anatomy";

import { overlayParts } from "./overlay";
import type { ComponentCase } from "./types";
import { byTestId } from "./types";

const ids = compositeTestIds.sideSheet;
const { trigger, read, click, shown, overlay } = overlayParts(ids);

export const sideSheet: ComponentCase = {
    component: "SideSheet",
    props: {
        trigger: "Filters",
        headline: "Filters",
        body: "Narrow the results.",
    },
    root: ids.root,
    examples: {
        closed: {},
        "with actions": { actions: "Save" },
    },
    opened: {
        plain: { defaultOpen: true },
        "with a back button and actions": {
            defaultOpen: true,
            onBack: () => {},
            actions: "Save",
        },
        standard: { defaultOpen: true, modal: false },
    },
    state: { prop: "open", from: false, to: true, act: click, read },
    overlay: overlay({
        also: (host) => [
            byTestId(host, compositeTestIds.sideSheetBackdrop.root),
        ],
    }),
    keyboard: {
        // Focus moves to the first focusable element inside while it's open: the close button.
        focusable: (host) =>
            shown(host) ? byTestId(host, ids.closeTrigger) : trigger(host),
        disables: false,
        keys: [
            { key: "{Enter}", does: "change" },
            { key: " ", does: "change" },
        ],
    },
};
