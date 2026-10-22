import { createAnatomy } from "@zag-js/anatomy";

export const anatomy = createAnatomy("navigation").parts(
    "root",
    "header",
    "sectionLabel",
    "item",
    "indicator",
    "activeIndicator",
    "icon",
    "label",
);
export const parts = anatomy.build();
