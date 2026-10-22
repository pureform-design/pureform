import type { ReactNode } from "react";
import { View } from "react-native";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { PureformProvider } from ".";
import { DateInput } from "./date-input";
import { DatePicker } from "./date-picker";
import { DockedDatePicker } from "./docked-date-picker";
import { animated } from "./engine";
import { presetRegistry } from "./testing/registry";
import type { TestRegistry } from "./testing/registry";
import { byTestId, interact, mount, until } from "./testing/render";

let registry: TestRegistry;

beforeAll(async () => {
    registry = await presetRegistry([
        "datePicker",
        "dockedDatePicker",
        "dateInput",
        "calendarCell",
        "button",
        "iconButton",
        "menu",
        "scrim",
        "ripple",
    ]);
});

const render = (node: ReactNode) =>
    mount(
        <PureformProvider registry={registry} engine={animated} motion="reduce">
            <View style={{ width: 600, height: 700 }}>{node}</View>
        </PureformProvider>,
    );

const all = (selector: string) => [
    ...document.querySelectorAll<HTMLElement>(selector),
];
const weekdays = () =>
    all('[data-testid="pf-date-picker-weekday"]').map((day) =>
        day.getAttribute("aria-label"),
    );
const button = (text: string) => {
    const found = all('[role="button"]').find(
        (element) => element.textContent?.trim() === text,
    );
    if (!found) throw new Error(`no button "${text}"`);
    return found;
};
const day = (label: string) => {
    const found = document.querySelector<HTMLElement>(
        `[data-testid="pf-calendar-cell-trigger"][aria-label="${label}"]`,
    );
    if (!found) throw new Error(`no day "${label}"`);
    return found;
};

describe("DatePicker", () => {
    it("renders the surface with the chosen date and its month", async () => {
        await render(
            <DatePicker locale="en-US" defaultValue={["2026-08-17"]} />,
        );
        expect(byTestId("pf-date-picker-headline").textContent).toBe(
            "Select date",
        );
        expect(byTestId("pf-date-picker-selected-date").textContent).toBe(
            "Mon, Aug 17",
        );
        expect(byTestId("pf-date-picker-view-trigger").textContent).toContain(
            "August 2026",
        );
        expect(
            day("Monday, August 17, 2026").getAttribute("aria-selected"),
        ).toBe("true");
        expect(all('[data-testid="pf-date-picker-mode-toggle"]')).toHaveLength(
            0,
        );
    });

    it("starts the week on the locale's first day, or firstDayOfWeek", async () => {
        await render(<DatePicker locale="en-US" />);
        expect(weekdays()[0]).toBe("Sunday");
        document.body.innerHTML = "";
        await render(<DatePicker locale="en-GB" />);
        expect(weekdays()[0]).toBe("Monday");
        document.body.innerHTML = "";
        await render(<DatePicker locale="en-US" firstDayOfWeek={3} />);
        expect(weekdays()[0]).toBe("Wednesday");
    });

    it("commits the draft on OK and drops it on Cancel", async () => {
        const onValueChange = vi.fn();
        await render(
            <DatePicker
                trigger="Pick a date"
                locale="en-US"
                defaultValue={["2026-08-17"]}
                onValueChange={onValueChange}
            />,
        );
        await interact(() => userEvent.click(button("Pick a date")));
        await until(() => byTestId("pf-date-picker-root"));
        await interact(() => userEvent.click(day("Thursday, August 20, 2026")));
        expect(byTestId("pf-date-picker-selected-date").textContent).toBe(
            "Thu, Aug 20",
        );
        await interact(() => userEvent.click(button("Cancel")));
        expect(onValueChange).not.toHaveBeenCalled();
        await until(() =>
            expect(all('[data-testid="pf-date-picker-root"]')).toHaveLength(0),
        );

        await interact(() => userEvent.click(button("Pick a date")));
        await until(() => byTestId("pf-date-picker-root"));
        expect(byTestId("pf-date-picker-selected-date").textContent).toBe(
            "Mon, Aug 17",
        );
        await interact(() => userEvent.click(day("Thursday, August 20, 2026")));
        await interact(() => userEvent.click(button("OK")));
        expect(onValueChange).toHaveBeenCalledWith({ value: ["2026-08-20"] });
        await until(() =>
            expect(all('[data-testid="pf-date-picker-root"]')).toHaveLength(0),
        );
    });

    it("moves between months and to the year list", async () => {
        await render(
            <DatePicker locale="en-US" defaultValue={["2026-08-17"]} />,
        );
        await interact(() =>
            userEvent.click(
                byTestId("pf-date-picker-next").querySelector("[role=button]")!,
            ),
        );
        expect(byTestId("pf-date-picker-view-trigger").textContent).toContain(
            "September 2026",
        );
        await interact(() =>
            userEvent.click(byTestId("pf-date-picker-view-trigger")),
        );
        await interact(() => userEvent.click(day("2030")));
        expect(byTestId("pf-date-picker-view-trigger").textContent).toContain(
            "September 2030",
        );
    });

    it("draws a range's start, middle and end", async () => {
        await render(
            <DatePicker
                locale="en-US"
                selectionMode="range"
                defaultValue={["2026-08-10", "2026-08-12"]}
            />,
        );
        const cell = (date: number) =>
            day(
                new Intl.DateTimeFormat("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    timeZone: "UTC",
                }).format(new Date(Date.UTC(2026, 7, date))),
            );
        const band = (date: number) =>
            getComputedStyle(cell(date).parentElement!).backgroundColor;
        const fill = (date: number) =>
            getComputedStyle(cell(date)).backgroundColor;
        expect(band(11)).not.toBe(band(13));
        expect(band(10)).not.toBe(band(13));
        expect(band(12)).not.toBe(band(13));
        expect(fill(10)).not.toBe(fill(11));
        expect(fill(12)).toBe(fill(10));
        expect(cell(11).getAttribute("aria-selected")).toBe("true");
        expect(cell(13).getAttribute("aria-selected")).toBe("false");
    });
});

