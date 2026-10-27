/** The caret's style: Zag's arrow tip paints `var(--arrow-background)`, so the caret takes the
 *  surface's color (its slot's `color`) through `currentColor`. */
export const CARET_STYLE = { "--arrow-background": "currentColor" } as const;
