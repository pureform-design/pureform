import { describe, expect, it } from "vitest";

import { parseColor } from "./rgba";
import { mixIn, readColorFunction } from "./spaces";
import type { MixSpace } from "./spaces";

// Chromium's color-mix() for each space, painted to a canvas and read back: space, base,
// over, amount, and the 8-bit result.
const CHROMIUM: [MixSpace, string, string, number, number[]][] = [
    [
        "srgb",
        "rgb(103, 80, 164)",
        "rgb(255, 255, 255)",
        0.3,
        [149, 133, 191, 1],
    ],
    ["hsl", "rgb(103, 80, 164)", "rgb(255, 255, 255)", 0.3, [152, 139, 184, 1]],
    [
        "oklab",
        "rgb(103, 80, 164)",
        "rgb(255, 255, 255)",
        0.3,
        [145, 131, 193, 1],
    ],
    [
        "oklch",
        "rgb(103, 80, 164)",
        "rgb(255, 255, 255)",
        0.3,
        [145, 131, 193, 1],
    ],
    ["lab", "rgb(103, 80, 164)", "rgb(255, 255, 255)", 0.3, [149, 129, 191, 1]],
    ["lch", "rgb(103, 80, 164)", "rgb(255, 255, 255)", 0.3, [149, 129, 191, 1]],
    [
        "display-p3",
        "rgb(103, 80, 164)",
        "rgb(255, 255, 255)",
        0.3,
        [149, 133, 192, 1],
    ],
    ["srgb", "rgb(255, 0, 0)", "rgb(0, 0, 255)", 0.5, [128, 0, 128, 1]],
    ["hsl", "rgb(255, 0, 0)", "rgb(0, 0, 255)", 0.5, [255, 0, 255, 1]],
    ["oklab", "rgb(255, 0, 0)", "rgb(0, 0, 255)", 0.5, [140, 83, 162, 1]],
    ["oklch", "rgb(255, 0, 0)", "rgb(0, 0, 255)", 0.5, [186, 0, 194, 1]],
    ["lab", "rgb(255, 0, 0)", "rgb(0, 0, 255)", 0.5, [193, 0, 136, 1]],
    ["lch", "rgb(255, 0, 0)", "rgb(0, 0, 255)", 0.5, [245, 0, 134, 1]],
    ["display-p3", "rgb(255, 0, 0)", "rgb(0, 0, 255)", 0.5, [128, 10, 145, 1]],
    [
        "srgb",
        "rgb(0, 128, 0)",
        "rgba(255, 200, 0, 0.5)",
        0.4,
        [64, 146, 0, 0.8],
    ],
    ["hsl", "rgb(0, 128, 0)", "rgba(255, 200, 0, 0.5)", 0.4, [77, 160, 0, 0.8]],
    [
        "oklab",
        "rgb(0, 128, 0)",
        "rgba(255, 200, 0, 0.5)",
        0.4,
        [96, 148, 0, 0.8],
    ],
    [
        "oklch",
        "rgb(0, 128, 0)",
        "rgba(255, 200, 0, 0.5)",
        0.4,
        [115, 144, 0, 0.8],
    ],
    ["lab", "rgb(0, 128, 0)", "rgba(255, 200, 0, 0.5)", 0.4, [94, 148, 0, 0.8]],
    [
        "lch",
        "rgb(0, 128, 0)",
        "rgba(255, 200, 0, 0.5)",
        0.4,
        [104, 146, 0, 0.8],
    ],
    [
        "display-p3",
        "rgb(0, 128, 0)",
        "rgba(255, 200, 0, 0.5)",
        0.4,
        [90, 148, 2, 0.8],
    ],
    ["srgb", "rgb(128, 128, 128)", "rgb(0, 150, 200)", 0.5, [64, 139, 164, 1]],
    ["hsl", "rgb(128, 128, 128)", "rgb(0, 150, 200)", 0.5, [57, 143, 171, 1]],
    ["oklab", "rgb(128, 128, 128)", "rgb(0, 150, 200)", 0.5, [92, 140, 164, 1]],
    ["oklch", "rgb(128, 128, 128)", "rgb(0, 150, 200)", 0.5, [92, 140, 164, 1]],
    ["lab", "rgb(128, 128, 128)", "rgb(0, 150, 200)", 0.5, [97, 139, 164, 1]],
    ["lch", "rgb(128, 128, 128)", "rgb(0, 150, 200)", 0.5, [97, 139, 164, 1]],
    [
        "display-p3",
        "rgb(128, 128, 128)",
        "rgb(0, 150, 200)",
        0.5,
        [84, 139, 164, 1],
    ],
    ["srgb", "rgb(20, 30, 40)", "rgb(240, 220, 10)", 0.75, [185, 173, 17, 1]],
    ["hsl", "rgb(20, 30, 40)", "rgb(240, 220, 10)", 0.75, [92, 180, 23, 1]],
    ["oklab", "rgb(20, 30, 40)", "rgb(240, 220, 10)", 0.75, [178, 168, 52, 1]],
    ["oklch", "rgb(20, 30, 40)", "rgb(240, 220, 10)", 0.75, [114, 186, 95, 1]],
    ["lab", "rgb(20, 30, 40)", "rgb(240, 220, 10)", 0.75, [181, 167, 41, 1]],
    ["lch", "rgb(20, 30, 40)", "rgb(240, 220, 10)", 0.75, [90, 187, 73, 1]],
    [
        "display-p3",
        "rgb(20, 30, 40)",
        "rgb(240, 220, 10)",
        0.75,
        [185, 173, 35, 1],
    ],
];

