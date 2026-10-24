// The tooltip: `open`, when keyboard focus reaches its trigger (or the pointer rests on it, which
// the controlled rules can't use: leaving the trigger asks to close). Tab opens it, Escape closes
// it, and focus stays on the trigger. It has no form, and its `disabled` stops the tooltip, not
// the trigger. Open, it's placed against the trigger in the browser, so its open renderings are
// client-only.

import { compositeTestIds } from "@pureform/anatomy";

import type { ActOptions, ComponentCase } from "../types";
import { userEvent } from "../user-event";
import { overlayParts, tooltipRead } from "./overlay";

const ids = compositeTestIds.tooltip;
const { trigger, placed, shown, overlay } = overlayParts(ids, {
    role: "tooltip",
    name: "Save",
});

/** Whether it's open: shown, and the trigger described by it. */
const read = tooltipRead({ trigger, shown });

/** Keyboard focus reaches the trigger: a key press makes the keyboard the input, then the trigger
 *  takes focus. */
const focus = async (host: HTMLElement, _options: ActOptions = {}) => {
    trigger(host).blur();
    await userEvent.keyboard("a");
    trigger(host).focus();
    await placed(host);
};

export const tooltip: ComponentCase = {
    component: "Tooltip",
    props: {
        trigger: "Save",
        supportingText: "Save to drafts",
        openDelay: 0,
        closeDelay: 0,
    },
    root: ids.root,
    examples: {
        plain: {},
        caret: { caret: true },
    },
    opened: {
        plain: { defaultOpen: true },
        caret: { defaultOpen: true, caret: true },
    },
    state: { prop: "open", from: false, to: true, act: focus, read },
    overlay: overlay(),
    keyboard: {
        focusable: trigger,
        disables: false,
        // Tab, which reaches the trigger, opens it.
        focused: true,
        keys: [
            { key: "{Escape}", does: "change", to: false },
            // The trigger is a button: Enter clicks it.
            { key: "{Enter}", does: "click" },
        ],
    },
};
