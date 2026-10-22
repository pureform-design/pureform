import { describe, expect, it } from "vitest";

import {
    sharedAxisChange,
    sharedAxisDirection,
    sharedAxisMoving,
    sharedAxisPageProps,
    sharedAxisSettle,
    sharedAxisStart,
} from "./horizontal-shared-axis";

describe("the horizontal shared axis", () => {
    it("goes forward to a later page and backward to an earlier one", () => {
        expect(sharedAxisDirection(0, 2)).toBe("forward");
        expect(sharedAxisDirection(2, 1)).toBe("backward");
    });

    it("starts still, then has the shown page leave as the new one enters", () => {
        const start = sharedAxisStart(1);
        expect(sharedAxisMoving(start)).toBe(false);
        expect(sharedAxisChange(start, 1)).toBe(start);
        expect(sharedAxisChange(start, 0)).toEqual([
            { index: 1, state: "leaving", direction: "backward" },
            { index: 0, state: "entering", direction: "backward" },
        ]);
    });

    it("drops a page still leaving when another change comes", () => {
        const first = sharedAxisChange(sharedAxisStart(0), 1);
        expect(sharedAxisChange(first, 2)).toEqual([
            { index: 1, state: "leaving", direction: "forward" },
            { index: 2, state: "entering", direction: "forward" },
        ]);
    });

    it("removes the leaving page and settles the entering one as their animations end", () => {
        let pages = sharedAxisChange(sharedAxisStart(0), 1);
        pages = sharedAxisSettle(pages, 0, "leaving");
        expect(pages).toEqual([
            { index: 1, state: "entering", direction: "forward" },
        ]);
        pages = sharedAxisSettle(pages, 1, "entering");
        expect(pages).toEqual(sharedAxisStart(1));
        expect(sharedAxisMoving(pages)).toBe(false);
        // An end for a page no longer in that state changes nothing.
        expect(sharedAxisSettle(pages, 1, "entering")).toBe(pages);
    });

    it("makes a leaving page inert and hidden", () => {
        expect(
            sharedAxisPageProps({
                index: 0,
                state: "leaving",
                direction: "forward",
            }),
        ).toEqual({
            "data-state": "leaving",
            "data-direction": "forward",
            inert: true,
            "aria-hidden": "true",
        });
        expect(sharedAxisPageProps(sharedAxisStart(0)[0]!)).toEqual({
            "data-state": "current",
            "data-direction": undefined,
        });
    });
});
