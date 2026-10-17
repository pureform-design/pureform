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

/** The composites' default test ids, by composite and part: `compositeTestIds.radioGroup.root`. */
export const compositeTestIds = {
    radioGroup: { root: "pf-radio-group-root" },
} as const;
