import { testIds } from "@pureform/anatomy";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { Table } from ".";
import { PureformProvider } from "..";
import { displayRegistry } from "../__fixtures__/registry";
import { mount, settle } from "../testing/render";

const ids = testIds.dataTable;

const withRegistry = (view: React.ReactNode) =>
    mount(
        <PureformProvider registry={displayRegistry()}>
            {view}
        </PureformProvider>,
    );

const all = (id: string) => [
    ...document.querySelectorAll<HTMLElement>(`[data-testid="${id}"]`),
];
const byTestId = (id: string) => all(id)[0]!;

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

function Controlled(props: {
    readonly onSelectionChange: (selection: readonly string[]) => void;
}) {
    const [selection, setSelection] = useState<readonly string[]>([]);
    return (
        <Table
            columns={COLUMNS}
            rows={ELEMENTS}
            selectionMode="multiple"
            selection={selection}
            onSelectionChange={(details) => {
                props.onSelectionChange(details.selection);
                setSelection(details.selection);
            }}
        />
    );
}

describe("Table", () => {
    it("renders its rows with their table roles", async () => {
        withRegistry(<Table columns={COLUMNS} rows={ELEMENTS} />);
        await settle();
        expect(byTestId(ids.root).tagName).toBe("TABLE");
        expect(byTestId(ids.root).getAttribute("role")).toBe("table");
        expect(
            all(ids.headerCell).map((cell) => cell.getAttribute("role")),
        ).toEqual(["columnheader", "columnheader"]);
        expect(all(ids.row)).toHaveLength(3);
        expect(names()).toEqual(["Hydrogen", "Helium", "Lithium"]);
        expect(byTestId(ids.footerRow).textContent).toBe("Total");
    });

    it("sorts by a header's button, saying so in aria-sort, and from the keyboard", async () => {
        const onSortChange = vi.fn();
        withRegistry(
            <Table
                columns={COLUMNS}
                rows={ELEMENTS}
                onSortChange={onSortChange}
            />,
        );
        await settle();
        const name = () => all(ids.headerCell)[0]!;
        const button = () => all(ids.sortHeader)[0]!;
        expect(name().getAttribute("aria-sort")).toBe("none");
        await userEvent.click(button());
        expect(name().getAttribute("aria-sort")).toBe("ascending");
        expect(names()).toEqual(["Helium", "Hydrogen", "Lithium"]);
        expect(button().hasAttribute("data-pf-filled")).toBe(true);
        button().focus();
        await userEvent.keyboard("{Enter}");
        expect(name().getAttribute("aria-sort")).toBe("descending");
        expect(names()).toEqual(["Lithium", "Hydrogen", "Helium"]);
        await userEvent.keyboard(" ");
        expect(name().getAttribute("aria-sort")).toBe("none");
        expect(onSortChange).toHaveBeenLastCalledWith(
            expect.objectContaining({ sort: null }),
        );
    });

    it("selects rows by their checkboxes and all of them by the header's", async () => {
        const onSelectionChange = vi.fn();
        withRegistry(<Controlled onSelectionChange={onSelectionChange} />);
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
        expect(onSelectionChange).toHaveBeenLastCalledWith(["he"]);
        expect(
            all(ids.row).map((row) => row.getAttribute("aria-selected")),
        ).toEqual(["false", "true", "false"]);
        await userEvent.click(boxes()[0]!);
        await settle();
        expect(onSelectionChange).toHaveBeenLastCalledWith(["he", "h", "li"]);
        await userEvent.click(boxes()[0]!);
        await settle();
        expect(onSelectionChange).toHaveBeenLastCalledWith([]);
    });

    it("stripes every other body row as the alternate row", async () => {
        withRegistry(<Table columns={COLUMNS} rows={ELEMENTS} striped />);
        await settle();
        expect(
            [...byTestId(ids.body).children].map((row) =>
                row.getAttribute("data-pf-part"),
            ),
        ).toEqual(["row", "alternate-row", "row"]);
    });

    it("composes from its parts", async () => {
        withRegistry(
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
            </Table.Root>,
        );
        await settle();
        expect(byTestId(ids.headerCell).getAttribute("aria-sort")).toBe(
            "descending",
        );
        expect(byTestId(ids.sortLabel).textContent).toBe("A");
        expect(byTestId(ids.row).hasAttribute("aria-selected")).toBe(false);
    });
});
