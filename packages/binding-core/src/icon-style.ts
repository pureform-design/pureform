// Portable icon presentation. Bindings choose units, measurement and color inheritance.

/** An icon slot's size, optional color, and whether it draws a filled icon. */
export interface IconStyle {
    /** Size in the binding's logical units; unspecified when unavailable. */
    readonly size: number | undefined;
    /** Unspecified means the platform or icon supplies its own color. */
    readonly color: string | undefined;
    /** Whether the slot asks for a filled icon (Material Symbols' `FILL` axis at 1). */
    readonly filled: boolean;
}

/** Presentation when no icon slot supplies values. */
export const DEFAULT_ICON_STYLE: IconStyle = Object.freeze({
    size: undefined,
    color: undefined,
    filled: false,
});

/** Whether two icon styles are the same. */
export const sameIconStyle = (a: IconStyle, b: IconStyle): boolean =>
    a.size === b.size && a.color === b.color && a.filled === b.filled;
