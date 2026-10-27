// The table: Root on pureform's table machine (the sort and the chosen rows), around the Header,
// Body and Footer row groups, their rows (HeaderRow, Row, FooterRow) and cells (HeaderCell, Cell,
// FooterCell), the SelectionCell holding a row's checkbox (or the header's select-all one), and
// the SortHeader button a sortable column's header holds, with its label and arrow; and the
// ready-made Table, which renders and sorts its rows from data. Every element keeps its table
// role, which the preset's flex layout would otherwise drop.

import { dataTableAnatomy } from "@pureform/anatomy";
import type { checkboxAnatomy, PartName } from "@pureform/anatomy";
import {
    isPresent,
    TABLE_ROOT_PROPS,
    tableCellValue,
    tableRowPart,
    tableRowValue,
    tableSelection,
} from "@pureform/binding-core";
import type {
    InteractionSourceProps,
    TableCellInstance,
    TableColumnInstance,
    TableContentProps,
    TableInstances,
    TableRootOwnProps,
    TableRowInstance,
    TableSort,
} from "@pureform/binding-core";
import { tableMachineProps } from "@pureform/binding-web";
import * as table from "@pureform/machines/table";
import { normalizeProps } from "@zag-js/react";
import type { PropTypes } from "@zag-js/react";
import {
    createContext,
    type ElementType,
    type ReactNode,
    use,
    useId,
    useMemo,
} from "react";

import { Checkbox } from "../checkbox";
import { useControllable } from "../controllable";
import { ArrowUpwardIcon } from "../glyphs";
import { useMachineButton } from "../interaction";
import { useMachine } from "../machine";
import { createPartContext } from "../part-context";
import { machinePart, useComponent, useSlotProps } from "../parts";
import type {
    ComponentScope,
    InnerPropsOf,
    SlotKeyedProps,
    SlotPropsOf,
} from "../parts";
import { omitProps } from "../props";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

type Anatomy = typeof dataTableAnatomy;
type Api = table.Api<PropTypes>;

/** What Root shares with its parts. */
interface TableContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: Api;
    readonly striped: boolean | undefined;
    readonly checkboxProps: CheckboxInnerProps | undefined;
}

type CheckboxInnerProps = InnerPropsOf<typeof checkboxAnatomy>;

const context = createPartContext<TableContextValue>("Table");

// Where a selection cell sits: the header row (select all) or a body row (its value).
const RowContext = createContext<{ readonly value?: string }>({});

/** Root's props: the variants and tokens, the sort and selection, `testId` and `unstyled` for
 *  every part, `as`, and the element's own props. */
