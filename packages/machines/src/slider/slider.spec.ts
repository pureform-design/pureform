import { describe, expect, it, vi } from "vitest";

import * as slider from ".";
import { run, settle } from "../testing/vanilla";

describe("slider machine (stub)", () => {
    it("holds a clamped value with controllable-state semantics", async () => {
        const onValueChange = vi.fn();
        const input = document.createElement("input");
        document.body.append(input);
        const { api, stop } = run(
            slider.machine,
            slider.connect,
            { id: "volume", min: 0, max: 10, defaultValue: 5, onValueChange },
            (api, spread) => spread(input, api.getInputProps()),
        );
        expect(input.type).toBe("range");
        expect(api().value).toBe(5);
        expect(api().fraction).toBe(0.5);
        api().setValue(20);
        await settle();
        expect(api().value).toBe(10);
        expect(onValueChange).toHaveBeenCalledExactlyOnceWith({ value: 10 });
        stop();
        input.remove();
    });

    it.todo("tracks dragging for the dragged state (p6e)");
    it.todo("puts the value back on a form reset (p6e)");
    it.todo("follows a disabled fieldset (p6e)");
});
