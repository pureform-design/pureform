import type { Machine, Service } from "@zag-js/core";
import type {
    CommonProperties,
    DirectionProperty,
    PropTypes,
    RequiredBy,
} from "@zag-js/types";

import type {
    AriaSort,
    SelectAllState,
    SelectionMode,
    Sort,
    SortDirection,
} from "./table.logic";

export interface SortChangeDetails {
    /** The new sort, or `null` once cleared. */
    sort: Sort | null;
}

export interface SelectionChangeDetails {
    /** The chosen rows' values. */
    selection: string[];
}

export interface ElementIds {
    root?: string | undefined;
}

/** The words the table says, for a locale other than English. */
export interface TableTranslations {
    /** The select-all checkbox's name. @default "Select all rows" */
    selectAll: string;
    /** A row checkbox's name. @default "Select row" */
    selectRow: string;
}

export interface TableProps extends DirectionProperty, CommonProperties {
    ids?: ElementIds | undefined;
    /** The controlled sort, or `null` for none. */
    sort?: Sort | null | undefined;
    /** The sort it starts with when `sort` isn't controlled. @default null */
    defaultSort?: Sort | null | undefined;
    onSortChange?: ((details: SortChangeDetails) => void) | undefined;
    /** The direction a column sorts in first. @default "ascending" */
    sortStart?: SortDirection | undefined;
    /** Whether a third press on a sorted column clears the sort, rather than turning it back.
     *  @default true */
    sortClearable?: boolean | undefined;
    /** How rows are chosen; leave it out for a table without selection. */
    selectionMode?: SelectionMode | undefined;
    /** The controlled selection: the chosen rows' values. */
    selection?: string[] | undefined;
    /** @default [] */
    defaultSelection?: string[] | undefined;
    onSelectionChange?: ((details: SelectionChangeDetails) => void) | undefined;
    /** Every body row's value, in order, which select-all chooses. */
    rows?: string[] | undefined;
    translations?:
        | { [K in keyof TableTranslations]?: string | undefined }
        | undefined;
}

type PropsWithDefault = "defaultSelection";

export interface TableSchema {
    state: "idle";
    props: RequiredBy<TableProps, PropsWithDefault>;
    context: {
        sort: Sort | null;
        selection: string[];
    };
    computed: {
        translations: TableTranslations;
        selectAll: SelectAllState;
    };
    event: { type: string; [key: string]: unknown };
    action: string;
    effect: string;
    guard: string;
}

export type TableService = Service<TableSchema>;
export type TableMachine = Machine<TableSchema>;

/** A sortable column, by its value. */
export interface ColumnProps {
    column: string;
}

/** A body row, by its value. */
export interface RowProps {
    value: string;
}

/** A header cell: its column, when it has one, and whether it sorts. */
export interface HeaderCellProps {
    column?: string | undefined;
    sortable?: boolean | undefined;
}

export interface TableApi<T extends PropTypes = PropTypes> {
    sort: Sort | null;
    selection: string[];
    selectionMode: SelectionMode | undefined;
    /** What the select-all checkbox shows. */
    selectAll: SelectAllState;
    translations: TableTranslations;
    setSort: (sort: Sort | null) => void;
    /** Sorts by `column` as a press on its header does. */
    toggleSort: (column: string) => void;
    ariaSort: (column: string) => AriaSort;
    /** The way `column`'s sort arrow points: its direction when sorted, else the one a press
     *  would sort it in (`sortStart`). */
    arrowDirection: (column: string) => SortDirection;
    setSelection: (selection: string[]) => void;
    isSelected: (row: string) => boolean;
    toggleRow: (row: string) => void;
    toggleAll: () => void;
    getRootProps: () => T["element"];
    getHeaderProps: () => T["element"];
    getBodyProps: () => T["element"];
    getFooterProps: () => T["element"];
    getHeaderRowProps: () => T["element"];
    getRowProps: (props: RowProps) => T["element"];
    getFooterRowProps: () => T["element"];
    getHeaderCellProps: (props?: HeaderCellProps) => T["element"];
    getCellProps: () => T["element"];
    getFooterCellProps: () => T["element"];
    /** A selection cell: a column header in the header row, a cell elsewhere. */
    getSelectionCellProps: (props: {
        header?: boolean | undefined;
    }) => T["element"];
    /** The button in a sortable column's header. */
    getSortHeaderProps: (props: ColumnProps) => T["button"];
    getSortLabelProps: (props: ColumnProps) => T["element"];
    getSortIndicatorProps: (props: ColumnProps) => T["element"];
}
