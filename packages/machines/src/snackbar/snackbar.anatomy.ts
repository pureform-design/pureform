import { createAnatomy } from "@zag-js/anatomy";

export const anatomy = createAnatomy("snackbar").parts(
    "root",
    "supportingText",
    "actions",
    "action",
    "close",
);
export const parts = anatomy.build();
