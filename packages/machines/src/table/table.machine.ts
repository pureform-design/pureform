import { createMachine } from "@zag-js/core";

import { selectAllState, toggleAll, toggleRow } from "./table.logic";
import type { Sort } from "./table.logic";
import type { TableSchema } from "./table.types";

const sameSort = (a: Sort | null, b: Sort | null | undefined) =>
    a?.column === b?.column && a?.direction === b?.direction;

const sameSelection = (a: string[], b: string[] | undefined) =>
    a.length === b?.length && a.every((value, index) => value === b[index]);

// A data table's sort and selection, pureform's own machine: Zag has no table. It holds the
// column the rows are sorted by and which way, and the chosen rows, both with Zag's controllable
// semantics. The table never sorts the rows itself; the app (or the ready-made table) does.
export const machine = createMachine<TableSchema>({
    props({ props }) {
        return {
            ...props,
            defaultSelection: props.defaultSelection ?? [],
        };
    },

    initialState() {
        return "idle";
    },

    context({ prop, bindable }) {
        return {
            sort: bindable<Sort | null>(() => ({
                defaultValue: prop("defaultSort") ?? null,
                value: prop("sort"),
                isEqual: sameSort,
                onChange(sort) {
                    prop("onSortChange")?.({ sort });
                },
            })),
            selection: bindable<string[]>(() => ({
                defaultValue: prop("defaultSelection"),
                value: prop("selection"),
                isEqual: sameSelection,
                onChange(selection) {
                    prop("onSelectionChange")?.({ selection });
                },
            })),
        };
    },

    computed: {
        translations: ({ prop }) => {
            const given = prop("translations");
            return {
                selectAll: given?.selectAll ?? "Select all rows",
                selectRow: given?.selectRow ?? "Select row",
            };
        },
        selectAll: ({ prop, context }) =>
            selectAllState(context.get("selection"), prop("rows") ?? []),
    },

    on: {
        "SORT.SET": { actions: ["setSort"] },
        "SELECTION.SET": { guard: "isSelectable", actions: ["setSelection"] },
        "ROW.TOGGLE": { guard: "isSelectable", actions: ["toggleRow"] },
        "ALL.TOGGLE": { guard: "isMultiple", actions: ["toggleAll"] },
    },

    states: { idle: {} },

    implementations: {
        guards: {
            isSelectable: ({ prop }) => prop("selectionMode") !== undefined,
            isMultiple: ({ prop }) => prop("selectionMode") === "multiple",
        },

        actions: {
            setSort({ context, event }) {
                context.set("sort", (event["sort"] as Sort | null) ?? null);
            },
            setSelection({ context, event }) {
                context.set("selection", [...(event["selection"] as string[])]);
            },
            toggleRow({ context, prop, event }) {
                context.set(
                    "selection",
                    toggleRow(
                        context.get("selection"),
                        event["row"] as string,
                        prop("selectionMode"),
                    ),
                );
            },
            toggleAll({ context, prop }) {
                context.set(
                    "selection",
                    toggleAll(context.get("selection"), prop("rows") ?? []),
                );
            },
        },
    },
});
