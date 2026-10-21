import { anatomy as zagAnatomy } from "@zag-js/tree-view";

// Zag's parts, with the preset's: every node's row is a `node` (Zag's `item` for a leaf, its
// `branchControl` for a branch) holding a `leading` icon, its `text` and, on a branch, the expand
// `indicator`; a branch's children sit in its `group` (Zag's `branchContent`).
export const anatomy = zagAnatomy.extendWith(
    "node",
    "leading",
    "text",
    "indicator",
    "group",
);
export const parts = anatomy.build();
