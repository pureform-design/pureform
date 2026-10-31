import { compositeTestIds, testIds } from "@pureform/anatomy";
import { screen } from "@testing-library/react";
import type { ReactNode, SubmitEventHandler } from "react";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { DatePicker } from ".";
import type { ChangeDetails } from "..";
import { PureformProvider } from "..";
import { datePickersRegistry } from "../__fixtures__/registry";
import { interact, mount, settle, until } from "../testing/render";

const byTestId = <E extends HTMLElement = HTMLElement>(id: string): E =>
    screen.getByTestId(id) as E;

const ids = compositeTestIds.datePicker;
const cell = testIds.calendarCell;

const withRegistry = (view: ReactNode, dir: "ltr" | "rtl" = "ltr") =>
    mount(
        <PureformProvider registry={datePickersRegistry()} dir={dir}>
            {view}
        </PureformProvider>,
    );

const trigger = (date: string) =>
    document.querySelector<HTMLElement>(
        `[data-testid="${cell.trigger}"][data-value="${date}"]`,
    )!;

const cellRoot = (date: string) =>
    trigger(date).closest<HTMLElement>(`[data-testid="${cell.root}"]`)!;

const weekdays = () =>
    [
        ...document.querySelectorAll<HTMLElement>(
            `[data-testid="${ids.weekday}"]`,
        ),
    ].map((day) => day.getAttribute("aria-label"));

// The unstyled dialog outgrows the test's frame, so clicks go to the element itself.
const press = async (element: HTMLElement) => element.click();

const open = async () => {
    await interact(() => press(byTestId(ids.trigger)));
    await until(() => expect(byTestId(ids.positioner).hidden).toBe(false));
};

