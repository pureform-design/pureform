import { createAnatomy } from "@zag-js/anatomy";

export const anatomy = createAnatomy("text-field").parts(
    "root",
    "container",
    "leadingIcon",
    "label",
    "input",
    "trailingIcon",
    "supportingText",
);
export const parts = anatomy.build();
