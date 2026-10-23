import { anatomy as zagAnatomy } from "@zag-js/splitter";

// Zag's parts as they are: the preset's `root`, `panel` (a pane), `resizeTrigger` (the divider a
// drag or the arrow keys move) and `resizeTriggerIndicator` (Material's drag handle pill on it).
export const anatomy = zagAnatomy;
export const parts = anatomy.build();
