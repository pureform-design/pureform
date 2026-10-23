// The bottom sheet: `open`, by a click on its trigger (drawn as a button); Enter and Space open it
// from the trigger and move focus into it, to its drag handle. Like the dialog it isn't a form
// control and has no disabled state, and its open renderings are client-only. A modal sheet's
// backdrop, drawn by the scrim, comes and goes with it. With `partiallyExpandable`, a sheet taller
// than half the screen opens partly, and its drag handle moves it between partly and fully open.

import { compositeTestIds } from "@pureform/anatomy";

import type { ComponentCase } from "../types";
import { byTestId } from "../types";
import { overlayParts } from "./overlay";

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
    },
    opened: {
        plain: { defaultOpen: true },
        standard: { defaultOpen: true, modal: false },
        // The body takes the top padding the handle gave it.
        "without a drag handle": { defaultOpen: true, dragHandle: false },
        // Taller than half the screen, so it opens with its top at half the screen (the
        // default); its body scrolls, so it takes focus for the keyboard.
        "partly open": {
            defaultOpen: true,
            body: "Send it to a friend, or copy the link. ".repeat(120),
        },
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
