import { anatomy as zagAnatomy } from "@zag-js/date-input";

// Zag's parts, with the preset's names for what the date input draws: Zag's `control` is the
// field's `container`, its `segmentGroup` the field's `input`, and each `segment` a segment. The
// header, the field's other parts and the actions are drawn only.
export const anatomy = zagAnatomy.extendWith(
    "header",
    "headline",
    "selectedDate",
    "modeToggle",
    "divider",
    "field",
    "container",
    "leadingIcon",
    "prefixText",
    "input",
    "suffixText",
    "trailingIcon",
    "supportingText",
    "actions",
);
export const parts = anatomy.build();
