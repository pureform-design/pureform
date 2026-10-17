// The snackbar's contract, shared by every binding: the props Root takes for itself, and how they
// map onto the selection and pureform's snackbar machine. Root is the snackbar itself, a
// `role="status"` region hidden while closed; placing it (fixed to the bottom of the screen) is the
// app's.

import type {
    PartName,
    snackbarAnatomy,
    TestIdOverride,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Controllable } from "../controllable";
import type { Unstyled } from "../parts";

/** The snackbar's parts: `"root" | "supportingText" | "action" | "close"`. */
export type SnackbarPart = PartName<typeof snackbarAnatomy>;

/** The snackbar's instance tokens; it has no variants. */
export interface SnackbarVariantProps {
    readonly tokens?: InstanceTokens<"snackbar"> | undefined;
}

/** The ids of the snackbar's elements, for composition. */
export interface SnackbarElementIds {
    readonly root?: string | undefined;
    readonly supportingText?: string | undefined;
    readonly action?: string | undefined;
    readonly close?: string | undefined;
}

/** Why the snackbar asks to open or close: the app (`setOpen`), its time running out, the
 *  action, the close button, or Escape inside it. */
export type SnackbarOpenChangeReason =
    | "open"
    | "timeout"
    | "action"
    | "close"
    | "escape";

/** What `onOpenChange` gets. */
export interface SnackbarOpenChangeDetails {
    readonly open: boolean;
    readonly reason: SnackbarOpenChangeReason;
}

/** What the snackbar machine takes from Root's props. */
export interface SnackbarBehaviorProps extends Controllable<
    "open",
    boolean,
    SnackbarOpenChangeDetails
> {
    /** How long it stays open, in milliseconds, while the pointer and focus are elsewhere.
     *  `null` keeps it open until the user or the app closes it. @default 5000 */
    readonly duration?: number | null | undefined;
    /** Called when the user chooses the action, before the snackbar asks to close. */
    readonly onAction?: (() => void) | undefined;
    /** The root element's id; the machine builds the other ids from it. */
    readonly id?: string | undefined;
    readonly ids?: SnackbarElementIds | undefined;
}

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface SnackbarRootOwnProps
    extends SnackbarVariantProps, SnackbarBehaviorProps {
    /** A prefix for every part's test id (`saved` → `saved-action`), or ids by part. */
    readonly testId?: TestIdOverride<SnackbarPart> | undefined;
    /** Every part, or some, without the registry's styles. */
    readonly unstyled?: Unstyled<SnackbarPart> | undefined;
}

/** The keys of `SnackbarRootOwnProps`, which Root keeps off its element. */
export const SNACKBAR_ROOT_PROPS = [
    "tokens",
    "duration",
    "onAction",
    "id",
    "ids",
    "open",
    "defaultOpen",
    "onOpenChange",
    "testId",
    "unstyled",
] as const satisfies readonly (keyof SnackbarRootOwnProps)[];

/** What the ready-made snackbar renders inside Root, in the framework's node type. */
export interface SnackbarContentProps<Node> {
    /** The message. */
    readonly supportingText?: Node;
    /** The action button's label; the button renders only when given. */
    readonly action?: Node;
    /** The close button's accessible name; the button renders only when given. */
    readonly closeLabel?: string | undefined;
    /** The close button's icon. @default a cross */
    readonly closeIcon?: Node;
}

/** The keys of `SnackbarContentProps`. */
export const SNACKBAR_CONTENT_PROPS = [
    "supportingText",
    "action",
    "closeLabel",
    "closeIcon",
] as const satisfies readonly (keyof SnackbarContentProps<unknown>)[];

/** The snackbar's registry selection from Root's props. */
export const snackbarSelection = (
    props: SnackbarVariantProps,
): Selection<"snackbar"> => ({ tokens: props.tokens });

/** The snackbar machine's props from Root's, besides `dir` and the controllable `open`. */
export const snackbarMachineProps = (props: SnackbarBehaviorProps) => ({
    duration: props.duration,
    onAction: props.onAction,
    ids: {
        root: props.id ?? props.ids?.root,
        supportingText: props.ids?.supportingText,
        action: props.ids?.action,
        close: props.ids?.close,
    },
});
