import { describe, expect, it, vi } from "vitest";

import * as textField from ".";
import { run, settle } from "../testing/vanilla";

describe("text field machine (stub)", () => {
    it("holds the value with controllable-state semantics", async () => {
        const onValueChange = vi.fn();
        const input = document.createElement("input");
        document.body.append(input);
        const { api, stop } = run(
            textField.machine,
            textField.connect,
            { id: "name", defaultValue: "Ada", onValueChange },
            (api, spread) => spread(input, api.getInputProps()),
        );
        expect(api().value).toBe("Ada");
        expect(api().filled).toBe(true);
        api().setValue("");
        await settle();
        expect(api().filled).toBe(false);
        expect(onValueChange).toHaveBeenCalledExactlyOnceWith({ value: "" });
        stop();
        input.remove();
    });

    it.todo("floats the label while focused or filled (p6b)");
    it.todo("puts the value back on a form reset (p6b)");
    it.todo("follows a disabled fieldset (p6b)");
    it.todo("validates with invalid, error, and validate=native (p6b)");
});
