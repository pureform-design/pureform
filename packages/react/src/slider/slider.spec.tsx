import { testIds } from "@pureform/anatomy";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { Slider } from ".";
import { PureformProvider } from "..";
import { displayRegistry } from "../__fixtures__/registry";
import { interact, mount, outside, settle } from "../testing/render";

const ids = testIds.slider;

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
        ).toEqual([
            "start-track",
            "track",
            "active-track",
            "handle",
            "input",
        ]);
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
});
