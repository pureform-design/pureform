import type { ReactNode } from "react";
import { View } from "react-native";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { TimePicker } from ".";
import { PureformProvider } from "..";
import { animated } from "../engine";
import { presetRegistry } from "../testing/registry";
import type { TestRegistry } from "../testing/registry";
import { byTestId, computed, mount, settle, until } from "../testing/render";
import { TimeInput } from "../time-input";

let registry: TestRegistry;

beforeAll(async () => {
    registry = await presetRegistry(["timePicker", "timeInput", "ripple"]);
});

const render = (node: ReactNode) =>
    mount(
        <PureformProvider registry={registry} engine={animated} motion="reduce">
            {node}
        </PureformProvider>,
    );

const all = (id: string) => [
    ...document.querySelectorAll<HTMLElement>(`[data-testid="${id}"]`),
];

describe("time picker", () => {
    it("keeps its own width rather than stretching across a column, as the time input does", async () => {
        await render(
            <View style={{ width: 900 }}>
                <TimePicker defaultValue="09:30" hourCycle={12} />
                <TimeInput defaultValue="09:30" hourCycle={12} />
            </View>,
        );
        const picker = byTestId("pf-time-picker-root").getBoundingClientRect();
        const input = byTestId("pf-time-input-root").getBoundingClientRect();
        expect(picker.width).toBeLessThan(500);
        expect(input.width).toBeLessThan(500);
        expect(picker.left).toBe(input.left);
    });

    it("lays out the selectors, periods and a dial of twelve hours", async () => {
        await render(
            <TimePicker defaultValue="21:05" hourCycle={12} locale="en-US" />,
        );
        expect(byTestId("pf-time-picker-headline").textContent).toBe(
            "Select time",
        );
        expect(byTestId("pf-time-picker-hour-selector").textContent).toBe("9");
        expect(all("pf-time-picker-period").map((p) => p.textContent)).toEqual([
            "AM",
            "PM",
        ]);
        expect(all("pf-time-picker-dial-label")).toHaveLength(12);
        expect(computed("pf-time-picker-dial").borderTopLeftRadius).not.toBe(
            "0px",
        );
    });

    it("changes the period, and draws the selected one filled", async () => {
        const onValueChange = vi.fn();
        await render(
            <TimePicker
                defaultValue="09:30"
                hourCycle={12}
                onValueChange={onValueChange}
            />,
        );
        const [am, pm] = all("pf-time-picker-period");
        const resting = getComputedStyle(pm!).backgroundColor;
        await userEvent.click(pm!);
        await settle();
        expect(onValueChange).toHaveBeenLastCalledWith({ value: "21:30" });
        await until(() =>
            expect(getComputedStyle(pm!).backgroundColor).not.toBe(resting),
        );
        expect(am!.getAttribute("aria-pressed")).toBe("false");
    });

    it("has two rings on a 24-hour clock, and no period selector", async () => {
        await render(<TimePicker defaultValue="15:00" hourCycle={24} />);
        expect(all("pf-time-picker-dial-label")).toHaveLength(24);
        expect(all("pf-time-picker-period-selector")).toHaveLength(0);
    });

    it("shows scroll fields in scroll mode", async () => {
        await render(
            <TimePicker mode="scroll" defaultValue="10:00" hourCycle={24} />,
        );
        expect(all("pf-time-picker-dial")).toHaveLength(0);
        expect(
            all("pf-time-picker-scroll-item").map((i) => i.textContent),
        ).toEqual(["09", "10", "11", "59", "00", "01"]);
    });
});

describe("time input", () => {
    it("takes a typed minute", async () => {
        const onValueChange = vi.fn();
        await render(
            <TimeInput
                defaultValue="14:00"
                hourCycle={12}
                onValueChange={onValueChange}
            />,
        );
        const [hour, minute] = all("pf-time-input-input") as HTMLInputElement[];
        expect(hour!.value).toBe("2");
        await userEvent.clear(minute!);
        await userEvent.type(minute!, "45");
        await settle();
        expect(onValueChange).toHaveBeenLastCalledWith({ value: "14:45" });
    });
});
