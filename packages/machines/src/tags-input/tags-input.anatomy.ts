import { createAnatomy } from "@zag-js/anatomy";
import { anatomy as zagAnatomy } from "@zag-js/tags-input";

// Zag's parts, with the preset's names for what it draws: Zag's `control` is the field's
// `container`, and its `clearTrigger` the `trailingIcon` when it clears. `leadingIcon` and
// `supportingText` are drawn only.
export const anatomy = zagAnatomy.extendWith(
    "container",
    "leadingIcon",
    "trailingIcon",
    "supportingText",
);
export const parts = anatomy.build();

// The input chip each value renders: Zag's `itemPreview` (with its `item`) is the chip's
// `root`, `itemText` its `label`, and `itemDeleteTrigger` its `remove`. The avatar, the icon and
// the touch target are drawn only.
export const chipAnatomy = createAnatomy("inputChip").parts(
    "root",
    "avatar",
    "icon",
    "label",
    "remove",
    "touchTarget",
);
