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
    TableCellInstance,
    TableColumn,
    TableColumnInstance,
    TableContentProps,
    TableInstances,
    TablePart,
    TableRootOwnProps,
    TableRowInstance,
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
import type { CheckboxProps } from "../checkbox";
import { Glyph, IconSlot, iconSlot } from "../icon-style";
import { useSurfaceIndication } from "../indication";
import { testIdOf, useControllable, withEngine } from "../parts";
import { nativeSlots, withUnselectable } from "../slot-props";
import type { PartSlots } from "../slot-props";
import type { InnerPropsOf, NativeSlotProps } from "../slot-props";
import { useComponentSlots } from "../styles";

const [INDICATION] = dataTableAnatomy.indication!;

/** What each part renders as, for its keyed `style` and `slotProps`. */
export interface TableHosts {
    readonly sortHeader: "Pressable";
    readonly sortLabel: "Text";
    readonly sortIndicator: "View";
    readonly selectionCell: "View";
    readonly root: "View";
    readonly header: "View";
    readonly headerRow: "View";
    readonly headerCell: "Text";
    readonly row: "View";
    readonly alternateRow: "View";
    readonly cell: "Text";
    readonly footerCell: "Text";
    readonly body: "View";
    readonly footer: "View";
    readonly footerRow: "View";
}

/** The table's props: Root's, with `style` and `slotProps` keyed by part (a body row's parts also
 *  by row, `TableRowInstance`; a body cell's by cell, `TableCellInstance`; a header's or footer's
 *  by column, `TableColumnInstance`), and its columns and rows. */
