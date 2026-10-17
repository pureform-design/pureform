// The chip: `selected` for a filter chip, a native `<button>` that submits as the form's
// submitter, and Enter and Space to click.

import { testIds } from "@pureform/anatomy";
import { userEvent } from "vitest/browser";

import type { ComponentCase } from "./types";
import { byTestId } from "./types";

const ids = testIds.chip;

const root = (host: HTMLElement) => byTestId<HTMLButtonElement>(host, ids.root);

/** `aria-pressed`, which a filter chip always has. */
const read = (host: HTMLElement): boolean => {
    const pressed = root(host).getAttribute("aria-pressed");
    if (pressed !== "true" && pressed !== "false") {
        throw new Error(`aria-pressed is ${String(pressed)}`);
    }
    return pressed === "true";
};

export const chip: ComponentCase = {
    component: "Chip",
    props: { label: "Vegan" },
    root: ids.root,
    examples: {
        outlined: {},
        elevated: { variant: "elevated" },
        "with an icon": { icon: "+" },
        "with a mirrored icon": { icon: "→", mirrorIcon: true },
        "filter, selected": { defaultSelected: true, icon: "✓" },
        "filter, selected, secondary": {
            defaultSelected: true,
            color: "secondary",
            variant: "elevated",
        },
        compact: { density: "compact" },
        disabled: { disabled: true },
        "disabled and selected": { disabled: true, defaultSelected: true },
    },
    state: {
        prop: "selected",
        from: false,
        to: true,
        act: async (host, options = {}) => {
            await userEvent.click(root(host), options);
        },
        read,
    },
    form: {
        control: root,
        disabled: (host) => root(host).hasAttribute("data-disabled"),
        submits: {
            props: { type: "submit", name: "diet", value: "vegan" },
            entries: [["diet", "vegan"]],
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
