import { testIds } from "@pureform/anatomy";
import { act, useState } from "react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { Slider } from ".";
import { PureformProvider } from "..";
import { displayRegistry } from "../__fixtures__/registry";
import { interact, mount, outside, settle } from "../testing/render";

const ids = testIds.slider;

const parts = (root: Element) =>
    [...root.children].map((part) => part.getAttribute("data-pf-part"));

const withRegistry = (view: ReactNode) =>
    mount(
        <PureformProvider registry={displayRegistry()}>
            {view}
        </PureformProvider>,
    );

/** The first element with a test id. */
const byTestId = <E extends HTMLElement = HTMLElement>(id: string): E => {
    const element = document.querySelector<E>(`[data-testid="${id}"]`);
    if (!element) throw new Error(`no element with data-testid="${id}"`);
    return element;
};

describe("Slider", () => {
    it("renders the preset's parts around a named handle, the value as tokens", async () => {
        withRegistry(
            <Slider aria-label="Volume" defaultValue={40} name="volume" />,
        );
        await settle();
        const root = byTestId(ids.root);
        expect(
            [...root.children].map((part) => part.getAttribute("data-pf-part")),
        ).toEqual(["start-track", "track", "active-track", "handle", "input"]);
        expect(root.style.getPropertyValue("--value")).toBe("40");
        const handle = byTestId(ids.handle);
        expect(handle.getAttribute("role")).toBe("slider");
        expect(handle.getAttribute("aria-label")).toBe("Volume");
        const input = byTestId<HTMLInputElement>(ids.input);
        expect(input.value).toBe("40");
        expect(input.name).toBe("volume");
        expect(root.hasAttribute("aria-label")).toBe(false);
    });

    it("moves with the keyboard and reports a number, the token following", async () => {
        const onValueChange = vi.fn();
        withRegistry(
            <Slider
                aria-label="Volume"
                min={0}
                max={10}
                defaultValue={5}
                onValueChange={onValueChange}
            />,
        );
        await settle();
        await interact(async () => byTestId(ids.handle).focus());
        await interact(() => userEvent.keyboard("{ArrowRight}"));
        expect(onValueChange).toHaveBeenLastCalledWith({ value: 6 });
        expect(byTestId(ids.root).style.getPropertyValue("--value")).toBe("60");
    });

    it("stays put while controlled until the owner takes the change", async () => {
        const value = outside(40);
        const onValueChange = vi.fn();
        withRegistry(
            <value.Holder>
                {(current) => (
                    <Slider
                        aria-label="Volume"
                        value={current}
                        onValueChange={onValueChange}
                    />
                )}
            </value.Holder>,
        );
        await settle();
        const handle = byTestId(ids.handle);
        await interact(async () => handle.focus());
        await interact(() => userEvent.keyboard("{ArrowRight}"));
        expect(onValueChange).toHaveBeenLastCalledWith({ value: 41 });
        expect(handle.getAttribute("aria-valuenow")).toBe("40");
        await value.set(70);
        await settle();
        expect(handle.getAttribute("aria-valuenow")).toBe("70");
    });

    it("draws a range, each handle placed by its own token, and stops", async () => {
        withRegistry(
            <Slider
                aria-label={["From", "To"]}
                defaultValue={[1, 3]}
                min={0}
                max={4}
                stops
            />,
        );
        await settle();
        const root = byTestId(ids.root);
        const handles = root.querySelectorAll<HTMLElement>(
            "[data-pf-part=handle]",
        );
        expect(handles).toHaveLength(2);
        expect(handles[1]!.getAttribute("aria-label")).toBe("To");
        expect(handles[0]!.style.getPropertyValue("--value")).toBe("25");
        expect(handles[1]!.style.getPropertyValue("--value")).toBe("75");
        const markers = root.querySelectorAll<HTMLElement>(
            "[data-pf-part=marker]",
        );
        expect(
            [...markers].map((marker) =>
                marker.style.getPropertyValue("--stopActive"),
            ),
        ).toEqual(["0", "1", "1", "1", "0"]);
    });

    it("draws an inset icon inside the active track, before the handle, hidden from assistive technology", async () => {
        withRegistry(
            <Slider
                aria-label="Volume"
                size="large"
                defaultValue={40}
                insetIcon="♪"
            />,
        );
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
        let set!: (value: number) => void;
        function Wrapper() {
            const [value, setValue] = useState(40);
            set = setValue;
            return (
                <div style={{ width: "400px" }}>
                    <Slider
                        aria-label="Volume"
                        size="large"
                        value={value}
                        insetIcon="♪"
                    />
                </div>
            );
        }
        withRegistry(<Wrapper />);
        await settle();
        const icon = byTestId(ids.insetIcon);
        await expect
            .poll(() => icon.hasAttribute("data-pf-overflowing"))
            .toBe(false);
        await act(async () => set(5));
        await settle();
        await expect
            .poll(() => icon.hasAttribute("data-pf-overflowing"))
            .toBe(true);
    });

    it("has no inset icon part without one", async () => {
        withRegistry(<Slider aria-label="Volume" defaultValue={40} />);
        await settle();
        expect(
            document.querySelector(`[data-testid="${ids.insetIcon}"]`),
        ).toBeNull();
    });

    it("takes a function of each thumb and marker in their keys", async () => {
        withRegistry(
            <Slider
                aria-label={["From", "To"]}
                defaultValue={[1, 3]}
                min={0}
                max={4}
                stops
                className={{
                    handle: (thumb) => `thumb-${thumb.index}-${thumb.value}`,
                    track: "plain",
                }}
                style={{ marker: (marker) => ({ opacity: marker.index / 4 }) }}
                slotProps={{
                    input: (thumb) => ({ title: `input ${thumb.index}` }),
                }}
                unstyled={{ stateLayer: (thumb) => thumb.index === 0 }}
            />,
        );
        await settle();
        const root = byTestId(ids.root);
        const handles = root.querySelectorAll<HTMLElement>(
            "[data-pf-part=handle]",
        );
        expect(handles[0]!.classList.contains("thumb-0-1")).toBe(true);
        expect(handles[1]!.classList.contains("thumb-1-3")).toBe(true);
        expect(byTestId(ids.track).classList.contains("plain")).toBe(true);
        const markers = root.querySelectorAll<HTMLElement>(
            "[data-pf-part=marker]",
        );
        expect(markers[2]!.style.opacity).toBe("0.5");
        const inputs = root.querySelectorAll<HTMLInputElement>("input");
        expect(inputs[1]!.title).toBe("input 1");
        const layers = root.querySelectorAll<HTMLElement>(
            `[data-testid="${ids.stateLayer}"]`,
        );
        expect(layers[0]!.className).toBe("");
        expect(layers[1]!.className).not.toBe("");
    });
});
