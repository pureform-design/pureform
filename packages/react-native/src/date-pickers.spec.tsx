import type { ReactNode } from "react";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { PureformProvider } from ".";
import { DateInput } from "./date-input";
import { DatePicker } from "./date-picker";
import { DockedDatePicker } from "./docked-date-picker";
import { animated } from "./engine";
import { presetRegistry } from "./testing/registry";
import type { TestRegistry } from "./testing/registry";
import {
    byTestId,
    computed,
    interact,
    mount,
    outside,
    until,
} from "./testing/render";

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
    it.each([
        {
            value: ["2026-08-10", "2026-08-10"],
            selected: ["Monday, August 10, 2026"],
            next: [],
            outside: "Tuesday, August 11, 2026",
        },
        {
            value: ["2024-02-28", "2024-03-01"],
            selected: [
                "Wednesday, February 28, 2024",
                "Thursday, February 29, 2024",
            ],
            next: ["Friday, March 1, 2024"],
            outside: "Tuesday, February 27, 2024",
        },
        {
            value: ["2026-12-31", "2027-01-02"],
            selected: ["Thursday, December 31, 2026"],
            next: ["Friday, January 1, 2027", "Saturday, January 2, 2027"],
            outside: "Wednesday, December 30, 2026",
        },
    ])(
        "includes the boundaries of range $value",
        async ({ value, selected, next, outside }) => {
            await render(
                <DatePicker
                    locale="en-US"
                    selectionMode="range"
                    defaultValue={value}
                />,
            );
            for (const label of selected) {
                expect(
                    day(label)
                        .closest('[role="gridcell"]')!
                        .getAttribute("aria-selected"),
                ).toBe("true");
            }
            expect(
                day(outside)
                    .closest('[role="gridcell"]')!
                    .getAttribute("aria-selected"),
            ).not.toBe("true");
            if (next.length > 0) {
                // Native intentionally leaves outside-month cells unselected. Verify the endpoint
                // once its own month is shown rather than changing that display policy here.
                await interact(() =>
                    userEvent.click(
                        byTestId("pf-date-picker-next").querySelector(
                            "[role=button]",
                        )!,
                    ),
                );
                for (const label of next) {
                    // oxlint-disable-next-line vitest/no-conditional-expect -- only cross-month cases navigate
                    expect(
                        day(label)
                            .closest('[role="gridcell"]')!
                            .getAttribute("aria-selected"),
                    ).toBe("true");
                }
            }
        },
    );

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
        // The day's cell (a gridcell) is the selected one, as the web's.
        expect(
            day("Monday, August 17, 2026")
                .closest('[role="gridcell"]')!
                .getAttribute("aria-selected"),
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
        const onValueChange =
            vi.fn<(details: { readonly value: readonly string[] }) => void>();
        await render(
            <DatePicker
                trigger="Pick a date"
                locale="en-US"
                defaultValue={["2026-08-17"]}
                onValueChange={onValueChange}
            />,
        );
        await interact(() => userEvent.click(button("Pick a date")));
        await until(() => byTestId("pf-date-picker-content"));
        await interact(() => userEvent.click(day("Thursday, August 20, 2026")));
        expect(byTestId("pf-date-picker-selected-date").textContent).toBe(
            "Thu, Aug 20",
        );
        await interact(() => userEvent.click(button("Cancel")));
        expect(onValueChange).not.toHaveBeenCalled();
        await until(() =>
            expect(all('[data-testid="pf-date-picker-content"]')).toHaveLength(
                0,
            ),
        );

        await interact(() => userEvent.click(button("Pick a date")));
        await until(() => byTestId("pf-date-picker-content"));
        expect(byTestId("pf-date-picker-selected-date").textContent).toBe(
            "Mon, Aug 17",
        );
        await interact(() => userEvent.click(day("Thursday, August 20, 2026")));
        await interact(() => userEvent.click(button("OK")));
        expect(onValueChange).toHaveBeenCalledWith({ value: ["2026-08-20"] });
        await until(() =>
            expect(all('[data-testid="pf-date-picker-content"]')).toHaveLength(
                0,
            ),
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

    it("takes a function of each cell, week and weekday in its style and slotProps", async () => {
        const views = new Set<string>();
        await render(
            <DatePicker
                locale="en-US"
                defaultValue={["2026-08-17"]}
                style={{
                    cell: (each) => {
                        views.add(each.view);
                        return each.selected ? { opacity: 0.5 } : undefined;
                    },
                    weekday: (label) =>
                        label.index === 0 ? { opacity: 0.25 } : undefined,
                }}
                slotProps={{
                    cell: (each) => ({ accessibilityHint: String(each.value) }),
                    week: (week) => ({
                        accessibilityHint: `week ${week.index}`,
                    }),
                }}
            />,
        );
        const cell = (label: string) =>
            day(label).closest<HTMLElement>('[role="gridcell"]')!;
        expect(getComputedStyle(cell("Monday, August 17, 2026")).opacity).toBe(
            "0.5",
        );
        expect(getComputedStyle(cell("Tuesday, August 18, 2026")).opacity).toBe(
            "1",
        );
        const labels = all('[data-testid="pf-date-picker-weekday"]');
        expect(getComputedStyle(labels[0]!).opacity).toBe("0.25");
        expect(getComputedStyle(labels[1]!).opacity).toBe("1");
        await interact(() =>
            userEvent.click(byTestId("pf-date-picker-view-trigger")),
        );
        expect(getComputedStyle(day("2026").parentElement!).opacity).toBe(
            "0.5",
        );
        expect([...views].sort()).toEqual(["day", "year"]);
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
        const selected = (date: number) =>
            cell(date)
                .closest('[role="gridcell"]')!
                .getAttribute("aria-selected");
        expect(selected(11)).toBe("true");
        expect(selected(13)).toBe("false");
    });
});