describe("mixIn", () => {
    it.each(CHROMIUM)(
        "mixes in %s as Chromium does: %s with %s",
        (space, base, over, amount, want) => {
            const got = mixIn(
                space,
                parseColor(base),
                parseColor(over),
                amount,
            );
            for (let i = 0; i < 3; i++)
                expect(Math.abs(got[i]! - want[i]!)).toBeLessThanOrEqual(2);
            expect(got[3]).toBeCloseTo(want[3]!, 2);
        },
    );
});

// Chromium's reading of each color function, painted to a canvas and read back.
const READ: [string, number[]][] = [
    ["hsl(260 40% 50%)", [111, 77, 179, 1]],
    ["hsl(120, 100%, 25%)", [0, 128, 0, 1]],
    ["hsla(0.5turn 60% 70% / 0.5)", [133, 223, 223, 0.5]],
    ["oklch(0.6 0.15 280)", [113, 115, 215, 1]],
    ["oklch(60% 37.5% 120deg)", [117, 140, 0, 1]],
    ["oklab(0.7 -0.1 0.1)", [119, 178, 83, 1]],
    ["lab(50 40 -20)", [171, 90, 154, 1]],
    ["lch(70% 50 30)", [251, 137, 128, 1]],
    ["color(display-p3 0.2 0.6 0.4)", [0, 156, 97, 1]],
    ["color(srgb 0.1 0.2 0.3 / 80%)", [26, 51, 77, 0.8]],
];

describe("readColorFunction", () => {
    it.each(READ)("reads %s as Chromium does", (color, want) => {
        const got = readColorFunction(color)!;
        // Canvas stores half-transparent colors premultiplied, so they read back coarser.
        const slack = want[3]! < 1 ? 4 : 2;
        for (let i = 0; i < 3; i++)
            expect(Math.abs(got[i]! - want[i]!)).toBeLessThanOrEqual(slack);
        expect(got[3]).toBeCloseTo(want[3]!, 2);
    });

    it("leaves other values alone", () => {
        expect(readColorFunction("rgb(0, 0, 0)")).toBeUndefined();
        expect(readColorFunction("12px")).toBeUndefined();
        expect(readColorFunction("color(rec2020 1 0 0)")).toBeUndefined();
    });
});
