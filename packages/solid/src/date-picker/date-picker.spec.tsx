import { compositeTestIds } from "@pureform/anatomy";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { DatePicker } from ".";
import { PureformProvider } from "..";
import { datePickersRegistry } from "../__fixtures__/registry";
import { byTestId, mount, settle, until } from "../testing/mount";

const ids = compositeTestIds.datePicker;

// The fake registry draws nothing: lay the weeks out in rows, so the dialog fits the page.
const style = document.createElement("style");
style.textContent =
    "[data-pf-part=week], [data-pf-part=weekdays], [data-pf-part=year-list] { display: flex; flex-wrap: wrap; width: 300px }";
document.head.append(style);

const withRegistry = (view: () => unknown, dir?: "ltr" | "rtl") =>
    mount(() => (
        <PureformProvider registry={datePickersRegistry()} dir={dir}>
            {view() as never}
        </PureformProvider>
    ));

const all = (selector: string) => [
    ...document.querySelectorAll<HTMLElement>(selector),
];
const weekdays = () =>
    all(`[data-testid="${ids.weekday}"]`).map((day) => day.textContent);
const day = (iso: string) =>
    document.querySelector<HTMLElement>(
        `[data-part="table-cell-trigger"][data-value="${iso}"]`,
    )!;
const cellOf = (iso: string) => day(iso).parentElement!;

