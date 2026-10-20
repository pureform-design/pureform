import { describe, expect, it } from "vitest";

import {
    APP_BAR_AT_REST,
    appBarContentLast,
    appBarDrawnState,
    appBarScrollState,
    appBarSelection,
} from "./app-bar";

describe("appBarScrollState", () => {
    it("lifts a small bar once the page moves, and never collapses it", () => {
        expect(appBarScrollState(0)).toBe(APP_BAR_AT_REST);
        expect(appBarScrollState(400, { size: "small" })).toEqual({
            scrolled: true,
            collapsed: false,
        });
    });

    it("collapses a flexible bar past its headline, and expands it within half of that", () => {
        const size = "mediumFlexible";
        const lifted = appBarScrollState(10, { size });
        expect(lifted).toEqual({ scrolled: true, collapsed: false });
        const collapsed = appBarScrollState(48, { size, previous: lifted });
        expect(collapsed).toEqual({ scrolled: true, collapsed: true });
        expect(appBarScrollState(30, { size, previous: collapsed })).toBe(
            collapsed,
        );
        expect(appBarScrollState(20, { size, previous: collapsed })).toEqual(
            lifted,
        );
        expect(appBarScrollState(55, { size: "largeFlexible" })).toEqual(
            lifted,
        );
    });

    it("only lifts a pinned bar", () => {
        expect(
            appBarScrollState(400, {
                size: "largeFlexible",
                behavior: "pinned",
            }),
        ).toEqual({ scrolled: true, collapsed: false });
    });

    it("keeps the previous state while nothing changes", () => {
        const previous = { scrolled: true, collapsed: false };
        expect(appBarScrollState(5, { previous })).toBe(previous);
    });
});

describe("the drawn app bar", () => {
    it("takes the owner's scrolled and collapsed over the offset's", () => {
        const fromOffset = { scrolled: true, collapsed: true };
        expect(
            appBarDrawnState(
                { size: "mediumFlexible", scrolled: false },
                fromOffset,
            ),
        ).toEqual({ scrolled: false, collapsed: true });
        expect(
            appBarDrawnState({ size: "small", collapsed: true }, fromOffset),
        ).toEqual({ scrolled: true, collapsed: false });
    });

    it("puts an expanded flexible bar's content last, but not a search bar", () => {
        const rest = APP_BAR_AT_REST;
        expect(appBarContentLast({ size: "largeFlexible" }, rest)).toBe(true);
        expect(
            appBarContentLast(
                { size: "largeFlexible" },
                { scrolled: true, collapsed: true },
            ),
        ).toBe(false);
        expect(
            appBarContentLast({ size: "largeFlexible", search: true }, rest),
        ).toBe(false);
        expect(appBarContentLast({ size: "small" }, rest)).toBe(false);
    });

    it("selects the small layout for a search bar", () => {
        expect(
            appBarSelection(
                { size: "largeFlexible", search: true },
                { scrolled: true, collapsed: true },
            ),
        ).toEqual({
            size: "small",
            centered: undefined,
            search: true,
            scrolled: true,
            collapsed: false,
            tokens: undefined,
        });
    });
});
