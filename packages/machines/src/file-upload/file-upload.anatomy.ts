import { anatomy as zagAnatomy } from "@zag-js/file-upload";

// Zag's parts, with the preset's names for what it draws: Zag's `itemGroup` is the file list, and
// each file's `item` carries Zag's name, size, preview and delete parts on the list item that the
// ready-made component renders. `icon`, `headline`, `supportingText` and `error` are drawn only.
export const anatomy = zagAnatomy.extendWith(
    "icon",
    "headline",
    "supportingText",
    "error",
);
export const parts = anatomy.build();