describe("DatePicker, ready-made", () => {
    it("renders the dialog with its parts, roles and the calendar cells", async () => {
        withRegistry(
            <DatePicker
                trigger="Pick"
                locale="en-US"
                defaultValue={["2026-08-17"]}
            />,
        );
        await settle();
        await open();
        const content = byTestId(ids.content);
        expect(content.className).toBe("date-picker");
        expect(content.getAttribute("role")).toBe("dialog");
        expect(content.getAttribute("aria-labelledby")).toBe(
            byTestId(ids.headline).id,
        );
        expect(byTestId(ids.headline).textContent).toBe("Select date");
        expect(byTestId(ids.selectedDate).textContent).toBe("Mon, Aug 17");
        expect(byTestId(ids.grid).getAttribute("role")).toBe("grid");
        expect(byTestId(ids.weekdays).getAttribute("role")).toBe("row");
        expect(screen.getAllByTestId(ids.week)[0]!.getAttribute("role")).toBe(
            "row",
        );
        expect(
            screen.getAllByTestId(ids.weekday)[0]!.getAttribute("role"),
        ).toBe("columnheader");
        expect(byTestId(ids.viewTrigger).textContent).toContain("August 2026");
        expect(cellRoot("2026-08-17").getAttribute("role")).toBe("gridcell");
        expect(trigger("2026-08-17").getAttribute("role")).toBe("button");
        expect(cellRoot("2026-08-17").className).toContain(
            "calendar-cell--selection-selected",
        );
        expect(cellRoot("2026-08-18").className).toContain(
            "calendar-cell--selection-none",
        );
        expect(
            document.querySelector(`[data-testid="${ids.modeToggle}"]`),
        ).toBe(null);
        expect(
            document.querySelector('[data-testid="pf-date-picker-backdrop"]')
                ?.className,
        ).toBe("scrim");
    });

    it("starts the week on the locale's first day, or firstDayOfWeek", async () => {
        withRegistry(<DatePicker locale="en-US" defaultOpen />);
        await settle();
        expect(weekdays()[0]).toBe("Sunday");
        document.body.innerHTML = "";
        withRegistry(<DatePicker locale="en-GB" defaultOpen />);
        await settle();
        expect(weekdays()[0]).toBe("Monday");
        document.body.innerHTML = "";
        withRegistry(
            <DatePicker locale="en-US" firstDayOfWeek={3} defaultOpen />,
        );
        await settle();
        expect(weekdays()[0]).toBe("Wednesday");
    });

    it("commits the chosen day with OK and closes; Cancel drops the draft", async () => {
        const onValueChange =
            vi.fn<(details: { readonly value: readonly string[] }) => void>();
        withRegistry(
            <DatePicker
                trigger="Pick"
                locale="en-US"
                defaultValue={["2026-08-17"]}
                onValueChange={onValueChange}
            />,
        );
        await settle();
        await open();
        await interact(() => press(trigger("2026-08-20")));
        expect(byTestId(ids.selectedDate).textContent).toBe("Thu, Aug 20");
        expect(onValueChange).not.toHaveBeenCalled();
        await interact(() =>
            press(screen.getByRole("button", { name: "Cancel" })),
        );
        await until(() => expect(byTestId(ids.positioner).hidden).toBe(true));
        expect(onValueChange).not.toHaveBeenCalled();
        await open();
        expect(byTestId(ids.selectedDate).textContent).toBe("Mon, Aug 17");
        await interact(() => press(trigger("2026-08-21")));
        await interact(() => press(screen.getByRole("button", { name: "OK" })));
        expect(onValueChange).toHaveBeenCalledWith({ value: ["2026-08-21"] });
        await until(() => expect(byTestId(ids.positioner).hidden).toBe(true));
    });

    it("draws Cancel and OK as type=button, so they don't submit a form", async () => {
        const onSubmit = vi.fn<SubmitEventHandler<HTMLFormElement>>((event) =>
            event.preventDefault(),
        );
        const onValueChange =
            vi.fn<(details: { readonly value: readonly string[] }) => void>();
        withRegistry(
            <form onSubmit={onSubmit}>
                <DatePicker
                    trigger="Pick"
                    locale="en-US"
                    defaultValue={["2026-08-17"]}
                    onValueChange={onValueChange}
                />
            </form>,
        );
        await settle();
        await open();
        const ok = screen.getByRole("button", { name: "OK" });
        const cancel = screen.getByRole("button", { name: "Cancel" });
        expect(ok.getAttribute("type")).toBe("button");
        expect(cancel.getAttribute("type")).toBe("button");
        await interact(() => press(trigger("2026-08-21")));
        await interact(() => press(ok));
        expect(onValueChange).toHaveBeenCalledWith({ value: ["2026-08-21"] });
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it("moves between days with the arrows, chooses with Enter, closes with Escape", async () => {
        const onOpenChange =
            vi.fn<(details: ChangeDetails<"open", boolean>) => void>();
        withRegistry(
            <DatePicker
                trigger="Pick"
                locale="en-US"
                defaultValue={["2026-08-17"]}
                onOpenChange={onOpenChange}
            />,
        );
        await settle();
        await open();
        trigger("2026-08-17").focus();
        await interact(() => userEvent.keyboard("{ArrowRight}"));
        await until(() =>
            expect(document.activeElement).toBe(trigger("2026-08-18")),
        );
        await interact(() => userEvent.keyboard("{ArrowDown}"));
        await until(() =>
            expect(document.activeElement).toBe(trigger("2026-08-25")),
        );
        await interact(() => userEvent.keyboard("{Enter}"));
        expect(byTestId(ids.selectedDate).textContent).toBe("Tue, Aug 25");
        await interact(() => userEvent.keyboard("{Escape}"));
        await until(() => expect(byTestId(ids.positioner).hidden).toBe(true));
        expect(onOpenChange).toHaveBeenLastCalledWith({ open: false });
    });

    it.each([
        ["just after local midnight", new Date(2026, 7, 15, 0, 30)],
        ["just before local midnight", new Date(2026, 7, 15, 23, 30)],
    ])("marks the local date as today, %s", async (_, now) => {
        vi.useFakeTimers({ toFake: ["Date"], now });
        try {
            withRegistry(<DatePicker locale="en-US" defaultOpen />);
            await settle();
            expect(cellRoot("2026-08-15").className).toContain(
                "calendar-cell--today-true",
            );
        } finally {
            vi.useRealTimers();
        }
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
        withRegistry(
            <DatePicker
                locale="en-US"
                selectionMode="range"
                defaultValue={value}
                defaultOpen
            />,
        );
        await settle();
        for (const [date, selection] of days) {
            expect(cellRoot(date!).className).toContain(
                `calendar-cell--selection-${selection}`,
            );
        }
    });

    it("marks today, and a range's start, middle and end", async () => {
        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, "0");
        const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
        withRegistry(<DatePicker locale="en-US" defaultOpen />);
        await settle();
        expect(cellRoot(today).className).toContain(
            "calendar-cell--today-true",
        );
        document.body.innerHTML = "";
        withRegistry(
            <DatePicker
                locale="en-US"
                selectionMode="range"
                defaultValue={["2026-08-10", "2026-08-12"]}
                defaultOpen
            />,
        );
        await settle();
        expect(cellRoot("2026-08-10").className).toContain(
            "calendar-cell--selection-rangeStart",
        );
        expect(cellRoot("2026-08-11").className).toContain(
            "calendar-cell--selection-rangeMiddle",
        );
        expect(cellRoot("2026-08-12").className).toContain(
            "calendar-cell--selection-rangeEnd",
        );
        expect(byTestId(ids.selectedDate).textContent).toBe("Aug 10 – Aug 12");
    });

    it("switches to the years and back, and shows the mode toggle with onModeToggle", async () => {
        const onModeToggle = vi.fn<() => void>();
        withRegistry(
            <DatePicker
                locale="en-US"
                defaultValue={["2026-08-17"]}
                defaultOpen
                onModeToggle={onModeToggle}
            />,
        );
        await settle();
        await interact(() => press(byTestId(ids.viewTrigger)));
        expect(byTestId(ids.yearList).getAttribute("role")).toBe("grid");
        const year = document.querySelector<HTMLElement>(
            `[data-testid="${cell.trigger}"][data-value="2027"]`,
        )!;
        expect(
            year.closest(`[data-testid="${cell.root}"]`)!.className,
        ).toContain("calendar-cell--view-year");
        await interact(() => press(year));
        expect(byTestId(ids.viewTrigger).textContent).toContain("August 2027");
        const toggle = screen.getByRole("button", {
            name: "Switch to text input",
        });
        await interact(() => press(toggle));
        expect(onModeToggle).toHaveBeenCalled();
    });

    it("highlights the year being shown in the years list, and moves it when another is chosen", async () => {
        withRegistry(
            <DatePicker
                locale="en-US"
                defaultValue={["2026-08-17"]}
                defaultOpen
            />,
        );
        await settle();
        await interact(() => press(byTestId(ids.viewTrigger)));
        const year = (value: string) =>
            document.querySelector<HTMLElement>(
                `[data-testid="${cell.trigger}"][data-value="${value}"]`,
            )!;
        const isSelected = (value: string) =>
            year(value)
                .closest(`[data-testid="${cell.root}"]`)!
                .className.includes("calendar-cell--selection-selected");
        expect(isSelected("2026")).toBe(true);
        await interact(() => press(year("2027")));
        await interact(() => press(byTestId(ids.viewTrigger)));
        expect(isSelected("2027")).toBe(true);
        expect(isSelected("2026")).toBe(false);
    });

    it("takes the provider's `cell` props for its own cells, over the calendar cell's and under the instance's", async () => {
        mount(
            <PureformProvider
                registry={datePickersRegistry()}
                slotProps={{
                    calendarCell: {
                        root: { style: { marginLeft: 1, marginTop: 1 } },
                    },
                    datePicker: {
                        cell: { style: { marginTop: 2, marginBottom: 2 } },
                    },
                    dockedDatePicker: { cell: { style: { marginTop: 99 } } },
                }}
            >
                <DatePicker
                    locale="en-US"
                    defaultValue={["2026-08-17"]}
                    defaultOpen
                    style={{ cell: { marginBottom: 3 } }}
                />
            </PureformProvider>,
        );
        await settle();
        const root = cellRoot("2026-08-17");
        // Every cell's, then this picker's, then the instance's, each over the one before.
        expect(root.style.marginLeft).toBe("1px");
        expect(root.style.marginTop).toBe("2px");
        expect(root.style.marginBottom).toBe("3px");
    });

    it("lists the years as one scrollable range around the chosen year, as Material's", async () => {
        withRegistry(
            <DatePicker
                locale="en-US"
                defaultValue={["2026-08-17"]}
                defaultOpen
            />,
        );
        await settle();
        await interact(() => press(byTestId(ids.viewTrigger)));
        const years = () =>
            [
                ...document.querySelectorAll<HTMLElement>(
                    `[data-testid="${cell.trigger}"][data-view="year"]`,
                ),
            ].map((year) => Number(year.dataset["value"]));
        expect(years()[0]).toBe(1926);
        expect(years().at(-1)).toBe(2126);
        expect(years()).toHaveLength(201);
        // The header keeps naming the month, as in the days, not a decade.
        expect(byTestId(ids.viewTrigger).textContent).toContain("August 2026");
        const year = document.querySelector<HTMLElement>(
            `[data-testid="${cell.trigger}"][data-value="1931"]`,
        )!;
        await interact(() => press(year));
        expect(byTestId(ids.viewTrigger).textContent).toContain("August 1931");
    });

    it("goes from the years back to the days when a year is chosen with the keys", async () => {
        withRegistry(
            <DatePicker
                locale="en-US"
                defaultValue={["2026-08-17"]}
                defaultOpen
            />,
        );
        await settle();
        await interact(() => press(byTestId(ids.viewTrigger)));
        document
            .querySelector<HTMLElement>(
                `[data-testid="${cell.trigger}"][data-value="2026"]`,
            )!
            .focus();
        await interact(() => userEvent.keyboard("{ArrowRight}{Enter}"));
        expect(byTestId(ids.viewTrigger).textContent).toContain("August 2027");
        expect(byTestId(ids.grid)).toBeTruthy();
    });

    it("keeps the years inside min and max", async () => {
        withRegistry(
            <DatePicker
                locale="en-US"
                defaultValue={["2026-08-17"]}
                min="2024-01-01"
                max="2029-12-31"
                defaultOpen
            />,
        );
        await settle();
        await interact(() => press(byTestId(ids.viewTrigger)));
        const years = [
            ...document.querySelectorAll<HTMLElement>(
                `[data-testid="${cell.trigger}"][data-view="year"]`,
            ),
        ].map((year) => Number(year.dataset["value"]));
        expect(years).toEqual([2024, 2025, 2026, 2027, 2028, 2029]);
    });

    it("passes the previous and next parts' className and style to their IconButtons, and the backdrop's", async () => {
        withRegistry(
            <DatePicker
                locale="en-US"
                defaultOpen
                className={{
                    prev: "my-prev",
                    next: "my-next",
                    backdrop: "my-dim",
                }}
                style={{ prev: { color: "red" } }}
            />,
        );
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

    it("takes a function of each cell, week and weekday in its keys", async () => {
        const views = new Set<string>();
        withRegistry(
            <DatePicker
                trigger="Pick"
                locale="en-US"
                defaultValue={["2026-08-17"]}
                className={{
                    cell: (each) => {
                        views.add(each.view);
                        return each.selected ? "chosen" : undefined;
                    },
                    week: (week) => `week-${week.index}`,
                    grid: "days",
                }}
                style={{
                    weekday: (day) =>
                        day.index === 0 ? { opacity: 0.5 } : undefined,
                }}
                slotProps={{
                    cell: (each) => ({ title: String(each.value) }),
                }}
                unstyled={{ cell: (each) => each.value === "2026-08-18" }}
            />,
        );
        await settle();
        await open();
        expect(cellRoot("2026-08-17").classList.contains("chosen")).toBe(true);
        expect(cellRoot("2026-08-16").classList.contains("chosen")).toBe(false);
        expect(cellRoot("2026-08-17").title).toBe("2026-08-17");
        expect(cellRoot("2026-08-18").className).toBe("");
        expect(byTestId(ids.grid).classList.contains("days")).toBe(true);
        expect(
            screen.getAllByTestId(ids.week)[1]!.classList.contains("week-1"),
        ).toBe(true);
        const days = screen.getAllByTestId(ids.weekday);
        expect(days[0]!.style.opacity).toBe("0.5");
        expect(days[1]!.style.opacity).toBe("");
        await interact(() => press(byTestId(ids.viewTrigger)));
        expect(trigger("2026").closest("[title]")?.getAttribute("title")).toBe(
            "2026",
        );
        expect([...views].sort()).toEqual(["day", "year"]);
    });

    it("mirrors the previous and next buttons", async () => {
        withRegistry(<DatePicker locale="en-US" defaultOpen />, "rtl");
        await settle();
        expect(byTestId(ids.prev).hasAttribute("data-pf-mirror")).toBe(true);
        expect(byTestId(ids.next).hasAttribute("data-pf-mirror")).toBe(true);
    });
});
