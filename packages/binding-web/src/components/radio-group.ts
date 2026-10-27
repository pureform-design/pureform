/** Zag's root props for the group element: without `aria-labelledby`, which names a label part
 *  the preset doesn't have (name the group with `aria-label` or your own `aria-labelledby`), and
 *  without the inline `position`, which only places Zag's indicator. */
export const radioGroupRootProps = <P extends object>(
    props: P,
): Omit<P, "style" | "aria-labelledby"> => {
    const {
        style: _style,
        "aria-labelledby": _labelledBy,
        ...rest
    } = props as P & { style?: unknown; "aria-labelledby"?: unknown };
    return rest;
};
/** Zag's item props for a radio's root: without `data-ssr`, which Zag drops once it starts, so the
 *  server's markup and the hydrated page would disagree. */
export const radioItemProps = <P extends object>(
    props: P,
): Omit<P, "data-ssr"> => {
    const { "data-ssr": _ssr, ...rest } = props as P & { "data-ssr"?: unknown };
    return rest;
};
/** Zag's hidden-input props for a radio's `input` part: without the visually hidden `style` (the
 *  slot's own replaces it), `aria-labelledby` (no label part), and `data-ssr`. `aria-readonly`
 *  isn't valid on a radio, so a read-only group marks its group element instead (Zag does). */
export const radioInputProps = <P extends object>(
    props: P,
): Omit<P, "style" | "aria-labelledby" | "data-ssr"> => {
    const {
        style: _style,
        "aria-labelledby": _labelledBy,
        "data-ssr": _ssr,
        ...rest
    } = props as P & {
        style?: unknown;
        "aria-labelledby"?: unknown;
        "data-ssr"?: unknown;
    };
    return rest;
};
/** Zag's control props for a radio's `ring`: without `data-ssr`. */
export const radioRingProps = radioItemProps;
