import { anatomy as zagAnatomy } from "@zag-js/number-input";

// Zag's parts, with the text field's the preset draws around them: the `container` holding the
// input and the label (Zag has none), the optional `leadingIcon`, `prefixText` and `suffixText`,
// and the `supportingText`. Zag's `control` is the group holding `decrementTrigger` and
// `incrementTrigger`. Its `valueText` and `scrubber` aren't drawn.
export const anatomy = zagAnatomy.extendWith(
    "container",
    "leadingIcon",
    "prefixText",
    "suffixText",
    "supportingText",
);
export const parts = anatomy.build();
