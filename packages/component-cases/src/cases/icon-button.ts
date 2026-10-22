// The icon button: `selected` for a toggle icon button, a native `<button>` that submits as the
// form's submitter, and Enter and Space to click.

import { iconButtonAnatomy, testIds } from "@pureform/anatomy";

import type { ComponentCase } from "../types";
import { byTestId, ownSource } from "../types";
import { userEvent } from "../user-event";

const ids = testIds.iconButton;

const root = (host: HTMLElement) => byTestId<HTMLButtonElement>(host, ids.root);

/** `aria-pressed`, which a toggle icon button always has. */
const read = (host: HTMLElement): boolean => {
    const pressed = root(host).getAttribute("aria-pressed");
    if (pressed !== "true" && pressed !== "false") {
        throw new Error(`aria-pressed is ${String(pressed)}`);
    }
    return pressed === "true";
};

export const iconButton: ComponentCase = {
    component: "IconButton",
    props: { "aria-label": "Favorite", icon: "★" },
    root: ids.root,
    examples: {
        standard: {},
        filled: { variant: "filled" },
        tonal: { variant: "tonal", color: "secondary" },
        outlined: { variant: "outlined" },
        small: { size: "small", variant: "filled" },
        large: { size: "large", variant: "tonal" },
        "with a mirrored icon": { icon: "→", mirrorIcon: true },
        "toggle, unselected": { defaultSelected: false, variant: "filled" },
        "toggle, selected": { defaultSelected: true, variant: "outlined" },
        disabled: { disabled: true, variant: "filled" },
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
            props: { type: "submit", name: "action", value: "favorite" },
            entries: [["action", "favorite"]],
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
    indication: ownSource(iconButtonAnatomy),
};
