import { testIds } from "@pureform/anatomy";
import { createSignal } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { Table } from ".";
import { PureformProvider } from "..";
import { displayRegistry } from "../__fixtures__/registry";
import { byTestId, mount, settle } from "../testing/mount";

const ids = testIds.table;

const withRegistry = (view: () => unknown) =>
    mount(() => (
        <PureformProvider registry={displayRegistry()}>
            {view() as never}
        </PureformProvider>
    ));

const all = (id: string) => [
    ...document.querySelectorAll<HTMLElement>(`[data-testid="${id}"]`),
];

const ELEMENTS = [
    { id: "h", name: "Hydrogen", weight: 1.008 },
    { id: "he", name: "Helium", weight: 4.0026 },
    { id: "li", name: "Lithium", weight: 6.94 },
];

const COLUMNS = [
    { id: "name", header: "Name", sortable: true, footer: "Total" },
    { id: "weight", header: "Weight", sortable: true },
];

const names = () =>
    all(ids.cell)
        .filter((_, index) => index % 2 === 0)
        .map((cell) => cell.textContent);

describe("Table", () => {
    it("renders its rows with their table roles", async () => {
        withRegistry(() => <Table columns={COLUMNS} rows={ELEMENTS} />);
        await settle();
        expect(byTestId(ids.root).tagName).toBe("TABLE");
        expect(byTestId(ids.root).getAttribute("role")).toBe("table");
        expect(
            all(ids.headerCell).map((cell) => cell.getAttribute("role")),
        ).toEqual(["columnheader", "columnheader"]);
        expect(all(ids.row)).toHaveLength(3);
        expect(all(ids.cell)[0]!.getAttribute("role")).toBe("cell");
        expect(names()).toEqual(["Hydrogen", "Helium", "Lithium"]);
        expect(byTestId(ids.footerRow).textContent).toBe("Total");
    });

    it("sorts by a header's button, saying so in aria-sort, and from the keyboard", async () => {
        const onSortChange = vi.fn();
        withRegistry(() => (
            <Table
                columns={COLUMNS}
                rows={ELEMENTS}
                onSortChange={onSortChange}
            />
        ));
        await settle();
        const [name] = all(ids.headerCell);
        const [button] = all(ids.sortHeader);
        expect(name!.getAttribute("aria-sort")).toBe("none");
        await userEvent.click(button!);
        expect(name!.getAttribute("aria-sort")).toBe("ascending");
        expect(names()).toEqual(["Helium", "Hydrogen", "Lithium"]);
        expect(button!.hasAttribute("data-pf-filled")).toBe(true);
        button!.focus();
        await userEvent.keyboard("{Enter}");
        expect(name!.getAttribute("aria-sort")).toBe("descending");
        expect(names()).toEqual(["Lithium", "Hydrogen", "Helium"]);
        await userEvent.keyboard(" ");
        expect(name!.getAttribute("aria-sort")).toBe("none");
        expect(names()).toEqual(["Hydrogen", "Helium", "Lithium"]);
        expect(button!.hasAttribute("data-pf-filled")).toBe(false);
        expect(onSortChange).toHaveBeenLastCalledWith(
            expect.objectContaining({ sort: null }),
        );
    });

    it("selects rows by their checkboxes and all of them by the header's", async () => {
        const onSelectionChange = vi.fn();
        const [selection, setSelection] = createSignal<readonly string[]>([]);
        withRegistry(() => (
            <Table
                columns={COLUMNS}
                rows={ELEMENTS}
                selectionMode="multiple"
                selection={selection()}
                onSelectionChange={(details) => {
                    onSelectionChange(details);
                    setSelection(details.selection);
                }}
            />
        ));
        await settle();
        const boxes = () => [
            ...byTestId(ids.root).querySelectorAll<HTMLInputElement>(
                "input[type=checkbox]",
            ),
        ];
        expect(boxes()).toHaveLength(4);
        expect(boxes()[0]!.getAttribute("aria-label")).toBe("Select all rows");
        await userEvent.click(boxes()[2]!);
        await settle();
        expect(selection()).toEqual(["he"]);
        expect(
            all(ids.row).map((row) => row.getAttribute("aria-selected")),
        ).toEqual(["false", "true", "false"]);
        expect(boxes()[0]!.indeterminate).toBe(true);
        await userEvent.click(boxes()[0]!);
        await settle();
        expect(selection()).toEqual(["he", "h", "li"]);
        await userEvent.click(boxes()[0]!);
        await settle();
        expect(selection()).toEqual([]);
    });

    it("stripes every other body row as the alternate row", async () => {
        withRegistry(() => <Table columns={COLUMNS} rows={ELEMENTS} striped />);
        await settle();
        expect(all(ids.row)).toHaveLength(2);
        expect(all(ids.alternateRow)).toHaveLength(1);
        const body = byTestId(ids.body);
        expect(
            [...body.children].map((row) => row.getAttribute("data-pf-part")),
        ).toEqual(["row", "alternate-row", "row"]);
    });

    it("composes from its parts", async () => {
        withRegistry(() => (
            <Table.Root defaultSort={{ column: "a", direction: "descending" }}>
                <Table.Header>
                    <Table.HeaderRow>
                        <Table.HeaderCell column="a" sortable>
                            <Table.SortHeader column="a">A</Table.SortHeader>
                        </Table.HeaderCell>
                    </Table.HeaderRow>
                </Table.Header>
                <Table.Body>
                    <Table.Row value="1">
                        <Table.Cell>One</Table.Cell>
                    </Table.Row>
                </Table.Body>
            </Table.Root>
        ));
        await settle();
        expect(byTestId(ids.headerCell).getAttribute("aria-sort")).toBe(
            "descending",
        );
        expect(byTestId(ids.sortIndicator).getAttribute("aria-hidden")).toBe(
            "true",
        );
        expect(byTestId(ids.sortLabel).textContent).toBe("A");
        expect(byTestId(ids.row).hasAttribute("aria-selected")).toBe(false);
    });
});
