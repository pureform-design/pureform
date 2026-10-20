import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import * as textField from ".";
import { run, settle } from "../testing/vanilla";
import type { MachineProps } from "../testing/vanilla";

afterEach(() => {
    document.body.innerHTML = "";
});

/** A field in `markup` (a form or fieldset around `<input data-input>`), run with `props`. */
const field = (
    props: MachineProps<textField.Schema>,
    markup = "<div><input data-input></div>",
) => {
    const host = document.createElement("div");
    host.innerHTML = markup;
    document.body.append(host);
    const input = host.querySelector<HTMLInputElement>("[data-input]")!;
    const running = run(
        textField.machine,
        textField.connect,
        { id: "name", ...props },
        (api, spread) => spread(input, api.getInputProps()),
    );
    return { ...running, input, host };
};

describe("text field machine", () => {
    it("holds the value with controllable-state semantics", async () => {
        const onValueChange = vi.fn();
        const { api, stop } = field({ defaultValue: "Ada", onValueChange });
        expect(api().value).toBe("Ada");
        expect(api().filled).toBe(true);
        api().setValue("");
        await settle();
        expect(api().filled).toBe(false);
        expect(onValueChange).toHaveBeenCalledExactlyOnceWith({ value: "" });
        stop();
    });

    it("takes the user's typing, and writes changes from outside to the input", async () => {
        const onValueChange = vi.fn();
        const { api, input, stop } = field({ onValueChange });
        expect(input.placeholder).toBe(" ");
        await userEvent.type(input, "Ada");
        await settle();
        expect(api().value).toBe("Ada");
        expect(onValueChange).toHaveBeenLastCalledWith({ value: "Ada" });
        api().setValue("Grace");
        await settle();
        expect(input.value).toBe("Grace");
        stop();
    });

    it("tracks focus", async () => {
        const { api, input, stop } = field({});
        input.focus();
        await settle();
        expect(api().focused).toBe(true);
        input.blur();
        await settle();
        expect(api().focused).toBe(false);
        stop();
    });

    it("follows a disabled fieldset by the browser's rule", async () => {
        const { api, host, stop } = field(
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

    it("leaves a form reset to the binding, which calls reset", async () => {
        const onValueChange = vi.fn();
        const { api, input, host, stop } = field(
            { defaultValue: "Ada", onValueChange },
            "<form><input data-input></form>",
        );
        await userEvent.clear(input);
        await userEvent.type(input, "Grace");
        await settle();
        onValueChange.mockClear();
        host.querySelector("form")!.reset();
        await settle();
        expect(onValueChange).not.toHaveBeenCalled();
        api().reset("Ada");
        await settle();
        expect(api().value).toBe("Ada");
        expect(onValueChange).toHaveBeenCalledExactlyOnceWith({ value: "Ada" });
        stop();
    });

    it("counts toward counterMax, and a longer value marks the field invalid", async () => {
        const { api, input, stop } = field({
            defaultValue: "abc",
            counterMax: 4,
        });
        expect(api().counterText).toBe("3 / 4");
        expect(api().overflow).toBe(false);
        expect(api().invalid).toBe(false);
        expect(api().getCounterProps()).toMatchObject({
            id: api().counterId,
            "data-part": "counter",
        });
        api().setValue("abcde");
        await settle();
        expect(api().counterText).toBe("5 / 4");
        expect(api().overflow).toBe(true);
        expect(input.getAttribute("aria-invalid")).toBe("true");
        stop();
    });

    it("has no counter without counterMax", () => {
        const { api, stop } = field({ defaultValue: "abc" });
        expect(api().counterText).toBeUndefined();
        stop();
    });

    it("hides a secure field's text until the toggle reveals it", async () => {
        const { api, input, stop } = field({ secure: true });
        expect(input.type).toBe("password");
        const trigger = api().getVisibilityTriggerProps() as Record<
            string,
            unknown
        >;
        expect(trigger).toMatchObject({
            type: "button",
            "aria-label": "Show password",
            "aria-pressed": false,
            "aria-controls": input.id,
        });
        const click = (trigger["onClick"] ?? trigger["onclick"]) as () => void;
        click();
        await settle();
        expect(api().revealed).toBe(true);
        expect(input.type).toBe("text");
        api().setRevealed(false);
        await settle();
        expect(input.type).toBe("password");
        stop();
    });

    describe("validation", () => {
        it("`invalid` marks the input and nothing else", async () => {
            const { api, input, stop } = field({ invalid: true });
            await settle();
            expect(api().invalid).toBe(true);
            expect(api().errorText).toBeUndefined();
            expect(input.getAttribute("aria-invalid")).toBe("true");
            expect(input.validity.valid).toBe(true);
            stop();
        });

        it("`error` is the input's custom validity and the error text", async () => {
            const { api, input, setProps, stop } = field({
                error: "Taken",
            });
            await settle();
            expect(api().invalid).toBe(true);
            expect(api().errorText).toBe("Taken");
            expect(input.validationMessage).toBe("Taken");
            setProps({ id: "name" });
            await settle();
            expect(api().invalid).toBe(false);
            expect(input.validity.valid).toBe(true);
            stop();
        });

        it("`validate: native` shows the browser's message once the user commits a change", async () => {
            const { api, input, stop } = field({
                validate: "native",
                required: true,
            });
            await settle();
            expect(input.validity.valid).toBe(false);
            expect(api().invalid).toBe(false);
            await userEvent.type(input, "a");
            input.blur();
            await settle();
            expect(api().invalid).toBe(false);
            await userEvent.clear(input);
            await settle();
            expect(api().invalid).toBe(true);
            expect(api().errorText).toBe(input.validationMessage);
            await userEvent.type(input, "a");
            await settle();
            expect(api().invalid).toBe(false);
            stop();
        });

        it("`validate: native` shows the message when the form checks its controls", async () => {
            const { api, input, host, stop } = field(
                { validate: "native", required: true },
                "<form><input data-input></form>",
            );
            await settle();
            expect(api().invalid).toBe(false);
            host.querySelector("form")!.checkValidity();
            await settle();
            expect(api().invalid).toBe(true);
            api().reset("");
            await settle();
            expect(api().invalid).toBe(false);
            expect(input.value).toBe("");
            stop();
        });
    });
});
