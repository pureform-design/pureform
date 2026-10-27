import { sharedAxisChange, sharedAxisDirection } from "@pureform/binding-core";
import { startPages } from "@pureform/binding-core";
import { sharedAxisPageProps } from "@pureform/binding-web";
import { describe, expect, it } from "vitest";

describe("the horizontal shared axis", () => {
    it("goes forward to a later page and backward to an earlier one", () => {
        expect(sharedAxisDirection(0, 2)).toBe("forward");
        expect(sharedAxisDirection(2, 1)).toBe("backward");
    });

    it("starts still, then has the shown page leave as the new one enters", () => {
        const start = startPages(1);
        expect(sharedAxisChange(start, 1)).toBe(start);
        expect(sharedAxisChange(start, 0)).toEqual([
            { key: 1, state: "leaving", direction: "backward" },
            { key: 0, state: "entering", direction: "backward" },
        ]);
    });

    it("drops a page still leaving when another change comes", () => {
        const first = sharedAxisChange(startPages(0), 1);
        expect(sharedAxisChange(first, 2)).toEqual([
            { key: 1, state: "leaving", direction: "forward" },
            { key: 2, state: "entering", direction: "forward" },
        ]);
    });

    it("makes a leaving page inert and hidden", () => {
        expect(
            sharedAxisPageProps({
                key: 0,
                state: "leaving",
                direction: "forward",
            }),
        ).toEqual({
            "data-state": "leaving",
            "data-direction": "forward",
            inert: true,
            "aria-hidden": "true",
        });
        expect(sharedAxisPageProps(startPages(0)[0]!)).toEqual({
            "data-state": "current",
            "data-direction": undefined,
        });
    });
});
