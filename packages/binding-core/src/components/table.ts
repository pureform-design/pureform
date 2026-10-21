// The table's contract, shared by every binding: the props Root takes for itself, the columns
// and rows the ready-made table takes as data, and how they map onto pureform's table machine
// (`@pureform/machines/table`: the sort and the chosen rows) and the selection. The table never
// sorts its rows itself; the ready-made table sorts its data by the sort.

import type { PartName, TestIdOverride, tableAnatomy } from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Unstyled } from "../parts";
import type { IndicationProps } from "./indication";
import type { VariantProp } from "./variants";

/** The table's parts. */
export type TablePart = PartName<typeof tableAnatomy>;

/** Which way a sorted column runs. */
export type TableSortDirection = "ascending" | "descending";

/** The column a table is sorted by, and which way. */
export interface TableSort {
    readonly column: string;
    readonly direction: TableSortDirection;
}

/** How rows are chosen: one at a time, or any number. */
export type TableSelectionMode = "single" | "multiple";

/** The table's variants and tokens. */
export interface TableVariantProps {
    /** Keeps the header at the top of the scrolling container (not on React Native). */
    readonly stickyHeader?: boolean | undefined;
    readonly density?: VariantProp<"table", "density">;
    readonly tokens?: InstanceTokens<"table"> | undefined;
}

/** What Root takes for its behavior: the sort, the selection and the words. */
export interface TableBehaviorProps extends IndicationProps {
    /** The controlled sort, or `null` for none. */
    readonly sort?: TableSort | null | undefined;
    /** @default null */
    readonly defaultSort?: TableSort | null | undefined;
    readonly onSortChange?:
        | ((details: { readonly sort: TableSort | null }) => void)
        | undefined;
    /** The direction a column sorts in first. @default "ascending" */
    readonly sortStart?: TableSortDirection | undefined;
    /** Whether a third press on a sorted column clears the sort. @default true */
    readonly sortClearable?: boolean | undefined;
    /** How rows are chosen; leave it out for a table without a selection column. */
    readonly selectionMode?: TableSelectionMode | undefined;
    /** The controlled selection: the chosen rows' values. */
    readonly selection?: readonly string[] | undefined;
    /** @default [] */
    readonly defaultSelection?: readonly string[] | undefined;
    readonly onSelectionChange?:
        | ((details: { readonly selection: readonly string[] }) => void)
        | undefined;
    /** Every body row's value, which the select-all checkbox chooses. The ready-made table
     *  sets it from its rows. */
    readonly rowValues?: readonly string[] | undefined;
    /** The checkboxes' names in another language. */
    readonly translations?:
        | {
              readonly selectAll?: string | undefined;
              readonly selectRow?: string | undefined;
          }
        | undefined;
    /** The root's id. */
    readonly id?: string | undefined;
}

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface TableRootOwnProps
    extends TableVariantProps, TableBehaviorProps {
    /** Renders every other body row as `alternateRow`, on its own container color. */
    readonly striped?: boolean | undefined;
    readonly testId?: TestIdOverride<TablePart> | undefined;
    readonly unstyled?: Unstyled<TablePart> | undefined;
}

/** The keys of `TableRootOwnProps`, which Root keeps off its element. */
export const TABLE_ROOT_PROPS = [
    "stickyHeader",
    "density",
    "tokens",
    "sort",
    "defaultSort",
    "onSortChange",
    "sortStart",
    "sortClearable",
    "selectionMode",
    "selection",
    "defaultSelection",
    "onSelectionChange",
    "rowValues",
    "translations",
    "id",
    "indication",
    "striped",
    "testId",
    "unstyled",
] as const satisfies readonly (keyof TableRootOwnProps)[];

/** One column of the ready-made table. */
export interface TableColumn<Row, Node> {
    /** Its key: the sort's `column`, and by default the row's field it shows. */
    readonly id: string;
    /** Its header. @default its id */
    readonly header?: Node;
    /** Its footer cell; the footer row renders when any column has one. */
    readonly footer?: Node;
    /** Whether its header sorts the rows. */
    readonly sortable?: boolean | undefined;
    /** What a row's cell shows. @default the value, as text */
    readonly cell?: ((row: Row) => Node) | undefined;
    /** The value a row sorts by, and shows by default. @default `row[id]` */
    readonly value?: ((row: Row) => unknown) | undefined;
}

/** What the ready-made table renders inside Root. */
export interface TableContentProps<Row, Node> {
    readonly columns?: readonly TableColumn<Row, Node>[] | undefined;
    readonly rows?: readonly Row[] | undefined;
    /** A row's value, its key and what the selection holds. @default its `id`, else its index */
    readonly rowValue?: ((row: Row, index: number) => string) | undefined;
}

/** The keys of `TableContentProps`. */
export const TABLE_CONTENT_PROPS = [
    "columns",
    "rows",
    "rowValue",
] as const satisfies readonly (keyof TableContentProps<unknown, unknown>)[];

/** A column's value in a row: its `value`, else the row's field named by its id. */
export const tableCellValue = <Row>(
    column: Pick<TableColumn<Row, unknown>, "id" | "value">,
    row: Row,
): unknown =>
    column.value
        ? column.value(row)
        : (row as Record<string, unknown> | null)?.[column.id];

/** A row's value: `rowValue`, else its `id`, else its index. */
export const tableRowValue = <Row>(
    row: Row,
    index: number,
    rowValue?: (row: Row, index: number) => string,
): string => {
    if (rowValue) return rowValue(row, index);
    const id = (row as Record<string, unknown> | null)?.["id"];
    return id === undefined || id === null ? String(index) : String(id);
};

/** The machine's props from the behavior props (less the controllable sort and selection, which
 *  the bindings map themselves). */
export const tableMachineProps = (props: TableBehaviorProps) => ({
    sortStart: props.sortStart,
    sortClearable: props.sortClearable,
    selectionMode: props.selectionMode,
    rows: props.rowValues ? [...props.rowValues] : undefined,
    translations: props.translations,
    ids: { root: props.id },
});

/** The table's registry selection. */
export const tableSelection = (
    props: TableVariantProps,
): Selection<"table"> => ({
    stickyHeader: props.stickyHeader,
    density: props.density,
    tokens: props.tokens,
});

/** The part a body row renders as: every other row of a striped table is `alternateRow`. */
export const tableRowPart = (
    index: number,
    striped: boolean | undefined,
): "row" | "alternateRow" =>
    striped && index % 2 === 1 ? "alternateRow" : "row";
