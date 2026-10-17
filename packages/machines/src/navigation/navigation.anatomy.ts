import { createAnatomy } from "@zag-js/anatomy";

export const anatomy = createAnatomy("navigation").parts(
    "root",
    "item",
    "icon",
    "label",
);
export const parts = anatomy.build();
