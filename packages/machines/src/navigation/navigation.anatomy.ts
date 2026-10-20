import { createAnatomy } from "@zag-js/anatomy";

export const anatomy = createAnatomy("navigation").parts(
    "root",
    "header",
    "item",
    "indicator",
    "activeIndicator",
    "icon",
    "label",
);
export const parts = anatomy.build();
