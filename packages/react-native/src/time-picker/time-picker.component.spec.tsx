import type { ComponentProps } from "react";
import type { ReactNode } from "react";
import { View } from "react-native";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { TimePicker } from ".";
import { PureformProvider } from "..";
import { animated } from "../engine";
import { presetRegistry } from "../testing/registry";
import type { TestRegistry } from "../testing/registry";
import {
    byTestId,
    computed,
    drag,
    laidOut,
    mount,
    outside,
    settle,
    until,
} from "../testing/render";
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
        const onValueChange =
            vi.fn<
                NonNullable<ComponentProps<typeof TimePicker>["onValueChange"]>
            >();
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

    it("draws the handle over the selected label from its first frame, before the dial's layout reports", async () => {
        await render(
            <TimePicker
                defaultValue="09:30"
                hourCycle={12}
                defaultView="minute"
            />,
        );
        const centre = (element: HTMLElement) => {
            const box = element.getBoundingClientRect();
            return [box.x + box.width / 2, box.y + box.height / 2];
        };
        const label = all("pf-time-picker-dial-label").find(
            (each) => each.textContent === "30",
        )!;
        const [hx, hy] = centre(byTestId("pf-time-picker-dial-handle"));
        const [lx, ly] = centre(label);
        expect(Math.abs(hx! - lx!)).toBeLessThan(1);
        expect(Math.abs(hy! - ly!)).toBeLessThan(1);
    });

    it("turns the hand with a dragging touch itself, onto the value once let go", async () => {
        await render(<TimePicker defaultValue="02:00" hourCycle={12} />);
        const dial = byTestId("pf-time-picker-dial");
        // A touch reads where it is from the dial's size, which its layout reports.
        await laidOut(dial);
        const track = byTestId("pf-time-picker-dial-track");
        const box = dial.getBoundingClientRect();
        const r = box.width * 0.4;
        // Pressed right of the centre (3 o'clock), then dragged between 3 and 4: the moves are
        // from the press.
        const turn = 0.27 * 2 * Math.PI;
        const release = await drag(
            dial,
            [[r * Math.sin(turn) - r, -r * Math.cos(turn)]],
            { x: box.width / 2 + r, y: box.height / 2 },
        );
        expect(byTestId("pf-time-picker-hour-selector").textContent).toBe("3");
        const turned = track.style.transform;
        expect(turned).not.toBe("rotate(90deg)");
        expect(Number.parseFloat(turned.slice(7))).toBeCloseTo(0.27 * 360, 0);
        await release();
        // Letting go of an hour shows the minutes, the hand on the value's.
        await until(() => expect(track.style.transform).toBe("rotate(0deg)"));
    });

    it("springs the hand to a new value the short way round, the handle at its tip", async () => {
        const value = outside("11:00");
        await mount(
            <PureformProvider
                registry={registry}
                engine={animated}
                motion="full"
                timeScale={20}
            >
                <value.Holder>
                    {(at) => <TimePicker value={at} hourCycle={12} />}
                </value.Holder>
            </PureformProvider>,
        );
        await settle();
        const track = byTestId("pf-time-picker-dial-track");
        const handle = byTestId("pf-time-picker-dial-handle");
        const angle = () => Number.parseFloat(track.style.transform.slice(7));
        expect(angle()).toBeCloseTo(330, 0);
        await value.set("01:00");
        await settle(100);
        // From 11 to 1 through 12: up past 330, not back down through the other hours.
        const moving = angle();
        expect(moving).toBeGreaterThan(330);
        expect(moving).toBeLessThan(390);
        // The handle turns with it rather than jumping to the value.
        expect(handle.style.transform).toContain(`rotate(${moving}deg)`);
        await until(() => expect(angle()).toBeCloseTo(390, 0), 30_000);
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

describe("time picker, by copy", () => {
    it("takes a function of each dial label and scroll item in its style", async () => {
        await render(
            <TimePicker
                defaultValue="21:05"
                hourCycle={12}
                style={{
                    dialLabel: (label) =>
                        label.selected ? { opacity: 0.5 } : undefined,
                }}
            />,
        );
        const dimmed = all("pf-time-picker-dial-label").filter(
            (label) => getComputedStyle(label).opacity === "0.5",
        );
        expect(dimmed.map((label) => label.textContent)).toEqual(["9"]);
    });

    it("reaches each scroll item by its value", async () => {
        await render(
            <TimePicker
                mode="scroll"
                defaultValue="10:00"
                hourCycle={24}
                style={{
                    scrollItem: (item) =>
                        item.selected && item.view === "hour"
                            ? { opacity: 0.5 }
                            : undefined,
                }}
            />,
        );
        expect(
            all("pf-time-picker-scroll-item")
                .filter((item) => getComputedStyle(item).opacity === "0.5")
                .map((item) => item.textContent),
        ).toEqual(["10"]);
    });
});

describe("time input", () => {
    it("takes a typed minute", async () => {
        const onValueChange =
            vi.fn<
                NonNullable<ComponentProps<typeof TimeInput>["onValueChange"]>
            >();
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
