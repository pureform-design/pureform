import type { ReactNode } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { Table } from ".";
import { PureformProvider } from "..";
import { animated } from "../engine";
import { presetRegistry } from "../testing/registry";
import type { TestRegistry } from "../testing/registry";
import { byTestId, computed, mount, settle, until } from "../testing/render";

let registry: TestRegistry;

beforeAll(async () => {
    registry = await presetRegistry(["table", "checkbox", "ripple"]);
});

const render = (node: ReactNode) =>
    mount(
        <PureformProvider registry={registry} engine={animated} motion="reduce">
            {node}
        </PureformProvider>,
    );

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
    { id: "weight", header: "Weight" },
];

const names = () =>
    all("pf-table-cell")
        .filter((_, index) => index % 2 === 0)
        .map((cell) => cell.textContent);

describe("table", () => {
    it("lays out its rows with their roles, a rule under each", async () => {
        await render(<Table columns={COLUMNS} rows={ELEMENTS} />);
        expect(byTestId("pf-table-root").getAttribute("role")).toBe("table");
        expect(all("pf-table-row")).toHaveLength(3);
        expect(names()).toEqual(["Hydrogen", "Helium", "Lithium"]);
        expect(byTestId("pf-table-footer-row").textContent).toBe("Total");
        expect(computed("pf-table-header-row").minHeight).toBe("56px");
        expect(computed("pf-table-row").minHeight).toBe("52px");
        expect(computed("pf-table-row").borderBottomWidth).toBe("1px");
    });

    it("sorts by a header's button and shows the arrow", async () => {
        const onSortChange = vi.fn();
        await render(
            <Table
                columns={COLUMNS}
                rows={ELEMENTS}
                onSortChange={onSortChange}
            />,
        );
        expect(computed("pf-table-sort-indicator").opacity).toBe("0");
        await userEvent.click(byTestId("pf-table-sort-header"));
        await settle();
        expect(names()).toEqual(["Helium", "Hydrogen", "Lithium"]);
        await until(() =>
            expect(computed("pf-table-sort-indicator").opacity).toBe("1"),
        );
        expect(
            byTestId("pf-table-sort-header").getAttribute("aria-label"),
        ).toBe("Name, sorted ascending");
        await userEvent.click(byTestId("pf-table-sort-header"));
        await settle();
        expect(names()).toEqual(["Lithium", "Hydrogen", "Helium"]);
        expect(onSortChange).toHaveBeenLastCalledWith({
            sort: { column: "name", direction: "descending" },
        });
    });

    it("selects rows and fills them with the selected container", async () => {
        const onSelectionChange = vi.fn();
        await render(
            <Table
                columns={COLUMNS}
                rows={ELEMENTS}
                selectionMode="multiple"
                onSelectionChange={onSelectionChange}
            />,
        );
        const rest = computed("pf-table-row").backgroundColor;
        const boxes = all("pf-checkbox-root");
        expect(boxes).toHaveLength(4);
        await userEvent.click(boxes[1]!);
        await settle();
        expect(onSelectionChange).toHaveBeenLastCalledWith({
            selection: ["h"],
        });
        expect(all("pf-table-row")[0]!.getAttribute("aria-selected")).toBe(
            "true",
        );
        await until(() =>
            expect(
                getComputedStyle(all("pf-table-row")[0]!).backgroundColor,
            ).not.toBe(rest),
        );
        await userEvent.click(boxes[0]!);
        await settle();
        expect(onSelectionChange).toHaveBeenLastCalledWith({
            selection: ["h", "he", "li"],
        });
    });

    it("stripes every other row, and follows density", async () => {
        await render(
            <Table columns={COLUMNS} rows={ELEMENTS} striped density="-2" />,
        );
        expect(all("pf-table-row")).toHaveLength(2);
        expect(all("pf-table-alternate-row")).toHaveLength(1);
        expect(computed("pf-table-alternate-row").backgroundColor).not.toBe(
            computed("pf-table-row").backgroundColor,
        );
        expect(computed("pf-table-row").minHeight).toBe("44px");
    });
});
