import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import * as table from ".";
import { run, settle } from "../testing/vanilla";
import type { MachineProps } from "../testing/vanilla";

afterEach(() => {
    document.body.innerHTML = "";
});

const {
    ariaSort,
    compareValues,
    nextSort,
    selectAllState,
    sortRows,
    toggleAll,
    toggleRow,
} = table;

describe("sort arithmetic", () => {
    it("starts a column ascending, turns it, then clears it", () => {
        const first = nextSort(null, "name");
        expect(first).toEqual({ column: "name", direction: "ascending" });
        const second = nextSort(first, "name");
        expect(second).toEqual({ column: "name", direction: "descending" });
        expect(nextSort(second, "name")).toBeNull();
        expect(nextSort(second, "weight")).toEqual({
            column: "weight",
            direction: "ascending",
        });
    });

    it("turns back rather than clearing when it isn't clearable, and can start descending", () => {
        const start = { start: "descending", clearable: false } as const;
        const first = nextSort(null, "name", start);
        expect(first?.direction).toBe("descending");
        const second = nextSort(first, "name", start);
        expect(second?.direction).toBe("ascending");
        expect(nextSort(second, "name", start)?.direction).toBe("descending");
    });

    it("gives a column's aria-sort", () => {
        const sort = { column: "name", direction: "descending" } as const;
        expect(ariaSort(sort, "name")).toBe("descending");
        expect(ariaSort(sort, "weight")).toBe("none");
        expect(ariaSort(null, "name")).toBe("none");
    });

    it("compares numbers by value, text in order with numbers inside, and empties last", () => {
        expect(compareValues(2, 10)).toBeLessThan(0);
        expect(compareValues("item 2", "item 10")).toBeLessThan(0);
        expect(compareValues("b", "a")).toBeGreaterThan(0);
        expect(compareValues(undefined, "a")).toBeGreaterThan(0);
        expect(compareValues("", "")).toBe(0);
    });

    it("sorts rows stably either way, empties last, and keeps them unsorted", () => {
        const rows = [
            { id: "a", n: 2 },
            { id: "b", n: undefined },
            { id: "c", n: 1 },
            { id: "d", n: 2 },
        ];
        const value = (row: (typeof rows)[number], column: string) =>
            row[column as "n"];
        const ids = (sorted: typeof rows) => sorted.map((row) => row.id);
        expect(
            ids(sortRows(rows, { column: "n", direction: "ascending" }, value)),
        ).toEqual(["c", "a", "d", "b"]);
        expect(
            ids(
                sortRows(rows, { column: "n", direction: "descending" }, value),
            ),
        ).toEqual(["a", "d", "c", "b"]);
        expect(ids(sortRows(rows, null, value))).toEqual(["a", "b", "c", "d"]);
    });
});

describe("selection arithmetic", () => {
    it("toggles a row, alone in single mode", () => {
        expect(toggleRow(["a"], "b")).toEqual(["a", "b"]);
        expect(toggleRow(["a", "b"], "a")).toEqual(["b"]);
        expect(toggleRow(["a"], "b", "single")).toEqual(["b"]);
    });

    it("shows and toggles select-all over the given rows", () => {
        const rows = ["a", "b", "c"];
        expect(selectAllState([], rows)).toBe(false);
        expect(selectAllState(["b"], rows)).toBe("indeterminate");
        expect(selectAllState(rows, rows)).toBe(true);
        expect(toggleAll(["b", "x"], rows)).toEqual(["b", "x", "a", "c"]);
        expect(toggleAll(["a", "b", "c", "x"], rows)).toEqual(["x"]);
    });
});

const mount = (props: MachineProps<table.Schema> = {}) => {
    const root = document.createElement("div");
    const header = document.createElement("div");
    const sortButton = document.createElement("button");
    sortButton.textContent = "Name";
    const row = document.createElement("div");
    header.append(sortButton);
    root.append(header, row);
    document.body.append(root);
    const running = run(
        table.machine,
        table.connect,
        { id: "elements", rows: ["h", "he"], ...props },
        (api, spread) => {
            spread(root, api.getRootProps());
            spread(
                header,
                api.getHeaderCellProps({ column: "name", sortable: true }),
            );
            spread(sortButton, api.getSortHeaderProps({ column: "name" }));
            spread(row, api.getRowProps({ value: "h" }));
        },
    );
    return { ...running, header, sortButton, row };
};

describe("the table machine", () => {
    it("sorts from the header's button, by click and by keyboard, and says so in aria-sort", async () => {
        const onSortChange = vi.fn();
        const { header, sortButton, api, stop } = mount({ onSortChange });
        expect(header.getAttribute("role")).toBe("columnheader");
        expect(header.getAttribute("aria-sort")).toBe("none");
        await userEvent.click(sortButton);
        expect(header.getAttribute("aria-sort")).toBe("ascending");
        expect(sortButton.dataset["sorted"]).toBe("");
        sortButton.focus();
        await userEvent.keyboard("{Enter}");
        expect(header.getAttribute("aria-sort")).toBe("descending");
        await userEvent.keyboard(" ");
        expect(header.getAttribute("aria-sort")).toBe("none");
        expect(api().sort).toBeNull();
        expect(onSortChange).toHaveBeenLastCalledWith({ sort: null });
        stop();
    });

    it("follows a controlled sort", () => {
        const { header, setProps, stop } = mount({
            sort: { column: "name", direction: "descending" },
        });
        expect(header.getAttribute("aria-sort")).toBe("descending");
        setProps({ id: "elements", rows: ["h", "he"], sort: null });
        expect(header.getAttribute("aria-sort")).toBe("none");
        stop();
    });

    it("selects rows only with a selection mode, and marks them aria-selected", async () => {
        const plain = mount();
        expect(plain.row.hasAttribute("aria-selected")).toBe(false);
        plain.api().toggleRow("h");
        await settle();
        expect(plain.api().selection).toEqual([]);
        plain.stop();

        const onSelectionChange = vi.fn();
        const { row, api, stop } = mount({
            selectionMode: "multiple",
            onSelectionChange,
        });
        expect(row.getAttribute("aria-selected")).toBe("false");
        api().toggleRow("h");
        await settle();
        expect(row.getAttribute("aria-selected")).toBe("true");
        expect(api().selectAll).toBe("indeterminate");
        api().toggleAll();
        await settle();
        expect(api().selection).toEqual(["h", "he"]);
        expect(api().selectAll).toBe(true);
        api().toggleAll();
        await settle();
        expect(api().selection).toEqual([]);
        expect(onSelectionChange).toHaveBeenLastCalledWith({ selection: [] });
        stop();
    });

    it("has no select-all in single mode", async () => {
        const { api, stop } = mount({ selectionMode: "single" });
        api().toggleRow("h");
        await settle();
        api().toggleRow("he");
        await settle();
        expect(api().selection).toEqual(["he"]);
        api().toggleAll();
        await settle();
        expect(api().selection).toEqual(["he"]);
        stop();
    });

    it("names its checkboxes in English unless translated", () => {
        const { api, stop } = mount({
            translations: { selectAll: "Tout sélectionner" },
        });
        expect(api().translations).toEqual({
            selectAll: "Tout sélectionner",
            selectRow: "Select row",
        });
        stop();
    });
});
