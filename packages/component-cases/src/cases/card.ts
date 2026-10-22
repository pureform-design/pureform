// The card: no state of its own. A surface, or, rendered `as: "button"` here, an interactive card
// that Enter and Space click, with its touch target. With actions beside its own action, the card
// moves that action to its action area, which Enter and Space click, while the container shows its
// states.

import { cardAnatomy, testIds } from "@pureform/anatomy";

import type { ComponentCase } from "../types";
import { byTestId, ownSource } from "../types";

const ids = testIds.card;

const [ROOT_ENTRY, ACTION_AREA_ENTRY] = cardAnatomy.indication;

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
    // Root acts: its own entry.
    indication: ownSource({ ...cardAnatomy, indication: [ROOT_ENTRY] }),
};

/** A card laid out in Material's sections, whose action sits beside its actions: the action
 *  area acts, and the container shows its states. The actions are text here, as scenes are plain
 *  data; the binding suites press real controls beside it. */
export const cardActionArea: ComponentCase = {
    component: "Card",
    props: {
        as: "button",
        headline: "Basic plan",
        subhead: "Monthly",
        supportingText:
            "Everything in the free plan, with more storage and support.",
        actions: "Plan details",
    },
    root: ids.root,
    examples: {
        elevated: {},
        filled: { variant: "filled" },
        outlined: { variant: "outlined" },
        link: { as: undefined, href: "#plan" },
        "actions at the start": { actionsAlign: "start" },
        disabled: { disabled: true },
    },
    keyboard: {
        focusable: (host) => byTestId(host, ids.actionArea),
        keys: [
            { key: "{Enter}", does: "click" },
            { key: " ", does: "click" },
        ],
    },
    indication: ownSource({ ...cardAnatomy, indication: [ACTION_AREA_ENTRY] }),
};
