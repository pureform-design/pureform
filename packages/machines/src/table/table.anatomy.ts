import { createAnatomy } from "@zag-js/anatomy";

export const anatomy = createAnatomy("table").parts(
    "root",
    "header",
    "body",
    "footer",
    "headerRow",
    "row",
    "alternateRow",
    "footerRow",
    "headerCell",
    "cell",
    "footerCell",
    "selectionCell",
    "sortHeader",
    "sortLabel",
    "sortIndicator",
);
export const parts = anatomy.build();
