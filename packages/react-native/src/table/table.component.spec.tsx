import type { ComponentProps } from "react";
import type { ReactNode } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { Table } from ".";
import { PureformProvider } from "..";
import { animated } from "../engine";
import { presetRegistry } from "../testing/registry";
import type { TestRegistry } from "../testing/registry";
import {
    byTestId,
    computed,
    mount,
    pointerAway,
    settle,
    until,
} from "../testing/render";

let registry: TestRegistry;

beforeAll(async () => {
    registry = await presetRegistry(["dataTable", "checkbox", "ripple"]);
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
    all("pf-data-table-cell")
        .filter((_, index) => index % 2 === 0)
        .map((cell) => cell.textContent);

describe("table", () => {
    it.each([false, true])(
        "only hovers actionable rows (rowHover %s)",
        async (rowHover) => {
            await render(
                <Table columns={COLUMNS} rows={ELEMENTS} rowHover={rowHover} />,
            );
            await pointerAway();
            const resting = computed("pf-data-table-row").backgroundColor;
            await userEvent.hover(byTestId("pf-data-table-row"));
            // The tint fades in on a tween, which a loaded machine stretches: wait for it when
            // the row hovers, and give the absence a moment to show when it doesn't.
            if (rowHover) {
                await until(() =>
                    expect(
                        computed("pf-data-table-row").backgroundColor,
                    ).not.toBe(resting),
                );
            } else {
                await settle(100);
                expect(computed("pf-data-table-row").backgroundColor).toBe(
                    resting,
                );
            }
        },
    );
    it("lays out its rows with their roles, a rule under each", async () => {
        await render(<Table columns={COLUMNS} rows={ELEMENTS} />);
        expect(byTestId("pf-data-table-root").getAttribute("role")).toBe(
            "table",
        );
        expect(all("pf-data-table-row")).toHaveLength(3);
        expect(names()).toEqual(["Hydrogen", "Helium", "Lithium"]);
        expect(byTestId("pf-data-table-footer-row").textContent).toBe("Total");
        expect(computed("pf-data-table-header-row").minHeight).toBe("56px");
        expect(computed("pf-data-table-row").minHeight).toBe("52px");
        expect(computed("pf-data-table-row").borderBottomWidth).toBe("1px");
    });

    it("sorts by a header's button and shows the arrow", async () => {
        const onSortChange =
            vi.fn<NonNullable<ComponentProps<typeof Table>["onSortChange"]>>();
        await render(
            <Table
                columns={COLUMNS}
                rows={ELEMENTS}
                onSortChange={onSortChange}
            />,
        );
        // An earlier test's pointer can rest over the header, which hints its arrow.
        await pointerAway();
        // Reduced motion retains opacity transitions; wait for the initial fade as for sorting.
        await until(() =>
            expect(computed("pf-data-table-sort-indicator").opacity).toBe("0"),
        );
        await userEvent.click(byTestId("pf-data-table-sort-header"));
        await settle();
        expect(names()).toEqual(["Helium", "Hydrogen", "Lithium"]);
        await until(() =>
            expect(computed("pf-data-table-sort-indicator").opacity).toBe("1"),
        );
        expect(
            byTestId("pf-data-table-sort-header").getAttribute("aria-label"),
        ).toBe("Name, sorted ascending");
        expect(computed("pf-data-table-sort-indicator").transform).toMatch(
            /^(none|matrix\(1, 0, 0, 1, 0, 0\))$/,
        );
        await userEvent.click(byTestId("pf-data-table-sort-header"));
        await settle();
        expect(names()).toEqual(["Lithium", "Hydrogen", "Helium"]);
        await until(() =>
            expect(computed("pf-data-table-sort-indicator").transform).toMatch(
                /^matrix\(-1, [^,]+, [^,]+, -1, 0, 0\)$/,
            ),
        );
        expect(onSortChange).toHaveBeenLastCalledWith({
            sort: { column: "name", direction: "descending" },
        });
    });

    it("hints the way a press would sort: an unsorted arrow is turned when sortStart is descending", async () => {
        await render(
            <Table columns={COLUMNS} rows={ELEMENTS} sortStart="descending" />,
        );
        await until(() =>
            expect(computed("pf-data-table-sort-indicator").transform).toMatch(
                /^matrix\(-1, [^,]+, [^,]+, -1, 0, 0\)$/,
            ),
        );
    });

    it("selects rows and fills them with the selected container", async () => {
        const onSelectionChange =
            vi.fn<
                (details: { readonly selection: readonly string[] }) => void
            >();
        await render(
            <Table
                columns={COLUMNS}
                rows={ELEMENTS}
                selectionMode="multiple"
                onSelectionChange={onSelectionChange}
            />,
        );
        const rest = computed("pf-data-table-row").backgroundColor;
        const boxes = all("pf-checkbox-root");
        expect(boxes).toHaveLength(4);
        await userEvent.click(boxes[1]!);
        await settle();
        expect(onSelectionChange).toHaveBeenLastCalledWith({
            selection: ["h"],
        });
        expect(all("pf-data-table-row")[0]!.getAttribute("aria-selected")).toBe(
            "true",
        );
        await until(() =>
            expect(
                getComputedStyle(all("pf-data-table-row")[0]!).backgroundColor,
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
        expect(all("pf-data-table-row")).toHaveLength(2);
        expect(all("pf-data-table-alternate-row")).toHaveLength(1);
        expect(
            computed("pf-data-table-alternate-row").backgroundColor,
        ).not.toBe(computed("pf-data-table-row").backgroundColor);
        expect(computed("pf-data-table-row").minHeight).toBe("44px");
    });

    it("takes a function of each row, cell and column in style and slotProps", async () => {
        await render(
            <Table
                columns={COLUMNS}
                rows={ELEMENTS}
                selectionMode="multiple"
                defaultSelection={["he"]}
                style={{
                    row: (row) => (row.selected ? { opacity: 0.5 } : undefined),
                    sortLabel: (header) => ({
                        opacity: header.columnIndex === 0 ? 0.25 : 1,
                    }),
                }}
                slotProps={{
                    cell: (cell) => ({
                        "aria-label": `${cell.rowIndex}-${cell.column}`,
                    }),
                    headerCell: (header) => ({
                        "aria-label": header.column,
                    }),
                    footerCell: (footer) => ({
                        "aria-label": String(footer.columnIndex),
                    }),
                }}
            />,
        );
        expect(
            all("pf-data-table-row").map(
                (row) => getComputedStyle(row).opacity,
            ),
        ).toEqual(["1", "0.5", "1"]);
        expect(
            getComputedStyle(all("pf-data-table-sort-label")[0]!).opacity,
        ).toBe("0.25");
        const hints = (id: string) =>
            all(id).map((each) => each.getAttribute("aria-label"));
        expect(hints("pf-data-table-cell")[3]).toBe("1-weight");
        expect(hints("pf-data-table-header-cell")).toEqual(["name", "weight"]);
        expect(hints("pf-data-table-footer-cell")).toEqual(["-1", "0", "1"]);
    });
});
