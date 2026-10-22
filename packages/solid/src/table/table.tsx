// The table: Root on pureform's table machine (the sort and the chosen rows), around the Header,
// Body and Footer row groups, their rows (HeaderRow, Row, FooterRow) and cells (HeaderCell, Cell,
// FooterCell), the SelectionCell holding a row's checkbox (or the header's select-all one), and
// the SortHeader button a sortable column's header holds, with its label and arrow; and the
// ready-made Table, which renders and sorts its rows from data. Every element keeps its table
// role, which the preset's flex layout would otherwise drop.

import { dataTableAnatomy } from "@pureform/anatomy";
import type { PartName } from "@pureform/anatomy";
import {
    isPresent,
    TABLE_CONTENT_PROPS,
    TABLE_ROOT_PROPS,
    tableCellValue,
    tableMachineProps,
    tableRowPart,
    tableRowValue,
    tableSelection,
} from "@pureform/binding-core";
import type {
    InteractionSourceProps,
    TableContentProps,
    TableRootOwnProps,
    TableSort,
} from "@pureform/binding-core";
import * as table from "@pureform/machines/table";
import type { JSX, ValidComponent } from "@solidjs/web";
import {
    type Accessor,
    createContext,
    createMemo,
    createUniqueId,
    For,
    merge,
    omit,
    Show,
    untrack,
    useContext,
} from "solid-js";

import { Checkbox } from "../checkbox";
import { useControllable } from "../controllable";
import { ArrowUpwardIcon } from "../glyphs";
import { useMachineButton } from "../interaction";
import { normalizeProps, useMachine } from "../internal/zag";
import type { PropTypes } from "../internal/zag";
import { createPartContext } from "../part-context";
import { createSlotProps, machinePart, useComponent } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

type Anatomy = typeof dataTableAnatomy;
type Api = table.Api<PropTypes>;

/** What Root shares with its parts. */
interface TableContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: Accessor<Api>;
    readonly striped: Accessor<boolean | undefined>;
}

const context = createPartContext<TableContextValue>("Table");

// Where a selection cell sits: the header row (select all) or a body row (its value).
const RowContext = createContext<{ readonly value?: Accessor<string> }>({});

/** Root's props: the variants and tokens, the sort and selection, `testId` and `unstyled` for
 *  every part, `as`, and the element's own props. */
