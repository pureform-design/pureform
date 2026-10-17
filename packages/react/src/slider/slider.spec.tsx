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
    it("renders the preset's parts over a named range input, the value as a token", async () => {
        withRegistry(
            <Slider aria-label="Volume" defaultValue={40} name="volume" />,
        );
        await settle();
        const root = byTestId(ids.root);
        expect(
            [...root.children].map((part) => part.getAttribute("data-pf-part")),
        ).toEqual(["track", "active-track", "state-layer", "handle", "input"]);
        expect(root.style.getPropertyValue("--value")).toBe("40");
        const input = byTestId<HTMLInputElement>(ids.input);
        expect(input.type).toBe("range");
        expect(input.value).toBe("40");
        expect(input.name).toBe("volume");
        expect(input.getAttribute("aria-label")).toBe("Volume");
        expect(root.hasAttribute("aria-label")).toBe(false);
    });

    it("moves with the keyboard and reports it, the token following", async () => {
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
        byTestId(ids.input).focus();
        await interact(() => userEvent.keyboard("{ArrowRight}"));
        expect(onValueChange).toHaveBeenCalledExactlyOnceWith({ value: 6 });
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
        const input = byTestId<HTMLInputElement>(ids.input);
        input.focus();
        await interact(() => userEvent.keyboard("{ArrowRight}"));
        expect(onValueChange).toHaveBeenCalledExactlyOnceWith({ value: 41 });
        expect(input.value).toBe("40");
        await value.set(70);
        await settle();
        expect(input.value).toBe("70");
    });
});
