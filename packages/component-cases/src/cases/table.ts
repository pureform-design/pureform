// The table: the chosen rows, which a row's checkbox changes. The suites check its markup (axe and
// server rendering, with its table roles), direction (the cells and the arrow mirror), themes,
// the keyboard (Tab reaches the first sort header; Enter and Space sort), and indication on the
// sort headers.

import { dataTableAnatomy, testIds } from "@pureform/anatomy";

import { allByRole, byRole, optionalFlagOf } from "../aria";
import type { ActOptions, ComponentCase } from "../types";
import { userEvent } from "../user-event";

const ids = testIds.dataTable;

const ROWS = [
    { id: "h", name: "Hydrogen", weight: "1.008", symbol: "H" },
    { id: "he", name: "Helium", weight: "4.0026", symbol: "He" },
    { id: "li", name: "Lithium", weight: "6.94", symbol: "Li" },
];

const COLUMNS = [
    { id: "name", header: "Name", sortable: true },
    { id: "weight", header: "Weight", sortable: true },
    { id: "symbol", header: "Symbol" },
];

/** The body's rows, which say `aria-selected` when they can be chosen. */
const rows = (host: HTMLElement) =>
    allByRole(host, "row").filter((row) => row.hasAttribute("aria-selected"));

/** The chosen rows' values (by their place), from their `aria-selected`. */
const read = (host: HTMLElement): string[] =>
    rows(host).flatMap((row, index) =>
        optionalFlagOf(row, "selected") ? [ROWS[index]!.id] : [],
    );

export const table: ComponentCase = {
    component: "Table",
    props: { "aria-label": "Elements", columns: COLUMNS, rows: ROWS },
    root: ids.root,
    examples: {
        plain: {},
        sorted: { defaultSort: { column: "weight", direction: "descending" } },
        striped: { striped: true },
        "selection, some chosen": {
            selectionMode: "multiple",
            defaultSelection: ["he"],
        },
        "single selection": { selectionMode: "single" },
        "sticky header": { stickyHeader: true },
        compact: { density: "compact" },
        "with a footer": {
            columns: [
                { id: "name", header: "Name", footer: "Total" },
                { id: "weight", header: "Weight", footer: "11.95" },
            ],
        },
    },
    state: {
        prop: "selection",
        from: [],
        to: ["h"],
        props: { selectionMode: "multiple" },
        act: async (host, options: ActOptions = {}) => {
            await userEvent.click(byRole(rows(host)[0]!, "checkbox"), options);
        },
        read,
    },
    keyboard: {
        // The first control in the header: the select-all checkbox when there's one.
        focusable: (host) =>
            host.querySelector<HTMLElement>(
                `[data-testid="${ids.headerRow}"] input, [data-testid="${ids.sortHeader}"]`,
            )!,
        disables: false,
        keys: [
            { key: "{Enter}", does: "click" },
            { key: " ", does: "click" },
        ],
    },
    indication: { anatomy: dataTableAnatomy },
};
