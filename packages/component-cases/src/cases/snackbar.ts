// The snackbar: `open`, which its close button, its action, and Escape inside it close. Tab reaches
// its action; Enter and Space choose it, which closes the snackbar and leaves focus on the page.
// It has no form and no disabled state.

import { snackbarAnatomy, testIds } from "@pureform/anatomy";

import type { ActOptions, ComponentCase } from "../types";
import { byTestId } from "../types";
import { userEvent } from "../user-event";

const ids = testIds.snackbar;

const root = (host: HTMLElement) => byTestId(host, ids.root);

const action = (host: HTMLElement) =>
    byTestId<HTMLButtonElement>(host, ids.action);

const close = (host: HTMLElement) =>
    byTestId<HTMLButtonElement>(host, ids.close);

/** Whether it's open: a status region that isn't hidden, and isn't on its way out. */
const read = (host: HTMLElement): boolean => {
    const element = root(host);
    if (element.getAttribute("role") !== "status") {
        throw new Error(
            `the snackbar's role is ${element.getAttribute("role")}`,
        );
    }
    return !element.hidden && element.dataset.state !== "closed";
};

export const snackbar: ComponentCase = {
    component: "Snackbar",
    props: {
        defaultOpen: true,
        supportingText: "Message archived",
        action: "Undo",
        closeLabel: "Dismiss",
    },
    root: ids.root,
    examples: {
        "with an action and a close button": {},
        "text only": { action: null, closeLabel: null },
        "with an action": { closeLabel: null },
        "a long message": {
            supportingText:
                "Your photos are backed up and will stay on this device until you remove them.",
        },
    },
    state: {
        prop: "open",
        from: true,
        to: false,
        act: async (host, options: ActOptions = {}) => {
            await userEvent.click(close(host), options);
        },
        read,
    },
    keyboard: {
        // Choosing the action closes it, and focus goes back to the page.
        focusable: (host) => (read(host) ? action(host) : document.body),
        disables: false,
        keys: [
            { key: "{Enter}", does: "click" },
            { key: " ", does: "click" },
            { key: "{Escape}", does: "change" },
        ],
    },
    // Its action and its close button; the ready-made snackbar takes no source for either, and
    // has no disabled state.
    indication: { anatomy: snackbarAnatomy },
    // Placed as an app places it, fixed at the bottom; it stays until closed.
    overlay: {
        surface: root,
        parts: () => [],
        props: { duration: null },
        place: (host) => {
            Object.assign(root(host).style, {
                position: "fixed",
                insetInlineStart: "16px",
                bottom: "16px",
            });
        },
    },
};
