import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import * as timePicker from ".";
import { run, settle } from "../testing/vanilla";
import type { MachineProps } from "../testing/vanilla";

afterEach(() => {
    document.body.innerHTML = "";
});

const {
    dialHand,
    dialLabels,
    displayHour,
    formatTime,
    localeHourCycle,
    localePeriods,
    parseField,
    parseTime,
    stepTime,
    timeAtEdge,
    timeAtPoint,
    withPeriod,
} = timePicker;

describe("time arithmetic", () => {
    it("reads and writes HH:mm", () => {
        expect(parseTime("09:05")).toEqual({ hour: 9, minute: 5 });
        expect(parseTime("21:30:15")).toEqual({ hour: 21, minute: 30 });
        expect(parseTime("24:00")).toBeUndefined();
        expect(parseTime("nope")).toBeUndefined();
        expect(formatTime({ hour: 7, minute: 3 })).toBe("07:03");
    });

    it("shows hours on a 12-hour clock as 12, 1 to 11, and on a 24-hour one as they are", () => {
        expect([0, 1, 11, 12, 13, 23].map((h) => displayHour(h, 12))).toEqual([
            12, 1, 11, 12, 1, 11,
        ]);
        expect(displayHour(0, 24)).toBe(0);
        expect(displayHour(23, 24)).toBe(23);
    });

    it("keeps a 12-hour hour in its period as it steps, and wraps a 24-hour one", () => {
        expect(stepTime({ hour: 11, minute: 0 }, "hour", 1, 12)).toEqual({
            hour: 0,
            minute: 0,
        });
        expect(stepTime({ hour: 23, minute: 0 }, "hour", 1, 12).hour).toBe(12);
        expect(stepTime({ hour: 23, minute: 0 }, "hour", 1, 24).hour).toBe(0);
        expect(stepTime({ hour: 0, minute: 0 }, "minute", -1, 24).minute).toBe(
            59,
        );
        expect(
            timeAtEdge({ hour: 15, minute: 0 }, "hour", "start", 12).hour,
        ).toBe(13);
        expect(
            timeAtEdge({ hour: 15, minute: 0 }, "hour", "end", 24).hour,
        ).toBe(23);
    });

    it("moves a time into the other period", () => {
        expect(withPeriod({ hour: 9, minute: 0 }, "pm").hour).toBe(21);
        expect(withPeriod({ hour: 21, minute: 0 }, "am").hour).toBe(9);
        expect(withPeriod({ hour: 21, minute: 0 }, "pm").hour).toBe(21);
    });

    it("reads a typed field in the cycle and period", () => {
        expect(parseField("9", "hour", 12, "pm")).toBe(21);
        expect(parseField("12", "hour", 12, "am")).toBe(0);
        expect(parseField("0", "hour", 12, "am")).toBeUndefined();
        expect(parseField("23", "hour", 24, "am")).toBe(23);
        expect(parseField("60", "minute", 24, "am")).toBeUndefined();
        expect(parseField("x", "minute", 24, "am")).toBeUndefined();
    });

    it("follows the locale's hour cycle and period names", () => {
        expect(localeHourCycle("en-US")).toBe(12);
        expect(localeHourCycle("en-GB")).toBe(24);
        expect(localeHourCycle("de-DE")).toBe(24);
        expect(localeHourCycle("ja-JP")).toBe(24);
        expect(localePeriods("en-US")).toEqual({ am: "AM", pm: "PM" });
    });

    it("puts twelve hour labels on the dial, and twelve more inside for 24 hours", () => {
        const twelve = dialLabels("hour", 12);
        expect(twelve.map((label) => label.text)).toEqual([
            "12",
            ...Array.from({ length: 11 }, (_, i) => String(i + 1)),
        ]);
        expect(twelve[0]).toMatchObject({ x: 50, inner: false });
        expect(twelve[3]!.y).toBe(50);
        expect(twelve[3]!.x).toBeGreaterThan(50);
        const day = dialLabels("hour", 24);
        expect(day).toHaveLength(24);
        expect(day[0]!.text).toBe("00");
        expect(day[12]).toMatchObject({ text: "12", inner: true });
        expect(dialLabels("minute", 12).map((label) => label.value)).toEqual(
            Array.from({ length: 12 }, (_, i) => i * 5),
        );
    });

    it("points the hand at the value, on the inner ring for afternoon hours on a 24-hour dial", () => {
        expect(dialHand({ hour: 15, minute: 0 }, "hour", 12).turn).toBe(0.25);
        expect(
            dialHand({ hour: 15, minute: 0 }, "hour", 24).radius,
        ).toBeLessThan(dialHand({ hour: 3, minute: 0 }, "hour", 24).radius);
        expect(dialHand({ hour: 0, minute: 45 }, "minute", 12).turn).toBe(0.75);
    });

    it("picks the value under a point on the dial", () => {
        const pm = { hour: 13, minute: 0 };
        // Right of the centre is 3 o'clock: in a 12-hour cycle it stays in the period.
        expect(timeAtPoint(pm, "hour", 12, 90, 50).hour).toBe(15);
        // On a 24-hour dial the outer ring is 0 to 11 and the inner 12 to 23.
        expect(timeAtPoint(pm, "hour", 24, 89, 50).hour).toBe(3);
        expect(timeAtPoint(pm, "hour", 24, 75, 50).hour).toBe(15);
        expect(timeAtPoint(pm, "minute", 12, 50, 90).minute).toBe(30);
    });
});

