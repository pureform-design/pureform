// The tables' section of the page: a table with a selection column (the last row chosen, the
// header's checkbox mixed), sorted by weight descending, striped, with a footer; the same table right to
// left and at the `dense` theme's density; and one under `sharp` with a sticky header.

import { checkbox, dataTable } from "$recipes";
import { For } from "solid-js";

const ROWS = [
    { name: "Lithium", weight: "6.94", symbol: "Li" },
    { name: "Helium", weight: "4.0026", symbol: "He" },
    { name: "Hydrogen", weight: "1.008", symbol: "H" },
];

const ARROW_DOWN = "M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8z";
const ARROW_UP = "M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8z";

function Box(props: { readonly checked?: boolean; readonly mixed?: boolean }) {
    const c = checkbox();
    return (
        <label class={c.root}>
            <span class={c.touchTarget} />
            <input
                ref={(el) => {
                    el.indeterminate = props.mixed ?? false;
                }}
                class={c.input}
                type="checkbox"
                aria-label="Select row"
                checked={props.checked ?? false}
            />
            <span class={c.box}>
                <span class={c.checkIcon} />
                <span class={c.indeterminateIcon} />
            </span>
        </label>
    );
}

function SortHeader(props: {
    readonly label: string;
    readonly sorted?: boolean;
    readonly t: ReturnType<typeof dataTable>;
}) {
    return (
        <button
            class={props.t.sortHeader}
            type="button"
            data-pf-filled={props.sorted ? "" : undefined}
        >
            <span class={props.t.sortLabel}>{props.label}</span>
            <span class={props.t.sortIndicator} aria-hidden="true">
                <svg
                    viewBox="0 0 24 24"
                    width="1em"
                    height="1em"
                    fill="currentColor"
                >
                    <path d={props.sorted ? ARROW_DOWN : ARROW_UP} />
                </svg>
            </span>
        </button>
    );
}

function ExampleTable(props: {
    readonly dir?: "rtl";
    readonly theme?: string;
    readonly stickyHeader?: boolean;
}) {
    const t = dataTable({ stickyHeader: props.stickyHeader ?? false });
    return (
        <div
            data-panda-theme={props.theme}
            dir={props.dir}
            style={{ width: "420px" }}
        >
            <table class={t.root} role="table" aria-label="Elements">
                <thead class={t.header} role="rowgroup">
                    <tr class={t.headerRow} role="row">
                        <th class={t.selectionCell} role="columnheader">
                            <Box mixed />
                        </th>
                        <th
                            class={t.headerCell}
                            role="columnheader"
                            aria-sort="none"
                        >
                            <SortHeader label="Name" t={t} />
                        </th>
                        <th
                            class={t.headerCell}
                            role="columnheader"
                            aria-sort="descending"
                        >
                            <SortHeader label="Weight" sorted t={t} />
                        </th>
                        <th class={t.headerCell} role="columnheader">
                            Symbol
                        </th>
                    </tr>
                </thead>
                <tbody class={t.body} role="rowgroup">
                    <For each={ROWS}>
                        {(row, index) => (
                            <tr
                                class={
                                    index() % 2 === 1 ? t.alternateRow : t.row
                                }
                                role="row"
                                aria-selected={index() === 2 ? "true" : "false"}
                            >
                                <td class={t.selectionCell} role="cell">
                                    <Box checked={index() === 2} />
                                </td>
                                <td class={t.cell} role="cell">
                                    {row.name}
                                </td>
                                <td class={t.cell} role="cell">
                                    {row.weight}
                                </td>
                                <td class={t.cell} role="cell">
                                    {row.symbol}
                                </td>
                            </tr>
                        )}
                    </For>
                </tbody>
                <tfoot class={t.footer} role="rowgroup">
                    <tr class={t.footerRow} role="row">
                        <td class={t.selectionCell} role="cell" />
                        <td class={t.footerCell} role="cell">
                            Total
                        </td>
                        <td class={t.footerCell} role="cell">
                            11.95
                        </td>
                        <td class={t.footerCell} role="cell" />
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}

export function TableSection() {
    return (
        <section
            data-section="tables"
            style={{
                display: "flex",
                gap: "16px",
                "flex-wrap": "wrap",
                "align-items": "flex-start",
            }}
        >
            <ExampleTable />
            <ExampleTable dir="rtl" />
            <ExampleTable theme="dense" />
            <ExampleTable theme="sharp" stickyHeader />
        </section>
    );
}
