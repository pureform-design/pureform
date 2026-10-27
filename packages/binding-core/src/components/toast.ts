// The toast's contract, shared by every binding: the toaster's options (Zag's toast store), what
// each toast shows, and how its type reaches the registry. Toasts run on Zag's toast machines on
// the web; React Native times them itself (see its `toast/`).

import type { PartName, TestIdOverride, toastAnatomy } from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Unstyled } from "../parts";
import type { IndicationProps } from "./indication";

/** The toast's parts: `"group" | "root" | "icon" | "title" | "description" | "actionTrigger" |
 *  "closeTrigger"`. */
export type ToastPart = PartName<typeof toastAnatomy>;

/** A toast's status, which colors its icon: `info` (the default), `success`, `warning`, `error`,
 *  or `loading`, which stays until it's updated or dismissed. */
export type ToastType = "info" | "success" | "warning" | "error" | "loading";

/** Where the toaster stacks its toasts. */
export type ToastPlacement =
    | "top-start"
    | "top"
    | "top-end"
    | "bottom-start"
    | "bottom"
    | "bottom-end";

/** Portable toast scheduling and placement options, in platform logical units. */
export interface ToasterOptions {
    /** Where the toasts stack. @default "bottom-end" */
    readonly placement?: ToastPlacement | undefined;
    /** How many show at once; the rest wait. @default 3 */
    readonly max?: number | undefined;
    /** How long each stays, in milliseconds, unless it says otherwise. @default 5000 */
    readonly duration?: number | undefined;
    /** The space between toasts. @default 8 */
    readonly gap?: number | undefined;
    /** Overlap the toasts in a pile that spreads out on hover, rather than stacking them in a
     *  column. @default false */
    readonly overlap?: boolean | undefined;
    /** The space between the screen's edges and the toasts. @default 16 */
    readonly offsets?: number | undefined;
}

/** The toaster defaults pureform sets over Zag's. */
export const TOASTER_DEFAULTS = {
    placement: "bottom-end",
    max: 3,
    duration: 5000,
    gap: 8,
    overlap: false,
    offsets: 16,
} as const satisfies Required<ToasterOptions>;

/** The toaster's options with pureform's defaults, for Zag's `createStore`. */
export const toasterOptions = (
    options: ToasterOptions = {},
): Required<ToasterOptions> => ({
    ...TOASTER_DEFAULTS,
    ...Object.fromEntries(
        Object.entries(options).filter(([, value]) => value !== undefined),
    ),
});

/** A toast's action button: its label, and what choosing it does (then the toast closes). */
export interface ToastAction {
    readonly label: string;
    readonly onClick: () => void;
}

/** The toast's instance tokens. Its `type` comes with each toast. */
export interface ToastVariantProps {
    readonly tokens?: InstanceTokens<"toast"> | undefined;
}

/** What the toaster (the ready-made group) takes for itself. */
export interface ToasterOwnProps extends ToastVariantProps, IndicationProps {
    /** The region's accessible name. @default "Notifications" */
    readonly label?: string | undefined;
    /** The close buttons' accessible name. @default "Dismiss" */
    readonly closeLabel?: string | undefined;
    /** A prefix for every part's test id (`saved` → `saved-title`), or ids by part. */
    readonly testId?: TestIdOverride<ToastPart> | undefined;
    /** Every part, or some, without the registry's styles. */
    readonly unstyled?: Unstyled<ToastPart> | undefined;
}

/** What a ready-made toaster's toast is, for a function of the copy in its parts' keys:
 *  `className={{ root: (toast) => (toast.type === "error" ? "loud" : undefined) }}`. */
export interface ToastInstance {
    /** The toast's id, from the toaster. */
    readonly id: string;
    /** Its type: `info` when it has none, or one the preset doesn't know. */
    readonly type: ToastType;
    /** Its 0-based place in the group. */
    readonly index: number;
}

/** The ready-made toaster's repeated parts (all but the group), each to its toast. */
export interface ToastInstances {
    readonly root: ToastInstance;
    readonly icon: ToastInstance;
    readonly title: ToastInstance;
    readonly description: ToastInstance;
    readonly actionTrigger: ToastInstance;
    readonly closeTrigger: ToastInstance;
}

/** The keys of `ToasterOwnProps`, kept off the group's element. */
export const TOASTER_PROPS = [
    "tokens",
    "indication",
    "label",
    "closeLabel",
    "testId",
    "unstyled",
] as const satisfies readonly (keyof ToasterOwnProps)[];

/** A toast's registry selection: its type (`info` when it has none, or one the preset doesn't
 *  know) and the toaster's tokens. */
export const toastSelection = (
    type: string | undefined,
    props: ToastVariantProps,
): Selection<"toast"> => ({
    type: isToastType(type) ? type : "info",
    tokens: props.tokens,
});

const TYPES: readonly string[] = [
    "info",
    "success",
    "warning",
    "error",
    "loading",
] satisfies ToastType[];

/** Whether `type` is one of the toast's types. */
export const isToastType = (type: string | undefined): type is ToastType =>
    type !== undefined && TYPES.includes(type);

/** The ready-made toast's icon glyph for a type, when the app gives none: a check, an
 *  exclamation in a triangle, a cross in a circle, an `i` in a circle, or a ring while loading. */
export const TOAST_GLYPHS: Record<ToastType, string> = {
    success: "✓",
    warning: "⚠",
    error: "⊗",
    info: "ⓘ",
    loading: "◌",
};

/** A flick this fast (px/ms) or faster dismisses a swiped toast however short the swipe. */
export const TOAST_SWIPE_VELOCITY_THRESHOLD = 0.5;

/** Where a toast swiped sideways goes once let go, on every renderer: `offset` is how far it
 *  moved (px, either way), `velocity` its speed along the screen (px/ms). Past half its `width`,
 *  or on a flick the way it moved, it leaves (`dismissed`); short of that, it settles back. */
export const toastSwipeRelease = (release: {
    readonly offset: number;
    readonly velocity: number;
    readonly width: number;
}): "dismissed" | "settled" => {
    const { offset, velocity, width } = release;
    if (offset === 0) return "settled";
    const fling =
        Math.abs(velocity) >= TOAST_SWIPE_VELOCITY_THRESHOLD &&
        Math.sign(velocity) === Math.sign(offset);
    return (width > 0 && Math.abs(offset) >= width / 2) || fling
        ? "dismissed"
        : "settled";
};
