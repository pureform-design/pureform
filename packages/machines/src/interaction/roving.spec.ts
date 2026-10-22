import { describe, expect, it } from "vitest";

import { rovingIndex } from "./roving";

describe("rovingIndex", () => {
    it("moves along a row, flipped in right-to-left, and stops at the ends", () => {
        expect(rovingIndex("ArrowRight", 1, 3)).toBe(2);
        expect(rovingIndex("ArrowRight", 2, 3)).toBe(2);
        expect(rovingIndex("ArrowLeft", 0, 3)).toBe(0);
        expect(rovingIndex("ArrowLeft", 1, 3, { rtl: true })).toBe(2);
        expect(rovingIndex("ArrowDown", 1, 3)).toBeUndefined();
    });

    it("moves along a column and loops round when asked", () => {
        const column = { vertical: true, rtl: true, loop: true };
        expect(rovingIndex("ArrowDown", 2, 3, column)).toBe(0);
        expect(rovingIndex("ArrowUp", 0, 3, column)).toBe(2);
        expect(rovingIndex("ArrowRight", 0, 3, column)).toBeUndefined();
    });

    it("goes to the first and last with Home and End", () => {
        expect(rovingIndex("Home", 2, 3)).toBe(0);
        expect(rovingIndex("End", 0, 3)).toBe(2);
        expect(rovingIndex("a", 0, 3)).toBeUndefined();
    });
});
