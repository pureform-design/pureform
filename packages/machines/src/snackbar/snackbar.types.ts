import type { Machine, Service } from "@zag-js/core";
import type {
    CommonProperties,
    DirectionProperty,
    PropTypes,
    RequiredBy,
} from "@zag-js/types";

/** Why the snackbar opens or closes: the app asked (`"open"`, as `setOpen` does), its time ran
 *  out, the user chose the action or the close button, or pressed Escape in it. */
export type OpenChangeReason =
    | "open"
    | "timeout"
    | "action"
    | "close"
    | "escape";

export interface OpenChangeDetails {
    open: boolean;
    reason: OpenChangeReason;
}

export interface ElementIds {
    root?: string | undefined;
    supportingText?: string | undefined;
    action?: string | undefined;
    close?: string | undefined;
}

export interface SnackbarProps extends DirectionProperty, CommonProperties {
    /** The ids of the elements in the snackbar. Useful for composition. */
    ids?: ElementIds | undefined;
    /** The controlled open state. */
    open?: boolean | undefined;
    /** The open state it starts with, when `open` isn't controlled. @default false */
    defaultOpen?: boolean | undefined;
    /** Called when the snackbar asks to open or close, with why. */
    onOpenChange?: ((details: OpenChangeDetails) => void) | undefined;
    /** How long it stays open, in milliseconds, while the pointer and focus are elsewhere.
     *  `null` keeps it open until the user or the app closes it. @default 5000 */
    duration?: number | null | undefined;
    /** Called when the user chooses the action, before the snackbar asks to close. */
    onAction?: (() => void) | undefined;
}

type PropsWithDefault = "defaultOpen";

export type SnackbarEvent =
    | { type: "OPEN"; reason?: OpenChangeReason }
    | { type: "CLOSE"; reason: OpenChangeReason }
    | { type: "ACTION" }
    | { type: "CONTROLLED.OPEN" }
    | { type: "CONTROLLED.CLOSE" }
    | { type: "PAUSE"; source: "pointer" | "focus" }
    | { type: "RESUME"; source: "pointer" | "focus" };

export interface SnackbarSchema {
    state: "open" | "paused" | "closed";
    tag: "open";
    props: RequiredBy<SnackbarProps, PropsWithDefault>;
    context: {
        /** What holds it open: the pointer over it, focus inside it. */
        pointerInside: boolean;
        focusInside: boolean;
    };
    event: SnackbarEvent;
    action: string;
    effect: string;
    guard: string;
}

export type SnackbarService = Service<SnackbarSchema>;
export type SnackbarMachine = Machine<SnackbarSchema>;

export interface SnackbarApi<T extends PropTypes = PropTypes> {
    /** Whether the snackbar shows. */
    open: boolean;
    /** Whether its time is held: the pointer is over it or focus is inside it. */
    paused: boolean;
    /** Ask to open or close it, as the app would (`reason: "open"` or `"close"`). */
    setOpen: (open: boolean) => void;
    getRootProps: () => T["element"];
    getSupportingTextProps: () => T["element"];
    getActionsProps: () => T["element"];
    getActionProps: () => T["button"];
    getCloseProps: () => T["button"];
}
