import { testIds } from "@pureform/anatomy";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { TimePicker } from ".";
import { PureformProvider } from "..";
import { displayRegistry } from "../__fixtures__/registry";
import { mount, settle } from "../testing/render";
import { TimeInput } from "../time-input";

const ids = testIds.timePicker;

const withRegistry = (view: React.ReactNode) =>
    mount(
        <PureformProvider registry={displayRegistry()}>
            {view}
        </PureformProvider>,
    );

const all = (id: string) => [
    ...document.querySelectorAll<HTMLElement>(`[data-testid="${id}"]`),
];
const byTestId = (id: string) => all(id)[0]!;

describe("TimePicker", () => {
    it("renders the headline, selectors, periods, dial and actions", async () => {
        withRegistry(
            <TimePicker
                defaultValue="21:05"
                hourCycle={12}
                locale="en-US"
                actions={<button>OK</button>}
            />,
        );
        await settle();
        expect(byTestId(ids.root).getAttribute("role")).toBe("group");
        expect(byTestId(ids.headline).textContent).toBe("Select time");
        expect(byTestId(ids.hourSelector).textContent).toBe("9");
        expect(byTestId(ids.minuteSelector).textContent).toBe("05");
        expect(
            all(ids.period).map((p) => p.getAttribute("aria-pressed")),
        ).toEqual(["false", "true"]);
        expect(all(ids.dialLabel)).toHaveLength(12);
        expect(byTestId(ids.dial).getAttribute("aria-valuetext")).toBe(
            "9:05 PM",
        );
        expect(byTestId(ids.actions).textContent).toBe("OK");
    });

    it("is controllable, and the period and the dial change it", async () => {
        const onValueChange = vi.fn();
        function Controlled() {
            const [value, setValue] = useState("09:30");
            return (
                <TimePicker
                    value={value}
                    hourCycle={12}
                    onValueChange={(details) => {
                        onValueChange(details);
                        setValue(details.value);
                    }}
                />
            );
        }
        withRegistry(<Controlled />);
        await settle();
        all(ids.period)[1]!.click();
        await settle();
        expect(onValueChange).toHaveBeenLastCalledWith(
            expect.objectContaining({ value: "21:30" }),
        );
        byTestId(ids.dial).focus();
        await userEvent.keyboard("{ArrowUp}");
        await settle();
        expect(byTestId(ids.hourSelector).textContent).toBe("10");
    });

    it("has two rings of hours and no period selector on a 24-hour clock", async () => {
        withRegistry(<TimePicker defaultValue="15:00" hourCycle={24} />);
        await settle();
        expect(all(ids.dialLabel)).toHaveLength(24);
        expect(all(ids.periodSelector)).toHaveLength(0);
        expect(byTestId(ids.hourSelector).textContent).toBe("15");
    });

    it("shows two spin buttons and no dial in scroll mode", async () => {
        withRegistry(
            <TimePicker mode="scroll" defaultValue="10:00" hourCycle={24} />,
        );
        await settle();
        const hour = byTestId(ids.hourSelector);
        expect(hour.getAttribute("role")).toBe("spinbutton");
        expect(all(ids.dial)).toHaveLength(0);
        expect(all(ids.scrollItem).map((item) => item.textContent)).toEqual([
            "09",
            "10",
            "11",
            "59",
            "00",
            "01",
        ]);
        hour.focus();
        await userEvent.keyboard("{ArrowDown}");
        await settle();
        expect(byTestId(ids.hourSelector).getAttribute("aria-valuenow")).toBe(
            "9",
        );
    });
});

describe("TimeInput", () => {
    it("takes a typed time, with the period selector in a 12-hour cycle", async () => {
        const onValueChange = vi.fn();
        withRegistry(
            <TimeInput
                defaultValue="14:00"
                hourCycle={12}
                onValueChange={onValueChange}
            />,
        );
        await settle();
        const input = all(testIds.timeInput.input) as HTMLInputElement[];
        expect(input.map((field) => field.value)).toEqual(["2", "00"]);
        await userEvent.clear(input[1]!);
        await userEvent.type(input[1]!, "45");
        await settle();
        expect(onValueChange).toHaveBeenLastCalledWith(
            expect.objectContaining({ value: "14:45" }),
        );
        expect(all(testIds.timeInput.period)).toHaveLength(2);
    });
});
