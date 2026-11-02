import { testIds } from "@pureform/anatomy";
import type { ComponentProps } from "solid-js";
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
        const onValueChange =
            vi.fn<
                NonNullable<ComponentProps<typeof ColorPicker>["onValueChange"]>
            >();
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
        const onValueChangeEnd =
            vi.fn<
                NonNullable<
                    ComponentProps<typeof ColorPicker>["onValueChangeEnd"]
                >
            >();
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

    it("runs the user's hex input handlers after its own", async () => {
        const calls: string[] = [];
        const onValueChangeEnd = vi.fn<
            NonNullable<ComponentProps<typeof ColorPicker>["onValueChangeEnd"]>
        >(() => calls.push("picker"));
        withRegistry(() => (
            <ColorPicker
                onValueChangeEnd={onValueChangeEnd}
                textFieldProps={{
                    slotProps: {
                        input: {
                            onKeyDown: (event: KeyboardEvent) => {
                                if (event.key === "Enter")
                                    calls.push("keyDown");
                            },
                            onBlur: () => calls.push("blur"),
                        },
                    },
                }}
            />
        ));
        await settle();
        await userEvent.click(hexInput());
        await userEvent.clear(hexInput());
        await userEvent.type(hexInput(), "abc{Enter}");
        await settle();
        expect(calls).toEqual(["picker", "keyDown"]);
        await userEvent.clear(hexInput());
        await userEvent.type(hexInput(), "123456");
        await userEvent.tab();
        await settle();
        expect(calls).toEqual(["picker", "keyDown", "picker", "blur"]);
    });

    it("takes a function of each swatch and channel in their keys, and reaches the inner parts", async () => {
        withRegistry(() => (
            <ColorPicker
                alpha
                swatches={["#ff0000", "#00ff00"]}
                class={{
                    swatch: ({ color, index }) =>
                        `swatch-${index}-${color.slice(1)}`,
                    areaThumb: "thumb",
                    areaBackground: "gradient",
                }}
                style={{
                    // oxlint-disable-next-line solid/style-prop -- a part-keyed style record, not CSS properties
                    channelSliderTrack: ({ channel }) =>
                        channel === "alpha" ? { opacity: 0.5 } : undefined,
                    // oxlint-disable-next-line solid/style-prop -- a part-keyed style record, not CSS properties
                    transparencyGrid: { opacity: 0.25 },
                }}
                slotProps={{
                    swatchTrigger: ({ index }) => ({
                        title: `swatch ${index}`,
                    }),
                    channelSliderThumb: ({ channel }) => ({ title: channel }),
                }}
                unstyled={{ swatch: ({ index }) => index === 0 }}
            />
        ));
        await settle();
        const swatches = document.querySelectorAll<HTMLElement>(
            `[data-testid="${ids.swatch}"]`,
        );
        expect(swatches[0]!.className).toBe("swatch-0-ff0000");
        expect(swatches[1]!.classList.contains("swatch-1-00ff00")).toBe(true);
        expect(swatches[1]!.className).not.toBe("swatch-1-00ff00");
        const triggers = document.querySelectorAll<HTMLElement>(
            `[data-testid="${ids.swatchTrigger}"]`,
        );
        expect(triggers[1]!.title).toBe("swatch 1");
        expect(one(ids.areaThumb).classList.contains("thumb")).toBe(true);
        expect(one(ids.areaBackground).classList.contains("gradient")).toBe(
            true,
        );
        expect(one(ids.transparencyGrid).style.opacity).toBe("0.25");
        const tracks = document.querySelectorAll<HTMLElement>(
            `[data-testid="${ids.channelSliderTrack}"]`,
        );
        expect(tracks[0]!.style.opacity).toBe("");
        expect(tracks[1]!.style.opacity).toBe("0.5");
        const thumbs = document.querySelectorAll<HTMLElement>(
            `[data-testid="${ids.channelSliderThumb}"]`,
        );
        expect(thumbs[1]!.title).toBe("alpha");
    });

    it("moves the hue with the arrow keys", async () => {
        const onValueChange =
            vi.fn<
                NonNullable<ComponentProps<typeof ColorPicker>["onValueChange"]>
            >();
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