describe("DockedDatePicker", () => {
    it("renders optional actions reactively through their existing part", async () => {
        const actions = outside<ReactNode>(null);
        const onPress = vi.fn<() => void>();
        await render(
            <actions.Holder>
                {(content) => (
                    <DockedDatePicker
                        defaultOpen
                        actions={content}
                        style={{ actions: { padding: 7 } }}
                        slotProps={{
                            actions: { accessibilityLabel: "Calendar actions" },
                        }}
                    />
                )}
            </actions.Holder>,
        );
        await until(() => byTestId("pf-docked-date-picker-content"));
        expect(
            document.querySelector(
                '[data-testid="pf-docked-date-picker-actions"]',
            ),
        ).toBeNull();
        await actions.set(
            <Pressable role="button" onPress={onPress}>
                <Text>Custom action</Text>
            </Pressable>,
        );
        expect(
            byTestId("pf-docked-date-picker-actions").getAttribute(
                "aria-label",
            ),
        ).toBe("Calendar actions");
        expect(computed("pf-docked-date-picker-actions").paddingTop).toBe(
            "7px",
        );
        await interact(() => userEvent.click(button("Custom action")));
        expect(onPress).toHaveBeenCalledTimes(1);
        expect(byTestId("pf-docked-date-picker-content")).toBeTruthy();
        await actions.set(false);
        expect(
            document.querySelector(
                '[data-testid="pf-docked-date-picker-actions"]',
            ),
        ).toBeNull();
    });

    it.each([true, false])(
        "keeps selection semantics and trigger wiring with closeOnSelect=%s",
        async (closeOnSelect) => {
            const onPress = vi.fn<() => void>();
            const onValueChange =
                vi.fn<
                    (details: { readonly value: readonly string[] }) => void
                >();
            await render(
                <DockedDatePicker
                    testId="custom"
                    label="Date"
                    locale="en-US"
                    defaultValue={["2026-08-17"]}
                    closeOnSelect={closeOnSelect}
                    actions={<Text>Calendar actions</Text>}
                    onValueChange={onValueChange}
                    style={{ trigger: { opacity: 0.8 } }}
                    slotProps={{
                        trigger: {
                            accessibilityHint: "Choose a date",
                            onPress,
                        },
                    }}
                />,
            );
            const trigger = byTestId("custom-trigger");
            expect(computed("custom-trigger").opacity).toBe("0.8");
            expect(trigger.getAttribute("aria-haspopup")).toBe("dialog");
            await interact(() => userEvent.click(trigger));
            expect(onPress).toHaveBeenCalledTimes(1);
            await until(() => byTestId("custom-content"));
            expect(byTestId("custom-actions").textContent).toBe(
                "Calendar actions",
            );
            await interact(() =>
                userEvent.click(day("Friday, August 21, 2026")),
            );
            expect(onValueChange).toHaveBeenLastCalledWith({
                value: ["2026-08-21"],
            });
            await until(() =>
                expect(
                    document.querySelector('[data-testid="custom-content"]') ===
                        null,
                ).toBe(closeOnSelect),
            );
        },
    );

    it("exposes the current month to cell styling", async () => {
        const now = new Date();
        const seen = new Map<number | string, boolean>();
        await render(
            <DockedDatePicker
                locale="en-US"
                defaultValue={[`${now.getFullYear()}-01-15`]}
                style={{
                    cell: (cell) => {
                        if (cell.view === "month")
                            seen.set(cell.value, cell.today);
                        return undefined;
                    },
                }}
            />,
        );
        await interact(() =>
            userEvent.click(byTestId("pf-docked-date-picker-trigger")),
        );
        await until(() => byTestId("pf-docked-date-picker-month-button"));
        await interact(() =>
            userEvent.click(byTestId("pf-docked-date-picker-month-button")),
        );
        expect(seen.get(now.getMonth() + 1)).toBe(true);
        expect([...seen.values()].filter(Boolean)).toHaveLength(1);
    });

    it("shows the format hint in the input only once focused, not under its resting label", async () => {
        await render(<DockedDatePicker label="Date" locale="en-US" />);
        const input = byTestId(
            "pf-docked-date-picker-input",
        ) as HTMLInputElement;
        expect(input.placeholder).toBe("");
        await interact(() => input.focus());
        expect(input.placeholder).toBe("mm/dd/yyyy");
    });

    it("reads typed text on blur", async () => {
        const onValueChange =
            vi.fn<(details: { readonly value: readonly string[] }) => void>();
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
        const onValueChange =
            vi.fn<(details: { readonly value: readonly string[] }) => void>();
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

const segments = () =>
    all('[data-testid="pf-date-input-segment"]') as HTMLInputElement[];

describe("DateInput", () => {
    it("draws its input as the locale's segments, each a spin button with its placeholder", async () => {
        await render(
            <DateInput locale="en-GB" defaultValue={["2026-08-17"]} />,
        );
        const input = byTestId("pf-date-input-input");
        expect(input.getAttribute("role")).toBe("group");
        expect(
            segments().map((segment) => [
                segment.getAttribute("role"),
                segment.getAttribute("aria-label"),
                segment.value,
            ]),
        ).toEqual([
            ["spinbutton", "day", "17"],
            ["spinbutton", "month", "08"],
            ["spinbutton", "year", "2026"],
        ]);
        document.body.innerHTML = "";
        await render(<DateInput locale="en-US" />);
        expect(segments().map((segment) => segment.placeholder)).toEqual([
            "mm",
            "dd",
            "yyyy",
        ]);
        // The label stays floated over the placeholders, as the web's.
        const label = byTestId("pf-date-input-label").getBoundingClientRect();
        expect(label.bottom).toBeLessThanOrEqual(
            segments()[0]!.getBoundingClientRect().top + 1,
        );
    });

    it("spaces its separators as the web's: each takes a segment's padding", async () => {
        await render(<DateInput locale="en-US" />);
        const input = byTestId("pf-date-input-input");
        const separators = [
            ...input.querySelectorAll<HTMLElement>('[aria-hidden="true"]'),
        ].filter((element) => element.textContent === "/");
        expect(separators).toHaveLength(2);
        const [month, day] = segments();
        const look = getComputedStyle(month!);
        for (const separator of separators) {
            const own = getComputedStyle(separator);
            expect(own.paddingLeft).toBe(look.paddingLeft);
            expect(own.paddingRight).toBe(look.paddingRight);
            expect(own.fontSize).toBe(look.fontSize);
        }
        // The separator fills the space between the segments around it, its padding included.
        const between =
            day!.getBoundingClientRect().left -
            month!.getBoundingClientRect().right;
        expect(between).toBeCloseTo(
            separators[0]!.getBoundingClientRect().width,
            0,
        );
        expect(parseFloat(look.paddingLeft)).toBeGreaterThan(0);
    });

    it("moves on from a full segment, back from an empty one, and along the row and up and down with the arrow keys", async () => {
        const onValueChange =
            vi.fn<(details: { readonly value: readonly string[] }) => void>();
        await render(
            <DateInput locale="en-US" onValueChange={onValueChange} />,
        );
        const [month, day, year] = segments();
        await interact(() => userEvent.click(month!));
        await interact(() => userEvent.keyboard("12"));
        expect(document.activeElement).toBe(day);
        await interact(() => userEvent.keyboard("{Backspace}"));
        expect(document.activeElement).toBe(month);
        await interact(() => userEvent.keyboard("{ArrowUp}"));
        expect(month!.value).toBe("01");
        await interact(() => userEvent.keyboard("{ArrowRight}{ArrowRight}"));
        expect(document.activeElement).toBe(year);
        await interact(() => userEvent.keyboard("2026{ArrowLeft}{ArrowDown}"));
        expect(day!.value).toBe("31");
        expect(onValueChange).toHaveBeenLastCalledWith({
            value: ["2026-01-31"],
        });
    });

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

    const iconsUnder = async (dir: "ltr" | "rtl", mirror: boolean) => {
        await mount(
            <PureformProvider
                registry={registry}
                engine={animated}
                motion="reduce"
                dir={dir}
            >
                <View style={{ width: 600, height: 700 }}>
                    <DateInput
                        locale="en-US"
                        leadingIcon="L"
                        trailingIcon="T"
                        mirrorLeadingIcon={mirror}
                    />
                </View>
            </PureformProvider>,
        );
        return computed("pf-date-input-leading-icon").transform;
    };

    it("flips a marked icon under rtl", async () => {
        const marked = await iconsUnder("rtl", true);
        expect(new DOMMatrix(marked).a).toBe(-1);
    });

    it("leaves the icons alone under rtl unless marked, and under ltr", async () => {
        expect(new DOMMatrix(await iconsUnder("rtl", false)).a).toBe(1);
    });

    it("confirms the typed date", async () => {
        const onConfirm = vi.fn<(value: readonly string[]) => void>();
        const onCancel = vi.fn<() => void>();
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
        await interact(() => userEvent.click(segments()[0]!));
        await interact(() => userEvent.keyboard("08172026"));
        expect(byTestId("pf-date-input-selected-date").textContent).toBe(
            "Mon, Aug 17",
        );
        await interact(() => userEvent.click(button("OK")));
        expect(onConfirm).toHaveBeenCalledWith(["2026-08-17"]);
        await interact(() => userEvent.click(button("Cancel")));
        expect(onCancel).toHaveBeenCalled();
    });

    it("draws its placeholders in the segment's color, the focused empty one on the focus color", async () => {
        await render(<DateInput locale="en-US" />);
        const [month, day] = segments();
        const placeholder = (segment: HTMLElement) =>
            getComputedStyle(segment, "::placeholder").color;
        expect(placeholder(month!)).toBe(getComputedStyle(month!).color);
        await interact(() => userEvent.click(month!));
        expect(placeholder(month!)).toBe(getComputedStyle(month!).color);
        // Readable on the focus color: not the resting placeholder's.
        expect(placeholder(month!)).not.toBe(placeholder(day!));
        expect(getComputedStyle(month!).backgroundColor).not.toBe(
            "rgba(0, 0, 0, 0)",
        );
    });

    it("has no date while the text isn't a whole one", async () => {
        const onConfirm = vi.fn<(value: readonly string[]) => void>();
        await render(<DateInput locale="en-US" onConfirm={onConfirm} />);
        await interact(() => userEvent.click(segments()[0]!));
        await interact(() => userEvent.keyboard("0817"));
        await interact(() => userEvent.click(button("OK")));
        expect(onConfirm).toHaveBeenCalledWith([]);
    });

    it("follows a controlled value changed later, keeping focus and the digits it typed", async () => {
        let setOutside: (value: readonly string[]) => void = () => {};
        function Controlled() {
            const [value, setValue] = useState<readonly string[]>([]);
            // oxlint-disable-next-line react/globals -- the test harness captures what it drives from outside the component
            setOutside = setValue;
            return (
                <DateInput
                    locale="en-US"
                    value={value}
                    onValueChange={(details) => setValue(details.value)}
                />
            );
        }
        await render(<Controlled />);
        const digits = () => segments().map((segment) => segment.value);
        await interact(() => userEvent.click(segments()[0]!));
        // Typed through the value: the digits stay as typed (a partial year included).
        await interact(() => userEvent.keyboard("0817202"));
        expect(digits()).toEqual(["08", "17", "202"]);
        await interact(() => userEvent.keyboard("6"));
        expect(digits()).toEqual(["08", "17", "2026"]);
        await interact(() => userEvent.click(segments()[1]!));
        // Set from outside mid-typing: the segments show it, focus stays on the day.
        await interact(() => setOutside(["2027-03-09"]));
        expect(digits()).toEqual(["03", "09", "2027"]);
        expect(document.activeElement).toBe(segments()[1]);
        await interact(() => setOutside([]));
        expect(digits()).toEqual(["", "", ""]);
    });
});
