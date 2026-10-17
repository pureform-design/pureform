// The card: no state of its own. A surface, or, rendered `as: "button"` here, an interactive card
// that Enter and Space click, with its touch target.

import { cardAnatomy, testIds } from "@pureform/anatomy";

import type { ComponentCase } from "./types";
import { byTestId, ownSource } from "./types";

const ids = testIds.card;

export const card: ComponentCase = {
    component: "Card",
    props: { children: "Basic plan", as: "button" },
    root: ids.root,
    examples: {
        elevated: {},
        filled: { variant: "filled" },
        outlined: { variant: "outlined" },
        link: { as: undefined, href: "#plan" },
        "not interactive": { as: undefined, variant: "outlined" },
        disabled: { disabled: true },
    },
    keyboard: {
        focusable: (host) => byTestId(host, ids.root),
        keys: [
            { key: "{Enter}", does: "click" },
            { key: " ", does: "click" },
        ],
    },
    indication: ownSource(cardAnatomy),
};
