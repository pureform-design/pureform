import { createAnatomy } from "@zag-js/anatomy";

export const anatomy = createAnatomy("button").parts(
    "root",
    "label",
    "icon",
    "touchTarget",
);
export const parts = anatomy.build();
