import type { Service } from "@zag-js/core";
import { dataAttr } from "@zag-js/dom-query";
import type { NormalizeProps, PropTypes } from "@zag-js/types";

import { ariaSort, nextSort } from "./table.logic";
import type { Sort } from "./table.logic";
import type { TableApi, TableSchema } from "./table.types";

export function connect<T extends PropTypes>(
    service: Service<TableSchema>,
    normalize: NormalizeProps<T>,
): TableApi<T> {
    const { send, context, prop, computed, scope } = service;
    const sort = context.get("sort");
    const selection = context.get("selection");
    const selectionMode = prop("selectionMode");
    const dir = prop("dir");

    const setSort = (next: Sort | null) =>
        send({ type: "SORT.SET", sort: next });
    const toggleSort = (column: string) =>
        setSort(
            nextSort(sort, column, {
                start: prop("sortStart") ?? "ascending",
                clearable: prop("sortClearable") ?? true,
            }),
        );
    const isSelected = (row: string) => selection.includes(row);

    return {
        sort,
        selection,
        selectionMode,
        selectAll: computed("selectAll"),
        translations: computed("translations"),
        setSort,
        toggleSort,
        ariaSort: (column) => ariaSort(sort, column),
        setSelection(next) {
            send({ type: "SELECTION.SET", selection: next });
        },
        isSelected,
        toggleRow(row) {
            send({ type: "ROW.TOGGLE", row });
        },
        toggleAll() {
            send({ type: "ALL.TOGGLE" });
        },
        getRootProps() {
            return normalize.element({
                id: scope.ids?.root ?? `table:${scope.id}`,
                dir,
                role: "table",
            });
        },
        getHeaderProps() {
            return normalize.element({ role: "rowgroup" });
        },
        getBodyProps() {
            return normalize.element({ role: "rowgroup" });
        },
        getFooterProps() {
            return normalize.element({ role: "rowgroup" });
        },
        getHeaderRowProps() {
            return normalize.element({ role: "row" });
        },
        getRowProps({ value }) {
            const selected = selectionMode !== undefined && isSelected(value);
            return normalize.element({
                role: "row",
                "data-value": value,
                "data-selected": dataAttr(selected),
                "aria-selected":
                    selectionMode === undefined ? undefined : selected,
            });
        },
        getFooterRowProps() {
            return normalize.element({ role: "row" });
        },
        getHeaderCellProps({ column, sortable } = {}) {
            return normalize.element({
                role: "columnheader",
                "data-column": column,
                "aria-sort":
                    sortable && column !== undefined
                        ? ariaSort(sort, column)
                        : undefined,
            });
        },
        getCellProps() {
            return normalize.element({ role: "cell" });
        },
        getFooterCellProps() {
            return normalize.element({ role: "cell" });
        },
        getSelectionCellProps({ header }) {
            return normalize.element({
                role: header ? "columnheader" : "cell",
            });
        },
        getSortHeaderProps({ column }) {
            const sorted = sort?.column === column;
            return normalize.button({
                type: "button",
                "data-column": column,
                "data-sorted": dataAttr(sorted),
                "data-direction": sorted ? sort.direction : undefined,
                onClick(event) {
                    if (event.defaultPrevented) return;
                    toggleSort(column);
                },
            });
        },
        getSortLabelProps() {
            return normalize.element({});
        },
        getSortIndicatorProps({ column }) {
            const sorted = sort?.column === column;
            return normalize.element({
                "aria-hidden": true,
                "data-direction": sorted
                    ? sort.direction
                    : (prop("sortStart") ?? "ascending"),
            });
        },
    };
}
