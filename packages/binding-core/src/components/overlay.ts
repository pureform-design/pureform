// What the menu, tooltip, and dialog share: where an overlay opens, and its positioner, hidden
// while the overlay is closed. Overlays render in place, inside Root, rather than in a portal at
// the end of the page: the provider's theme, direction, and registry reach them as they reach any
// part, and server rendering and hydration see one tree. A container that clips (`overflow:
// hidden`) or stacks above them (a `transform`, a `z-index`) can cut a floating one off;
// `positioning={{ strategy: "fixed" }}` escapes most.

/** Where a floating overlay opens against its trigger. */
export type OverlayPlacement =
    | "top"
    | "top-start"
    | "top-end"
    | "bottom"
    | "bottom-start"
    | "bottom-end"
    | "left"
    | "left-start"
    | "left-end"
    | "right"
    | "right-start"
    | "right-end";

/** Where a menu or tooltip opens: Zag's positioning options that matter here. `start` and `end`
 *  follow the direction. */
export interface OverlayPositioning {
    readonly placement?: OverlayPlacement | undefined;
    /** The gap between the trigger and the overlay, in pixels. */
    readonly gutter?: number | undefined;
    /** The overlay as wide as the trigger. */
    readonly sameWidth?: boolean | undefined;
    /** `fixed` escapes a container that clips. @default "absolute" */
    readonly strategy?: "absolute" | "fixed" | undefined;
    /** Open on the other side when there's no room. @default true */
    readonly flip?: boolean | undefined;
}

/** A positioner's props, hidden while the overlay is closed, so the closed overlay takes no room
 *  in the layout or the page's measurements. */
export const overlayPositionerProps = <P extends object>(
    props: P,
    open: boolean,
): P & { readonly hidden: boolean } => ({ ...props, hidden: !open });
