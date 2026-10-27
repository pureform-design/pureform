import { TOASTER_DEFAULTS as DEFAULTS } from "@pureform/binding-core";
import type { ToasterOptions as PortableToasterOptions } from "@pureform/binding-core";

export interface ToasterOptions extends Omit<
    PortableToasterOptions,
    "offsets"
> {
    /** CSS inset from the screen edges. */
    readonly offsets?: string | undefined;
}
export const TOASTER_DEFAULTS = { ...DEFAULTS, offsets: "16px" } as const;
export const toasterOptions = (options: ToasterOptions = {}) => ({
    ...TOASTER_DEFAULTS,
    ...Object.fromEntries(
        Object.entries(options).filter(([, value]) => value !== undefined),
    ),
});

/** How a toast's root moves as Zag stacks it: Zag sets `--x`, `--y`, `--scale`, `--opacity` and
 *  `--height` on it (and `--z-index`, which each binding applies under its own spelling); the
 *  preset's transition animates the change. */
export const TOAST_STACK_STYLE = {
    transform: "translate(var(--x, 0), var(--y, 0)) scale(var(--scale, 1))",
    opacity: "var(--opacity, 1)",
    height: "var(--height, auto)",
} as const;

/** The group's placement style from Zag, made physical and left to the theme's layer. Zag has
 *  already turned the placement's `start` and `end` into left and right by the direction, but
 *  writes them as `insetInlineStart` (left) and `insetInlineEnd` (right), which the region's own
 *  `dir` would flip back; and it stacks the region at the highest `zIndex`, over the theme's
 *  layers. */
export const toastGroupStyle = <S extends object>(style: S | undefined): S => {
    const {
        insetInlineStart,
        insetInlineEnd,
        "inset-inline-start": kebabStart,
        "inset-inline-end": kebabEnd,
        zIndex: _zIndex,
        "z-index": _kebabZIndex,
        ...rest
    } = (style ?? {}) as Record<string, unknown>;
    const left = insetInlineStart ?? kebabStart;
    const right = insetInlineEnd ?? kebabEnd;
    return {
        ...rest,
        ...(left === undefined ? {} : { left }),
        ...(right === undefined ? {} : { right }),
    } as S;
};
