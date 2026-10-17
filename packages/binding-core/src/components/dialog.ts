// The dialog's contract, shared by every binding: the props Root takes for itself, how they map
// onto the selection and Zag's dialog machine, and the layout the preset leaves to the app. The
// bindings render Root (an unstyled element around the trigger and the dialog), the trigger, the
// backdrop (drawn by the scrim), Zag's positioner, and the dialog's surface (`Content`), in place
// rather than in a portal: fixed to the viewport, with Zag hiding the rest of the page from
// assistive technology and trapping focus while it's open.

import type {
    dialogOverlayAnatomy,
    PartName,
    TestIdOverride,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Controllable } from "../controllable";
import type { Unstyled } from "../parts";

/** The dialog's parts: `"root" | "trigger" | "positioner" | "content"` (the surface) `| "icon" |
 *  "headline" | "body" | "actions" | "closeTrigger"`, and `"backdrop"`. */
export type DialogPart = PartName<typeof dialogOverlayAnatomy> | "backdrop";

/** The dialog's variant groups and instance tokens. `icon` centers the icon and headline; the
 *  ready-made dialog sets it when it renders an icon. */
export interface DialogVariantProps {
    readonly icon?: boolean | undefined;
    readonly tokens?: InstanceTokens<"dialog"> | undefined;
}

/** The ids of the dialog's elements, for composition. */
export interface DialogElementIds {
    readonly trigger?: string | undefined;
    readonly backdrop?: string | undefined;
    readonly positioner?: string | undefined;
    readonly content?: string | undefined;
    /** The headline, which names the dialog. */
    readonly headline?: string | undefined;
    /** The body, which describes it. */
    readonly body?: string | undefined;
    readonly closeTrigger?: string | undefined;
}

/** What the dialog machine takes from Root's props. `open` is the dialog's. */
export interface DialogBehaviorProps extends Controllable<"open", boolean> {
    /** Whether the rest of the page is out of reach while it's open: focus stays inside, the page
     *  doesn't scroll, and assistive technology reads only the dialog. @default true */
    readonly modal?: boolean | undefined;
    /** `alertdialog` for one that interrupts with an urgent question; a click outside doesn't
     *  close it. @default "dialog" */
    readonly role?: "dialog" | "alertdialog" | undefined;
    /** Whether a click outside closes it. @default true for a modal dialog */
    readonly closeOnInteractOutside?: boolean | undefined;
    /** @default true */
    readonly closeOnEscape?: boolean | undefined;
    /** Whether focus goes back to the trigger once it closes. @default true */
    readonly restoreFocus?: boolean | undefined;
    /** The element that takes focus when it opens: a function, so it's read then. @default the
     *  first focusable element inside, else the dialog */
    readonly initialFocusEl?: (() => HTMLElement | null) | undefined;
    /** The element that takes focus once it closes. @default the trigger */
    readonly finalFocusEl?: (() => HTMLElement | null) | undefined;
    /** The dialog's name, when it has no headline. */
    readonly "aria-label"?: string | undefined;
    readonly ids?: DialogElementIds | undefined;
}

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface DialogRootOwnProps
    extends DialogVariantProps, DialogBehaviorProps {
    /** A prefix for every part's test id (`discard` → `discard-trigger`, `discard-content`), or
     *  ids by part. */
    readonly testId?: TestIdOverride<DialogPart> | undefined;
    /** Every part, or some, without the registry's styles. */
    readonly unstyled?: Unstyled<DialogPart> | undefined;
}

/** The keys of `DialogRootOwnProps`, which Root keeps off its element. */
export const DIALOG_ROOT_PROPS = [
    "icon",
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
] as const satisfies readonly (keyof DialogRootOwnProps)[];

/** What the ready-made dialog renders inside Root, in the framework's node type. */
export interface DialogContentProps<Node> {
    /** The trigger's label: the ready-made dialog renders its trigger as a button only when
     *  given. */
    readonly trigger?: Node;
    /** An icon above the headline; renders only when given, centering the headline. */
    readonly icon?: Node;
    /** Flip the icon under `rtl`, for an icon that points. */
    readonly mirrorIcon?: boolean | undefined;
    /** The title, which names the dialog. */
    readonly headline?: Node;
    /** The message, which describes it. */
    readonly body?: Node;
    /** The buttons at the end: text buttons, the confirming one last. */
    readonly actions?: Node;
}

/** The keys of `DialogContentProps`, but for `icon`, which Root takes as a variant too. */
export const DIALOG_CONTENT_PROPS = [
    "trigger",
    "mirrorIcon",
    "headline",
    "body",
    "actions",
] as const satisfies readonly (keyof DialogContentProps<unknown>)[];

/** The dialog's registry selection from Root's props. */
export const dialogSelection = (
    props: DialogVariantProps,
): Selection<"dialog"> => ({
    icon: props.icon,
    tokens: props.tokens,
});

/** Zag's dialog props from Root's, besides `id`, `dir`, and the controllable `open`. */
export const dialogMachineProps = (props: DialogBehaviorProps) => ({
    modal: props.modal,
    role: props.role,
    closeOnInteractOutside: props.closeOnInteractOutside,
    closeOnEscape: props.closeOnEscape,
    restoreFocus: props.restoreFocus,
    initialFocusEl: props.initialFocusEl,
    finalFocusEl: props.finalFocusEl,
    "aria-label": props["aria-label"],
    ids: {
        trigger: props.ids?.trigger,
        backdrop: props.ids?.backdrop,
        positioner: props.ids?.positioner,
        content: props.ids?.content,
        title: props.ids?.headline,
        description: props.ids?.body,
        closeTrigger: props.ids?.closeTrigger,
    },
});

/** What the positioner adds to Zag's props: hidden while closed, and fixed over the viewport,
 *  centering the dialog. Normalize it with the framework's `normalizeProps` and merge it after
 *  Zag's. */
export const dialogPositionerLayout = (open: boolean) => ({
    hidden: !open,
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

/** What the backdrop adds to Zag's props: the scrim covers the viewport rather than its
 *  container. Normalize it and merge it after Zag's. */
export const dialogBackdropLayout = () => ({
    style: { position: "fixed" } as const,
});
