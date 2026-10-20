// The toast: a toaster's region with its toasts, each a status with its type's icon, a title, a
// description, an action and a close button. The close button and the action dismiss it; Tab
// reaches the toast, then its action. Zag adds the toasts once it runs, in the browser.

import { testIds, toastAnatomy } from "@pureform/anatomy";

import type { ComponentCase } from "./types";

const ids = testIds.toast;

const toast = (type: string, title: string, more: object = {}) => ({
    type,
    title,
    ...more,
});

// Toasts come in once Zag runs, after hydration, so the server renders the empty region: the
// examples are the region, and the toasts are client-only renderings (`opened`).
const saved = toast("success", "Saved", {
    description: "Your changes are saved.",
    action: { label: "Undo", onClick: () => {} },
});

export const toastCase: ComponentCase = {
    component: "Toast",
    props: { closeLabel: "Dismiss", toasts: [] },
    root: ids.group,
    examples: { "the empty region": {} },
    opened: {
        "with a description and an action": { toasts: [saved] },
        "an error, title only": { toasts: [toast("error", "Upload failed")] },
        "a warning, not closable": {
            toasts: [
                toast("warning", "Storage almost full", { closable: false }),
            ],
        },
        "several, stacked": {
            toasts: [
                toast("info", "Synced"),
                toast("loading", "Uploading 3 files"),
            ],
        },
    },
    // The empty region draws nothing; the toasts' colors are in the browser suite's screenshots.
    themed: false,
    // Its action and close button; the ready-made toaster takes no source for either, and has no
    // disabled state.
    indication: { anatomy: toastAnatomy, props: { toasts: [saved] } },
};
