// The dialog: `open`, by a click on its trigger (drawn as a button); Enter and Space open it from
// the trigger and move focus into it. It isn't a form control, and has no disabled state of its
// own. Open, it's fixed over the viewport, which the server rendering suite can't hydrate the
// same way (Zag hides the page and locks its scrolling), so its open renderings are client-only.

import { compositeTestIds } from "@pureform/anatomy";

import { overlayParts } from "./overlay";
import type { ComponentCase } from "./types";
import { byTestId } from "./types";

const ids = compositeTestIds.dialog;
const { content, trigger, read, click, shown, overlay } = overlayParts(ids);

export const dialog: ComponentCase = {
    component: "Dialog",
    props: {
        trigger: "Discard",
        headline: "Discard draft?",
        body: "Your changes won't be saved.",
    },
    root: ids.root,
    examples: {
        closed: {},
        "with an icon": { icon: "★" },
    },
    opened: {
        plain: { defaultOpen: true },
        "with an icon": { defaultOpen: true, icon: "★" },
        "with a mirrored icon": {
            defaultOpen: true,
            icon: "→",
            mirrorIcon: true,
        },
    },
    state: { prop: "open", from: false, to: true, act: click, read },
    // The backdrop, drawn by the scrim, comes and goes with it.
    overlay: overlay({
        also: (host) => [byTestId(host, compositeTestIds.dialogBackdrop.root)],
    }),
    keyboard: {
        // The dialog takes focus while it's open.
        focusable: (host) => (shown(host) ? content(host) : trigger(host)),
        disables: false,
        keys: [
            { key: "{Enter}", does: "change" },
            { key: " ", does: "change" },
        ],
    },
};
