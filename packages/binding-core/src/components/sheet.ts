// The sheets' contract, shared by every binding: the bottom sheet's and the side sheet's props,
// how they map onto the selection and Zag's dialog machine, and the layout the preset leaves to
// the app. Both run on the dialog's machine: a modal sheet keeps focus inside, hides the page
// from assistive technology, stops it scrolling, and closes on a click outside; a standard one
// leaves the page usable and closes only from its own controls or Escape. The bindings render
// Root (an unstyled element around the trigger and the sheet), the trigger, a modal sheet's
// backdrop (drawn by the scrim), Zag's positioner (against the sheet's edge), and the sheet's
// surface (`Content`), in place rather than in a portal.

import type {
    bottomSheetOverlayAnatomy,
    PartName,
    sideSheetOverlayAnatomy,
    TestIdOverride,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { ChangeDetails } from "../controllable";
import type { Unstyled } from "../parts";
import type {
    CloseQuestion,
    DialogBehaviorProps,
    OverlayCloseProps,
} from "./dialog";
import { DIALOG_BEHAVIOR_PROPS, dialogMachineProps } from "./dialog";

/** What the sheets' machine takes from Root's props: the dialog's, but for `modal`, which is the
 *  sheets' variant too, and `role`. */
export type SheetBehaviorProps = Omit<DialogBehaviorProps, "modal" | "role">;

/** The bottom sheet's parts: `"root" | "trigger" | "positioner" | "content"` (the surface) `|
 *  "dragHandle" | "body"`, and `"backdrop"`. */
export type BottomSheetPart =
    | PartName<typeof bottomSheetOverlayAnatomy>
    | "backdrop";

/** The side sheet's parts: `"root" | "trigger" | "positioner" | "content"` (the surface) `|
 *  "header" | "backButton" | "headline" | "closeTrigger" | "body" | "actions"`, and
 *  `"backdrop"`. */
export type SideSheetPart =
    | PartName<typeof sideSheetOverlayAnatomy>
    | "backdrop";

/** The bottom sheet's variant groups and instance tokens. */
export interface BottomSheetVariantProps {
    /** Over a scrim, with focus kept inside and the page out of reach while it's open. Without,
     *  a standard sheet: the page stays usable. @default true */
    readonly modal?: boolean | undefined;
    readonly tokens?: InstanceTokens<"bottomSheet"> | undefined;
}

/** The side sheet's variant groups and instance tokens. */
export interface SideSheetVariantProps {
    /** Over a scrim, with focus kept inside and the page out of reach while it's open. Without,
     *  a standard sheet over the page's end edge, which stays usable. @default true */
    readonly modal?: boolean | undefined;
    /** A standard sheet in the page's own layout, squeezing the content next to it rather than
     *  covering it. Ignored on a modal sheet. @default false */
    readonly coplanar?: boolean | undefined;
    readonly tokens?: InstanceTokens<"sideSheet"> | undefined;
}

/** Where a bottom sheet rests while open: fully open, or partly (Compose's `SheetValue`
 *  `Expanded` and `PartiallyExpanded`). */
export type SheetRest = "expanded" | "partial";

/** How far down, as a share of the sheet's height (below where it rests partly open, if it
 *  can), a drag closes it. */
export const SHEET_DISMISS_SHARE = 0.25;
/** How fast, in pixels per millisecond, a flick moves the sheet on to the next place it rests
 *  (or away) however short. */
export const SHEET_FLICK_SPEED = 0.5;
/** How much of the screen's height a sheet resting partly open shows, as Compose's
 *  `PartiallyExpanded` anchor (half the layout's height). */
export const SHEET_PARTIAL_SHARE = 0.5;

/** How far down a sheet `height` tall rests partly open on a screen `container` tall: where its
 *  top is at half the screen. 0 when it's no taller than that, so it rests fully open. */
export const sheetPartialOffset = (height: number, container: number) =>
    Math.max(0, Math.round(height - container * SHEET_PARTIAL_SHARE));

/** Where a dragged bottom sheet goes once let go `offset` pixels down from fully open at
 *  `velocity` (pixels per millisecond, down), given its `height` and, if it can rest partly
 *  open, that `partial` offset. A flick goes on to the next place in its direction; otherwise it
 *  closes past a quarter of the way from partly (or fully) open to gone, and goes to the nearer
 *  of fully and partly open. */
export const sheetRelease = (release: {
    readonly offset: number;
    readonly velocity: number;
    readonly height: number;
    readonly partial?: number | undefined;
}): SheetRest | "closed" => {
    const { offset, velocity, height } = release;
    const partial =
        release.partial !== undefined && release.partial > 0
            ? release.partial
            : undefined;
    if (velocity > SHEET_FLICK_SPEED)
        return partial !== undefined && offset < partial ? "partial" : "closed";
    if (velocity < -SHEET_FLICK_SPEED)
        return partial !== undefined && offset > partial
            ? "partial"
            : "expanded";
    const lowest = partial ?? 0;
    if (height > 0 && offset > lowest + (height - lowest) * SHEET_DISMISS_SHARE)
        return "closed";
    if (partial === undefined) return "expanded";
    return offset > partial / 2 ? "partial" : "expanded";
};

/** The drag handle's name when the app gives none, for what a press does: on a sheet that can
 *  move between partly and fully open, it expands or collapses it; otherwise it closes it. */
export const sheetDragHandleLabel = (rest: SheetRest, movable: boolean) =>
    !movable
        ? "Close sheet"
        : rest === "partial"
          ? "Expand sheet"
          : "Collapse sheet";

/** Asks an overlay's `onClose` and acts on the answer, `yes` or `no`, once it comes. */
export interface CloseAsker {
    /** Asks `onClose` (without one, the answer is yes). A boolean answers at once; a promise
     *  when it settles, a rejection meaning no. An answer after a later question, or after
     *  `cancel`, is ignored. */
    ask(
        onClose: CloseQuestion | undefined,
        yes: () => void,
        no: () => void,
    ): void;
    /** Ignores the answer to any question still open: another drag started, or the overlay
     *  went away. */
    cancel(): void;
}

/** A `CloseAsker`, one per overlay, shared by every way it closes. */
export const closeAsker = (): CloseAsker => {
    // Counts the questions, so an answer to an older one is moot.
    let asking = 0;
    return {
        ask(onClose, yes, no) {
            const asked = ++asking;
            let answer: boolean | Promise<boolean>;
            try {
                answer = onClose?.() ?? true;
            } catch (error) {
                no();
                throw error;
            }
            if (typeof answer === "boolean") {
                if (answer) yes();
                else no();
                return;
            }
            answer.then(
                (closes) => {
                    if (asked !== asking) return;
                    if (closes) yes();
                    else no();
                },
                () => {
                    if (asked === asking) no();
                },
            );
        },
        cancel() {
            asking++;
        },
    };
};

/** What Zag's dialog props add so Escape and a press outside ask `onClose` first: each stops
 *  Zag's own close (only where Zag would close: `closeOnEscape`, and `closeOnInteractOutside`,
 *  which defaults to `modal`) and asks, and `close` closes on a yes. Without `onClose`,
 *  nothing. */
export const askingDismissProps = (
    onClose: CloseQuestion | undefined,
    props: Pick<
        DialogBehaviorProps,
        "closeOnEscape" | "closeOnInteractOutside"
    > & { readonly modal?: boolean | undefined },
    asker: CloseAsker,
    close: () => void,
) => {
    if (!onClose) return {};
    const ask = (event: { preventDefault(): void }) => {
        event.preventDefault();
        asker.ask(onClose, close, () => {});
    };
    return {
        onEscapeKeyDown: (event: { preventDefault(): void }) => {
            if (props.closeOnEscape !== false) ask(event);
        },
        onInteractOutside: (event: { preventDefault(): void }) => {
            if (props.closeOnInteractOutside ?? props.modal !== false)
                ask(event);
        },
    };
};

/** Everything the bottom sheet's Root takes for itself, besides the element's own props and
 *  `as`. */
export interface BottomSheetRootOwnProps
    extends
        BottomSheetVariantProps,
        SheetBehaviorProps,
        OverlayCloseProps,
        BottomSheetRestProps {
    /** A prefix for every part's test id (`share` → `share-trigger`, `share-content`), or ids by
     *  part. */
    readonly testId?: TestIdOverride<BottomSheetPart> | undefined;
    /** Every part, or some, without the registry's styles. */
    readonly unstyled?: Unstyled<BottomSheetPart> | undefined;
}

/** Everything the side sheet's Root takes for itself, besides the element's own props and
 *  `as`. */
export interface SideSheetRootOwnProps
    extends SideSheetVariantProps, SheetBehaviorProps, OverlayCloseProps {
    /** A prefix for every part's test id (`filters` → `filters-trigger`, `filters-content`), or
     *  ids by part. */
    readonly testId?: TestIdOverride<SideSheetPart> | undefined;
    /** Every part, or some, without the registry's styles. */
    readonly unstyled?: Unstyled<SideSheetPart> | undefined;
}

/** Whether a bottom sheet can rest partly open, and what hears where it rests. */
export interface BottomSheetRestProps {
    /** Whether it can rest partly open, as Compose's sheet without `skipPartiallyExpanded`: a
     *  sheet taller than half the screen opens with its top at half the screen, and a drag (or a
     *  press on the drag handle) moves it between partly and fully open; a drag down from partly
     *  open closes it. Content scrolls natively either way. @default false */
    readonly partiallyExpandable?: boolean | undefined;
    /** Called when it comes to rest partly open (`expanded: false`) or fully open (`true`). */
    readonly onExpandedChange?:
        | ((details: ChangeDetails<"expanded", boolean>) => void)
        | undefined;
}

/** The keys of `BottomSheetRestProps`. */
export const BOTTOM_SHEET_REST_PROPS = [
    "partiallyExpandable",
    "onExpandedChange",
] as const satisfies readonly (keyof BottomSheetRestProps)[];

/** The keys of `BottomSheetRootOwnProps`, which Root keeps off its element. */
export const BOTTOM_SHEET_ROOT_PROPS = [
    "modal",
    "tokens",
    "onClose",
    ...BOTTOM_SHEET_REST_PROPS,
    ...DIALOG_BEHAVIOR_PROPS,
] as const satisfies readonly (keyof BottomSheetRootOwnProps)[];

/** The keys of `SideSheetRootOwnProps`, which Root keeps off its element. */
export const SIDE_SHEET_ROOT_PROPS = [
    "modal",
    "coplanar",
    "tokens",
    "onClose",
    ...DIALOG_BEHAVIOR_PROPS,
] as const satisfies readonly (keyof SideSheetRootOwnProps)[];

/** What the ready-made bottom sheet renders inside Root, in the framework's node type. */
export interface BottomSheetContentProps<Node> {
    /** The trigger's label: the ready-made sheet renders its trigger as a button only when
     *  given. */
    readonly trigger?: Node;
    /** Whether it shows the drag handle at its top edge. @default true */
    readonly dragHandle?: boolean | undefined;
    /** The drag handle's accessible name. @default for what a press does: "Close sheet", or on a
     *  sheet moving between partly and fully open, "Expand sheet" or "Collapse sheet" */
    readonly dragHandleLabel?: string | undefined;
    /** The content. */
    readonly body?: Node;
}

/** The keys of `BottomSheetContentProps`. */
export const BOTTOM_SHEET_CONTENT_PROPS = [
    "trigger",
    "dragHandle",
    "dragHandleLabel",
    "body",
] as const satisfies readonly (keyof BottomSheetContentProps<unknown>)[];

/** What the ready-made side sheet renders inside Root, in the framework's node type. */
export interface SideSheetContentProps<Node> {
    /** The trigger's label: the ready-made sheet renders its trigger as a button only when
     *  given. */
    readonly trigger?: Node;
    /** The title, which names the sheet. */
    readonly headline?: Node;
    /** Called by the back button, which shows only when this is given. */
    readonly onBack?: (() => void) | undefined;
    /** The back button's accessible name. @default "Back" */
    readonly backLabel?: string | undefined;
    /** The back button's icon. @default an arrow toward the start */
    readonly backIcon?: Node;
    /** The close button's accessible name; it's an icon button, always rendered.
     *  @default "Close" */
    readonly closeLabel?: string | undefined;
    /** The close button's icon. @default a cross */
    readonly closeIcon?: Node;
    /** The content, which describes the sheet. */
    readonly body?: Node;
    /** The buttons under the content, the main one first. The row shows only when given. */
    readonly actions?: Node;
}

/** The keys of `SideSheetContentProps`. */
export const SIDE_SHEET_CONTENT_PROPS = [
    "trigger",
    "headline",
    "onBack",
    "backLabel",
    "backIcon",
    "closeLabel",
    "closeIcon",
    "body",
    "actions",
] as const satisfies readonly (keyof SideSheetContentProps<unknown>)[];

/** Whether a sheet is modal: unless `modal` is `false`. */
export const sheetModal = (props: { readonly modal?: boolean | undefined }) =>
    props.modal !== false;

/** The bottom sheet's registry selection from Root's props. */
export const bottomSheetSelection = (
    props: BottomSheetVariantProps,
): Selection<"bottomSheet"> => ({
    modal: sheetModal(props),
    tokens: props.tokens,
});

/** The side sheet's registry selection from Root's props: a modal sheet isn't coplanar. */
export const sideSheetSelection = (
    props: SideSheetVariantProps,
): Selection<"sideSheet"> => ({
    modal: sheetModal(props),
    coplanar: sheetModal(props) ? false : props.coplanar === true,
    tokens: props.tokens,
});

/** Zag's dialog props from a sheet Root's, besides `id`, `dir`, and the controllable `open`. A
 *  standard sheet isn't modal and a click outside doesn't close it. */
export const sheetMachineProps = (
    props: SheetBehaviorProps & { readonly modal?: boolean | undefined },
) => {
    const modal = sheetModal(props);
    // Read through `props` rather than spread it: a binding's props can be getters (Solid's
    // children), which a spread would run.
    return {
        ...dialogMachineProps(props),
        modal,
        role: "dialog" as const,
        closeOnInteractOutside: props.closeOnInteractOutside ?? modal,
    };
};

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

/** What a bottom sheet's drag handle adds to Zag's props: touch moves on it drag the sheet rather
 *  than scroll the page. It's rendered on the server too, so hydration changes nothing. */
export const sheetDragHandleLayout = {
    style: { touchAction: "none" } as const,
};
