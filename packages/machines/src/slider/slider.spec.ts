import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import * as slider from ".";
import { run, settle } from "../testing/vanilla";
import type { MachineProps } from "../testing/vanilla";

afterEach(() => {
    document.body.innerHTML = "";
});

/** A slider in `markup` (a form or fieldset around `<input data-input>`), run with `props`. */
const range = (
    props: MachineProps<slider.Schema>,
    markup = "<div><input data-input style='width: 200px'></div>",
) => {
    const host = document.createElement("div");
    host.innerHTML = markup;
    document.body.append(host);
    const input = host.querySelector<HTMLInputElement>("[data-input]")!;
    const running = run(
        slider.machine,
        slider.connect,
        { id: "volume", ...props },
        (api, spread) => spread(input, api.getInputProps()),
    );
    return { ...running, input, host };
};

describe("slider machine", () => {
    it("holds a clamped value with controllable-state semantics", async () => {
        const onValueChange = vi.fn();
        const { api, input, stop } = range({
            min: 0,
            max: 10,
            defaultValue: 5,
            onValueChange,
        });
        expect(input.type).toBe("range");
        expect(api().value).toBe(5);
        expect(api().fraction).toBe(0.5);
        expect(api().percent).toBe(50);
        api().setValue(20);
        await settle();
        expect(api().value).toBe(10);
        expect(input.value).toBe("10");
        expect(onValueChange).toHaveBeenCalledExactlyOnceWith({ value: 10 });
        stop();
    });

    it("snaps to the step from min, without float error", () => {
        const range = { min: 0, max: 1, step: 0.1 };
        expect(slider.snapValue(0.3000001, range)).toBe(0.3);
        expect(slider.snapValue(0.26, range)).toBe(0.3);
        expect(slider.snapValue(7, { min: 1, max: 10, step: 3 })).toBe(7);
        expect(slider.snapValue(6, { min: 1, max: 10, step: 3 })).toBe(7);
        expect(slider.snapValue(-4, range)).toBe(0);
    });

    it("takes the keyboard through the native input", async () => {
        const onValueChange = vi.fn();
        const { api, input, stop } = range({ defaultValue: 40, onValueChange });
        input.focus();
        await userEvent.keyboard("{ArrowRight}");
        await settle();
        expect(api().value).toBe(41);
        expect(onValueChange).toHaveBeenCalledExactlyOnceWith({ value: 41 });
        stop();
    });

    it("takes no change while read-only", async () => {
        const onValueChange = vi.fn();
        const { api, input, stop } = range({
            defaultValue: 40,
            readOnly: true,
            onValueChange,
        });
        expect(input.getAttribute("aria-readonly")).toBe("true");
        input.focus();
        await userEvent.keyboard("{ArrowRight}");
        await settle();
        expect(api().value).toBe(40);
        expect(onValueChange).not.toHaveBeenCalled();
        stop();
    });

    it("marks a drag while the pointer is down", async () => {
        const { api, input, stop } = range({ defaultValue: 40 });
        input.dispatchEvent(
            new PointerEvent("pointerdown", { bubbles: true, button: 0 }),
        );
        await settle();
        expect(api().dragging).toBe(true);
        expect(input.dataset["dragging"]).toBe("");
        window.dispatchEvent(new PointerEvent("pointerup"));
        await settle();
        expect(api().dragging).toBe(false);
        stop();
    });

    it("doesn't drag while disabled", async () => {
        const { api, input, stop } = range({ disabled: true });
        expect(input.disabled).toBe(true);
        input.dispatchEvent(
            new PointerEvent("pointerdown", { bubbles: true, button: 0 }),
        );
        await settle();
        expect(api().dragging).toBe(false);
        stop();
    });

    it("puts the value back when reset", async () => {
        const onValueChange = vi.fn();
        const { api, input, stop } = range({ defaultValue: 40, onValueChange });
        api().setValue(70);
        await settle();
        api().reset(40);
        await settle();
        expect(api().value).toBe(40);
        expect(input.value).toBe("40");
        expect(onValueChange).toHaveBeenLastCalledWith({ value: 40 });
        stop();
    });

    it("follows a disabled fieldset by the browser's rule", async () => {
        const { api, host, stop } = range(
            {},
            "<fieldset disabled><legend><input data-input></legend></fieldset>",
        );
        await settle();
        expect(api().disabled).toBe(false);
        const fieldset = host.querySelector("fieldset")!;
        fieldset.append(fieldset.querySelector("input")!);
        await settle();
        expect(api().disabled).toBe(true);
        stop();
    });
});
