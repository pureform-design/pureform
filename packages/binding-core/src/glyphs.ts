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
    /** A chevron pointing down, which an expand indicator turns over: an accordion's headers
     *  and a tree's branches. */
    expand: "M16.59 8.59 12 13.17 7.41 8.59 6 10l6 6 6-6z",
    /** A minus: a number field's decrement button. */
    remove: "M19 13H5v-2h14v2z",
    /** A plus: a number field's increment button. */
    add: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",
    /** Three dots in a column: a toolbar's overflow button. */
    more: "M12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4m0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4m0 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4",
    /** A chevron pointing toward the start: a calendar's previous button (mirror it under right
     *  to left). */
    chevronStart: "M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z",
    /** A chevron pointing toward the end: a calendar's next button (mirror it under right to
     *  left). */
    chevronEnd: "M8.59 16.59 10 18l6-6-6-6-1.41 1.41L13.17 12z",
    /** A bar and a chevron toward the start: a paginator's first-page button (mirror it under
     *  right to left). */
    firstPage: "M18.41 16.59 13.82 12l4.59-4.59L17 6l-6 6 6 6zM6 6h2v12H6z",
    /** A bar and a chevron toward the end: a paginator's last-page button (mirror it under right
     *  to left). */
    lastPage: "M5.59 7.41 10.18 12l-4.59 4.59L7 18l6-6-6-6zM16 6h2v12h-2z",
    /** A calendar page: the docked date picker's button and the date input's mode toggle. */
    calendar:
        "M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2m0 16H5V10h14zm0-12H5V6h14z",
    /** A pencil: the modal date picker's mode toggle to the date input. */
    edit: "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z",
    /** An arrow pointing up: a table's sort arrow, ascending. */
    arrowUpward: "M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8z",
    /** An arrow pointing down: a table's sort arrow, descending. */
    arrowDownward: "M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8z",
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