export interface TableProps<Row = Record<string, unknown>>
    extends
        Omit<TableRootOwnProps, "unstyled" | "rowValues">,
        TableContentProps<Row, ReactNode>,
        NativeSlotProps<TableHosts, TableInstances<Row>> {
    readonly "aria-label"?: string | undefined;
    /** The selection checkboxes' (select-all and each row's) `style`, `slotProps`, `tokens`
     *  and `testId`. */
    readonly checkboxProps?: InnerPropsOf<CheckboxProps> | undefined;
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
    readonly slot: PartSlots;
    readonly instance?: unknown;
    readonly children: ReactNode;
}): ReactNode {
    const slot = props.slot;
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
            {...slot.props(props.part, props.instance)}
            role={props.role}
            style={slot.style(
                props.part,
                props.styles[props.part],
                props.instance,
            )}
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
    readonly slot: PartSlots;
    readonly instance: TableColumnInstance | undefined;
}): ReactNode {
    const slot = props.slot;
    const each = props.instance;
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
            {...slot.props("sortHeader", each)}
            {...slot.with("sortHeader", indication.handlers, each)}
            role="button"
            {...(typeof props.label === "string"
                ? {
                      "aria-label": direction
                          ? `${props.label}, sorted ${direction}`
                          : props.label,
                  }
                : {})}
            onPress={slot.on("sortHeader", "onPress", props.onPress, each)}
            style={slot.style(
                "sortHeader",
                withUnselectable(s.sortHeader),
                each,
            )}
            testID={props.id("sortHeader")}
        >
            <v.sortLabel.Text
                {...slot.props("sortLabel", each)}
                style={slot.style("sortLabel", s.sortLabel, each)}
                testID={props.id("sortLabel")}
            >
                {props.label}
            </v.sortLabel.Text>
            <v.sortIndicator.View
                {...slot.props("sortIndicator", each)}
                aria-hidden
                style={slot.style("sortIndicator", s.sortIndicator, each)}
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
    readonly value: string;
    readonly index: number;
    readonly striped: boolean | undefined;
    readonly selectable: boolean;
    readonly selected: boolean;
    readonly selectLabel: string;
    readonly onToggle: () => void;
    readonly columns: readonly TableColumn<Row, ReactNode>[];
    readonly id: Id;
    readonly slot: PartSlots;
    readonly checkboxProps: InnerPropsOf<CheckboxProps> | undefined;
}): ReactNode {
    const slot = props.slot;
    const { styles: s, views: v } = useComponentSlots<TablePart>(
        "dataTable",
        props.selection,
        props.selectable ? { selected: props.selected } : {},
    );
    const part = tableRowPart(props.index, props.striped);
    const RowView = v[part].View;
    const row: TableRowInstance<Row> | undefined = slot.each(part)
        ? {
              index: props.index,
              row: props.row,
              value: props.value,
              selected: props.selected,
          }
        : undefined;
    const eachCell = slot.each("cell");
    return (
        <RowView
            {...slot.props(part, row)}
            role="row"
            {...(props.selectable ? { "aria-selected": props.selected } : {})}
            style={slot.style(part, s[part], row)}
            testID={props.id(part)}
        >
            {props.selectable ? (
                <v.selectionCell.View
                    {...slot.props("selectionCell")}
                    role="cell"
                    style={slot.style("selectionCell", s.selectionCell)}
                    testID={props.id("selectionCell")}
                >
                    <Checkbox
                        {...props.checkboxProps}
                        aria-label={props.selectLabel}
                        checked={props.selected}
                        onCheckedChange={props.onToggle}
                    />
                </v.selectionCell.View>
            ) : null}
            {props.columns.map((column, columnIndex) => (
                <CellContent
                    key={column.id}
                    part="cell"
                    role="cell"
                    slot={slot}
                    instance={
                        eachCell
                            ? ({
                                  rowIndex: props.index,
                                  row: props.row,
                                  column: column.id,
                                  columnIndex,
                              } satisfies TableCellInstance<Row>)
                            : undefined
                    }
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
    const slot = nativeSlots(props);
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
    const cell = (
        part: TablePart,
        role: "cell" | "columnheader",
        key: string,
        children: ReactNode,
        instance?: TableColumnInstance,
    ) => (
        <CellContent
            key={key}
            part={part}
            role={role}
            styles={s as Record<string, unknown>}
            views={v as never}
            id={id}
            slot={slot}
            instance={instance}
        >
            {children}
        </CellContent>
    );
    return (
        <v.root.View
            {...slot.props("root")}
            role="table"
            {...(props["aria-label"] === undefined
                ? {}
                : { "aria-label": props["aria-label"] })}
            style={slot.style("root", s.root)}
            testID={id("root")}
        >
            <v.header.View
                {...slot.props("header")}
                role="rowgroup"
                style={slot.style("header", s.header)}
                testID={id("header")}
            >
                <v.headerRow.View
                    {...slot.props("headerRow")}
                    role="row"
                    style={slot.style("headerRow", s.headerRow)}
                    testID={id("headerRow")}
                >
                    {selectable ? (
                        <v.selectionCell.View
                            {...slot.props("selectionCell")}
                            role={
                                props.selectionMode === "multiple"
                                    ? "columnheader"
                                    : "cell"
                            }
                            style={slot.style("selectionCell", s.selectionCell)}
                            testID={id("selectionCell")}
                        >
                            {props.selectionMode === "multiple" ? (
                                <Checkbox
                                    {...props.checkboxProps}
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
                    {columns.map((column, columnIndex) => {
                        const header = columnOf(
                            eachHeader,
                            column.id,
                            columnIndex,
                        );
                        return column.sortable ? (
                            <v.headerCell.View
                                {...slot.props("headerCell", header)}
                                key={column.id}
                                role="columnheader"
                                style={slot.style(
                                    "headerCell",
                                    s.headerCell,
                                    header,
                                )}
                                testID={id("headerCell")}
                            >
                                <SortHeader
                                    selection={registry}
                                    sort={sort}
                                    column={column.id}
                                    label={column.header ?? column.id}
                                    indication={props.indication}
                                    id={id}
                                    slot={slot}
                                    instance={header}
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
                                header,
                            )
                        );
                    })}
                </v.headerRow.View>
            </v.header.View>
            <v.body.View
                {...slot.props("body")}
                role="rowgroup"
                style={slot.style("body", s.body)}
                testID={id("body")}
            >
                {rows.map((entry, index) => (
                    <BodyRow
                        key={entry.value}
                        checkboxProps={props.checkboxProps}
                        selection={registry}
                        row={entry.row}
                        value={entry.value}
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
                        slot={slot}
                    />
                ))}
            </v.body.View>
            {hasFooter ? (
                <v.footer.View
                    {...slot.props("footer")}
                    role="rowgroup"
                    style={slot.style("footer", s.footer)}
                    testID={id("footer")}
                >
                    <v.footerRow.View
                        {...slot.props("footerRow")}
                        role="row"
                        style={slot.style("footerRow", s.footerRow)}
                        testID={id("footerRow")}
                    >
                        {selectable
                            ? cell(
                                  "footerCell",
                                  "cell",
                                  "",
                                  null,
                                  columnOf(eachFooter, "", -1),
                              )
                            : null}
                        {columns.map((column, columnIndex) =>
                            cell(
                                "footerCell",
                                "cell",
                                column.id,
                                column.footer,
                                columnOf(eachFooter, column.id, columnIndex),
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
