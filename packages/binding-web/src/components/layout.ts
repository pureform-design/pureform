import type { CloseQuestion } from "@pureform/binding-core";
import type {
    SharedAxisDirection,
    TransitionPage,
} from "@pureform/binding-core";

/** What the positioner adds to Zag's props: hidden once the dialog is gone (closed, and its exit
 *  animation over), and fixed over the viewport, which the dialog fills. Normalize it with the
 *  framework's `normalizeProps` and merge it after Zag's. Once it shows, `stackPositioner` (from
 *  `/dom`) stacks it at the surface's layer, in the next frame. */
export const fullscreenDialogPositionerLayout = (present: boolean) => ({
    hidden: !present,
    style: {
        position: "fixed",
        inset: "0",
        display: "flex",
        alignItems: "stretch",
        boxSizing: "border-box",
    } as const,
});
/** A part's props, hidden once the overlay is gone (`present`, from `overlayPresent`), so the
 *  closed overlay takes no room in the layout or the page's measurements. Zag hides its parts the
 *  moment the overlay closes; this keeps them while the exit animation runs. */
export const presentProps = <P extends object>(
    props: P,
    present: boolean,
): P & { readonly hidden: boolean } => ({ ...props, hidden: !present });
/** A positioner's props, hidden once the overlay is gone. */
export const overlayPositionerProps = presentProps;
/** The attributes a leaving page takes: out of reach and hidden from assistive technology. */
export const LEAVING_PAGE_PROPS = {
    inert: true,
    "aria-hidden": "true",
} as const;
/** A page's attributes: its state and direction for the styles, and a leaving page inert and
 *  hidden from assistive technology. */
export const sharedAxisPageProps = (
    page: TransitionPage,
): Record<string, string | boolean | undefined> => ({
    "data-state": page.state,
    "data-direction": page.direction,
    ...(page.state === "leaving" ? LEAVING_PAGE_PROPS : {}),
});
/** The scrim's attributes while a change runs: its direction, hidden from assistive technology. */
export const sharedAxisScrimProps = (
    direction: SharedAxisDirection,
): Record<string, string> => ({
    "data-direction": direction,
    "aria-hidden": "true",
});
/** A page's attributes: entering `data-state="open"`, leaving `"closed"` (and out of reach,
 *  hidden from assistive technology); the page shown first has none, so it doesn't animate. A
 *  fade through doesn't settle its entering pages, so an entered page keeps `"open"`. */
export const fadeThroughPageProps = (
    page: TransitionPage,
): Readonly<Record<string, string | boolean>> =>
    page.state === "leaving"
        ? { "data-state": "closed", ...LEAVING_PAGE_PROPS }
        : page.state === "entering"
          ? { "data-state": "open" }
          : {};

/** A close trigger's props: Zag's `close` props as they are, or, with an `onClose`, its click
 *  replaced by `requestClose`, which asks first (a dialog's close trigger, a bottom sheet's drag
 *  handle). */
export const closeTriggerProps = <P extends object>(
    close: P,
    onClose: CloseQuestion | undefined,
    requestClose: () => void,
): P => (onClose ? { ...close, onClick: requestClose } : close);
/** What the positioner adds to Zag's props: hidden once the dialog is gone (closed, and its exit
 *  animation over), and fixed over the viewport, centering the dialog. Normalize it with the
 *  framework's `normalizeProps` and merge it after Zag's. Once it shows, `stackPositioner` (from
 *  `/dom`) stacks it at the surface's layer, in the next frame. */
export const dialogPositionerLayout = (present: boolean) => ({
    hidden: !present,
    style: {
        position: "fixed",
        inset: "0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
        padding: "24px",
    } as const,
});
/** What the backdrop adds to Zag's props: hidden once the dialog is gone, and the scrim covering
 *  the viewport rather than its container. Normalize it and merge it after Zag's. */
export const dialogBackdropLayout = (present: boolean) => ({
    hidden: !present,
    style: { position: "fixed" } as const,
});
const fixed = { position: "fixed", boxSizing: "border-box" } as const;
/** What the bottom sheet's positioner adds to Zag's props: hidden once the sheet is gone (closed,
 *  and its exit animation over), and fixed to the bottom of the viewport. A modal sheet's covers
 *  the viewport, leaving room at the top; a standard one's lets presses beside the sheet through
 *  (`sheetContentLayout` takes them back on the sheet). Normalize it with the framework's
 *  `normalizeProps` and merge it after Zag's. Once it shows, `stackPositioner` (from `/dom`)
 *  stacks it at the surface's layer. */
export const bottomSheetPositionerLayout = (
    present: boolean,
    modal: boolean,
) => ({
    hidden: !present,
    style: modal
        ? ({
              ...fixed,
              inset: "0",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              paddingTop: "72px",
          } as const)
        : ({
              ...fixed,
              insetInline: "0",
              bottom: "0",
              display: "flex",
              flexDirection: "column",
              maxHeight: "100%",
              pointerEvents: "none",
          } as const),
});
/** What the side sheet's positioner adds to Zag's props: hidden once the sheet is gone, and the
 *  sheet against the end edge. A modal sheet's covers the viewport; a standard one's is as wide
 *  as the sheet, fixed to the end edge; a coplanar one's stays in the page's layout, stretched to
 *  the height of the row it's in. */
export const sideSheetPositionerLayout = (
    present: boolean,
    modal: boolean,
    coplanar: boolean,
) => ({
    hidden: !present,
    style: modal
        ? ({
              ...fixed,
              inset: "0",
              display: "flex",
              flexDirection: "row",
              justifyContent: "flex-end",
              alignItems: "stretch",
          } as const)
        : coplanar
          ? ({
                display: "flex",
                alignSelf: "stretch",
                boxSizing: "border-box",
            } as const)
          : ({
                ...fixed,
                insetBlock: "0",
                insetInlineEnd: "0",
                display: "flex",
                maxWidth: "100%",
            } as const),
});
/** What a sheet's surface adds to Zag's props: presses on it count, inside a standard bottom
 *  sheet's positioner that lets them through. */
export const sheetContentLayout = { style: { pointerEvents: "auto" } as const };
/** What a side sheet's surface adds to Zag's props: `sheetContentLayout`'s, and sideways touch
 *  moves on it drag the sheet (`sideSheetDragToDismiss`) while up and down still scroll natively.
 *  It's rendered on the server too, so hydration changes nothing. */
export const sideSheetContentLayout = {
    style: { pointerEvents: "auto", touchAction: "pan-y" } as const,
};
/** What a side sheet's body adds to Zag's props. The body scrolls, and a scroll container
 *  doesn't take its touch actions from the sheet around it: without its own `pan-y`, the
 *  browser takes a sideways touch on it and the sheet only drags by its header. */
export const sideSheetBodyLayout = { style: { touchAction: "pan-y" } as const };
/** What a bottom sheet's drag handle adds to Zag's props: touch moves on it drag the sheet rather
 *  than scroll the page. It's rendered on the server too, so hydration changes nothing. */
export const sheetDragHandleLayout = {
    style: { touchAction: "none" } as const,
};
