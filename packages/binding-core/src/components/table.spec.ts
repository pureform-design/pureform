import { describe, expect, it } from "vitest";

import { tableRowValue } from "./table";

describe("table row identities", () => {
    it("keeps custom stringifiable IDs attached to their rows after reordering", () => {
        const a = { id: { toString: () => "record-a" } };
        const b = { id: { toString: () => "record-b" } };
        expect([a, b].map((row, index) => tableRowValue(row, index))).toEqual([
            "record-a",
            "record-b",
        ]);
        expect([b, a].map((row, index) => tableRowValue(row, index))).toEqual([
            "record-b",
            "record-a",
        ]);
    });

    it("supports custom primitive conversion", () => {
        const id = { [Symbol.toPrimitive]: () => "record-c" };
        expect(tableRowValue({ id }, 4)).toBe("record-c");
    });

    it.each(["record", 17, 17n, true, false])(
        "stringifies a primitive ID (%s)",
        (id) => {
            expect(tableRowValue({ id }, 4)).toBe(String(id));
        },
    );

    it.each([undefined, null, {}])(
        "uses the index when an ID names no record (%s)",
        (id) => {
            expect(tableRowValue({ id }, 4)).toBe("4");
        },
    );

    it("lets rowValue override any default ID", () => {
        expect(
            tableRowValue(
                { id: "record-a" },
                4,
                (_row, index) => `row-${index}`,
            ),
        ).toBe("row-4");
    });
});
