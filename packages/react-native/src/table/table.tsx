// The table: views laid out as flex rows, each with its table role: a header row of the columns'
// headers (a sort header button where a column sorts), a row per entry of `rows` in the sort's
// order, and a footer row when a column has a footer. A table with a selection mode leads each
// row with a checkbox, and the header with a select-all one. React Native has no sticky position,
// so `stickyHeader` leaves the header where it is; put the table in a ScrollView with
// `stickyHeaderIndices` for that.

import { dataTableAnatomy } from "@pureform/anatomy";
import {
    isPresent,
    tableCellValue,
    tableRowPart,
    tableRowValue,
    tableSelection,
} from "@pureform/binding-core";
import type {
    ChangeDetails,
    TableColumn,
    TableContentProps,
    TablePart,
    TableRootOwnProps,
    TableSort,
} from "@pureform/binding-core";
import {
    arrowDirection,
    nextSort,
    selectAllState,
    sortRows,
    toggleAll,
    toggleRow,
} from "@pureform/machines/table";
import type { ReactNode } from "react";

import { Checkbox } from "../checkbox";
import { Glyph, IconSlot, iconSlot } from "../icon-style";
import { useSurfaceIndication } from "../indication";
import { testIdOf, unselectable, useControllable, withEngine } from "../parts";
import { useComponentSlots } from "../styles";

const [INDICATION] = dataTableAnatomy.indication!;

export interface TableProps<Row = Record<string, unknown>>
    extends
        Omit<TableRootOwnProps, "unstyled" | "rowValues">,
        TableContentProps<Row, ReactNode> {
    readonly "aria-label"?: string | undefined;
}

type Selection = ReturnType<typeof tableSelection>;
type Id = (part: TablePart) => string | undefined;

// What a cell holds: text in the cell's type, or the given view.
function CellContent(props: {
    readonly part: TablePart;
    readonly role: "cell" | "columnheader";
    readonly styles: Record<string, unknown>;
    readonly views: Record<string, { Text: never; View: never }>;
    readonly id: Id;
    readonly children: ReactNode;
}): ReactNode {
    const Slot = props.views[props.part] as unknown as {
        Text: React.ComponentType<Record<string, unknown>>;
        View: React.ComponentType<Record<string, unknown>>;
    };
    const text =
        typeof props.children === "string" ||
        typeof props.children === "number";
    const Element = text ? Slot.Text : Slot.View;
    return (
        <Element
            role={props.role}
            style={props.styles[props.part]}
            testID={props.id(props.part)}
        >
            {props.children}
        </Element>
    );
}

// The button in a sortable column's header, with its own indication and state.
function SortHeader(props: {
    readonly selection: Selection;
    readonly sort: TableSort | null;
    readonly column: string;
    readonly label: ReactNode;
    readonly start: TableSort["direction"] | undefined;
    readonly onPress: () => void;
    readonly indication: TableProps["indication"];
    readonly id: Id;
}): ReactNode {
    const indication = useSurfaceIndication(INDICATION!, {
        indication: props.indication,
    });
    const sorted = props.sort?.column === props.column;
    const direction = sorted ? props.sort!.direction : undefined;
    const {
        styles: s,
        selected,
        views: v,
    } = useComponentSlots<TablePart>(
        "dataTable",
        indication.select(props.selection),
        indication.states({
            filled: sorted,
            descending:
                arrowDirection(props.sort, props.column, props.start) ===
                "descending",
        }),
    );
    return (
        <v.sortHeader.Pressable
            {...indication.handlers}
            role="button"
            {...(typeof props.label === "string"
                ? {
                      "aria-label": direction
                          ? `${props.label}, sorted ${direction}`
                          : props.label,
                  }
                : {})}
            onPress={props.onPress}
            style={{ ...s.sortHeader, ...unselectable }}
            testID={props.id("sortHeader")}
        >
            <v.sortLabel.Text
                style={s.sortLabel}
                testID={props.id("sortLabel")}
            >
                {props.label}
            </v.sortLabel.Text>
            <v.sortIndicator.View
                aria-hidden
                style={s.sortIndicator}
                testID={props.id("sortIndicator")}
            >
                <IconSlot
                    {...iconSlot(selected, "sortIndicator")}
                    motion={s.sortIndicator}
                >
                    <Glyph glyph="↑" />
                </IconSlot>
            </v.sortIndicator.View>
            {indication.layer(selected)}
        </v.sortHeader.Pressable>
    );
}

// A body row, in its state: selected or not, striped or not.
function BodyRow<Row>(props: {
    readonly selection: Selection;
    readonly row: Row;
    readonly index: number;
    readonly striped: boolean | undefined;
    readonly selectable: boolean;
    readonly selected: boolean;
    readonly selectLabel: string;
    readonly onToggle: () => void;
    readonly columns: readonly TableColumn<Row, ReactNode>[];
    readonly id: Id;
}): ReactNode {
    const { styles: s, views: v } = useComponentSlots<TablePart>(
        "dataTable",
        props.selection,
        props.selectable ? { selected: props.selected } : {},
    );
    const part = tableRowPart(props.index, props.striped);
    const RowView = v[part].View;
    return (
        <RowView
            role="row"
            {...(props.selectable ? { "aria-selected": props.selected } : {})}
            style={s[part]}
            testID={props.id(part)}
        >
            {props.selectable ? (
                <v.selectionCell.View
                    role="cell"
                    style={s.selectionCell}
                    testID={props.id("selectionCell")}
                >
                    <Checkbox
                        aria-label={props.selectLabel}
                        checked={props.selected}
                        onCheckedChange={props.onToggle}
                    />
                </v.selectionCell.View>
            ) : null}
            {props.columns.map((column) => (
                <CellContent
                    key={column.id}
                    part="cell"
                    role="cell"
                    styles={s as Record<string, unknown>}
                    views={v as never}
                    id={props.id}
                >
                    {column.cell
                        ? column.cell(props.row)
                        : String(tableCellValue(column, props.row) ?? "")}
                </CellContent>
            ))}
        </RowView>
    );
}

