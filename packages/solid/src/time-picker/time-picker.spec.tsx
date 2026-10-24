import { testIds } from "@pureform/anatomy";
import { createSignal } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { TimePicker } from ".";
import { PureformProvider } from "..";
import { displayRegistry } from "../__fixtures__/registry";
import { byTestId, mount, settle } from "../testing/mount";
import { TimeInput } from "../time-input";

const ids = testIds.timePicker;

const withRegistry = (view: () => unknown) =>
    mount(() => (
        <PureformProvider registry={displayRegistry()}>
            {view() as never}
        </PureformProvider>
    ));

const all = (id: string) => [
    ...document.querySelectorAll<HTMLElement>(`[data-testid="${id}"]`),
];

describe("TimePicker", () => {
    it("renders the headline, selectors, periods, dial and actions", async () => {
        withRegistry(() => (
            <TimePicker
                defaultValue="21:05"
                hourCycle={12}
                locale="en-US"
                actions={<button>OK</button>}
            />
        ));
        await settle();
        const root = byTestId(ids.root);
        expect(root.getAttribute("role")).toBe("group");
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
        const [value, setValue] = createSignal("09:30");
        withRegistry(() => (
            <TimePicker
                value={value()}
                hourCycle={12}
                onValueChange={(details) => {
                    onValueChange(details);
                    setValue(details.value);
                }}
            />
        ));
        await settle();
        all(ids.period)[1]!.click();
        await settle();
        expect(onValueChange).toHaveBeenLastCalledWith(
            expect.objectContaining({ value: "21:30" }),
        );
        byTestId(ids.dial).focus();
        await userEvent.keyboard("{ArrowUp}");
        await settle();
        expect(value()).toBe("22:30");
        expect(byTestId(ids.hourSelector).textContent).toBe("10");
    });

    it("has two rings of hours and no period selector on a 24-hour clock", async () => {
        withRegistry(() => <TimePicker defaultValue="15:00" hourCycle={24} />);
        await settle();
        expect(all(ids.dialLabel)).toHaveLength(24);
        expect(all(ids.periodSelector)).toHaveLength(0);
        expect(byTestId(ids.hourSelector).textContent).toBe("15");
    });

    it("shows two spin buttons and no dial in scroll mode", async () => {
        withRegistry(() => (
            <TimePicker mode="scroll" defaultValue="10:00" hourCycle={24} />
        ));
        await settle();
        const hour = byTestId(ids.hourSelector);
        expect(hour.getAttribute("role")).toBe("spinbutton");
        expect(hour.getAttribute("aria-valuenow")).toBe("10");
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
        expect(hour.getAttribute("aria-valuenow")).toBe("9");
    });
});

describe("TimePicker, slot props", () => {
    it("reaches the dial's parts, its labels by copy", async () => {
        withRegistry(() => (
            <TimePicker
                defaultValue="21:05"
                hourCycle={12}
                class={{
                    dialLabel: (label) => (label.selected ? "on" : undefined),
                    dialTrack: "track",
                }}
                style={{ dialHandle: { opacity: 0.5 } }}
                slotProps={{
                    dialLabel: (label) => ({ title: `h${label.value}` }),
                }}
                unstyled={{ dialCenter: true }}
            />
        ));
        await settle();
        const labels = all(ids.dialLabel);
        const on = labels.filter((label) => label.classList.contains("on"));
        expect(on).toHaveLength(1);
        expect(on[0]!.title).toBe("h9");
        expect(byTestId(ids.dialTrack).classList.contains("track")).toBe(true);
        expect(byTestId(ids.dialHandle).style.opacity).toBe("0.5");
        expect(byTestId(ids.dialCenter).className).toBe("");
    });

    it("reaches each scroll item, by copy", async () => {
        withRegistry(() => (
            <TimePicker
                mode="scroll"
                defaultValue="10:00"
                hourCycle={24}
                class={{
                    scrollItem: (item) =>
                        item.selected ? `now-${item.view}` : undefined,
                }}
            />
        ));
        await settle();
        expect(
            all(ids.scrollItem)
                .filter((item) => item.className.includes("now-"))
                .map((item) => item.textContent),
        ).toEqual(["10", "00"]);
    });
});

describe("TimeInput, slot props", () => {
    it("reaches each field's input and label", async () => {
        withRegistry(() => (
            <TimeInput
                defaultValue="14:00"
                class={{ input: "digits", fieldLabel: "caption" }}
                slotProps={{ input: { title: "time" } }}
            />
        ));
        await settle();
        const inputs = all(testIds.timeInput.input);
        expect(inputs).toHaveLength(2);
        expect(
            inputs.every((input) => input.classList.contains("digits")),
        ).toBe(true);
        expect(inputs[0]!.title).toBe("time");
        expect(
            all(testIds.timeInput.fieldLabel).every((label) =>
                label.classList.contains("caption"),
            ),
        ).toBe(true);
    });
});

describe("TimeInput", () => {
    it("takes a typed time, with the period selector in a 12-hour cycle", async () => {
        const onValueChange = vi.fn();
        withRegistry(() => (
            <TimeInput
                defaultValue="14:00"
                hourCycle={12}
                onValueChange={onValueChange}
            />
        ));
        await settle();
        const input = all(testIds.timeInput.input) as HTMLInputElement[];
        expect(input.map((field) => field.value)).toEqual(["2", "00"]);
        expect(input[0]!.getAttribute("aria-label")).toBe("Hour");
        await userEvent.clear(input[1]!);
        await userEvent.type(input[1]!, "45");
        await settle();
        expect(onValueChange).toHaveBeenLastCalledWith(
            expect.objectContaining({ value: "14:45" }),
        );
        expect(all(testIds.timeInput.period)).toHaveLength(2);
    });
});
