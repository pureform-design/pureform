import { testIds } from "@pureform/anatomy";
import { createSignal } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { ColorPicker } from ".";
import { PureformProvider } from "..";
import { colorPickerRegistry } from "../__fixtures__/registry";
import { mount, settle, until } from "../testing/mount";

const ids = testIds.colorPicker;

const withRegistry = (view: () => unknown) =>
    mount(() => (
        <PureformProvider registry={colorPickerRegistry()}>
            {view() as never}
        </PureformProvider>
    ));

const one = (id: string) =>
    document.querySelector<HTMLElement>(`[data-testid="${id}"]`)!;

const hexInput = () =>
    document.querySelector<HTMLInputElement>(
        `[data-testid="${testIds.textField.input}"]`,
    )!;

describe("ColorPicker", () => {
    it("renders the area, the hue slider, the field and the swatches", async () => {
        withRegistry(() => (
            <ColorPicker
                label="Seed color"
                name="seed"
                defaultValue="#6750a4"
                swatches={["#6750a4", "#006a6a"]}
            />
        ));
        expect(one(ids.area)).not.toBeNull();
        expect(one(ids.areaThumb).getAttribute("role")).toBe("slider");
        expect(one(ids.channelSliderThumb).getAttribute("aria-label")).toBe(
            "hue",
        );
        expect(hexInput().value).toBe("6750A4");
        expect(
            document.querySelector<HTMLInputElement>('input[name="seed"]')!
                .value,
        ).toBe("#6750a4");
        const swatches = document.querySelectorAll(
            `[data-testid="${ids.swatchTrigger}"]`,
        );
        expect(swatches).toHaveLength(2);
        expect(swatches[0]!.getAttribute("aria-pressed")).toBe("true");
        expect(swatches[1]!.getAttribute("aria-pressed")).toBe("false");
    });

    it("shows the alpha slider over a transparency grid only when asked", async () => {
        withRegistry(() => <ColorPicker alpha />);
        expect(one(ids.transparencyGrid)).not.toBeNull();
        expect(
            document.querySelectorAll(
                `[data-testid="${ids.channelSliderThumb}"]`,
            ),
        ).toHaveLength(2);
    });

    it("shows the eye dropper where the browser has one, and not with eyeDropper={false}", async () => {
        withRegistry(() => <ColorPicker eyeDropperLabel="Pick" />);
        await until(() =>
            expect(
                document.querySelector('button[aria-label="Pick"]') !== null,
            ).toBe("EyeDropper" in window),
        );
        document.body.innerHTML = "";
        withRegistry(() => (
            <ColorPicker eyeDropper={false} eyeDropperLabel="Pick" />
        ));
        await settle();
        expect(document.querySelector('button[aria-label="Pick"]')).toBeNull();
    });

    it("picks a swatch, reporting hex", async () => {
        const onValueChange = vi.fn();
        withRegistry(() => (
            <ColorPicker swatches={["#006a6a"]} onValueChange={onValueChange} />
        ));
        await userEvent.click(one(ids.swatchTrigger));
        await until(() =>
            expect(onValueChange).toHaveBeenLastCalledWith({
                value: "#006a6a",
            }),
        );
        await until(() => expect(hexInput().value).toBe("006A6A"));
    });

    it("sets the color from the hex field on Enter, and puts back text that isn't one", async () => {
        const onValueChangeEnd = vi.fn();
        withRegistry(() => <ColorPicker onValueChangeEnd={onValueChangeEnd} />);
        await userEvent.click(hexInput());
        await userEvent.clear(hexInput());
        await userEvent.type(hexInput(), "abc{Enter}");
        await settle();
        expect(onValueChangeEnd).toHaveBeenLastCalledWith({
            value: "#aabbcc",
        });
        expect(hexInput().value).toBe("AABBCC");
        await userEvent.clear(hexInput());
        await userEvent.type(hexInput(), "zz");
        expect(hexInput().getAttribute("aria-invalid")).toBe("true");
        await userEvent.tab();
        await settle();
        expect(hexInput().value).toBe("AABBCC");
    });

    it("moves the hue with the arrow keys", async () => {
        const onValueChange = vi.fn();
        withRegistry(() => (
            <ColorPicker defaultValue="#ff0000" onValueChange={onValueChange} />
        ));
        one(ids.channelSliderThumb).focus();
        await userEvent.keyboard("{ArrowRight}");
        await until(() => expect(onValueChange).toHaveBeenCalled());
        expect(onValueChange.mock.lastCall![0].value).not.toBe("#ff0000");
    });

    it("follows a controlled value", async () => {
        const [value, setValue] = createSignal("#006a6a");
        withRegistry(() => <ColorPicker value={value()} />);
        await settle();
        expect(hexInput().value).toBe("006A6A");
        setValue("#8b5000");
        await until(() => expect(hexInput().value).toBe("8B5000"));
    });
});
