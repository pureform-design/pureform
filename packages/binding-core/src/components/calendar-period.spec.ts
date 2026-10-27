import { describe, expect, it } from "vitest";

import { isCurrentCalendarPeriod } from "./date-picker";

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
