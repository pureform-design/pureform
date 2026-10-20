// The button: `selected` when it toggles, a native `<button>` that submits as the form's
// submitter, and Enter and Space to click.

import { buttonAnatomy, testIds } from "@pureform/anatomy";
import { userEvent } from "vitest/browser";

import type { ComponentCase } from "./types";
import { byTestId, ownSource } from "./types";

const ids = testIds.button;

const root = (host: HTMLElement) => byTestId<HTMLButtonElement>(host, ids.root);

/** `aria-pressed`, which a toggle button always has. */
const read = (host: HTMLElement): boolean => {
    const pressed = root(host).getAttribute("aria-pressed");
    if (pressed !== "true" && pressed !== "false") {
        throw new Error(`aria-pressed is ${String(pressed)}`);
    }
    return pressed === "true";
};

export const button: ComponentCase = {
    component: "Button",
    props: { label: "Save" },
    root: ids.root,
    examples: {
        filled: {},
        tonal: { variant: "tonal" },
        outlined: { variant: "outlined" },
        text: { variant: "text" },
        elevated: { variant: "elevated", color: "secondary" },
        "with an icon": { icon: "+", size: "large" },
        "with a mirrored icon": {
            icon: "→",
            mirrorIcon: true,
            variant: "outlined",
        },
        "with a secondary icon": { secondaryIcon: "▾", variant: "tonal" },
        "with a secondary icon first": {
            icon: "+",
            secondaryIcon: "▾",
            secondaryIconPosition: "start",
        },
        "toggle, selected": { defaultSelected: true, variant: "tonal" },
        disabled: { disabled: true },
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
            props: { type: "submit", name: "action", value: "send" },
            entries: [["action", "send"]],
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
    indication: ownSource(buttonAnatomy),
};
