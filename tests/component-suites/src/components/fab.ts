// The FAB: a native `<button>` that submits as the form's submitter, and Enter and Space to click.
// It doesn't toggle.

import { testIds } from "@pureform/anatomy";

import type { ComponentCase } from "./types";
import { byTestId } from "./types";

const ids = testIds.fab;

const root = (host: HTMLElement) => byTestId<HTMLButtonElement>(host, ids.root);

export const fab: ComponentCase = {
    component: "Fab",
    props: { "aria-label": "Compose", icon: "✎" },
    root: ids.root,
    examples: {
        tonal: {},
        filled: { variant: "filled", color: "secondary" },
        surface: { variant: "surface" },
        small: { size: "small" },
        large: { size: "large" },
        extended: { label: "Compose" },
        "with a mirrored icon": { icon: "→", mirrorIcon: true },
        disabled: { disabled: true },
    },
    form: {
        control: root,
        disabled: (host) => root(host).hasAttribute("data-disabled"),
        submits: {
            props: { type: "submit", name: "action", value: "compose" },
            entries: [["action", "compose"]],
        },
        submitter: true,
    },
    keyboard: {
        focusable: root,
        keys: [
            { key: "{Enter}", does: "click" },
            { key: " ", does: "click" },
        ],
    },
};
