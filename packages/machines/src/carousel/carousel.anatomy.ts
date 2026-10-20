import { anatomy as zagAnatomy } from "@zag-js/carousel";

// Zag's parts, with the preset's: each item (Zag's `item`, its place in the row) holds a `mask`,
// the rounded and clipped item people see, around its `content`.
export const anatomy = zagAnatomy.extendWith("mask", "content");
export const parts = anatomy.build();
