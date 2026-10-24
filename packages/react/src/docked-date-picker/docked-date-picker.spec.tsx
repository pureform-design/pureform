import { compositeTestIds, testIds } from "@pureform/anatomy";
import { screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { DockedDatePicker } from ".";
import { PureformProvider } from "..";
import { datePickersRegistry } from "../__fixtures__/registry";
import { interact, mount, settle, until } from "../testing/render";

const byTestId = <E extends HTMLElement = HTMLElement>(id: string): E =>
    screen.getByTestId(id) as E;

const ids = compositeTestIds.dockedDatePicker;
const cell = testIds.calendarCell;

const withRegistry = (view: ReactNode, dir: "ltr" | "rtl" = "ltr") =>
    mount(
        <PureformProvider registry={datePickersRegistry()} dir={dir}>
            {view}
        </PureformProvider>,
    );

const trigger = (value: string) =>
    document.querySelector<HTMLElement>(
        `[data-testid="${cell.trigger}"][data-value="${value}"]`,
    )!;

// The unstyled popup outgrows the test's frame, so clicks go to the element itself.
const press = async (element: HTMLElement) => element.click();

describe("DockedDatePicker, ready-made", () => {
    it("renders the field, the calendar button and the format as supporting text", async () => {
        withRegistry(<DockedDatePicker label="Date" locale="en-US" />);
        await settle();
        expect(byTestId(ids.root).className).toContain("docked-date-picker");
        expect(byTestId(ids.root).className).toContain(
            "docked-date-picker--trailingIcon-true",
        );
        expect(byTestId(ids.label).textContent).toBe("Date");
        expect(byTestId(ids.trailingIcon).getAttribute("aria-label")).toBe(
            "Open calendar",
        );
        expect(byTestId(ids.supportingText).textContent).toBe("mm/dd/yyyy");
        // The input's placeholder is the format too, as React Native's (the preset shows it once
        // the field is focused and the label has floated).
        expect(byTestId<HTMLInputElement>(ids.input).placeholder).toBe(
            "mm/dd/yyyy",
        );
        expect(byTestId(ids.input).getAttribute("aria-describedby")).toBe(
            byTestId(ids.supportingText).id,
        );
        expect(byTestId(ids.positioner).hidden).toBe(true);
        expect(byTestId(ids.container).hasAttribute("data-pf-filled")).toBe(
            false,
        );
    });

    it("sets the value from a typed date once the field loses focus", async () => {
        const onValueChange = vi.fn();
        withRegistry(
            <DockedDatePicker
                label="Date"
                locale="en-US"
                onValueChange={onValueChange}
            />,
        );
        await settle();
        await interact(() => userEvent.click(byTestId(ids.input)));
        await interact(() => userEvent.keyboard("08/17/2026"));
        expect(byTestId(ids.container).hasAttribute("data-pf-filled")).toBe(
            true,
        );
        await interact(async () => byTestId(ids.input).blur());
        await until(() =>
            expect(onValueChange).toHaveBeenLastCalledWith({
                value: ["2026-08-17"],
            }),
        );
    });

    it("opens with the trigger and closes on a choice", async () => {
        const onValueChange = vi.fn();
        withRegistry(
            <DockedDatePicker
                label="Date"
                locale="en-US"
                defaultValue={["2026-08-17"]}
                onValueChange={onValueChange}
            />,
        );
        await settle();
        expect(byTestId<HTMLInputElement>(ids.input).value).toBe("08/17/2026");
        await interact(() => press(byTestId(ids.trailingIcon)));
        await until(() => expect(byTestId(ids.positioner).hidden).toBe(false));
        expect(byTestId(ids.monthButton).textContent).toBe("Aug");
        expect(byTestId(ids.yearButton).textContent).toBe("2026");
        expect(byTestId(ids.grid).getAttribute("role")).toBe("grid");
        expect(
            trigger("2026-08-17").closest(`[data-testid="${cell.root}"]`)!
                .className,
        ).toContain("calendar-cell--selection-selected");
        await interact(() => press(trigger("2026-08-20")));
        expect(onValueChange).toHaveBeenLastCalledWith({
            value: ["2026-08-20"],
        });
        await until(() => expect(byTestId(ids.positioner).hidden).toBe(true));
        expect(byTestId<HTMLInputElement>(ids.input).value).toBe("08/20/2026");
    });

    it("steps by month and year, and picks from the month and year lists", async () => {
        withRegistry(
            <DockedDatePicker
                label="Date"
                locale="en-US"
                defaultValue={["2026-08-17"]}
                defaultOpen
            />,
        );
        await settle();
        const [prevMonth, prevYear] = screen.getAllByTestId(ids.prev);
        const [nextMonth] = screen.getAllByTestId(ids.next);
        await interact(() => press(nextMonth!));
        expect(byTestId(ids.monthButton).textContent).toBe("Sep");
        await interact(() => press(prevMonth!));
        await interact(() => press(prevYear!));
        expect(byTestId(ids.monthButton).textContent).toBe("Aug");
        expect(byTestId(ids.yearButton).textContent).toBe("2025");
        await interact(() => press(byTestId(ids.monthButton)));
        expect(byTestId(ids.monthList)).toBeTruthy();
        await interact(() => press(trigger("3")));
        expect(byTestId(ids.monthButton).textContent).toBe("Mar");
        expect(byTestId(ids.grid)).toBeTruthy();
        await interact(() => press(byTestId(ids.yearButton)));
        await interact(() => press(trigger("2028")));
        expect(byTestId(ids.yearButton).textContent).toBe("2028");
        expect(byTestId(ids.grid)).toBeTruthy();
    });

    it("shows an error instead of the supporting text and mirrors the steps under rtl", async () => {
        withRegistry(
            <DockedDatePicker
                label="Date"
                locale="en-US"
                error="Out of range"
                defaultOpen
            />,
            "rtl",
        );
        await settle();
        expect(byTestId(ids.supportingText).textContent).toBe("Out of range");
        expect(byTestId(ids.input).getAttribute("aria-invalid")).toBe("true");
        for (const step of [
            ...screen.getAllByTestId(ids.prev),
            ...screen.getAllByTestId(ids.next),
        ])
            expect(step.hasAttribute("data-pf-mirror")).toBe(true);
    });
});
