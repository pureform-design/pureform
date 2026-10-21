import { anatomy as zagAnatomy } from "@zag-js/pagination";

// Zag's parts (root, the four triggers, and the numbered `item` and `ellipsis` the paginator
// doesn't draw), with the preset's: the page-size group, its label and select, the range label
// and the row of triggers.
export const anatomy = zagAnatomy.extendWith(
    "pageSize",
    "pageSizeLabel",
    "pageSizeSelect",
    "rangeLabel",
    "actions",
);
export const parts = anatomy.build();
