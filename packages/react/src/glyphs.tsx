// The glyphs ready-made parts show unless given another icon. Their paths are binding-core's.

import { GLYPH_PATHS, TOAST_GLYPH_PATHS } from "@pureform/binding-core";
import type { ToastType } from "@pureform/binding-core";
import type { ReactNode } from "react";

// A 24px glyph, filled with the current color and hidden from assistive technology.
const Glyph = (props: { readonly path: string }): ReactNode => (
    <svg
        viewBox="0 0 24 24"
        width="1em"
        height="1em"
        fill="currentColor"
        aria-hidden="true"
    >
        <path d={props.path} />
    </svg>
);

/** The cross of a close or remove button: the snackbar's close, the full-screen dialog's close
 *  trigger, the open FAB menu's FAB, and the input chips' remove buttons. */
export const CloseIcon = (): ReactNode => <Glyph path={GLYPH_PATHS.close} />;

/** A toast's icon for its type: a check, a warning triangle, an error or info disc, or a partial
 *  ring while loading. */
export const ToastIcon = (props: { readonly type: ToastType }): ReactNode => (
    <Glyph path={TOAST_GLYPH_PATHS[props.type]} />
);

/** The arrow of a back button, pointing toward the start: the side sheet's back button and the
 *  search view's. Mirror it under right to left (`mirrorIcon`). */
export const BackIcon = (): ReactNode => <Glyph path={GLYPH_PATHS.back} />;

/** Material's drop-down arrow: the select's, the autocomplete's and the split button's trailing
 *  icon. */
export const DropDownArrow = (): ReactNode => (
    <Glyph path={GLYPH_PATHS.dropDown} />
);

/** Three dots in a column: the toolbar's overflow button. */
export const MoreIcon = (): ReactNode => <Glyph path={GLYPH_PATHS.more} />;

/** A chevron pointing toward the start: a calendar's previous button. Mirror it under right to
 *  left. */
export const ChevronStartIcon = (): ReactNode => (
    <Glyph path={GLYPH_PATHS.chevronStart} />
);

/** A chevron pointing toward the end: a calendar's next button. Mirror it under right to left. */
export const ChevronEndIcon = (): ReactNode => (
    <Glyph path={GLYPH_PATHS.chevronEnd} />
);

/** A calendar page: the docked date picker's button and the date input's mode toggle. */
export const CalendarIcon = (): ReactNode => (
    <Glyph path={GLYPH_PATHS.calendar} />
);

/** A pencil: the modal date picker's mode toggle. */
export const EditIcon = (): ReactNode => <Glyph path={GLYPH_PATHS.edit} />;
