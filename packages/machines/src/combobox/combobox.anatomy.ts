import { createAnatomy } from "@zag-js/anatomy";
import { anatomy as zagAnatomy } from "@zag-js/combobox";

// Zag's parts, with the preset's names for what the autocomplete draws: Zag's `control` is the
// field's `container`, and its `trigger` the arrow (`trailingIcon`). The rest of the field is
// drawn only.
export const anatomy = zagAnatomy.extendWith(
    "container",
    "leadingIcon",
    "prefixText",
    "suffixText",
    "trailingIcon",
    "supportingText",
);
export const parts = anatomy.build();

// The search view: Zag's dialog around Zag's combobox. The dialog's content is the view's
// `root`, and the combobox's input its `input` and its list its `content`; the header, the
// leading and trailing icons, and the divider are drawn only. The external trigger has its own
// sizing slot, even though the dialog machine handles its behavior.
export const searchViewAnatomy = createAnatomy("searchView").parts(
    "root",
    "trigger",
    "header",
    "leading",
    "input",
    "trailing",
    "divider",
    "content",
);
