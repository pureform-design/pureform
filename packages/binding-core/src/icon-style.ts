// What `useIconStyle()` returns: an icon slot's size and color as numbers and strings, for icon
// components that take them as props rather than following `1em` and `currentColor`.

/** An icon slot's size in pixels, its color, and whether it draws a filled icon. */
export interface IconStyle {
    /** The slot's icon size in pixels; `undefined` until measured (on the server, and before the
     *  part mounts). */
    readonly size: number | undefined;
    /** The slot's color: a computed color once measured, `currentColor` before. */
    readonly color: string;
    /** Whether the slot asks for a filled icon (Material Symbols' `FILL` axis at 1). */
    readonly filled: boolean;
}

/** What `useIconStyle()` gives outside an icon part, and before the part is measured. */
export const DEFAULT_ICON_STYLE: IconStyle = Object.freeze({
    size: undefined,
    color: "currentColor",
    filled: false,
});

/** Whether two icon styles are the same. */
export const sameIconStyle = (a: IconStyle, b: IconStyle): boolean =>
    a.size === b.size && a.color === b.color && a.filled === b.filled;
