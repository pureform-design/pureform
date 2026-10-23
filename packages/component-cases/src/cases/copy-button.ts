// The copy button: an icon button that copies its `value`. A press copies and swaps the icon and
// the accessible name for a while, so there's no state a user controls; it's a native `<button>`
// that Enter and Space click, and it shows the icon button's indication.

import { iconButtonAnatomy, testIds } from "@pureform/anatomy";

import type { ComponentCase } from "../types";
import { byTestId, ownSource } from "../types";

const ids = testIds.iconButton;

const root = (host: HTMLElement) => byTestId<HTMLButtonElement>(host, ids.root);

export const copyButton: ComponentCase = {
    component: "CopyButton",
    props: { value: "pureform" },
    root: ids.root,
    examples: {
        standard: {},
        filled: { variant: "filled" },
        tonal: { variant: "tonal", color: "secondary" },
        outlined: { variant: "outlined" },
        small: { size: "xsmall", variant: "filled" },
        large: { size: "large", variant: "tonal" },
        "custom icons": { icon: "C", copiedIcon: "OK" },
        "custom names": {
            label: "Copy the token",
            copiedLabel: "Token copied",
        },
        disabled: { disabled: true, variant: "filled" },
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
