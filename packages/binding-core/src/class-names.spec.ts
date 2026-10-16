import { describe, expect, it } from "vitest";

import { cx } from "./class-names";

describe("cx", () => {
    it("joins strings and numbers, skipping falsy values", () => {
        expect(cx("a", undefined, null, false, true, 0, "", "b", 1)).toBe(
            "a b 1",
        );
    });

    it("flattens arrays and reads objects by their truthy keys, in order", () => {
        expect(
            cx("a", ["b", ["c", { d: true, e: false }]], { f: 1, g: null }),
        ).toBe("a b c d f");
    });

    it("gives an empty string for nothing", () => {
        expect(cx()).toBe("");
        expect(cx([], {}, undefined)).toBe("");
    });
});