/** A picker over a dial and two buttons, run with `props`. */
const picker = (props: MachineProps<timePicker.Schema>) => {
    const host = document.createElement("div");
    host.innerHTML = `<div data-dial style="position:relative;width:200px;height:200px"></div>
        <button data-hour></button><button data-minute></button>
        <input data-input>`;
    document.body.append(host);
    const dial = host.querySelector<HTMLElement>("[data-dial]")!;
    const hour = host.querySelector<HTMLElement>("[data-hour]")!;
    const input = host.querySelector<HTMLInputElement>("[data-input]")!;
    const running = run(
        timePicker.machine,
        timePicker.connect,
        { id: "alarm", hourCycle: 12, ...props },
        (api, spread) => {
            spread(dial, api.getDialProps());
            spread(hour, api.getSelectorProps("hour"));
            spread(input, api.getInputProps("hour"));
        },
    );
    return { ...running, dial, hour, input };
};

describe("time picker machine", () => {
    it("holds the time with controllable-state semantics", async () => {
        const onValueChange = vi.fn();
        const { api, stop } = picker({ defaultValue: "09:30", onValueChange });
        expect(api().value).toBe("09:30");
        expect(api().period).toBe("am");
        api().setPeriod("pm");
        await settle();
        expect(onValueChange).toHaveBeenCalledExactlyOnceWith({
            value: "21:30",
            time: { hour: 21, minute: 30 },
        });
        stop();
    });

    it("announces the dial as a slider over the view's value", () => {
        const { dial, stop } = picker({ defaultValue: "21:30" });
        expect(dial.getAttribute("role")).toBe("slider");
        expect(dial.getAttribute("aria-valuenow")).toBe("9");
        expect(dial.getAttribute("aria-valuemin")).toBe("1");
        expect(dial.getAttribute("aria-valuemax")).toBe("12");
        expect(dial.getAttribute("aria-valuetext")).toBe("9:30 PM");
        expect(dial.getAttribute("aria-label")).toBe("Hour");
        stop();
    });

    it("steps the view's value with the arrow keys, and moves to the minutes on Enter", async () => {
        const { api, dial, stop } = picker({ defaultValue: "09:30" });
        dial.focus();
        await userEvent.keyboard("{ArrowUp}{ArrowUp}");
        await settle();
        expect(api().value).toBe("11:30");
        await userEvent.keyboard("{Enter}");
        await settle();
        expect(api().view).toBe("minute");
        await userEvent.keyboard("{PageDown}");
        await settle();
        expect(api().value).toBe("11:25");
        await userEvent.keyboard("{End}");
        await settle();
        expect(api().value).toBe("11:59");
        stop();
    });

    it("turns the hand with a dragging pointer at once, and to the value, animated, after", async () => {
        const { api, dial, stop } = picker({ defaultValue: "02:00" });
        const box = dial.getBoundingClientRect();
        const at = (turn: number) => ({
            clientX:
                box.left +
                box.width * (0.5 + 0.4 * Math.sin(turn * 2 * Math.PI)),
            clientY:
                box.top +
                box.height * (0.5 - 0.4 * Math.cos(turn * 2 * Math.PI)),
        });
        const track = () =>
            api().getDialTrackProps().style as Record<string, string>;
        dial.dispatchEvent(
            new PointerEvent("pointerdown", {
                bubbles: true,
                button: 0,
                pointerId: 1,
                ...at(0.24),
            }),
        );
        await settle();
        // A press jumps to the value under it, over the track's transition.
        expect(track()["transform"]).toBe("rotate(90deg)");
        expect(track()["transition"]).toBeUndefined();
        document.dispatchEvent(
            new PointerEvent("pointermove", {
                bubbles: true,
                pointerId: 1,
                ...at(0.27),
            }),
        );
        await settle();
        // Between 3 and 4 o'clock: the hand is where the pointer is, not on the hour.
        expect(api().value).toBe("03:00");
        const turned = Number.parseFloat(track()["transform"]!.slice(7));
        expect(turned).toBeCloseTo(0.27 * 360, 0);
        expect(track()["transition"]).toBe("none");
        document.dispatchEvent(
            new PointerEvent("pointerup", {
                bubbles: true,
                pointerId: 1,
                ...at(0.27),
            }),
        );
        await settle();
        expect(api().view).toBe("minute");
        expect(track()["transition"]).toBeUndefined();
        stop();
    });

    it("turns the hand to a new value the short way round", async () => {
        const { api, dial, stop } = picker({ defaultValue: "11:00" });
        dial.focus();
        await userEvent.keyboard("{ArrowUp}");
        await settle();
        // 12 AM, in the period it was in.
        expect(api().value).toBe("00:00");
        // From 330° on to 360°, not back to 0°.
        expect(api().getDialTrackProps().style).toMatchObject({
            transform: "rotate(360deg)",
        });
        // The handle goes round its path with the track, from 11 o'clock on past 12, rather than
        // jumping to the value: the path starts at 3 o'clock.
        expect(api().getDialHandleProps().style).toMatchObject({
            offsetPath: "circle(39% at 50% 50%)",
            offsetDistance: "75%",
            offsetRotate: "0deg",
        });
        stop();
    });

    it("moves the handle at once with a dragging pointer, as the track", async () => {
        const { api, dial, stop } = picker({ defaultValue: "02:00" });
        const box = dial.getBoundingClientRect();
        dial.dispatchEvent(
            new PointerEvent("pointerdown", {
                bubbles: true,
                button: 0,
                pointerId: 1,
                clientX: box.left + box.width * 0.9,
                clientY: box.top + box.height * 0.5,
            }),
        );
        await settle();
        document.dispatchEvent(
            new PointerEvent("pointermove", {
                bubbles: true,
                pointerId: 1,
                clientX: box.left + box.width * 0.9,
                clientY: box.top + box.height * 0.6,
            }),
        );
        await settle();
        const handle = api().getDialHandleProps().style as Record<
            string,
            string
        >;
        expect(handle["transition"]).toBe("none");
        expect(api().getDialTrackProps().style).toMatchObject({
            transition: "none",
        });
        stop();
    });

    it("picks the hour a pointer lets go of, then shows the minutes", async () => {
        const { api, dial, stop } = picker({ defaultValue: "09:00" });
        const box = dial.getBoundingClientRect();
        dial.dispatchEvent(
            new PointerEvent("pointerdown", {
                bubbles: true,
                button: 0,
                pointerId: 1,
                clientX: box.left + box.width * 0.9,
                clientY: box.top + box.height / 2,
            }),
        );
        await settle();
        document.dispatchEvent(
            new PointerEvent("pointerup", {
                bubbles: true,
                pointerId: 1,
                clientX: box.left + box.width / 2,
                clientY: box.top + box.height * 0.9,
            }),
        );
        await settle();
        expect(api().value).toBe("06:00");
        expect(api().view).toBe("minute");
        stop();
    });

    it("marks the selector the dial sets as pressed", async () => {
        const { api, hour, stop } = picker({});
        expect(hour.getAttribute("aria-pressed")).toBe("true");
        api().setView("minute");
        await settle();
        expect(hour.getAttribute("aria-pressed")).toBe("false");
        stop();
    });

    it("takes a typed hour once it reads as one", async () => {
        const { api, input, stop } = picker({ defaultValue: "14:00" });
        await userEvent.clear(input);
        await userEvent.type(input, "7");
        await settle();
        expect(api().value).toBe("19:00");
        stop();
    });

    it("changes nothing while disabled or read-only", async () => {
        const { api, dial, stop } = picker({
            defaultValue: "09:00",
            readOnly: true,
        });
        dial.focus();
        await userEvent.keyboard("{ArrowUp}");
        await settle();
        api().setPeriod("pm");
        await settle();
        expect(api().value).toBe("09:00");
        stop();
    });

    it("follows the locale's hour cycle when none is given", () => {
        const { api, stop } = picker({ hourCycle: undefined, locale: "de-DE" });
        expect(api().hourCycle).toBe(24);
        stop();
        const us = picker({ hourCycle: undefined, locale: "en-US" });
        expect(us.api().hourCycle).toBe(12);
        us.stop();
    });
});
