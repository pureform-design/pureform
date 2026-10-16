import { afterEach, describe, expect, it } from "vitest";
import { commands } from "vitest/browser";

import {
    observeIconStyle,
    readIconStyle,
    subscribeReducedMotion,
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
