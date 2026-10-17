import { testIds } from "@pureform/anatomy";
import { createSignal } from "solid-js";
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

describe("Slider", () => {
    it("renders the preset's parts over a named range input, the value as a token", async () => {
        withRegistry(() => (
            <Slider aria-label="Volume" defaultValue={40} name="volume" />
        ));
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
        byTestId(ids.input).focus();
        await userEvent.keyboard("{ArrowRight}");
        await settle();
        expect(onValueChange).toHaveBeenCalledExactlyOnceWith({ value: 6 });
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
        const input = byTestId<HTMLInputElement>(ids.input);
        input.focus();
        await userEvent.keyboard("{ArrowRight}");
        await settle();
        expect(onValueChange).toHaveBeenCalledExactlyOnceWith({ value: 41 });
        expect(input.value).toBe("40");
        setValue(70);
        await settle();
        expect(input.value).toBe("70");
    });
});
