import {
    changePages,
    keepContents,
    pagesLeaving,
    pagesMoving,
    settlePage,
    startPages,
} from "@pureform/binding-core";
import type { PageKey } from "@pureform/binding-core";
import { pageRootProps } from "@pureform/binding-web";
import { describe, expect, it } from "vitest";

const start = startPages("home");

describe("page transition pages", () => {
    it("starts with the first page still", () => {
        expect(start).toEqual([
            { key: "home", state: "current", direction: undefined },
        ]);
        expect(pagesMoving(start)).toBe(false);
        expect(changePages(start, "home")).toBe(start);
    });

    it("sends the shown page out and brings the new key's in, the way the change goes", () => {
        expect(changePages(start, "mail", { direction: "forward" })).toEqual([
            { key: "home", state: "leaving", direction: "forward" },
            { key: "mail", state: "entering", direction: "forward" },
        ]);
    });

    it("drops pages still leaving, or keeps them with keepLeaving", () => {
        const away = changePages(start, "mail");
        expect(changePages(away, "chat").map((page) => page.key)).toEqual([
            "mail",
            "chat",
        ]);
        const kept = changePages(away, "chat", { keepLeaving: true });
        expect(kept.map((page) => [page.key, page.state])).toEqual([
            ["home", "leaving"],
            ["mail", "leaving"],
            ["chat", "entering"],
        ]);
    });

    it("lets a page still leaving give way to the same key coming back", () => {
        const away = changePages(start, "mail");
        expect(changePages(away, "home", { keepLeaving: true })).toEqual([
            { key: "mail", state: "leaving", direction: undefined },
            { key: "home", state: "entering", direction: undefined },
        ]);
    });

    it("removes a leaving page and settles an entering one as their motion ends", () => {
        let pages = changePages(start, "mail");
        expect(pagesLeaving(pages)).toBe(true);
        expect(pageRootProps(pages)).toEqual({ "data-transitioning": "" });
        pages = settlePage(pages, "home", "leaving");
        expect(pagesLeaving(pages)).toBe(false);
        expect(pageRootProps(pages)).toEqual({});
        pages = settlePage(pages, "mail", "entering");
        expect(pages).toEqual(startPages("mail"));
        expect(settlePage(pages, "mail", "entering")).toBe(pages);
        expect(settlePage(pages, "mail", "current")).toBe(pages);
    });

    it("keeps each page's content until it has gone", () => {
        const contents = new Map<PageKey, string>();
        keepContents(contents, start, "home", "Home");
        const pages = changePages(start, "mail");
        keepContents(contents, pages, "mail", "Mail");
        expect([...contents]).toEqual([
            ["home", "Home"],
            ["mail", "Mail"],
        ]);
        keepContents(contents, startPages("mail"), "mail", "Mail 2");
        expect([...contents]).toEqual([["mail", "Mail 2"]]);
    });
});
