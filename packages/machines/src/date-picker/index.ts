// Zag's date picker, re-exported so bindings take every machine from one package: the modal
// date picker runs it inline in Zag's dialog, and the docked date picker as a popover under its
// field. It reads and writes `@internationalized/date` values; `parse` turns an ISO date
// (`2026-08-17`) into one, and `toISO` turns one back.

import type { DateValue } from "@zag-js/date-picker";

export * from "@zag-js/date-picker";
export {
    anatomy,
    cellAnatomy,
    dockedAnatomy,
    parts,
} from "./date-picker.anatomy";

/** A date value as an ISO date, `YYYY-MM-DD`, without its time. */
export const toISO = (value: DateValue): string =>
    `${String(value.year).padStart(4, "0")}-${String(value.month).padStart(2, "0")}-${String(value.day).padStart(2, "0")}`;
