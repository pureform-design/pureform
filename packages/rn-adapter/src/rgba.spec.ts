import { describe, expect, it } from "vitest";

import { compositeOver, formatColor, mixSrgb, parseColor } from "./rgba";

describe("parseColor", () => {
    it("reads rgba(), hex, and transparent", () => {
        expect(parseColor("rgba(10, 20, 30, 0.5)")).toEqual([10, 20, 30, 0.5]);
        expect(parseColor("rgb(10 20 30 / 50%)")).toEqual([10, 20, 30, 0.5]);
        expect(parseColor("#ff000080")).toEqual([255, 0, 0, 128 / 255]);
        expect(parseColor("#0f0")).toEqual([0, 255, 0, 1]);
        expect(parseColor("transparent")).toEqual([0, 0, 0, 0]);
    });

    it("rejects what it can't read", () => {
        expect(() => parseColor("oklch(0.5 0.1 200)")).toThrow("can't read");
    });
});

describe("mixSrgb", () => {
    it("fades a color over transparent rather than darkening it, as color-mix does", () => {
        expect(
            formatColor(mixSrgb([0, 0, 0, 0], [103, 80, 164, 1], 0.08)),
        ).toBe("rgba(103, 80, 164, 0.08)");
    });

    it("interpolates opaque colors", () => {
        expect(mixSrgb([0, 0, 0, 1], [200, 100, 50, 1], 0.5)).toEqual([
            100, 50, 25, 1,
        ]);
    });
});

describe("compositeOver", () => {
    it("paints a translucent layer over a color", () => {
        expect(compositeOver([255, 255, 255, 0.5], [0, 0, 0, 1])).toEqual([
            127.5, 127.5, 127.5, 1,
        ]);
        expect(compositeOver([0, 0, 0, 0], [10, 20, 30, 1])).toEqual([
            10, 20, 30, 1,
        ]);
    });
});

describe("formatColor", () => {
    it("rounds and clips channels", () => {
        expect(formatColor([255.6, -3, 12.4, 1.2])).toBe("rgba(255, 0, 12, 1)");
    });
});
