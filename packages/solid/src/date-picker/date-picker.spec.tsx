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
    "[data-pf-part=week], [data-pf-part=weekdays], [data-pf-part=year-list] { display: flex }";
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
        const onValueChange = vi.fn();
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
        const onValueChange = vi.fn();
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

    it("marks today", async () => {
        const now = new Date();
        const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        withRegistry(() => <DatePicker locale="en-US" defaultOpen />);
        await settle();
        expect(cellOf(iso).className).toContain("calendar-cell--today-true");
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

    it("mirrors the chevrons under rtl, and shows the mode toggle only when given", async () => {
        const onModeToggle = vi.fn();
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
