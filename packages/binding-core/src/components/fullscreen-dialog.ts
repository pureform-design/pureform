// The full-screen dialog's contract, shared by every binding. It runs on the same Zag dialog
// machine as the basic dialog, so Root takes the basic dialog's behavior props; what differs is
// the content (a header with a close trigger, headline, and confirm action over a body, and no
// icon or actions row), and the layout: the positioner fills the viewport rather than centering a
// card, and there's no backdrop, since nothing shows behind it. The bindings render Root (an
// unstyled element around the trigger and the dialog), the trigger, Zag's positioner, and the
// dialog's surface (`Content`), in place rather than in a portal.

import type {
    fullscreenDialogOverlayAnatomy,
    PartName,
    TestIdOverride,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Unstyled } from "../parts";
import type { DialogBehaviorProps } from "./dialog";

/** The full-screen dialog's parts: `"root" | "trigger" | "positioner" | "content"` (the surface)
 *  `| "header" | "closeTrigger" | "headline" | "confirmAction" | "body"`. */
export type FullscreenDialogPart = PartName<
    typeof fullscreenDialogOverlayAnatomy
>;

/** The full-screen dialog's instance tokens; it has no variant groups. */
export interface FullscreenDialogVariantProps {
    readonly tokens?: InstanceTokens<"fullscreenDialog"> | undefined;
}

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface FullscreenDialogRootOwnProps
    extends FullscreenDialogVariantProps, DialogBehaviorProps {
    /** A prefix for every part's test id (`event` → `event-trigger`, `event-content`), or ids by
     *  part. */
    readonly testId?: TestIdOverride<FullscreenDialogPart> | undefined;
    /** Every part, or some, without the registry's styles. */
    readonly unstyled?: Unstyled<FullscreenDialogPart> | undefined;
}

/** The keys of `FullscreenDialogRootOwnProps`, which Root keeps off its element. */
export const FULLSCREEN_DIALOG_ROOT_PROPS = [
    "tokens",
    "modal",
    "role",
    "closeOnInteractOutside",
    "closeOnEscape",
    "restoreFocus",
    "initialFocusEl",
    "finalFocusEl",
    "aria-label",
    "ids",
    "open",
    "defaultOpen",
    "onOpenChange",
    "testId",
    "unstyled",
] as const satisfies readonly (keyof FullscreenDialogRootOwnProps)[];

/** What the ready-made full-screen dialog renders inside Root, in the framework's node type. */
export interface FullscreenDialogContentProps<Node> {
    /** The trigger's label: the ready-made dialog renders its trigger as a button only when
     *  given. */
    readonly trigger?: Node;
    /** The close trigger's accessible name; it's an icon button, always rendered.
     *  @default "Close" */
    readonly closeLabel?: string | undefined;
    /** The close trigger's icon. @default a cross */
    readonly closeIcon?: Node;
    /** The title, which names the dialog. */
    readonly headline?: Node;
    /** The confirming action at the end of the header: a text button. */
    readonly confirmAction?: Node;
    /** The content, which describes the dialog. */
    readonly body?: Node;
}

/** The keys of `FullscreenDialogContentProps`. */
export const FULLSCREEN_DIALOG_CONTENT_PROPS = [
    "trigger",
    "closeLabel",
    "closeIcon",
    "headline",
    "confirmAction",
    "body",
] as const satisfies readonly (keyof FullscreenDialogContentProps<unknown>)[];

/** The full-screen dialog's registry selection from Root's props. */
export const fullscreenDialogSelection = (
    props: FullscreenDialogVariantProps,
): Selection<"fullscreenDialog"> => ({ tokens: props.tokens });

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
