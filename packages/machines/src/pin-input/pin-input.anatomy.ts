import { anatomy as zagAnatomy } from "@zag-js/pin-input";

// Zag's parts, with the field's `supportingText` the preset's code field draws below the cells.
// Zag's `control` is the row of cells and each `input` a cell.
export const anatomy = zagAnatomy.extendWith("supportingText");
export const parts = anatomy.build();
