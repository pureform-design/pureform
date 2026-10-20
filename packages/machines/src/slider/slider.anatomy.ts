import { anatomy as zagAnatomy } from "@zag-js/slider";

// Zag's parts, with the preset's names for what it draws: Zag's `range` is the active track, its
// `thumb` the handle, its `draggingIndicator` the value indicator, and each thumb's hidden input
// the `input`. `startTrack` (the inactive track before a range or a centered active track) and
// `stateLayer` are drawn only.
export const anatomy = zagAnatomy.extendWith(
    "activeTrack",
    "startTrack",
    "stateLayer",
    "handle",
    "input",
    "valueIndicator",
);
export const parts = anatomy.build();
