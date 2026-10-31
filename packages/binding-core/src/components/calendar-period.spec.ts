import { describe, expect, it } from "vitest";

import { calendarYears, isCurrentCalendarPeriod } from "./date-picker";

describe("current calendar periods across bindings", () => {
    it("marks only the current month in the current year", () => {
        const now = new Date(2026, 0, 1, 12);
        expect(isCurrentCalendarPeriod("month", 2026, 1, now)).toBe(true);
        expect(isCurrentCalendarPeriod("month", 2025, 1, now)).toBe(false);
        expect(isCurrentCalendarPeriod("month", 2026, 2, now)).toBe(false);
    });
    it("marks the current year independently of month", () => {
        const now = new Date(2026, 11, 31, 12);
        expect(isCurrentCalendarPeriod("year", 2026, 1, now)).toBe(true);
        expect(isCurrentCalendarPeriod("year", 2027, 12, now)).toBe(false);
    });
});

describe("the years a calendar lists, across bindings", () => {
    it("lists a century either side of the shown year, Material's scrollable range", () => {
        const years = calendarYears(2026, {});
        expect(years[0]).toBe(1926);
        expect(years.at(-1)).toBe(2126);
        expect(years).toHaveLength(201);
    });
    it("lists min to max when they are set, whatever the shown year", () => {
        expect(
            calendarYears(2026, { min: "2020-06-01", max: "2024-01-01" }),
        ).toEqual([2020, 2021, 2022, 2023, 2024]);
    });
    it("bounds only the side that is set", () => {
        const years = calendarYears(2026, { min: "2000-01-01" });
        expect([years[0], years.at(-1)]).toEqual([2000, 2126]);
    });
    it("grows to hold a focused year past the range, but never past min or max", () => {
        expect(calendarYears(2026, {}, 2130).at(-1)).toBe(2130);
        expect(calendarYears(2026, {}, 1900)[0]).toBe(1900);
        expect(calendarYears(2026, { max: "2030-01-01" }, 2130).at(-1)).toBe(
            2030,
        );
        expect(calendarYears(2026, { min: "2020-01-01" }, 1900)[0]).toBe(2020);
    });
});
