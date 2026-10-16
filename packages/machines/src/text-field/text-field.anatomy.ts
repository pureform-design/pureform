import { createAnatomy } from "@zag-js/anatomy";

export const anatomy = createAnatomy("text-field").parts(
    "root",
    "label",
    "input",
    "supportingText",
);
export const parts = anatomy.build();
