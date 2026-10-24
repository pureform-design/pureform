import { compositeTestIds, testIds } from "@pureform/anatomy";
import { screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { DatePicker } from ".";
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
        const onValueChange = vi.fn();
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
        const onSubmit = vi.fn((event: { preventDefault(): void }) =>
            event.preventDefault(),
        );
        const onValueChange = vi.fn();
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
        const onOpenChange = vi.fn();
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
        const onModeToggle = vi.fn();
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

    it("mirrors the previous and next buttons", async () => {
        withRegistry(<DatePicker locale="en-US" defaultOpen />, "rtl");
        await settle();
        expect(byTestId(ids.prev).hasAttribute("data-pf-mirror")).toBe(true);
        expect(byTestId(ids.next).hasAttribute("data-pf-mirror")).toBe(true);
    });
});
