import { anatomy as zagAnatomy } from "@zag-js/accordion";

// Zag's parts, with the preset's: each item's header (`trigger`, Zag's `itemTrigger`) is a list
// row holding a `leading` icon, its `text` (a `title` over a `description`) and the expand
// `indicator`; the panel under it is `content` (Zag's `itemContent`).
export const anatomy = zagAnatomy.extendWith(
    "trigger",
    "leading",
    "text",
    "title",
    "description",
    "indicator",
    "content",
);
export const parts = anatomy.build();