describe("DockedDatePicker", () => {
    it("reads typed text on blur", async () => {
        const onValueChange = vi.fn();
        await render(
            <DockedDatePicker
                label="Date"
                locale="en-US"
                onValueChange={onValueChange}
            />,
        );
        expect(
            byTestId("pf-docked-date-picker-supporting-text").textContent,
        ).toBe("mm/dd/yyyy");
        const input = byTestId("pf-docked-date-picker-input");
        await interact(() => userEvent.fill(input, "08/17/2026"));
        await interact(() => input.blur());
        expect(onValueChange).toHaveBeenCalledWith({ value: ["2026-08-17"] });
    });

    it("opens the calendar and closes on a chosen day", async () => {
        const onValueChange = vi.fn();
        await render(
            <DockedDatePicker
                label="Date"
                locale="en-US"
                defaultValue={["2026-08-17"]}
                onValueChange={onValueChange}
            />,
        );
        expect(
            (byTestId("pf-docked-date-picker-input") as HTMLInputElement).value,
        ).toBe("08/17/2026");
        await interact(() =>
            userEvent.click(byTestId("pf-docked-date-picker-trigger")),
        );
        await until(() => byTestId("pf-docked-date-picker-content"));
        await interact(() => userEvent.click(day("Friday, August 21, 2026")));
        expect(onValueChange).toHaveBeenCalledWith({ value: ["2026-08-21"] });
        await until(() =>
            expect(
                all('[data-testid="pf-docked-date-picker-content"]'),
            ).toHaveLength(0),
        );
        expect(
            (byTestId("pf-docked-date-picker-input") as HTMLInputElement).value,
        ).toBe("08/21/2026");
    });
});

describe("DateInput", () => {
    it("draws the icons and affixes only when given", async () => {
        await render(
            <DateInput
                locale="en-US"
                leadingIcon="L"
                prefixText="$"
                suffixText="USD"
            />,
        );
        expect(byTestId("pf-date-input-leading-icon").textContent).toBe("L");
        expect(byTestId("pf-date-input-prefix-text").textContent).toBe("$");
        expect(byTestId("pf-date-input-suffix-text").textContent).toBe("USD");
        expect(
            document.querySelector(
                '[data-testid="pf-date-input-trailing-icon"]',
            ),
        ).toBeNull();
    });

    it("confirms the typed date", async () => {
        const onConfirm = vi.fn();
        const onCancel = vi.fn();
        await render(
            <DateInput
                locale="en-US"
                onConfirm={onConfirm}
                onCancel={onCancel}
            />,
        );
        expect(byTestId("pf-date-input-selected-date").textContent).toBe(
            "Enter date",
        );
        expect(byTestId("pf-date-input-label").textContent).toBe("Date");
        await interact(() =>
            userEvent.fill(byTestId("pf-date-input-input"), "08/17/2026"),
        );
        expect(byTestId("pf-date-input-selected-date").textContent).toBe(
            "Mon, Aug 17",
        );
        await interact(() => userEvent.click(button("OK")));
        expect(onConfirm).toHaveBeenCalledWith(["2026-08-17"]);
        await interact(() => userEvent.click(button("Cancel")));
        expect(onCancel).toHaveBeenCalled();
    });

    it("has no date while the text isn't a whole one", async () => {
        const onConfirm = vi.fn();
        await render(<DateInput locale="en-US" onConfirm={onConfirm} />);
        await interact(() =>
            userEvent.fill(byTestId("pf-date-input-input"), "08/17"),
        );
        await interact(() => userEvent.click(button("OK")));
        expect(onConfirm).toHaveBeenCalledWith([]);
    });
});
