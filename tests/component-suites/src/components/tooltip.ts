// The tooltip: `open`, when keyboard focus reaches its trigger (or the pointer rests on it, which
// the controlled rules can't use: leaving the trigger asks to close). Tab opens it, Escape closes
// it, and focus stays on the trigger. It has no form, and its `disabled` stops the tooltip, not
// the trigger. Open, it's placed against the trigger in the browser, so its open renderings are
// client-only.

import { compositeTestIds } from "@pureform/anatomy";
import { userEvent } from "vitest/browser";

import { overlayParts } from "./overlay";
import type { ActOptions, ComponentCase } from "./types";

const ids = compositeTestIds.tooltip;
const { trigger, placed, shown, overlay } = overlayParts(ids);

/** Whether it's open: shown, and the trigger described by it, throwing if they disagree. */
const read = (host: HTMLElement): boolean => {
    const open = shown(host);
    const described = trigger(host).hasAttribute("aria-describedby");
    if (described !== open) {
        throw new Error(
            `the tooltip ${open ? "shows" : "is hidden"}, its trigger ${described ? "is" : "isn't"} described`,
        );
    }
    return open;
};

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
        rich: {
            variant: "rich",
            subhead: "Drafts",
            supportingText: "Drafts stay on this device.",
        },
    },
    opened: {
        plain: { defaultOpen: true },
        rich: {
            defaultOpen: true,
            variant: "rich",
            subhead: "Drafts",
            supportingText: "Drafts stay on this device.",
        },
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
