// The glyphs ready-made parts show unless given another icon.

import type { ToastType } from "@pureform/binding-core";
import type { ReactNode } from "react";

/** The cross of a close or remove button: the snackbar's close, the full-screen dialog's close
 *  trigger, the open FAB menu's FAB, and the input chips' remove buttons. */
export const CloseIcon = (): ReactNode => (
    <svg
        viewBox="0 0 24 24"
        width="1em"
        height="1em"
        fill="currentColor"
        aria-hidden="true"
    >
        <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
    </svg>
);

// 24px outlines of each toast type's icon.
const TOAST_PATHS: Record<ToastType, string> = {
    success: "M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
    warning: "M1 21h22L12 2zm12-3h-2v-2h2zm0-4h-2v-4h2z",
    error: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20m1 15h-2v-2h2zm0-4h-2V7h2z",
    info: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20m1 15h-2v-6h2zm0-8h-2V7h2z",
    loading: "M12 4a8 8 0 1 0 8 8h-2a6 6 0 1 1-6-6z",
};

/** A toast's icon for its type: a check, a warning triangle, an error or info disc, or a partial
 *  ring while loading. */
export const ToastIcon = (props: { readonly type: ToastType }): ReactNode => (
    <svg
        viewBox="0 0 24 24"
        width="1em"
        height="1em"
        fill="currentColor"
        aria-hidden="true"
    >
        <path d={TOAST_PATHS[props.type]} />
    </svg>
);

/** The arrow of a back button, pointing toward the start: the side sheet's back button. Mirror it
 *  under right to left (`mirrorIcon`). */
export const BackIcon = (): ReactNode => (
    <svg
        viewBox="0 0 24 24"
        width="1em"
        height="1em"
        fill="currentColor"
        aria-hidden="true"
    >
        <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
    </svg>
);
