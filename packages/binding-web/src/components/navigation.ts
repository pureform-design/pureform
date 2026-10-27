import type { NavigationItemOwnProps } from "@pureform/binding-core";

/** What a modal rail's positioner adds to Zag's props: hidden while closed, and fixed along the
 *  start edge of the viewport, the rail's full height. Normalize it with the framework's
 *  `normalizeProps` and merge it after Zag's. */
export const navigationModalPositionerLayout = (open: boolean) => ({
    hidden: !open,
    style: {
        position: "fixed",
        insetBlock: "0",
        insetInlineStart: "0",
        display: "flex",
    } as const,
});
/** What a modal rail's dialog surface adds to Zag's props: hidden while closed, the rail's full
 *  height. */
export const navigationModalContentLayout = (open: boolean) => ({
    hidden: !open,
    style: { display: "flex", height: "100%", outline: "none" } as const,
});
/** The element a destination renders: a link with an `href`, else a button. */
export const navigationItemElement = (item: NavigationItemOwnProps) =>
    item.href === undefined ? ("button" as const) : ("a" as const);
/** A destination's own element props: a button's `type` and `disabled`. A disabled link keeps its
 *  `href`, marked `aria-disabled`, and the machine stops its click. */
export const navigationItemElementProps = (
    item: NavigationItemOwnProps,
    disabled: boolean,
) =>
    item.href === undefined
        ? { type: "button" as const, disabled: disabled || undefined }
        : {};
