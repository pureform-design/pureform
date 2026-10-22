// The split button: its leading button runs the action, and its trailing button opens the menu
// component (`open`) with a click; Enter, Space, and the arrow keys up and down open it from the
// trailing button. `disabled` disables both buttons. Open, the menu is placed against the trailing
// button in the browser, so its open renderings are client-only.

import {
    compositeTestIds,
    splitButtonAnatomy,
    testIds,
} from "@pureform/anatomy";

import type { ComponentCase } from "../types";
import { byTestId } from "../types";
import { overlayParts } from "./overlay";

const ids = testIds.splitButton;
const { read, click, overlay } = overlayParts({
    trigger: ids.trailingButton,
    content: compositeTestIds.menu.content,
});

const ITEMS = [
    { value: "draft", label: "Save as draft" },
    { value: "template", label: "Save as template" },
];

const leading = (host: HTMLElement) =>
    byTestId<HTMLButtonElement>(host, ids.leadingButton);

export const splitButton: ComponentCase = {
    component: "SplitButton",
    props: { label: "Save", items: ITEMS },
    root: ids.root,
    examples: {
        filled: {},
        tonal: { variant: "tonal", color: "secondary" },
        outlined: { variant: "outlined" },
        elevated: { variant: "elevated" },
        "extra small": { size: "xsmall" },
        large: { size: "large" },
        "with an icon": { icon: "✎" },
        disabled: { disabled: true },
    },
    opened: {
        plain: { defaultOpen: true },
        // Zag rounds the menu's place to whole pixels, so a size whose trailing button's edge
        // falls between pixels places it up to a pixel off its mirror.
        tonal: { defaultOpen: true, variant: "tonal" },
    },
    state: { prop: "open", from: false, to: true, act: click, read },
    keyboard: {
        // Tab reaches the leading button first; Enter and Space press it.
        focusable: leading,
        keys: [
            { key: "{Enter}", does: "click" },
            { key: " ", does: "click" },
        ],
    },
    // Each button; the ready-made split button takes no source for either.
    indication: { anatomy: splitButtonAnatomy, disabled: { disabled: true } },
    overlay: overlay(),
};
