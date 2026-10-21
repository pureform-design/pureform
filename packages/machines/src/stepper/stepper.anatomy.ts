import { anatomy as zagAnatomy } from "@zag-js/steps";

// Zag's parts, with the preset's: a step header's `label` and `caption` (its optional text).
export const anatomy = zagAnatomy.extendWith("label", "caption");
export const parts = anatomy.build();
