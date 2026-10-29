import { describe, expect, it } from "vitest";

import {
    calendarCellSelection,
    chooseDate,
    isSelectableDate,
} from "./date-picker";

describe("calendar range boundaries", () => {
    it.each([
        ["2024-02-28", "2024-02-29", "2024-03-01"],
        ["2026-12-31", "2027-01-01", "2027-01-02"],
    ])("includes both endpoints across %s to %s", (start, middle, end) => {
        for (const selected of [
            [start!, end!],
            [end!, start!],
        ]) {
            expect(calendarCellSelection(start!, selected, "range")).toBe(
                "rangeStart",
            );
            expect(calendarCellSelection(middle!, selected, "range")).toBe(
                "rangeMiddle",
            );
            expect(calendarCellSelection(end!, selected, "range")).toBe(
                "rangeEnd",
            );
        }
    });

    it("draws a one-day range as one selection and starts a new draft after completion", () => {
        const value = "2026-08-10";
        const selected = chooseDate(value, [value], "range");
        expect(selected).toEqual([value, value]);
        expect(calendarCellSelection(value, selected, "range")).toBe(
            "selected",
        );
        expect(calendarCellSelection("2026-08-09", selected, "range")).toBe(
            "none",
        );
        expect(calendarCellSelection("2026-08-11", selected, "range")).toBe(
            "none",
        );
        expect(chooseDate("2026-08-12", selected, "range")).toEqual([
            "2026-08-12",
        ]);
    });

    it("includes min/max, but an unavailable endpoint remains unselectable", () => {
        const rules = { min: "2026-08-10", max: "2026-08-12" };
        expect(isSelectableDate(rules.min, rules)).toBe(true);
        expect(isSelectableDate(rules.max, rules)).toBe(true);
        expect(isSelectableDate("2026-08-09", rules)).toBe(false);
        expect(isSelectableDate("2026-08-13", rules)).toBe(false);
        expect(
            isSelectableDate(rules.min, {
                ...rules,
                isDateUnavailable: () => true,
            }),
        ).toBe(false);
    });
});
