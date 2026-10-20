// The bottom sheet: `open`, by a click on its trigger (drawn as a button); Enter and Space open it
// from the trigger and move focus into it, to its drag handle. Like the dialog it isn't a form
// control and has no disabled state, and its open renderings are client-only. A modal sheet's
// backdrop, drawn by the scrim, comes and goes with it.

import { compositeTestIds } from "@pureform/anatomy";

import { overlayParts } from "./overlay";
import type { ComponentCase } from "./types";
import { byTestId } from "./types";

const ids = compositeTestIds.bottomSheet;
const { trigger, read, click, shown, overlay } = overlayParts(ids);

export const bottomSheet: ComponentCase = {
    component: "BottomSheet",
    props: {
        trigger: "Share",
        "aria-label": "Share",
        body: "Send it to a friend.",
    },
    root: ids.root,
    examples: {
        closed: {},
        "without a drag handle": { dragHandle: false },
    },
    opened: {
        plain: { defaultOpen: true },
        standard: { defaultOpen: true, modal: false },
    },
    state: { prop: "open", from: false, to: true, act: click, read },
    overlay: overlay({
        also: (host) => [
            byTestId(host, compositeTestIds.bottomSheetBackdrop.root),
        ],
    }),
    keyboard: {
        // Focus moves to the first focusable element inside while it's open: the drag handle.
        focusable: (host) =>
            shown(host) ? byTestId(host, ids.dragHandle) : trigger(host),
        disables: false,
        keys: [
            { key: "{Enter}", does: "change" },
            { key: " ", does: "change" },
        ],
    },
};
