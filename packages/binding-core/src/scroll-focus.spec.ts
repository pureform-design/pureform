import { afterEach, describe, expect, it } from "vitest";

import { focusableWhileOverflowing } from "./scroll-focus";

const frame = () =>
    new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

describe("focusableWhileOverflowing", () => {
    afterEach(() => document.body.replaceChildren());

    it("is focusable only while its content overflows", async () => {
        const body = document.createElement("div");
        body.style.cssText = "height: 100px; overflow: auto";
        const content = document.createElement("div");
        content.style.height = "50px";
        body.append(content);
        document.body.append(body);
        const stop = focusableWhileOverflowing(body);
        expect(body.hasAttribute("tabindex")).toBe(false);
        content.style.height = "300px";
        await frame();
        await frame();
        expect(body.getAttribute("tabindex")).toBe("0");
        content.style.height = "50px";
        await frame();
        await frame();
        expect(body.hasAttribute("tabindex")).toBe(false);
        content.style.height = "300px";
        await frame();
        await frame();
        stop();
        expect(body.hasAttribute("tabindex")).toBe(false);
    });

    it("leaves the app's tabindex alone", () => {
        const body = document.createElement("div");
        body.tabIndex = -1;
        document.body.append(body);
        focusableWhileOverflowing(body)();
        expect(body.getAttribute("tabindex")).toBe("-1");
    });
});
