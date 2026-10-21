import { carouselKeylines } from "@pureform/binding-core";
import type { ReactNode } from "react";
import { View } from "react-native";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { Carousel } from ".";
import { PureformProvider } from "..";
import { animated } from "../engine";
import { reanimated } from "../engines/reanimated";
import { presetRegistry } from "../testing/registry";
import type { TestRegistry } from "../testing/registry";
import { byTestId, mount, outside, settle } from "../testing/render";

let registry: TestRegistry;

beforeAll(async () => {
    registry = await presetRegistry(["carousel", "ripple"]);
});

afterEach(() => {
    document.body.innerHTML = "";
});

const ITEMS = Array.from({ length: 8 }, (_, index) => ({
    "aria-label": `Item ${index + 1}`,
    content: null,
}));

// The preset's 16px padding either side and 8px gap, in a 392px wide row.
const VIEWPORT = 392 - 32;
const GAP = 8;

const all = (id: string) => [
    ...document.querySelectorAll<HTMLElement>(`[data-testid="${id}"]`),
];
const widths = (id: string) =>
    all(id).map((element) => Math.round(element.getBoundingClientRect().width));

const frames = async (count = 3) => {
    for (let i = 0; i < count; i++)
        await new Promise((resolve) => requestAnimationFrame(resolve));
    await settle();
};

describe.each([animated, reanimated])("the carousel with $name", (engine) => {
    const render = (node: ReactNode, motion: "reduce" | "full" = "reduce") =>
        mount(
            <PureformProvider
                registry={registry}
                engine={engine}
                motion={motion}
            >
                <View style={{ width: 392 }}>{node}</View>
            </PureformProvider>,
        );

    it("is a named region of pressable masks on the keylines", async () => {
        await render(<Carousel aria-label="Trips" items={ITEMS} />);
        await frames();
        const root = byTestId("pf-carousel-root");
        expect(root.getAttribute("role")).toBe("region");
        expect(root.getAttribute("aria-label")).toBe("Trips");
        const keylines = carouselKeylines("multiBrowse", VIEWPORT, GAP).map(
            Math.round,
        );
        expect(widths("pf-carousel-mask").slice(0, keylines.length)).toEqual(
            keylines,
        );
        expect(new Set(widths("pf-carousel-content"))).toEqual(
            new Set([keylines[0]]),
        );
        expect(all("pf-carousel-mask")[0]!.getAttribute("aria-label")).toBe(
            "Item 1",
        );
        // Material's extra-large corners on each mask.
        expect(
            getComputedStyle(all("pf-carousel-mask")[0]!).borderTopLeftRadius,
        ).toBe("28px");
    });

    it("doesn't mask uncontained items", async () => {
        await render(
            <Carousel layout="uncontained" itemWidth={150} items={ITEMS} />,
        );
        await frames();
        expect(new Set(widths("pf-carousel-mask"))).toEqual(new Set([150]));
    });

    it("scrolls to the page at once under reduced motion, and smoothly otherwise", async () => {
        for (const motion of ["reduce", "full"] as const) {
            const page = outside(0);
            await render(
                <page.Holder>
                    {(value) => (
                        <Carousel
                            layout="uncontained"
                            itemWidth={100}
                            items={ITEMS}
                            page={value}
                        />
                    )}
                </page.Holder>,
                motion,
            );
            await frames();
            await page.set(2);
            await frames(1);
            const scrolled = byTestId("pf-carousel-item-group").scrollLeft;
            if (motion === "reduce") expect(scrolled).toBe(2 * (100 + GAP));
            else expect(scrolled).toBeLessThan(2 * (100 + GAP));
            document.body.innerHTML = "";
        }
    });
});
