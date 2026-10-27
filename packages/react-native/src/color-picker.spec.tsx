import { testIds } from "@pureform/anatomy";
import type { ComponentProps } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { PureformProvider } from ".";
import { ColorPicker } from "./color-picker";
import { presetRegistry } from "./testing/registry";
import type { TestRegistry } from "./testing/registry";
import { byTestId, drag, mount, outside, until } from "./testing/render";

const ids = testIds.colorPicker;

let registry: TestRegistry;

beforeAll(async () => {
    registry = await presetRegistry([
        "colorPicker",
        "textField",
        "iconButton",
        "ripple",
    ]);
});

const withRegistry = (view: React.ReactNode) =>
    mount(
        <PureformProvider registry={registry} motion="reduce">
            {view}
        </PureformProvider>,
    );

const hexInput = () => byTestId(testIds.textField.input) as HTMLInputElement;

describe("ColorPicker on React Native", () => {
    it("draws the area, the hue slider at the value, the hex and the swatches", async () => {
        await withRegistry(
            <ColorPicker
                label="Seed color"
                defaultValue="#6750a4"
                swatches={["#6750a4", "#006a6a"]}
            />,
        );
        expect(byTestId(ids.area).getBoundingClientRect().height).toBe(176);
        expect(
            byTestId(ids.channelSliderThumb).getAttribute("aria-label"),
        ).toBe("hue");
        expect(hexInput().value).toBe("6750A4");
        const triggers = document.querySelectorAll(
            `[data-testid="${ids.swatchTrigger}"]`,
        );
        expect(triggers).toHaveLength(2);
        expect(triggers[0]!.getAttribute("aria-pressed")).toBe("true");
        expect(triggers[1]!.getAttribute("aria-pressed")).toBe("false");
        expect(
            document.querySelector(`[data-testid="${ids.transparencyGrid}"]`),
        ).toBeNull();
    });

    it("picks a swatch, reporting hex", async () => {
        const onValueChange =
            vi.fn<
                NonNullable<ComponentProps<typeof ColorPicker>["onValueChange"]>
            >();
        await withRegistry(
            <ColorPicker
                swatches={["#006a6a"]}
                onValueChange={onValueChange}
            />,
        );
        await userEvent.click(byTestId(ids.swatchTrigger));
        await until(() =>
            expect(onValueChange).toHaveBeenLastCalledWith({
                value: "#006a6a",
            }),
        );
        await until(() => expect(hexInput().value).toBe("006A6A"));
    });

    it("moves saturation and brightness with a drag on the area", async () => {
        const onValueChange =
            vi.fn<
                NonNullable<ComponentProps<typeof ColorPicker>["onValueChange"]>
            >();
        const onValueChangeEnd =
            vi.fn<
                NonNullable<
                    ComponentProps<typeof ColorPicker>["onValueChangeEnd"]
                >
            >();
        await withRegistry(
            <ColorPicker
                defaultValue="#ff0000"
                onValueChange={onValueChange}
                onValueChangeEnd={onValueChangeEnd}
            />,
        );
        const area = byTestId(ids.area);
        const box = area.getBoundingClientRect();
        // From the top left (white) to the bottom (black).
        const release = await drag(area, [[0, box.height - 2]], { x: 1, y: 1 });
        await release();
        await until(() => expect(onValueChangeEnd).toHaveBeenCalled());
        expect(onValueChange.mock.calls[0]![0].value).toMatch(
            /^#f[a-f0-9]{5}$/,
        );
        expect(onValueChangeEnd.mock.lastCall![0].value).toMatch(
            /^#0[0-9a-f]0[0-9a-f]0[0-9a-f]$/,
        );
    });

    it("sets the color from the hex field on submit, and puts back text that isn't one", async () => {
        const onValueChangeEnd =
            vi.fn<
                NonNullable<
                    ComponentProps<typeof ColorPicker>["onValueChangeEnd"]
                >
            >();
        await withRegistry(<ColorPicker onValueChangeEnd={onValueChangeEnd} />);
        await userEvent.clear(hexInput());
        await userEvent.type(hexInput(), "abc{Enter}");
        await until(() =>
            expect(onValueChangeEnd).toHaveBeenLastCalledWith({
                value: "#aabbcc",
            }),
        );
        await until(() => expect(hexInput().value).toBe("AABBCC"));
        await userEvent.clear(hexInput());
        await userEvent.type(hexInput(), "zz");
        await until(() =>
            expect(hexInput().getAttribute("aria-invalid")).toBe("true"),
        );
        await userEvent.tab();
        await until(() => expect(hexInput().value).toBe("AABBCC"));
    });

    it("runs the user's hex input handlers after its own", async () => {
        const calls: string[] = [];
        const onValueChangeEnd = vi.fn<
            NonNullable<ComponentProps<typeof ColorPicker>["onValueChangeEnd"]>
        >(() => calls.push("picker"));
        await withRegistry(
            <ColorPicker
                onValueChangeEnd={onValueChangeEnd}
                textFieldProps={{
                    slotProps: {
                        input: {
                            onSubmitEditing: () => calls.push("submit"),
                            onBlur: () => calls.push("blur"),
                        },
                    },
                }}
            />,
        );
        await userEvent.clear(hexInput());
        await userEvent.type(hexInput(), "abc{Enter}");
        await until(() =>
            expect(calls.slice(0, 2)).toEqual(["picker", "submit"]),
        );
        await userEvent.clear(hexInput());
        await userEvent.type(hexInput(), "123456");
        await userEvent.tab();
        await until(() => expect(calls.slice(-2)).toEqual(["picker", "blur"]));
    });

    it("takes a function of each swatch and channel in their style and slotProps", async () => {
        await withRegistry(
            <ColorPicker
                alpha
                swatches={["#ff0000", "#00ff00"]}
                style={{
                    swatch: ({ index }) =>
                        index === 1 ? { opacity: 0.5 } : undefined,
                    channelSliderTrack: ({ channel }) =>
                        channel === "alpha" ? { opacity: 0.25 } : undefined,
                    areaThumb: { opacity: 0.75 },
                }}
                slotProps={{
                    swatchTrigger: ({ color }) => ({
                        accessibilityHint: color,
                    }),
                }}
            />,
        );
        const all = (id: string) => [
            ...document.querySelectorAll<HTMLElement>(`[data-testid="${id}"]`),
        ];
        expect(
            all(ids.swatch).map((each) => getComputedStyle(each).opacity),
        ).toEqual(["1", "0.5"]);
        expect(
            all(ids.channelSliderTrack).map(
                (each) => getComputedStyle(each).opacity,
            ),
        ).toEqual(["1", "0.25"]);
        expect(getComputedStyle(byTestId(ids.areaThumb)).opacity).toBe("0.75");
    });

    it("adds the alpha slider over a transparency grid", async () => {
        await withRegistry(<ColorPicker alpha />);
        expect(byTestId(ids.transparencyGrid)).toBeTruthy();
        expect(
            document.querySelectorAll(
                `[data-testid="${ids.channelSliderThumb}"]`,
            ),
        ).toHaveLength(2);
    });

    it("follows a controlled value", async () => {
        const value = outside("#006a6a");
        await withRegistry(
            <value.Holder>{(v) => <ColorPicker value={v} />}</value.Holder>,
        );
        expect(hexInput().value).toBe("006A6A");
        await value.set("#8b5000");
        await until(() => expect(hexInput().value).toBe("8B5000"));
    });
});
