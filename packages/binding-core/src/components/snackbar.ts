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
import type { IndicationProps } from "./indication";
import type { VariantProp } from "./variants";

/** The snackbar's parts: `"root" | "supportingText" | "actions" | "action" | "close"`. */
export type SnackbarPart = PartName<typeof snackbarAnatomy>;

/** The snackbar's `layout` (`oneLine`, `twoLine`, or `longAction`, which puts the actions below
 *  the text) and instance tokens. */
export interface SnackbarVariantProps {
    readonly layout?: VariantProp<"snackbar", "layout">;
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
    /** The root element's id; the machine builds the other ids from it.
     *  @control none */
    readonly id?: string | undefined;
    readonly ids?: SnackbarElementIds | undefined;
}

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface SnackbarRootOwnProps
    extends SnackbarVariantProps, SnackbarBehaviorProps, IndicationProps {
    /** A prefix for every part's test id (`saved` → `saved-action`), or ids by part. */
    readonly testId?: TestIdOverride<SnackbarPart> | undefined;
    /** Every part, or some, without the registry's styles. */
    readonly unstyled?: Unstyled<SnackbarPart> | undefined;
    /** Called once it has closed and its exit animation is over (a queue shows the next one
     *  then). */
    readonly onExitComplete?: (() => void) | undefined;
}

/** The keys of `SnackbarRootOwnProps`, which Root keeps off its element. */
export const SNACKBAR_ROOT_PROPS = [
    "layout",
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
    "indication",
    "onExitComplete",
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
): Selection<"snackbar"> => ({
    layout: props.layout,
    tokens: props.tokens,
});

/** A snackbar to show through a queue (`createSnackbarQueue`, React Native's `useSnackbar`): its
 *  content, its layout, how long it stays, and who to tell. */
export interface SnackbarQueueOptions<Node>
    extends SnackbarVariantProps, IndicationProps, SnackbarContentProps<Node> {
    /** How long it stays, in milliseconds, while the pointer and focus are elsewhere. `null` keeps
     *  it until the user or the app closes it. @default 5000 */
    readonly duration?: number | null | undefined;
    /** Called when the user chooses the action, before the snackbar closes. */
    readonly onAction?: (() => void) | undefined;
    /** Called once it asks to close, with why: `timeout`, `action`, `close` (its close button, or
     *  the app's `dismiss`) or `escape`. */
    readonly onOpenChange?:
        | ((details: SnackbarOpenChangeDetails) => void)
        | undefined;
    readonly testId?: TestIdOverride<SnackbarPart>;
}

/** What a snackbar queue gives the app. */
export interface SnackbarQueueApi<Options> {
    /** Adds a snackbar to the queue, shown once those before it have gone. Returns its id. */
    show(options: Options): string;
    /** Closes the snackbar with this id, or the one showing; one still waiting leaves unseen. */
    dismiss(id?: string): void;
}

/** Where a snackbar host sits: above the bottom edge by `offset` (a navigation bar's or a FAB's
 *  room, a CSS length on the web, points on React Native), and the theme's spacing. */
export interface SnackbarHostPlacementProps<Length> {
    /** The room to leave below the snackbar, such as a navigation bar's height, so it shows
     *  above it. @default 0 */
    readonly offset?: Length | undefined;
}
