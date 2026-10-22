// The full-screen dialog: `open`, by a click on its trigger (drawn as a button); Enter and Space
// open it from the trigger and move focus into it. Like the basic dialog it isn't a form control and
// has no disabled state, and its open renderings are client-only. It has no backdrop.

import { compositeTestIds } from "@pureform/anatomy";

import type { ComponentCase } from "../types";
import { byTestId } from "../types";
import { overlayParts } from "./overlay";

const ids = compositeTestIds.fullscreenDialog;
const { trigger, read, click, shown, overlay } = overlayParts(ids);

export const fullscreenDialog: ComponentCase = {
    component: "FullscreenDialog",
    props: {
        trigger: "New event",
        headline: "New event",
        confirmAction: "Save",
        body: "Fill in the details.",
    },
    root: ids.root,
    examples: {
        closed: {},
        "without a confirm action": { confirmAction: undefined },
    },
    opened: {
        plain: { defaultOpen: true },
        "without a confirm action": {
            defaultOpen: true,
            confirmAction: undefined,
        },
    },
    state: { prop: "open", from: false, to: true, act: click, read },
    overlay: overlay(),
    keyboard: {
        // Focus moves to the first focusable element inside while it's open: the close trigger.
        focusable: (host) =>
            shown(host) ? byTestId(host, ids.closeTrigger) : trigger(host),
        disables: false,
        keys: [
            { key: "{Enter}", does: "change" },
            { key: " ", does: "change" },
        ],
    },
};
