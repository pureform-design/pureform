import { anatomy as zagAnatomy } from "@zag-js/color-picker";

// Zag's parts, and `valueSwatch`: the preview of the value beside the text field, which Zag
// draws with a plain `swatch` (a swatch part can't sit in two places in the preset's structure).
export const anatomy = zagAnatomy.extendWith("valueSwatch");
export const parts = anatomy.build();
