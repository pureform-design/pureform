// Parts that group preset components rather than belonging to one: the registry doesn't style
// them, so they aren't AST slots, and the generator doesn't write them. Bindings render them as
// they are, with the same attributes and test ids as any part.

import type { ComponentAnatomy } from "./types";

/** The radio group: one element around its radios, which carries Zag's `role="radiogroup"`.
 *  Each radio inside it is a `radio` with its own parts. */
export const radioGroupAnatomy = {
    name: "radioGroup",
    scope: "radio-group",
    root: "root",
    partNames: ["root"],
    parts: {
        root: {
            name: "root",
            attribute: "root",
            testId: "pf-radio-group-root",
            parent: null,
            children: [],
            styled: false,
            mirror: false,
        },
    },
} as const satisfies ComponentAnatomy;

/** The select's list of options, drawn as a menu: its parts are the menu's slots (so the menu's
 *  registry entry styles them), named and test-identified as the select's. Zag's positioner
 *  around it places it under the field and isn't styled. */
export const selectMenuAnatomy = {
    name: "menu",
    scope: "select",
    root: "root",
    partNames: ["positioner", "root", "item", "itemLabel"],
    parts: {
        positioner: {
            name: "positioner",
            attribute: "positioner",
            testId: "pf-select-positioner",
            parent: null,
            children: ["root"],
            styled: false,
            mirror: false,
        },
        root: {
            name: "root",
            attribute: "content",
            testId: "pf-select-content",
            parent: "positioner",
            children: ["item"],
            styled: true,
            mirror: false,
        },
        item: {
            name: "item",
            attribute: "item",
            testId: "pf-select-item",
            parent: "root",
            children: ["itemLabel"],
            styled: true,
            mirror: false,
        },
        itemLabel: {
            name: "itemLabel",
            attribute: "item-label",
            testId: "pf-select-item-label",
            parent: "item",
            children: [],
            styled: true,
            mirror: false,
        },
    },
} as const satisfies ComponentAnatomy;

/** The composites' default test ids, by composite and part: `compositeTestIds.radioGroup.root`. */
export const compositeTestIds = {
    radioGroup: { root: "pf-radio-group-root" },
    selectMenu: {
        positioner: "pf-select-positioner",
        root: "pf-select-content",
        item: "pf-select-item",
        itemLabel: "pf-select-item-label",
    },
} as const;
