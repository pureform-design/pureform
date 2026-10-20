// The glyphs ready-made parts show unless given another icon.

import type { JSX } from "@solidjs/web";

/** The cross of a close or remove button: the snackbar's close, the full-screen dialog's close
 *  trigger, the open FAB menu's FAB, and the input chips' remove buttons. */
export const CloseIcon = (): JSX.Element => (
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
