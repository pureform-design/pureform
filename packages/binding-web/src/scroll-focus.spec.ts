import { afterEach, describe, expect, it } from "vitest";

import { focusableWhileOverflowing, scrollCellIntoList } from "./scroll-focus";

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

describe("scrollCellIntoList", () => {
    afterEach(() => document.body.replaceChildren());

    const list = () => {
        const page = document.createElement("div");
        page.style.cssText = "height: 3000px; padding-top: 200px";
        const box = document.createElement("div");
        box.style.cssText = "height: 100px; overflow: auto";
        const cells = Array.from({ length: 40 }, () => {
            const cell = document.createElement("div");
            cell.style.height = "20px";
            return cell;
        });
        box.append(...cells);
        page.append(box);
        document.body.append(page);
        return { box, cells };
    };

    it("centres a cell in the list, leaving the page where it is", () => {
        const { box, cells } = list();
        scrollCellIntoList(box, cells[20]!, true);
        expect(box.scrollTop).toBe(20 * 20 + 10 - 50);
        expect(document.scrollingElement!.scrollTop).toBe(0);
    });

    it("scrolls no further than showing a cell, and not at all while it shows", () => {
        const { box, cells } = list();
        scrollCellIntoList(box, cells[2]!, false);
        expect(box.scrollTop).toBe(0);
        scrollCellIntoList(box, cells[10]!, false);
        expect(box.scrollTop).toBe(11 * 20 - 100);
        scrollCellIntoList(box, cells[9]!, false);
        expect(box.scrollTop).toBe(11 * 20 - 100);
        scrollCellIntoList(box, cells[5]!, false);
        expect(box.scrollTop).toBe(5 * 20);
    });
});
