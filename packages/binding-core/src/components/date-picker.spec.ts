import { describe, expect, it } from "vitest";

import {
    addDays,
    addMonths,
    calendarCellSelection,
    chooseDate,
    dateFormatHint,
    dateMachineProps,
    dayOfWeek,
    dockedDatePickerSelection,
    formatIsoDate,
    isSelectableDate,
    monthWeeks,
    parseIsoDate,
    selectedDateText,
    weekdayLabels,
    weekStartOf,
} from "./date-picker";

describe("ISO dates", () => {
    it("parses and checks a date", () => {
        expect(parseIsoDate("2026-08-17")).toEqual({
            year: 2026,
            month: 8,
            day: 17,
        });
        expect(parseIsoDate("2026-02-29")).toBeNull();
        expect(parseIsoDate("2024-02-29")).not.toBeNull();
        expect(parseIsoDate("17/08/2026")).toBeNull();
    });

    it("moves by days and by months, keeping the day within the month", () => {
        expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
        expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
        expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
        expect(addMonths("2026-01-15", -1)).toBe("2025-12-15");
        expect(dayOfWeek("2026-08-17")).toBe(1);
    });
});

describe("week starts", () => {
    it("follows the locale's region", () => {
        expect(weekStartOf("en-US")).toBe(0);
        expect(weekStartOf("en-GB")).toBe(1);
        expect(weekStartOf("de-DE")).toBe(1);
        expect(weekStartOf("ar-EG")).toBe(6);
        expect(weekStartOf("not a locale")).toBe(1);
    });

    it("lays the month's weeks out from the first day", () => {
        // August 2026 starts on a Saturday.
        const sunday = monthWeeks({ year: 2026, month: 8 }, 0);
        expect(sunday[0]![0]).toBe("2026-07-26");
        expect(sunday[0]![6]).toBe("2026-08-01");
        expect(sunday).toHaveLength(6);
        const monday = monthWeeks({ year: 2026, month: 8 }, 1);
        expect(monday[0]![0]).toBe("2026-07-27");
        expect(monday.at(-1)![6]).toBe("2026-09-06");
        const saturday = monthWeeks({ year: 2026, month: 8 }, 6);
        expect(saturday[0]![0]).toBe("2026-08-01");
        expect(saturday).toHaveLength(5);
        expect(monthWeeks({ year: 2026, month: 8 }, 6, true)).toHaveLength(6);
    });

    it("labels the weekdays from the first day", () => {
        expect(weekdayLabels("en-US", 0).map((day) => day.long)).toEqual([
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
        ]);
        expect(weekdayLabels("en-GB", 1)[0]).toEqual({
            narrow: "M",
            long: "Monday",
        });
    });

    it("passes the locale's week start to Zag", () => {
        const parse = (value: string) => value;
        expect(dateMachineProps({ locale: "en-GB" }, parse).startOfWeek).toBe(
            1,
        );
        expect(
            dateMachineProps({ locale: "en-GB", firstDayOfWeek: 3 }, parse)
                .startOfWeek,
        ).toBe(3);
        expect(dateMachineProps({ min: "2026-01-01" }, parse).min).toBe(
            "2026-01-01",
        );
    });
});

describe("selection", () => {
    it("places a date in a single or a range selection", () => {
        expect(calendarCellSelection("2026-08-17", ["2026-08-17"])).toBe(
            "selected",
        );
        const range = ["2026-08-21", "2026-08-17"];
        expect(calendarCellSelection("2026-08-17", range, "range")).toBe(
            "rangeStart",
        );
        expect(calendarCellSelection("2026-08-19", range, "range")).toBe(
            "rangeMiddle",
        );
        expect(calendarCellSelection("2026-08-21", range, "range")).toBe(
            "rangeEnd",
        );
        expect(calendarCellSelection("2026-08-22", range, "range")).toBe(
            "none",
        );
        expect(
            calendarCellSelection("2026-08-17", ["2026-08-17"], "range"),
        ).toBe("selected");
    });

    it("chooses a date, or a range's start and then its end", () => {
        expect(chooseDate("2026-08-17", ["2026-08-01"])).toEqual([
            "2026-08-17",
        ]);
        expect(chooseDate("2026-08-10", ["2026-08-17"], "range")).toEqual([
            "2026-08-10",
            "2026-08-17",
        ]);
        expect(
            chooseDate("2026-08-20", ["2026-08-10", "2026-08-17"], "range"),
        ).toEqual(["2026-08-20"]);
    });

    it("keeps dates outside min and max, and unavailable ones, from being chosen", () => {
        const rules = {
            min: "2026-08-02",
            max: "2026-08-30",
            isDateUnavailable: (value: string) => value === "2026-08-15",
        };
        expect(isSelectableDate("2026-08-01", rules)).toBe(false);
        expect(isSelectableDate("2026-08-15", rules)).toBe(false);
        expect(isSelectableDate("2026-08-16", rules)).toBe(true);
        expect(isSelectableDate("2026-08-31", rules)).toBe(false);
    });
});

describe("text", () => {
    it("writes the chosen date and the format in the locale", () => {
        expect(formatIsoDate("2026-08-17", "en-US")).toBe("Mon, Aug 17");
        expect(selectedDateText(["2026-08-17", "2026-08-21"], "en-US")).toBe(
            "Aug 17 – Aug 21",
        );
        expect(selectedDateText([], "en-US")).toBeUndefined();
        expect(dateFormatHint("en-US")).toBe("mm/dd/yyyy");
        expect(dateFormatHint("en-GB")).toBe("dd/mm/yyyy");
    });

    it("always selects the docked picker's trailing icon", () => {
        expect(dockedDatePickerSelection({}).trailingIcon).toBe(true);
    });
});
