import { describe, expect, it } from "vitest";

import {
    CAROUSEL_SIZES,
    carouselItemSizes,
    carouselKeylines,
    carouselSelection,
} from "./carousel";
import type { CarouselLayout } from "./carousel";

const GAP = 8;
const total = (keylines: readonly number[]) =>
    keylines.reduce((sum, size) => sum + size, 0) + (keylines.length - 1) * GAP;

const sizes = (
    layout: CarouselLayout,
    scroll: number,
    count = 8,
    viewport = 328,
) =>
    carouselItemSizes(
        { layout, count },
        { viewport, height: 200, gap: GAP, scroll },
    );

describe("carousel keylines", () => {
    it("fill the row with large items, a medium and a small one for multi-browse", () => {
        for (const viewport of [328, 400, 600, 900, 1200]) {
            const keylines = carouselKeylines("multiBrowse", viewport, GAP);
            expect(total(keylines)).toBeCloseTo(viewport);
            const [small, medium, ...large] = [...keylines].reverse();
            expect(small).toBe(CAROUSEL_SIZES.smallMax);
            expect(medium).toBeGreaterThan(small!);
            for (const size of large) {
                expect(size).toBeGreaterThanOrEqual(medium!);
                expect(size).toBe(large[0]);
            }
        }
        expect(carouselKeylines("multiBrowse", 328, GAP)).toEqual([
            186, 70, 56,
        ]);
    });

    it("are one large item and a small one for hero", () => {
        expect(carouselKeylines("hero", 328, GAP)).toEqual([264, 56]);
    });

    it("are a single item when the row is too narrow", () => {
        expect(carouselKeylines("multiBrowse", 100, GAP)).toEqual([100]);
    });

    it("are none for the unmasked layouts", () => {
        for (const layout of ["uncontained", "multiAspect", "fullScreen"]) {
            expect(
                carouselKeylines(layout as CarouselLayout, 328, GAP),
            ).toEqual([]);
        }
    });
});

describe("carousel item sizes", () => {
    it("put the items on the keylines at rest", () => {
        const [first, second, third] = sizes("multiBrowse", 0);
        expect(first).toEqual({ slot: 186, mask: 186, offset: 0 });
        expect(second).toEqual({ slot: 186, mask: 70, offset: 0 });
        expect(third!.mask).toBe(56);
        // The third slot starts two steps in; its mask starts after the medium item.
        expect(third!.offset).toBe(186 + 8 + 70 + 8 - 2 * (186 + 8));
    });

    it("keep the gap between the masks on the row however far the row has scrolled", () => {
        for (const layout of ["multiBrowse", "hero"] as const) {
            const step = carouselKeylines(layout, 328, GAP)[0]! + GAP;
            for (const scroll of [0, 13, 97, step, 250, 433, 700, 1100]) {
                const items = sizes(layout, scroll);
                items.slice(0, -1).forEach((item, index) => {
                    const next = items[index + 1]!;
                    const end = index * step - scroll + item.offset + item.mask;
                    const start = (index + 1) * step - scroll + next.offset;
                    // Only where both are on the row: off it, they move on with the row.
                    if (end - item.mask < 0 || start > 328) return;
                    expect(
                        start - end,
                        `${layout} ${scroll} ${index}`,
                    ).toBeCloseTo(GAP);
                });
            }
        }
    });

    it("end with the last item large", () => {
        const count = 8;
        const step = 186 + GAP;
        const end = count * step - GAP - 328;
        const last = sizes("multiBrowse", end, count).at(-1)!;
        expect(last.mask).toBeCloseTo(186);
        expect(last.offset).toBeCloseTo(0);
    });

    it("don't mask uncontained, multi-aspect or full-screen items", () => {
        expect(sizes("uncontained", 120)[3]).toEqual({
            slot: 186,
            mask: 186,
            offset: 0,
        });
        expect(sizes("fullScreen", 120)[3]).toEqual({
            slot: 328,
            mask: 328,
            offset: 0,
        });
        expect(
            carouselItemSizes(
                { layout: "multiAspect", count: 2, aspectRatios: [0.5, 2] },
                { viewport: 328, height: 100, gap: GAP, scroll: 0 },
            ),
        ).toEqual([
            { slot: 50, mask: 50, offset: 0 },
            { slot: 200, mask: 200, offset: 0 },
        ]);
    });

    it("selects the layout and tokens", () => {
        expect(carouselSelection({ layout: "hero" })).toEqual({
            layout: "hero",
            tokens: undefined,
        });
    });
});