export interface TableRootProps
    extends Omit<PartProps, keyof TableRootOwnProps>, TableRootOwnProps {
    /** Another element or component to render instead of `<table>`. */
    readonly as?: ElementType | undefined;
    /** The selection checkboxes' own props (select-all and each row's), keyed by the
     *  checkbox's parts. */
    readonly checkboxProps?: CheckboxInnerProps | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface TablePartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** The table, `role="table"`. */
function Root(props: TableRootProps): ReactNode {
    const id = useId();
    const dir = useDirection();
    const sort = useControllable<"sort", TableSort | null>(
        "Table",
        "sort",
        props,
    );
    const selection = useControllable<"selection", readonly string[]>(
        "Table",
        "selection",
        props,
    );
    const sorted = sort.machineProps;
    const chosen = selection.machineProps;
    const service = useMachine(table.machine, {
        id,
        dir,
        ...tableMachineProps(props),
        ...sorted,
        sort: sorted.sort ?? undefined,
        defaultSort: sorted.defaultSort ?? undefined,
        selection: chosen.selection ? [...chosen.selection] : undefined,
        defaultSelection: chosen.defaultSelection
            ? [...chosen.defaultSelection]
            : undefined,
        onSelectionChange: chosen.onSelectionChange,
    } as table.Props);
    const api = table.connect(service, normalizeProps);
    const scope = useComponent(dataTableAnatomy, {
        selection: tableSelection(props),
        testId: props.testId,
        unstyled: props.unstyled,
        indication: props.indication,
    });
    const { as, checkboxProps, ...rest } = omitProps(props, TABLE_ROOT_PROPS);
    return (
        <context.Provider
            value={{ scope, api, striped: props.striped, checkboxProps }}
        >
            {scope.render("root", {
                element: "table",
                as,
                machine: api.getRootProps(),
                props: rest,
            })}
        </context.Provider>
    );
}

// A part on its own element, spreading the machine's props for it.
const part = (
    name: PartName<Anatomy>,
    label: string,
    element: ElementType,
    machine: (api: Api) => object,
) => machinePart(context.use, element)(name, label, ({ api }) => machine(api));

/** The header rows' group, a `<thead>`. */
const Header = part("header", "Header", "thead", (api) => api.getHeaderProps());
/** The body rows' group, a `<tbody>`. */
const Body = part("body", "Body", "tbody", (api) => api.getBodyProps());
/** The footer rows' group, a `<tfoot>`. */
const Footer = part("footer", "Footer", "tfoot", (api) => api.getFooterProps());
/** A footer row. */
const FooterRow = part("footerRow", "FooterRow", "tr", (api) =>
    api.getFooterRowProps(),
);
/** A body cell, a `<td>`. */
const Cell = part("cell", "Cell", "td", (api) => api.getCellProps());
/** A footer cell. */
const FooterCell = part("footerCell", "FooterCell", "td", (api) =>
    api.getFooterCellProps(),
);

const HEADER_ROW = {};

/** The header row; its selection cell is the select-all checkbox. */
function HeaderRow({ unstyled, ...props }: TablePartProps): ReactNode {
    const { scope, api } = context.use("HeaderRow");
    return (
        <RowContext value={HEADER_ROW}>
            {scope.render("headerRow", {
                element: "tr",
                machine: api.getHeaderRowProps(),
                unstyled,
                props,
            })}
        </RowContext>
    );
}

/** A body row's props: its value, which the selection holds, and its index among the body's
 *  rows, which stripes a striped table. */
export interface TableRowProps extends TablePartProps {
    readonly value: string;
    readonly index?: number | undefined;
}

/** A body row: `aria-selected` in a table with a selection. */
function Row({ value, index, unstyled, ...props }: TableRowProps): ReactNode {
    const { scope, api, striped } = context.use("Row");
    const row = useMemo(() => ({ value }), [value]);
    return (
        <RowContext value={row}>
            {scope.render(tableRowPart(index ?? 0, striped), {
                element: "tr",
                machine: api.getRowProps({ value }),
                unstyled,
                props,
            })}
        </RowContext>
    );
}

/** A header cell's props: its column, and whether it sorts (then put a SortHeader in it). */
export interface TableHeaderCellProps extends TablePartProps {
    readonly column?: string | undefined;
    readonly sortable?: boolean | undefined;
}

/** A column's header, a `<th>`: `aria-sort` on a sortable one. */
function HeaderCell({
    column,
    sortable,
    unstyled,
    ...props
}: TableHeaderCellProps): ReactNode {
    const { scope, api } = context.use("HeaderCell");
    return scope.render("headerCell", {
        element: "th",
        machine: api.getHeaderCellProps({ column, sortable }),
        unstyled,
        props,
    });
}

/** The cell of the selection column: the header row's select-all checkbox (in a table choosing
 *  many rows), or a body row's own. Holds the checkbox unless given children. */
function SelectionCell({
    unstyled,
    children,
    ...props
}: TablePartProps): ReactNode {
    const { scope, api, checkboxProps } = context.use("SelectionCell");
    const { value } = use(RowContext);
    // An empty header cell is a plain cell: the header has no select-all checkbox in a table
    // choosing one row.
    const header = value === undefined && api.selectionMode === "multiple";
    const box =
        value === undefined ? (
            api.selectionMode === "multiple" ? (
                <Checkbox
                    {...checkboxProps}
                    aria-label={api.translations.selectAll}
                    checked={api.selectAll}
                    onCheckedChange={() => api.toggleAll()}
                />
            ) : null
        ) : (
            <Checkbox
                {...checkboxProps}
                aria-label={api.translations.selectRow}
                checked={api.isSelected(value)}
                onCheckedChange={() => api.toggleRow(value)}
            />
        );
    return scope.render("selectionCell", {
        element: header ? "th" : "td",
        machine: api.getSelectionCellProps({ header }),
        unstyled,
        props: { ...props, children: isPresent(children) ? children : box },
    });
}

/** A sort header's props: the column it sorts, its own source, its label as children, and the
 *  props of the label's and the arrow's elements. */
export interface TableSortHeaderProps
    extends TablePartProps, InteractionSourceProps {
    readonly column: string;
    readonly labelProps?: TablePartProps | undefined;
    readonly indicatorProps?: TablePartProps | undefined;
}

/** The button in a sortable column's header: its label, then the arrow, which shows the
 *  sorted direction and hints at the first one while hovered or focused. */
function SortHeader({
    column,
    children,
    labelProps,
    indicatorProps,
    ...props
}: TableSortHeaderProps): ReactNode {
    const { scope, api } = context.use("SortHeader");
    const button = useMachineButton(props, [
        api.getSortHeaderProps({ column }) as Readonly<Record<string, unknown>>,
    ]);
    const sorted = api.sort?.column === column;
    const descending = api.arrowDirection(column) === "descending";
    const { unstyled: labelUnstyled, ...label } = labelProps ?? {};
    const { unstyled: arrowUnstyled, ...arrow } = indicatorProps ?? {};
    return scope.render("sortHeader", {
        ...button,
        states: { filled: sorted },
        props: {
            ...button.props,
            children: (
                <>
                    {scope.render("sortLabel", {
                        element: "span",
                        machine: api.getSortLabelProps({ column }),
                        unstyled: labelUnstyled,
                        props: { ...label, children },
                    })}
                    {scope.render("sortIndicator", {
                        element: "span",
                        machine: api.getSortIndicatorProps({ column }),
                        states: { descending },
                        unstyled: arrowUnstyled,
                        props: { ...arrow, children: <ArrowUpwardIcon /> },
                    })}
                </>
            ),
        },
    });
}

/** The table's sort and selection, for a part placed in it: the machine's API. */
export function useTable(): Api {
    return context.use("useTable").api;
}

/** The ready-made table's props: Root's, with `className`, `style`, `slotProps` and `unstyled`
 *  keyed by part (a body row's parts also by row, `TableRowInstance`; a body cell's by cell,
 *  `TableCellInstance`; a header's or footer's by column, `TableColumnInstance`), and its columns
 *  and rows. */
export interface TableProps<Row = Record<string, unknown>>
    extends
        Omit<TableRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy, never, TableInstances<Row>>,
        TableContentProps<Row, ReactNode> {}

type Slot<Row> = SlotPropsOf<PartName<Anatomy>, TableInstances<Row>>;

/** The ready-made table: a header row of the columns' headers (sort headers where they sort),
 *  a row per entry of `rows` in the sort's order, and a footer row when a column has a footer.
 *  A table with a selection mode leads each row with a checkbox. */
function ReadyMade<Row>(props: TableProps<Row>): ReactNode {
    const {
        className: _className,
        style: _style,
        slotProps: _slotProps,
        columns: _columns,
        rows = [],
        rowValue,
        ...rootProps
    } = props;
    const slot = useSlotProps<Anatomy, never, TableInstances<Row>>(props);
    const values = rows.map((row, index) =>
        tableRowValue(row, index, rowValue),
    );
    return (
        <Root rowValues={values} {...rootProps} {...(slot("root") as object)}>
            <ReadyMadeParts {...props} slotOf={slot} />
        </Root>
    );
}

function ReadyMadeParts<Row>(
    props: TableProps<Row> & { readonly slotOf: Slot<Row> },
): ReactNode {
    const { api } = context.use("Table");
    const slot = props.slotOf;
    const columns = props.columns ?? [];
    const selectable = props.selectionMode !== undefined;
    const entries = (props.rows ?? []).map((row, index) => ({
        row,
        value: tableRowValue(row, index, props.rowValue),
    }));
    const sortColumn = columns.find((each) => each.id === api.sort?.column);
    const rows = sortColumn
        ? table.sortRows(entries, api.sort, (entry) =>
              tableCellValue(sortColumn, entry.row),
          )
        : entries;
    const eachRow = slot.each("row") || slot.each("alternateRow");
    const eachCell = slot.each("cell");
    const eachHeader =
        slot.each("headerCell") ||
        slot.each("sortHeader") ||
        slot.each("sortLabel") ||
        slot.each("sortIndicator");
    const eachFooter = slot.each("footerCell");
    const columnOf = (
        each: boolean,
        column: string,
        columnIndex: number,
    ): TableColumnInstance | undefined =>
        each ? { column, columnIndex } : undefined;
    const footerSelection = columnOf(eachFooter, "", -1);
    return (
        <>
            <Header {...slot("header")}>
                <HeaderRow {...slot("headerRow")}>
                    {selectable ? (
                        <SelectionCell {...slot("selectionCell")} />
                    ) : null}
                    {columns.map((column, columnIndex) => {
                        const header = columnOf(
                            eachHeader,
                            column.id,
                            columnIndex,
                        );
                        return (
                            <HeaderCell
                                key={column.id}
                                column={column.id}
                                sortable={column.sortable}
                                {...slot("headerCell", header)}
                            >
                                {column.sortable ? (
                                    <SortHeader
                                        column={column.id}
                                        labelProps={slot("sortLabel", header)}
                                        indicatorProps={slot(
                                            "sortIndicator",
                                            header,
                                        )}
                                        {...slot("sortHeader", header)}
                                    >
                                        {column.header ?? column.id}
                                    </SortHeader>
                                ) : (
                                    (column.header ?? column.id)
                                )}
                            </HeaderCell>
                        );
                    })}
                </HeaderRow>
            </Header>
            <Body {...slot("body")}>
                {rows.map((entry, index) => {
                    const row: TableRowInstance<Row> | undefined = eachRow
                        ? {
                              index,
                              row: entry.row,
                              value: entry.value,
                              selected: api.isSelected(entry.value),
                          }
                        : undefined;
                    return (
                        <Row
                            key={entry.value}
                            value={entry.value}
                            index={index}
                            {...slot(tableRowPart(index, props.striped), row)}
                        >
                            {selectable ? (
                                <SelectionCell {...slot("selectionCell")} />
                            ) : null}
                            {columns.map((column, columnIndex) => {
                                const cell: TableCellInstance<Row> | undefined =
                                    eachCell
                                        ? {
                                              rowIndex: index,
                                              row: entry.row,
                                              column: column.id,
                                              columnIndex,
                                          }
                                        : undefined;
                                return (
                                    <Cell
                                        key={column.id}
                                        {...slot("cell", cell)}
                                    >
                                        {column.cell
                                            ? column.cell(entry.row)
                                            : String(
                                                  tableCellValue(
                                                      column,
                                                      entry.row,
                                                  ) ?? "",
                                              )}
                                    </Cell>
                                );
                            })}
                        </Row>
                    );
                })}
            </Body>
            {columns.some((column) => isPresent(column.footer)) ? (
                <Footer {...slot("footer")}>
                    <FooterRow {...slot("footerRow")}>
                        {selectable ? (
                            <FooterCell
                                {...slot("footerCell", footerSelection)}
                            />
                        ) : null}
                        {columns.map((column, columnIndex) => (
                            <FooterCell
                                key={column.id}
                                {...slot(
                                    "footerCell",
                                    columnOf(
                                        eachFooter,
                                        column.id,
                                        columnIndex,
                                    ),
                                )}
                            >
                                {column.footer}
                            </FooterCell>
                        ))}
                    </FooterRow>
                </Footer>
            ) : null}
        </>
    );
}

/** A data table, with Angular Material's sort header. Use it ready-made, `<Table columns={[{ id:
 *  "name", header: "Name", sortable: true }]} rows={elements} />`, or compose its parts under
 *  `Table.Root`: `Header` with a `HeaderRow` of `HeaderCell`s (a `SortHeader` in each sortable
 *  one), `Body` with a `Row` of `Cell`s per row, `Footer` with a `FooterRow` of `FooterCell`s,
 *  and a `SelectionCell` leading each row in a table with a selection. */
export const Table = Object.assign(ReadyMade, {
    Root,
    Header,
    Body,
    Footer,
    HeaderRow,
    Row,
    FooterRow,
    HeaderCell,
    Cell,
    FooterCell,
    SelectionCell,
    SortHeader,
});
