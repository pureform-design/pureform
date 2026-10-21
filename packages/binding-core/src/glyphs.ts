// The paths of the glyphs the web bindings' ready-made parts show unless given another icon:
// 24px outlines, like Material Symbols, filled with the current color.

import type { ToastType } from "./components/toast";

/** Each glyph's path in a 24 by 24 view box. */
export const GLYPH_PATHS = {
    /** The cross of a close or remove button. */
    close: "M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
    /** The arrow of a back button, pointing toward the start (mirror it under right to left). */
    back: "M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z",
    /** Material's drop-down arrow: a select's, an autocomplete's, a split button's. */
    dropDown: "M7 10l5 5 5-5z",
    /** Three dots in a column: a toolbar's overflow button. */
    more: "M12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4m0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4m0 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4",
} as const;

/** Each toast type's icon: a check, a warning triangle, an error or info disc, or a partial ring
 *  while loading. */
export const TOAST_GLYPH_PATHS: Readonly<Record<ToastType, string>> = {
    success: "M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
    warning: "M1 21h22L12 2zm12-3h-2v-2h2zm0-4h-2v-4h2z",
    error: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20m1 15h-2v-2h2zm0-4h-2V7h2z",
    info: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20m1 15h-2v-6h2zm0-8h-2V7h2z",
    loading: "M12 4a8 8 0 1 0 8 8h-2a6 6 0 1 1-6-6z",
};