export interface TableRootProps
    extends Omit<PartProps, keyof TableRootOwnProps>, TableRootOwnProps {
    /** Another element or component to render instead of `<table>`. */
    readonly as?: ValidComponent | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface TablePartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** The table, `role="table"`. */
function Root(props: TableRootProps): JSX.Element {
    const id = createUniqueId();
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
    const service = useMachine(table.machine, () => {
        const sorted = sort.machineProps();
        const chosen = selection.machineProps();
        return {
            id,
            dir: dir(),
            ...tableMachineProps(props),
            ...sorted,
            sort: sorted.sort ?? undefined,
            defaultSort: sorted.defaultSort ?? undefined,
            selection: chosen.selection ? [...chosen.selection] : undefined,
            defaultSelection: chosen.defaultSelection
                ? [...chosen.defaultSelection]
                : undefined,
            onSelectionChange: chosen.onSelectionChange,
        } as table.Props;
    });
    const api = createMemo(() => table.connect(service, normalizeProps));
    const scope = useComponent(dataTableAnatomy, {
        selection: () => tableSelection(props),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
        indication: () => props.indication,
    });
    return (
        <context.Provider value={{ scope, api, striped: () => props.striped }}>
            {scope.render("root", {
                element: "table",
                as: () => props.as,
                machine: () => api().getRootProps(),
                props: omit(props, "as", ...TABLE_ROOT_PROPS),
            })}
        </context.Provider>
    );
}

// A part on its own element, spreading the machine's props for it.
const part = (
    name: PartName<Anatomy>,
    label: string,
    element: ValidComponent,
    machine: (api: Api) => object,
) =>
    machinePart(context.use, element)(name, label, ({ api }) => machine(api()));

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

/** The header row; its selection cell is the select-all checkbox. */
function HeaderRow(props: TablePartProps): JSX.Element {
    const { scope, api } = context.use("HeaderRow");
    return (
        <RowContext value={{}}>
            {scope.render("headerRow", {
                element: "tr",
                machine: () => api().getHeaderRowProps(),
                unstyled: () => props.unstyled,
                props: omit(props, "unstyled"),
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
function Row(props: TableRowProps): JSX.Element {
    const { scope, api, striped } = context.use("Row");
    return (
        <RowContext value={{ value: () => props.value }}>
            {scope.render(tableRowPart(props.index ?? 0, striped()), {
                element: "tr",
                machine: () => api().getRowProps({ value: props.value }),
                unstyled: () => props.unstyled,
                props: omit(props, "unstyled", "value", "index"),
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
function HeaderCell(props: TableHeaderCellProps): JSX.Element {
    const { scope, api } = context.use("HeaderCell");
    return scope.render("headerCell", {
        element: "th",
        machine: () =>
            api().getHeaderCellProps({
                column: props.column,
                sortable: props.sortable,
            }),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled", "column", "sortable"),
    });
}

/** The cell of the selection column: the header row's select-all checkbox (in a table choosing
 *  many rows), or a body row's own. Holds the checkbox unless given children. */
function SelectionCell(props: TablePartProps): JSX.Element {
    const { scope, api } = context.use("SelectionCell");
    const row = useContext(RowContext);
    // An empty header cell is a plain cell: the header has no select-all checkbox in a table
    // choosing one row.
    const header = () =>
        row.value === undefined && api().selectionMode === "multiple";
    const box = () => {
        const value = row.value?.();
        if (value === undefined) {
            return api().selectionMode === "multiple" ? (
                <Checkbox
                    aria-label={api().translations.selectAll}
                    checked={api().selectAll}
                    onCheckedChange={() => api().toggleAll()}
                />
            ) : undefined;
        }
        return (
            <Checkbox
                aria-label={api().translations.selectRow}
                checked={api().isSelected(value)}
                onCheckedChange={() => api().toggleRow(value)}
            />
        );
    };
    return scope.render("selectionCell", {
        element: untrack(header) ? "th" : "td",
        machine: () => api().getSelectionCellProps({ header: header() }),
        unstyled: () => props.unstyled,
        props: merge(omit(props, "unstyled"), {
            get children() {
                return isPresent(props.children) ? props.children : box();
            },
        }),
    });
}

/** A sort header's props: the column it sorts, its own source, and its label as children. */
export interface TableSortHeaderProps
    extends TablePartProps, InteractionSourceProps {
    readonly column: string;
}

/** The button in a sortable column's header: its label, then the arrow, which shows the
 *  sorted direction and hints at the first one while hovered or focused. */
function SortHeader(props: TableSortHeaderProps): JSX.Element {
    const { scope, api } = context.use("SortHeader");
    const button = useMachineButton(omit(props, "column", "children"), () => [
        api().getSortHeaderProps({ column: props.column }) as Readonly<
            Record<string, unknown>
        >,
    ]);
    return scope.render("sortHeader", {
        ...button,
        states: () => ({ filled: api().sort?.column === props.column }),
        props: merge(button.props, {
            get children() {
                return (
                    <>
                        {scope.render("sortLabel", {
                            element: "span",
                            machine: () =>
                                api().getSortLabelProps({
                                    column: props.column,
                                }),
                            props: { children: props.children },
                        })}
                        {scope.render("sortIndicator", {
                            element: "span",
                            machine: () =>
                                api().getSortIndicatorProps({
                                    column: props.column,
                                }),
                            props: { children: <ArrowUpwardIcon /> },
                        })}
                    </>
                );
            },
        }),
    });
}

/** The table's sort and selection, for a part placed in it: the machine's API. */
export function useTable(): Accessor<Api> {
    return context.use("useTable").api;
}

/** The ready-made table's props: Root's, with `class`, `style`, and `slotProps` keyed by part,
 *  and its columns and rows. */
export interface TableProps<Row = Record<string, unknown>>
    extends
        Omit<TableRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy>,
        TableContentProps<Row, JSX.Element> {}

/** The ready-made table: a header row of the columns' headers (sort headers where they sort),
 *  a row per entry of `rows` in the sort's order, and a footer row when a column has a footer.
 *  A table with a selection mode leads each row with a checkbox. */
function ReadyMade<Row>(props: TableProps<Row>): JSX.Element {
    const slots = createSlotProps(props);
    const own = omit(
        props,
        "class",
        "style",
        "slotProps",
        ...TABLE_CONTENT_PROPS,
    ) as TableRootProps;
    const values = createMemo(() =>
        (props.rows ?? []).map((row, index) =>
            tableRowValue(row, index, props.rowValue),
        ),
    );
    return (
        <Root rowValues={values()} {...own} {...(slots("root") as object)}>
            <ReadyMadeParts {...props} slots={slots} />
        </Root>
    );
}

function ReadyMadeParts<Row>(
    props: TableProps<Row> & {
        readonly slots: (part: PartName<Anatomy>) => PartProps;
    },
): JSX.Element {
    const { api } = context.use("Table");
    const columns = () => props.columns ?? [];
    const selectable = () => props.selectionMode !== undefined;
    const rows = createMemo(() => {
        const sort = api().sort;
        const entries = (props.rows ?? []).map((row, index) => ({
            row,
            value: tableRowValue(row, index, props.rowValue),
        }));
        const column = columns().find((each) => each.id === sort?.column);
        return column
            ? table.sortRows(entries, sort, (entry) =>
                  tableCellValue(column, entry.row),
              )
            : entries;
    });
    return (
        <>
            <Header {...props.slots("header")}>
                <HeaderRow {...props.slots("headerRow")}>
                    <Show when={selectable()}>
                        <SelectionCell {...props.slots("selectionCell")} />
                    </Show>
                    <For each={columns()}>
                        {(column) => (
                            <HeaderCell
                                column={column.id}
                                sortable={column.sortable}
                                {...props.slots("headerCell")}
                            >
                                <Show
                                    when={column.sortable}
                                    fallback={column.header ?? column.id}
                                >
                                    <SortHeader
                                        column={column.id}
                                        {...props.slots("sortHeader")}
                                    >
                                        {column.header ?? column.id}
                                    </SortHeader>
                                </Show>
                            </HeaderCell>
                        )}
                    </For>
                </HeaderRow>
            </Header>
            <Body {...props.slots("body")}>
                <For each={rows()}>
                    {(entry, index) => (
                        <Row
                            value={entry.value}
                            index={index()}
                            {...props.slots(
                                tableRowPart(index(), props.striped),
                            )}
                        >
                            <Show when={selectable()}>
                                <SelectionCell
                                    {...props.slots("selectionCell")}
                                />
                            </Show>
                            <For each={columns()}>
                                {(column) => (
                                    <Cell {...props.slots("cell")}>
                                        {column.cell
                                            ? column.cell(entry.row)
                                            : String(
                                                  tableCellValue(
                                                      column,
                                                      entry.row,
                                                  ) ?? "",
                                              )}
                                    </Cell>
                                )}
                            </For>
                        </Row>
                    )}
                </For>
            </Body>
            <Show when={columns().some((column) => isPresent(column.footer))}>
                <Footer {...props.slots("footer")}>
                    <FooterRow {...props.slots("footerRow")}>
                        <Show when={selectable()}>
                            <FooterCell {...props.slots("footerCell")} />
                        </Show>
                        <For each={columns()}>
                            {(column) => (
                                <FooterCell {...props.slots("footerCell")}>
                                    {column.footer}
                                </FooterCell>
                            )}
                        </For>
                    </FooterRow>
                </Footer>
            </Show>
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
