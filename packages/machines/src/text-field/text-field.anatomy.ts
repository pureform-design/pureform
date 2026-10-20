import { createAnatomy } from "@zag-js/anatomy";

export const anatomy = createAnatomy("text-field").parts(
    "root",
    "container",
    "leadingIcon",
    "prefixText",
    "label",
    "input",
    "suffixText",
    "trailingIcon",
    "supportingText",
    "counter",
);
export const parts = anatomy.build();
