// The table's sort and selection arithmetic, free of any framework: the machine reads it, and
// React Native, which runs no Zag machine, uses it directly.

/** Which way a sorted column runs. */
export type SortDirection = "ascending" | "descending";

/** The column a table is sorted by, and which way. */
export interface Sort {
    readonly column: string;
    readonly direction: SortDirection;
}

/** How rows are chosen: one at a time, or any number. */
export type SelectionMode = "single" | "multiple";

/** What a select-all checkbox shows: every row chosen, none, or some. */
export type SelectAllState = boolean | "indeterminate";

/** The value `aria-sort` gives a column: its direction when sorted, else `none`. */
export type AriaSort = SortDirection | "none";

const opposite = (direction: SortDirection): SortDirection =>
    direction === "ascending" ? "descending" : "ascending";

/** The sort after a press on `column`'s header: a new column starts at `start`; the sorted one
 *  turns to the other direction, then clears (when `clearable`) or turns back. */
export const nextSort = (
    current: Sort | null,
    column: string,
    {
        start = "ascending",
        clearable = true,
    }: { start?: SortDirection; clearable?: boolean } = {},
): Sort | null => {
    if (current?.column !== column) return { column, direction: start };
    if (current.direction === start)
        return { column, direction: opposite(start) };
    return clearable ? null : { column, direction: start };
};

/** `column`'s `aria-sort`. */
export const ariaSort = (sort: Sort | null, column: string): AriaSort =>
    sort?.column === column ? sort.direction : "none";

/** The direction a column's sort arrow points: the sorted direction, or while the column isn't
 *  sorted, the one a press would sort it in (`start`). */
export const arrowDirection = (
    sort: Sort | null,
    column: string,
    start: SortDirection = "ascending",
): SortDirection => (sort?.column === column ? sort.direction : start);

/** Compares two cells' values: numbers and dates by value, anything else as text in the
 *  locale's order, numbers inside text by value. Empty values sort last. */
export const compareValues = (
    a: unknown,
    b: unknown,
    collator: Intl.Collator = new Intl.Collator(undefined, { numeric: true }),
): number => {
    const empty = (value: unknown) =>
        value === undefined || value === null || value === "";
    if (empty(a) || empty(b)) return empty(a) ? (empty(b) ? 0 : 1) : -1;
    const number = (value: unknown) =>
        typeof value === "number"
            ? value
            : value instanceof Date
              ? value.getTime()
              : undefined;
    const x = number(a);
    const y = number(b);
    if (x !== undefined && y !== undefined) return x - y;
    return collator.compare(String(a), String(b));
};

/** `rows` in `sort`'s order, reading each row's value in a column through `value`. The sort is
 *  stable, and empty values stay last either way. Unsorted, the rows keep their order. */
export const sortRows = <R>(
    rows: readonly R[],
    sort: Sort | null,
    value: (row: R, column: string) => unknown,
    compare: (a: unknown, b: unknown) => number = compareValues,
): R[] => {
    if (!sort) return [...rows];
    const sign = sort.direction === "ascending" ? 1 : -1;
    const empty = (v: unknown) => v === undefined || v === null || v === "";
    return rows
        .map((row, index) => ({ row, index, v: value(row, sort.column) }))
        .sort((a, b) => {
            if (empty(a.v) || empty(b.v))
                return compareValues(a.v, b.v) || a.index - b.index;
            return sign * compare(a.v, b.v) || a.index - b.index;
        })
        .map(({ row }) => row);
};

/** The selection after `row` is toggled: on its own in single mode. */
export const toggleRow = (
    selection: readonly string[],
    row: string,
    mode: SelectionMode = "multiple",
): string[] => {
    if (selection.includes(row))
        return selection.filter((value) => value !== row);
    return mode === "single" ? [row] : [...selection, row];
};

/** What the select-all checkbox shows for `rows`. */
export const selectAllState = (
    selection: readonly string[],
    rows: readonly string[],
): SelectAllState => {
    const chosen = rows.filter((row) => selection.includes(row)).length;
    if (chosen === 0) return false;
    return chosen === rows.length ? true : "indeterminate";
};

/** The selection after the select-all checkbox is pressed: every row of `rows`, or none of them
 *  once they're all chosen. Rows outside `rows` stay as they are. */
export const toggleAll = (
    selection: readonly string[],
    rows: readonly string[],
): string[] =>
    selectAllState(selection, rows) === true
        ? selection.filter((value) => !rows.includes(value))
        : [...selection, ...rows.filter((row) => !selection.includes(row))];
