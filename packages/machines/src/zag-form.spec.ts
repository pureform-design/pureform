import { afterEach, describe, expect, it } from "vitest";

import * as radioGroup from "./radio-group";
import * as switchControl from "./switch";
import { run, settle } from "./testing/vanilla";

const mount = (markup: string) => {
    document.body.innerHTML = markup;
    const root = document.querySelector<HTMLElement>("[data-root]")!;
    const items = ["a", "b"].map((value) => {
        const input = document.createElement("input");
        root.append(input);
        return { value, input };
    });
    return run(
        radioGroup.machine,
        radioGroup.connect,
        { id: "size", defaultValue: "a" },
        (api, spread) => {
            spread(root, api.getRootProps());
            for (const { value, input } of items) {
                spread(input, api.getItemHiddenInputProps({ value }));
            }
        },
    );
};

afterEach(() => {
    document.body.innerHTML = "";
});

describe("radioGroup.machine", () => {
    it("is disabled inside a disabled fieldset", async () => {
        const group = mount(
            `<fieldset disabled><div data-root id="radio-group:size"></div></fieldset>`,
        );
        await settle();
        expect(group.service.computed("isDisabled")).toBe(true);
        group.stop();
    });

    it("stays enabled in the first legend of a disabled fieldset, which Zag's own misses", async () => {
        const group = mount(
            `<fieldset disabled><legend><div data-root id="radio-group:size"></div></legend></fieldset>`,
        );
        await settle();
        expect(group.service.computed("isDisabled")).toBe(false);
        group.stop();
    });

    it("leaves a form reset to the binding", async () => {
        document.body.innerHTML = `<form><div data-root id="radio-group:size"></div></form>`;
        const root = document.querySelector<HTMLElement>("[data-root]")!;
        const group = run(
            radioGroup.machine,
            radioGroup.connect,
            { id: "size", defaultValue: "a" },
            (api, spread) => spread(root, api.getRootProps()),
        );
        group.api().setValue("b");
        await settle();
        root.closest("form")!.reset();
        await settle();
        expect(group.api().value).toBe("b");
        group.stop();
    });
});

describe("switchControl.machine", () => {
    const mountSwitch = (markup: string) => {
        document.body.innerHTML = markup;
        const input = document.querySelector<HTMLInputElement>("input")!;
        return run(
            switchControl.machine,
            switchControl.connect,
            { id: "wifi", defaultChecked: false },
            (api, spread) => spread(input, api.getHiddenInputProps()),
        );
    };

    it("stays enabled in the first legend of a disabled fieldset", async () => {
        const control = mountSwitch(
            `<fieldset disabled><legend><input id="switch:wifi:input"></legend></fieldset>`,
        );
        await settle();
        expect(control.service.computed("isDisabled")).toBe(false);
        control.stop();
    });

    it("is disabled inside a disabled fieldset, and leaves a form reset to the binding", async () => {
        const control = mountSwitch(
            `<form><fieldset><input id="switch:wifi:input"></fieldset></form>`,
        );
        control.api().setChecked(true);
        await settle();
        document.querySelector("form")!.reset();
        await settle();
        expect(control.api().checked).toBe(true);
        document.querySelector("fieldset")!.disabled = true;
        await settle();
        expect(control.service.computed("isDisabled")).toBe(true);
        control.stop();
    });
});