describe("DatePicker, ready-made", () => {
    it("renders the dialog with its parts, test ids and roles", async () => {
        withRegistry(() => (
            <DatePicker
                trigger="Pick"
                locale="en-US"
                defaultOpen
                defaultValue={["2026-08-17"]}
            />
        ));
        await settle();
        expect(byTestId(ids.content).className).toBe("date-picker");
        expect(byTestId(ids.content).getAttribute("role")).toBe("dialog");
        expect(byTestId(ids.headline).textContent).toBe("Select date");
        expect(byTestId(ids.selectedDate).textContent).toBe("Mon, Aug 17");
        expect(byTestId(ids.grid).getAttribute("role")).toBe("grid");
        expect(
            all(`[data-testid="${ids.week}"]`)[0]!.getAttribute("role"),
        ).toBe("row");
        expect(
            all(`[data-testid="${ids.weekday}"]`)[0]!.getAttribute("role"),
        ).toBe("columnheader");
        expect(byTestId(ids.viewTrigger).textContent).toContain("August 2026");
        expect(cellOf("2026-08-17").getAttribute("role")).toBe("gridcell");
        expect(cellOf("2026-08-17").className).toContain(
            "calendar-cell--selection-selected",
        );
        expect(cellOf("2026-08-18").className).toContain(
            "calendar-cell--selection-none",
        );
        expect(cellOf("2026-07-31").className).toContain(
            "calendar-cell--outside-true",
        );
        expect(
            byTestId(compositeTestIds.datePickerBackdrop.root).className,
        ).toBe("scrim");
    });

    it("passes the previous and next parts' className and style to their IconButtons, and the backdrop's", async () => {
        withRegistry(() => (
            <DatePicker
                locale="en-US"
                defaultOpen
                class={{ prev: "my-prev", next: "my-next", backdrop: "my-dim" }}
                // oxlint-disable-next-line solid/style-prop -- a part-keyed style record, not CSS properties
                style={{ prev: { color: "red" } }}
            />
        ));
        await settle();
        expect(byTestId(ids.prev).classList.contains("my-prev")).toBe(true);
        expect(byTestId(ids.prev).style.color).toBe("red");
        expect(byTestId(ids.next).classList.contains("my-next")).toBe(true);
        expect(
            byTestId(
                compositeTestIds.datePickerBackdrop.root,
            ).classList.contains("my-dim"),
        ).toBe(true);
    });

    it("starts the week on the locale's first day, unless told otherwise", async () => {
        withRegistry(() => (
            <>
                <DatePicker locale="en-US" defaultOpen testId="us" />
            </>
        ));
        await settle();
        expect(
            all('[data-testid="us-weekday"]').map((d) => d.textContent)[0],
        ).toBe("S");
        expect(
            all('[data-testid="us-weekday"]')[0]!.getAttribute("aria-label"),
        ).toBe("Sunday");
    });

    it("starts on Monday in en-GB", async () => {
        withRegistry(() => <DatePicker locale="en-GB" defaultOpen />);
        await settle();
        expect(weekdays()[0]).toBe("M");
    });

    it("takes firstDayOfWeek over the locale's", async () => {
        withRegistry(() => (
            <DatePicker locale="en-US" firstDayOfWeek={3} defaultOpen />
        ));
        await settle();
        expect(weekdays()[0]).toBe("W");
    });

    it("commits the chosen day with OK, and closes", async () => {
        const onValueChange =
            vi.fn<(details: { readonly value: readonly string[] }) => void>();
        withRegistry(() => (
            <DatePicker
                trigger="Pick"
                locale="en-US"
                defaultValue={["2026-08-17"]}
                onValueChange={onValueChange}
            />
        ));
        await settle();
        await userEvent.click(byTestId(ids.trigger));
        await until(() => expect(byTestId(ids.positioner).hidden).toBe(false));
        await userEvent.click(day("2026-08-20"));
        await settle();
        expect(byTestId(ids.selectedDate).textContent).toBe("Thu, Aug 20");
        expect(onValueChange).not.toHaveBeenCalled();
        await userEvent.click(all(`[data-testid="${ids.actions}"] button`)[1]!);
        await settle();
        expect(onValueChange).toHaveBeenCalledWith({ value: ["2026-08-20"] });
        await until(() => expect(byTestId(ids.positioner).hidden).toBe(true));
    });

    it("drops the draft with Cancel", async () => {
        const onValueChange =
            vi.fn<(details: { readonly value: readonly string[] }) => void>();
        withRegistry(() => (
            <DatePicker
                trigger="Pick"
                locale="en-US"
                defaultValue={["2026-08-17"]}
                onValueChange={onValueChange}
            />
        ));
        await settle();
        await userEvent.click(byTestId(ids.trigger));
        await settle();
        await userEvent.click(day("2026-08-20"));
        await userEvent.click(all(`[data-testid="${ids.actions}"] button`)[0]!);
        await until(() => expect(byTestId(ids.positioner).hidden).toBe(true));
        expect(onValueChange).not.toHaveBeenCalled();
        await userEvent.click(byTestId(ids.trigger));
        await settle();
        expect(byTestId(ids.selectedDate).textContent).toBe("Mon, Aug 17");
    });

    it("moves between days with the arrow keys, chooses with Enter, closes with Escape", async () => {
        withRegistry(() => (
            <DatePicker
                trigger="Pick"
                locale="en-US"
                defaultValue={["2026-08-17"]}
            />
        ));
        await settle();
        await userEvent.click(byTestId(ids.trigger));
        await settle();
        await userEvent.click(day("2026-08-17"));
        await userEvent.keyboard("{ArrowRight}");
        await until(() =>
            expect(document.activeElement).toBe(day("2026-08-18")),
        );
        await userEvent.keyboard("{ArrowDown}");
        await until(() =>
            expect(document.activeElement).toBe(day("2026-08-25")),
        );
        await userEvent.keyboard("{Enter}");
        await until(() =>
            expect(byTestId(ids.selectedDate).textContent).toBe("Tue, Aug 25"),
        );
        await userEvent.keyboard("{Escape}");
        await until(() => expect(byTestId(ids.positioner).hidden).toBe(true));
    });

    it.each([
        ["just after local midnight", new Date(2026, 7, 15, 0, 30)],
        ["just before local midnight", new Date(2026, 7, 15, 23, 30)],
    ])("marks the local date as today, %s", async (_, now) => {
        vi.useFakeTimers({ toFake: ["Date"], now });
        try {
            withRegistry(() => <DatePicker locale="en-US" defaultOpen />);
            await settle();
            expect(cellOf("2026-08-15").className).toContain(
                "calendar-cell--today-true",
            );
        } finally {
            vi.useRealTimers();
        }
    });

    it("marks today", async () => {
        const now = new Date();
        const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        withRegistry(() => <DatePicker locale="en-US" defaultOpen />);
        await settle();
        expect(cellOf(iso).className).toContain("calendar-cell--today-true");
    });

    it.each([
        {
            value: ["2026-08-10", "2026-08-10"],
            days: [
                ["2026-08-09", "none"],
                ["2026-08-10", "selected"],
                ["2026-08-11", "none"],
            ],
        },
        {
            value: ["2026-08-12", "2026-08-10"],
            days: [
                ["2026-08-10", "rangeStart"],
                ["2026-08-11", "rangeMiddle"],
                ["2026-08-12", "rangeEnd"],
            ],
        },
        {
            value: ["2024-02-28", "2024-03-01"],
            days: [
                ["2024-02-28", "rangeStart"],
                ["2024-02-29", "rangeMiddle"],
                ["2024-03-01", "rangeEnd"],
            ],
        },
        {
            value: ["2026-12-31", "2027-01-02"],
            days: [
                ["2026-12-31", "rangeStart"],
                ["2027-01-01", "rangeMiddle"],
                ["2027-01-02", "rangeEnd"],
            ],
        },
    ])("marks range boundaries for $value", async ({ value, days }) => {
        withRegistry(() => (
            <DatePicker
                locale="en-US"
                selectionMode="range"
                defaultValue={value}
                defaultOpen
            />
        ));
        await settle();
        for (const [date, selection] of days) {
            expect(cellOf(date!).className).toContain(
                `calendar-cell--selection-${selection}`,
            );
        }
    });

    it("marks a range's start, middle and end", async () => {
        withRegistry(() => (
            <DatePicker
                locale="en-US"
                defaultOpen
                selectionMode="range"
                defaultValue={["2026-08-10", "2026-08-12"]}
            />
        ));
        await settle();
        expect(cellOf("2026-08-10").className).toContain(
            "calendar-cell--selection-rangeStart",
        );
        expect(cellOf("2026-08-11").className).toContain(
            "calendar-cell--selection-rangeMiddle",
        );
        expect(cellOf("2026-08-12").className).toContain(
            "calendar-cell--selection-rangeEnd",
        );
        expect(byTestId(ids.selectedDate).textContent).toBe("Aug 10 – Aug 12");
    });

    it("takes a function of each cell, week and weekday in its keys", async () => {
        const views = new Set<string>();
        withRegistry(() => (
            <DatePicker
                locale="en-US"
                defaultOpen
                defaultValue={["2026-08-17"]}
                class={{
                    cell: (each) => {
                        views.add(each.view);
                        return each.selected ? "chosen" : undefined;
                    },
                    week: (week) => `week-${week.index}`,
                    grid: "days",
                }}
                style={{
                    // oxlint-disable-next-line solid/style-prop -- a part-keyed style record, not CSS properties
                    weekday: (day) =>
                        day.index === 0 ? { opacity: 0.5 } : undefined,
                }}
                slotProps={{
                    cell: (each) => ({ title: String(each.value) }),
                }}
                unstyled={{ cell: (each) => each.value === "2026-08-18" }}
            />
        ));
        await settle();
        expect(cellOf("2026-08-17").classList.contains("chosen")).toBe(true);
        expect(cellOf("2026-08-16").classList.contains("chosen")).toBe(false);
        expect(cellOf("2026-08-17").title).toBe("2026-08-17");
        expect(cellOf("2026-08-18").className).toBe("");
        expect(byTestId(ids.grid).classList.contains("days")).toBe(true);
        expect(
            all(`[data-testid="${ids.week}"]`)[1]!.classList.contains("week-1"),
        ).toBe(true);
        const days = all(`[data-testid="${ids.weekday}"]`);
        expect(days[0]!.style.opacity).toBe("0.5");
        expect(days[1]!.style.opacity).toBe("");
        await userEvent.click(byTestId(ids.viewTrigger));
        await settle();
        const year = document.querySelector<HTMLElement>(
            `[data-testid="${ids.yearList}"] [data-value="2026"][role="button"]`,
        )!;
        expect(year.parentElement!.title).toBe("2026");
        expect([...views].sort()).toEqual(["day", "year"]);
    });

    it("switches to the years, and back on choosing one", async () => {
        withRegistry(() => (
            <DatePicker
                locale="en-US"
                defaultOpen
                defaultValue={["2026-08-17"]}
            />
        ));
        await settle();
        await userEvent.click(byTestId(ids.viewTrigger));
        await settle();
        expect(byTestId(ids.yearList).getAttribute("role")).toBe("grid");
        const year = document.querySelector<HTMLElement>(
            `[data-testid="${ids.yearList}"] [data-value="2028"][role="button"]`,
        )!;
        expect(year.parentElement!.className).toContain(
            "calendar-cell--view-year",
        );
        await userEvent.click(year);
        await until(() =>
            expect(byTestId(ids.viewTrigger).textContent).toContain("2028"),
        );
    });

    it("takes the provider's `cell` props for its own cells, over the calendar cell's and under the instance's", async () => {
        mount(() => (
            <PureformProvider
                registry={datePickersRegistry()}
                slotProps={{
                    calendarCell: {
                        root: {
                            style: {
                                "margin-left": "1px",
                                "margin-top": "1px",
                            },
                        },
                    },
                    datePicker: {
                        cell: {
                            style: {
                                "margin-top": "2px",
                                "margin-bottom": "2px",
                            },
                        },
                    },
                    dockedDatePicker: {
                        cell: { style: { "margin-top": "99px" } },
                    },
                }}
            >
                <DatePicker
                    locale="en-US"
                    defaultOpen
                    defaultValue={["2026-08-17"]}
                    // oxlint-disable-next-line solid/style-prop -- a part-keyed style record, not CSS properties
                    style={{ cell: { "margin-bottom": "3px" } }}
                />
            </PureformProvider>
        ));
        await settle();
        const root = cellOf("2026-08-17");
        // Every cell's, then this picker's, then the instance's, each over the one before.
        expect(root.style.marginLeft).toBe("1px");
        expect(root.style.marginTop).toBe("2px");
        expect(root.style.marginBottom).toBe("3px");
    });

    it("lists the years as one scrollable range around the chosen year, as Material's", async () => {
        withRegistry(() => (
            <DatePicker
                locale="en-US"
                defaultOpen
                defaultValue={["2026-08-17"]}
            />
        ));
        await settle();
        await userEvent.click(byTestId(ids.viewTrigger));
        await settle();
        const years = () =>
            all(
                `[data-testid="${ids.yearList}"] [data-view="year"][role="button"]`,
            ).map((year) => Number(year.dataset["value"]));
        expect(years()[0]).toBe(1926);
        expect(years().at(-1)).toBe(2126);
        expect(years()).toHaveLength(201);
        const far = document.querySelector<HTMLElement>(
            `[data-testid="${ids.yearList}"] [data-value="1931"][role="button"]`,
        )!;
        await userEvent.click(far);
        await until(() =>
            expect(byTestId(ids.viewTrigger).textContent).toContain("1931"),
        );
    });

    it("keeps the years inside min and max", async () => {
        withRegistry(() => (
            <DatePicker
                locale="en-US"
                defaultOpen
                defaultValue={["2026-08-17"]}
                min="2024-01-01"
                max="2029-12-31"
            />
        ));
        await settle();
        await userEvent.click(byTestId(ids.viewTrigger));
        await settle();
        expect(
            all(
                `[data-testid="${ids.yearList}"] [data-view="year"][role="button"]`,
            ).map((year) => Number(year.dataset["value"])),
        ).toEqual([2024, 2025, 2026, 2027, 2028, 2029]);
    });

    it("mirrors the chevrons under rtl, and shows the mode toggle only when given", async () => {
        const onModeToggle = vi.fn<() => void>();
        withRegistry(
            () => (
                <DatePicker
                    locale="en-US"
                    defaultOpen
                    onModeToggle={onModeToggle}
                />
            ),
            "rtl",
        );
        await settle();
        expect(byTestId(ids.prev).hasAttribute("data-pf-mirror")).toBe(true);
        expect(byTestId(ids.next).hasAttribute("data-pf-mirror")).toBe(true);
        expect(byTestId(ids.modeToggle).getAttribute("aria-label")).toBe(
            "Switch to text input",
        );
        await userEvent.click(byTestId(ids.modeToggle));
        expect(onModeToggle).toHaveBeenCalled();
    });
});
