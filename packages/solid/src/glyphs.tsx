// The glyphs ready-made parts show unless given another icon. Their paths are binding-core's.

import { GLYPH_PATHS, TOAST_GLYPH_PATHS } from "@pureform/binding-core";
import type { ToastType } from "@pureform/binding-core";
import type { JSX } from "@solidjs/web";

// A 24px glyph, filled with the current color and hidden from assistive technology.
const Glyph = (props: { readonly path: string }): JSX.Element => (
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
export const CloseIcon = (): JSX.Element => <Glyph path={GLYPH_PATHS.close} />;

/** A toast's icon for its type: a check, a warning triangle, an error or info disc, or a partial
 *  ring while loading. */
export const ToastIcon = (props: { readonly type: ToastType }): JSX.Element => (
    <Glyph path={TOAST_GLYPH_PATHS[props.type]} />
);

/** The arrow of a back button, pointing toward the start: the side sheet's back button and the
 *  search view's. Mirror it under right to left (`mirrorIcon`). */
export const BackIcon = (): JSX.Element => <Glyph path={GLYPH_PATHS.back} />;

/** Material's drop-down arrow: the select's, the autocomplete's and the split button's trailing
 *  icon. */
export const DropDownArrow = (): JSX.Element => (
    <Glyph path={GLYPH_PATHS.dropDown} />
);

/** A chevron pointing toward the start: a calendar's previous button. Mirror it under right to
 *  left. */
export const ChevronStartIcon = (): JSX.Element => (
    <Glyph path={GLYPH_PATHS.chevronStart} />
);

/** A chevron pointing toward the end: a calendar's next button. Mirror it under right to left. */
export const ChevronEndIcon = (): JSX.Element => (
    <Glyph path={GLYPH_PATHS.chevronEnd} />
);

/** A bar and a chevron toward the start: a paginator's first-page button. Mirror it under right to
 *  left. */
export const FirstPageIcon = (): JSX.Element => (
    <Glyph path={GLYPH_PATHS.firstPage} />
);

/** A bar and a chevron toward the end: a paginator's last-page button. Mirror it under right to
 *  left. */
export const LastPageIcon = (): JSX.Element => (
    <Glyph path={GLYPH_PATHS.lastPage} />
);

/** A calendar page: the docked date picker's button and the date input's mode toggle. */
export const CalendarIcon = (): JSX.Element => (
    <Glyph path={GLYPH_PATHS.calendar} />
);

/** A pencil: the modal date picker's mode toggle. */
export const EditIcon = (): JSX.Element => <Glyph path={GLYPH_PATHS.edit} />;

/** A chevron pointing down, which an expand indicator turns over: an accordion's headers and a
 *  tree's branches. */
export const ExpandIcon = (): JSX.Element => (
    <Glyph path={GLYPH_PATHS.expand} />
);

/** A minus: a number field's decrement button. */
export const RemoveIcon = (): JSX.Element => (
    <Glyph path={GLYPH_PATHS.remove} />
);

/** A plus: a number field's increment button. */
export const AddIcon = (): JSX.Element => <Glyph path={GLYPH_PATHS.add} />;

/** Three dots in a column: the toolbar's overflow button. */
export const MoreIcon = (): JSX.Element => <Glyph path={GLYPH_PATHS.more} />;

/** An arrow pointing up: a table's sort arrow, ascending. */
export const ArrowUpwardIcon = (): JSX.Element => (
    <Glyph path={GLYPH_PATHS.arrowUpward} />
);

/** An arrow pointing down: a table's sort arrow, descending. */
export const ArrowDownwardIcon = (): JSX.Element => (
    <Glyph path={GLYPH_PATHS.arrowDownward} />
);
