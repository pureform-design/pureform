import { afterEach, describe, expect, it } from "vitest";
import { commands } from "vitest/browser";

import {
    observeIconStyle,
    radioInputs,
    readIconStyle,
    setRadioDefaults,
    subscribeReducedMotion,
    syncCheckedInput,
    syncRadioInputs,
    syncTextInput,
    systemReducedMotion,
} from "./dom";
import type { IconStyle } from "./icon-style";

afterEach(async () => {
    document.body.innerHTML = "";
    document.head
        .querySelectorAll("style[data-test]")
        .forEach((s) => s.remove());
    await commands.emulateReducedMotion("no-preference");
});

const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));

describe("reduced motion", () => {
    it("reads and follows the system's preference", async () => {
        const seen: boolean[] = [];
        const stop = subscribeReducedMotion((reduce) => seen.push(reduce));
        expect(seen).toEqual([false]);
        expect(systemReducedMotion()).toBe(false);

        await commands.emulateReducedMotion("reduce");
        await frame();
        expect(seen).toEqual([false, true]);
        expect(systemReducedMotion()).toBe(true);

        stop();
        await commands.emulateReducedMotion("no-preference");
        await frame();
        expect(seen).toEqual([false, true]);
    });
});

const iconMarkup = () => {
    const style = document.createElement("style");
    style.dataset.test = "";
    style.textContent = `
        [data-pf-part="root"] { color: rgb(0, 0, 255); }
        [data-pf-part="root"][aria-pressed="true"] { color: rgb(255, 0, 0); }
        [data-pf-part="icon"] { font-size: 18px; font-variation-settings: "FILL" 0; }
        [aria-pressed="true"] [data-pf-part="icon"] { font-size: 24px; font-variation-settings: "FILL" 1; }
    `;
    document.head.append(style);
    document.body.innerHTML = `
        <button data-scope="button" data-pf-part="root">
            <span data-scope="button" data-pf-part="icon"></span>
        </button>`;
    return {
        root: document.querySelector("button")!,
        icon: document.querySelector("span")!,
    };
};

describe("icon style", () => {
    it("reads the slot's size, color, and fill", () => {
        const { icon } = iconMarkup();
        expect(readIconStyle(icon)).toEqual({
            size: 18,
            color: "rgb(0, 0, 255)",
            filled: false,
        });
    });

    it("follows a state change on the component's root", async () => {
        const { root, icon } = iconMarkup();
        const seen: IconStyle[] = [];
        const stop = observeIconStyle(icon, (style) => seen.push(style));
        expect(seen).toHaveLength(1);

        root.setAttribute("aria-pressed", "true");
        await frame();
        expect(seen.at(-1)).toEqual({
            size: 24,
            color: "rgb(255, 0, 0)",
            filled: true,
        });
        const count = seen.length;

        root.setAttribute("title", "unrelated");
        await frame();
        expect(seen).toHaveLength(count);

        stop();
        root.removeAttribute("aria-pressed");
        await frame();
        expect(seen).toHaveLength(count);
    });
});

describe("syncCheckedInput", () => {
    it("puts the input's checked and indeterminate back to the machine's state", () => {
        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = true;
        syncCheckedInput(input, false);
        expect(input.checked).toBe(false);
        syncCheckedInput(input, "indeterminate");
        expect([input.checked, input.indeterminate]).toEqual([false, true]);
        syncCheckedInput(input, true);
        expect([input.checked, input.indeterminate]).toEqual([true, false]);
    });
});

describe("syncTextInput", () => {
    it("puts the text back, and leaves an equal value and its caret alone", () => {
        const input = document.createElement("input");
        document.body.append(input);
        input.value = "Adam";
        input.setSelectionRange(1, 1);
        syncTextInput(input, "Adam");
        expect(input.selectionStart).toBe(1);
        syncTextInput(input, "Ada");
        expect(input.value).toBe("Ada");
    });
});

describe("radio groups", () => {
    const group = () => {
        document.body.innerHTML = `<form><div data-group>
            <input type="radio" name="size" value="s" checked>
            <input type="radio" name="size" value="m">
        </div></form>`;
        return document.querySelector("[data-group]")!;
    };

    it("puts the radios back to the group's value", () => {
        const element = group();
        const [small, medium] = radioInputs(element);
        medium!.checked = true;
        syncRadioInputs(element, "s");
        expect([small!.checked, medium!.checked]).toEqual([true, false]);
        syncRadioInputs(element, null);
        expect([small!.checked, medium!.checked]).toEqual([false, false]);
    });

    it("sets the defaults a form reset shows, leaving the user's radio checked", () => {
        const element = group();
        const [small, medium] = radioInputs(element);
        medium!.click();
        setRadioDefaults(element, "s");
        expect([small!.defaultChecked, medium!.defaultChecked]).toEqual([
            true,
            false,
        ]);
        expect(medium!.checked).toBe(true);
        element.closest("form")!.reset();
        expect([small!.checked, medium!.checked]).toEqual([true, false]);
        setRadioDefaults(element, null);
        expect(
            radioInputs(element).map((input) => input.defaultChecked),
        ).toEqual([false, false]);
    });
});
