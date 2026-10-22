import { testIds } from "@pureform/anatomy";
import { createSignal, flush } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { Slider } from ".";
import { PureformProvider } from "..";
import { displayRegistry } from "../__fixtures__/registry";
import { byTestId, mount, settle } from "../testing/mount";

const ids = testIds.slider;

const withRegistry = (view: () => unknown) =>
    mount(() => (
        <PureformProvider registry={displayRegistry()}>
            {view() as never}
        </PureformProvider>
    ));

const parts = (root: Element) =>
    [...root.children].map((part) => part.getAttribute("data-pf-part"));

describe("Slider", () => {
    it("renders the preset's parts around a named handle, the value as tokens", async () => {
        withRegistry(() => (
            <Slider aria-label="Volume" defaultValue={40} name="volume" />
        ));
        await settle();
        const root = byTestId(ids.root);
        expect(parts(root)).toEqual([
            "start-track",
            "track",
            "active-track",
            "handle",
            "input",
        ]);
        expect(root.style.getPropertyValue("--value")).toBe("40");
        expect(root.style.getPropertyValue("--activeEnd")).toBe("40");
        const handle = byTestId(ids.handle);
        expect(handle.getAttribute("role")).toBe("slider");
        expect(handle.getAttribute("aria-valuenow")).toBe("40");
        expect(handle.getAttribute("aria-label")).toBe("Volume");
        const input = byTestId<HTMLInputElement>(ids.input);
        expect(input.value).toBe("40");
        expect(input.name).toBe("volume");
        expect(root.hasAttribute("aria-label")).toBe(false);
    });

    it("moves with the keyboard and reports a number, the tokens following", async () => {
        const onValueChange = vi.fn();
        withRegistry(() => (
            <Slider
                aria-label="Volume"
                min={0}
                max={10}
                defaultValue={5}
                onValueChange={onValueChange}
            />
        ));
        await settle();
        byTestId(ids.handle).focus();
        await settle();
        await userEvent.keyboard("{ArrowRight}");
        await settle();
        expect(onValueChange).toHaveBeenLastCalledWith({ value: 6 });
        expect(byTestId(ids.root).style.getPropertyValue("--value")).toBe("60");
    });

    it("stays put while controlled until the owner takes the change", async () => {
        const [value, setValue] = createSignal(40);
        const onValueChange = vi.fn();
        withRegistry(() => (
            <Slider
                aria-label="Volume"
                value={value()}
                onValueChange={onValueChange}
            />
        ));
        await settle();
        const handle = byTestId(ids.handle);
        handle.focus();
        await settle();
        await userEvent.keyboard("{ArrowRight}");
        await settle();
        expect(onValueChange).toHaveBeenLastCalledWith({ value: 41 });
        expect(handle.getAttribute("aria-valuenow")).toBe("40");
        setValue(70);
        await settle();
        expect(handle.getAttribute("aria-valuenow")).toBe("70");
    });

    it("draws a range: two handles, each placed by its own token", async () => {
        const onValueChange = vi.fn();
        withRegistry(() => (
            <Slider
                aria-label={["From", "To"]}
                defaultValue={[20, 60]}
                onValueChange={onValueChange}
            />
        ));
        await settle();
        const root = byTestId(ids.root);
        const handles = root.querySelectorAll<HTMLElement>(
            "[data-pf-part=handle]",
        );
        expect(handles).toHaveLength(2);
        expect(handles[0]!.getAttribute("aria-label")).toBe("From");
        expect(handles[0]!.style.getPropertyValue("--value")).toBe("20");
        expect(handles[1]!.style.getPropertyValue("--value")).toBe("60");
        expect(root.style.getPropertyValue("--activeStart")).toBe("20");
        handles[1]!.focus();
        await settle();
        await userEvent.keyboard("{ArrowLeft}");
        await settle();
        expect(onValueChange).toHaveBeenLastCalledWith({ value: [20, 59] });
    });

    it("draws stops, active where the active track is, and the value indicator", async () => {
        withRegistry(() => (
            <Slider
                aria-label="Volume"
                min={0}
                max={4}
                defaultValue={2}
                stops
                valueIndicator
            />
        ));
        await settle();
        const markers = byTestId(ids.root).querySelectorAll<HTMLElement>(
            "[data-pf-part=marker]",
        );
        expect(
            [...markers].map((marker) => [
                marker.style.getPropertyValue("--value"),
                marker.style.getPropertyValue("--stopActive"),
            ]),
        ).toEqual([
            ["0", "1"],
            ["25", "1"],
            ["50", "1"],
            ["75", "0"],
            ["100", "0"],
        ]);
        const indicator = byTestId(ids.valueIndicator);
        expect(indicator.textContent).toBe("2");
        expect(indicator.hidden).toBe(true);
    });

    it("draws an inset icon inside the active track, before the handle, hidden from assistive technology", async () => {
        withRegistry(() => (
            <Slider
                aria-label="Volume"
                size="large"
                defaultValue={40}
                insetIcon="♪"
            />
        ));
        await settle();
        const root = byTestId(ids.root);
        expect(parts(root)).toEqual([
            "start-track",
            "track",
            "active-track",
            "inset-icon",
            "handle",
            "input",
        ]);
        const icon = byTestId(ids.insetIcon);
        expect(icon.textContent).toBe("♪");
        expect(icon.getAttribute("aria-hidden")).toBe("true");
    });

    it("marks the inset icon overflowing while the active track is too short for it", async () => {
        const [value, setValue] = createSignal(40);
        withRegistry(() => (
            <div style={{ width: "400px" }}>
                <Slider
                    aria-label="Volume"
                    size="large"
                    value={value()}
                    insetIcon="♪"
                />
            </div>
        ));
        await settle();
        const icon = byTestId(ids.insetIcon);
        await expect
            .poll(() => icon.hasAttribute("data-pf-overflowing"))
            .toBe(false);
        setValue(5);
        flush();
        await settle();
        await expect
            .poll(() => icon.hasAttribute("data-pf-overflowing"))
            .toBe(true);
    });

    it("has no inset icon part without one", async () => {
        withRegistry(() => <Slider aria-label="Volume" defaultValue={40} />);
        await settle();
        expect(
            document.querySelector(`[data-testid="${ids.insetIcon}"]`),
        ).toBeNull();
    });
});
