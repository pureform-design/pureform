// Zag's rating group, re-exported so bindings take every machine from one package. The machine
// is unchanged. Its anatomy has the preset's parts: each item draws the empty `icon`, and the
// `fill` and `halfFill` stars the binding lays over it (drawn only).

import { anatomy as zagAnatomy } from "@zag-js/rating-group";

export * from "@zag-js/rating-group";

export const anatomy = zagAnatomy.extendWith("icon", "fill", "halfFill");
export const parts = anatomy.build();