function TableImpl<Row>(props: TableProps<Row>): ReactNode {
    const [sort, setSort] = useControllable<"sort", TableSort | null>(
        "Table",
        "sort",
        props.sort,
        props.defaultSort,
        props.onSortChange as
            | ((details: ChangeDetails<"sort", TableSort | null>) => void)
            | undefined,
        null,
    );
    const [selection, setSelection] = useControllable<
        "selection",
        readonly string[]
    >(
        "Table",
        "selection",
        props.selection,
        props.defaultSelection,
        props.onSelectionChange as
            | ((details: ChangeDetails<"selection", readonly string[]>) => void)
            | undefined,
        [],
    );
    const registry = tableSelection(props);
    const { styles: s, views: v } = useComponentSlots<TablePart>(
        "dataTable",
        registry,
    );
    const id: Id = (part) => testIdOf(dataTableAnatomy, part, props.testId);
    const columns = props.columns ?? [];
    const selectable = props.selectionMode !== undefined;
    const entries = (props.rows ?? []).map((row, index) => ({
        row,
        value: tableRowValue(row, index, props.rowValue),
    }));
    const values = entries.map((entry) => entry.value);
    const sortColumn = columns.find((each) => each.id === sort?.column);
    const rows = sortColumn
        ? sortRows(entries, sort, (entry) =>
              tableCellValue(sortColumn, entry.row),
          )
        : entries;
    const selectAll = props.translations?.selectAll ?? "Select all rows";
    const selectRow = props.translations?.selectRow ?? "Select row";
    const hasFooter = columns.some((column) => isPresent(column.footer));
    const cell = (
        part: TablePart,
        role: "cell" | "columnheader",
        key: string,
        children: ReactNode,
    ) => (
        <CellContent
            key={key}
            part={part}
            role={role}
            styles={s as Record<string, unknown>}
            views={v as never}
            id={id}
        >
            {children}
        </CellContent>
    );
    return (
        <v.root.View
            role="table"
            {...(props["aria-label"] === undefined
                ? {}
                : { "aria-label": props["aria-label"] })}
            style={s.root}
            testID={id("root")}
        >
            <v.header.View
                role="rowgroup"
                style={s.header}
                testID={id("header")}
            >
                <v.headerRow.View
                    role="row"
                    style={s.headerRow}
                    testID={id("headerRow")}
                >
                    {selectable ? (
                        <v.selectionCell.View
                            role={
                                props.selectionMode === "multiple"
                                    ? "columnheader"
                                    : "cell"
                            }
                            style={s.selectionCell}
                            testID={id("selectionCell")}
                        >
                            {props.selectionMode === "multiple" ? (
                                <Checkbox
                                    aria-label={selectAll}
                                    checked={selectAllState(selection, values)}
                                    onCheckedChange={() =>
                                        setSelection(
                                            toggleAll(selection, values),
                                        )
                                    }
                                />
                            ) : null}
                        </v.selectionCell.View>
                    ) : null}
                    {columns.map((column) =>
                        column.sortable ? (
                            <v.headerCell.View
                                key={column.id}
                                role="columnheader"
                                style={s.headerCell}
                                testID={id("headerCell")}
                            >
                                <SortHeader
                                    selection={registry}
                                    sort={sort}
                                    column={column.id}
                                    label={column.header ?? column.id}
                                    indication={props.indication}
                                    id={id}
                                    start={props.sortStart}
                                    onPress={() =>
                                        setSort(
                                            nextSort(sort, column.id, {
                                                start:
                                                    props.sortStart ??
                                                    "ascending",
                                                clearable:
                                                    props.sortClearable ?? true,
                                            }),
                                        )
                                    }
                                />
                            </v.headerCell.View>
                        ) : (
                            cell(
                                "headerCell",
                                "columnheader",
                                column.id,
                                column.header ?? column.id,
                            )
                        ),
                    )}
                </v.headerRow.View>
            </v.header.View>
            <v.body.View role="rowgroup" style={s.body} testID={id("body")}>
                {rows.map((entry, index) => (
                    <BodyRow
                        key={entry.value}
                        selection={registry}
                        row={entry.row}
                        index={index}
                        striped={props.striped}
                        selectable={selectable}
                        selected={selection.includes(entry.value)}
                        selectLabel={selectRow}
                        onToggle={() =>
                            setSelection(
                                toggleRow(
                                    selection,
                                    entry.value,
                                    props.selectionMode,
                                ),
                            )
                        }
                        columns={columns}
                        id={id}
                    />
                ))}
            </v.body.View>
            {hasFooter ? (
                <v.footer.View
                    role="rowgroup"
                    style={s.footer}
                    testID={id("footer")}
                >
                    <v.footerRow.View
                        role="row"
                        style={s.footerRow}
                        testID={id("footerRow")}
                    >
                        {selectable
                            ? cell("footerCell", "cell", "", null)
                            : null}
                        {columns.map((column) =>
                            cell(
                                "footerCell",
                                "cell",
                                column.id,
                                column.footer,
                            ),
                        )}
                    </v.footerRow.View>
                </v.footer.View>
            ) : null}
        </v.root.View>
    );
}

/** A data table, with Angular Material's sort header: `<Table columns={[{ id: "name", header:
 *  "Name", sortable: true }]} rows={elements} selectionMode="multiple" />`. */
export const Table = withEngine(TableImpl, "Table") as <
    Row = Record<string, unknown>,
>(
    props: TableProps<Row>,
) => ReactNode;
