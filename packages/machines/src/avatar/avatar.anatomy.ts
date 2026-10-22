import { anatomy as zagAnatomy } from "@zag-js/avatar";

// Zag's parts as they are: the preset's `root`, `image` (the picture, shown once it has loaded)
// and `fallback` (initials or an icon, shown until then and when the picture fails).
export const anatomy = zagAnatomy;
export const parts = anatomy.build();
