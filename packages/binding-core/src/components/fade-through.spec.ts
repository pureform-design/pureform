import { describe, expect, it } from "vitest";

import { dropPage, pageStateProps, showPage } from "./fade-through";
import type { FadeThroughPage } from "./fade-through";

const start = showPage<string>([], "home", "Home");

describe("fade through pages", () => {
    it("shows the first page without a state, so it doesn't animate", () => {
        expect(start).toEqual([
            { value: "home", content: "Home", state: undefined },
        ]);
    });

    it("keeps the page for the same value, with its new content", () => {
        expect(showPage(start, "home", "Home")).toBe(start);
        expect(showPage(start, "home", "Home 2")).toEqual([
            { value: "home", content: "Home 2", state: undefined },
        ]);
    });

    it("sends the shown page out and brings the new value's in", () => {
        expect(showPage(start, "mail", "Mail")).toEqual([
            { value: "home", content: "Home", state: "closed" },
            { value: "mail", content: "Mail", state: "open" },
        ]);
    });

    it("lets a page still leaving give way to the same value coming back", () => {
        const away = showPage(start, "mail", "Mail");
        expect(showPage(away, "home", "Home")).toEqual([
            { value: "mail", content: "Mail", state: "closed" },
            { value: "home", content: "Home", state: "open" },
        ]);
    });

    it("keeps every page still leaving through quick switches", () => {
        const pages = showPage(showPage(start, "mail", "Mail"), "chat", "Chat");
        expect(pages.map((page) => [page.value, page.state])).toEqual([
            ["home", "closed"],
            ["mail", "closed"],
            ["chat", "open"],
        ]);
    });

    it("drops a page once it has left, and only one that's leaving", () => {
        const pages = showPage(start, "mail", "Mail");
        expect(dropPage(pages, "home")).toEqual([pages[1]]);
        expect(dropPage(pages, "mail")).toBe(pages);
        const shown: readonly FadeThroughPage<string>[] = start;
        expect(dropPage(shown, "home")).toBe(shown);
    });

    it("hides a leaving page from assistive technology and input", () => {
        expect(pageStateProps("closed")).toEqual({
            "data-state": "closed",
            "aria-hidden": "true",
            inert: true,
        });
        expect(pageStateProps("open")).toEqual({ "data-state": "open" });
        expect(pageStateProps(undefined)).toEqual({});
    });
});
