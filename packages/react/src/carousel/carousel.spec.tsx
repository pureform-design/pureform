import { testIds } from "@pureform/anatomy";
import { carouselKeylines } from "@pureform/binding-core";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { Carousel } from ".";
import { PureformProvider } from "..";
import { displayRegistry } from "../__fixtures__/registry";
import { mount, settle } from "../testing/render";

const byTestId = (id: string): HTMLElement => {
    const element = document.querySelector<HTMLElement>(
        `[data-testid="${id}"]`,
    );
    if (!element) throw new Error(`no element with data-testid="${id}"`);
    return element;
};

const ids = testIds.carousel;

const ITEMS = Array.from({ length: 8 }, (_, index) => ({
    "aria-label": `Item ${index + 1}`,
    content: `Item ${index + 1}`,
}));

// The fake registry draws nothing: the row is 360 wide, with no gap or padding.
const ROW = { style: { width: "360px", height: "120px" } };

const render = (
    props: Record<string, unknown> = {},
    provider: { dir?: "ltr" | "rtl"; motion?: "reduce" | "full" } = {},
) =>
    mount(
        <PureformProvider registry={displayRegistry()} {...provider}>
            <Carousel
                aria-label="Trips"
                items={ITEMS}
                slotProps={{ itemGroup: ROW }}
                {...props}
            />
        </PureformProvider>,
    );

const frames = async (count = 3) => {
    for (let i = 0; i < count; i++)
        await new Promise((resolve) => requestAnimationFrame(resolve));
    await settle();
};

const all = (id: string) => [
    ...document.querySelectorAll<HTMLElement>(`[data-testid="${id}"]`),
];
const widths = (id: string) =>
    all(id).map((element) => element.getBoundingClientRect().width);

afterEach(() => {
    document.body.innerHTML = "";
});

describe("Carousel", () => {
    it("renders a region with a row of items, each a focusable mask around its content", async () => {
        render({ layout: "hero" });
        await frames();
        const root = byTestId(ids.root);
        expect(root.className).toBe("carousel carousel--layout-hero");
        expect(root.getAttribute("role")).toBe("region");
        expect(root.getAttribute("aria-roledescription")).toBe("carousel");
        expect(root.getAttribute("aria-label")).toBe("Trips");
        expect(byTestId(ids.itemGroup).className).toBe("carousel__itemGroup");
        const masks = all(ids.mask);
        expect(masks).toHaveLength(8);
        expect(masks[0]!.getAttribute("aria-label")).toBe("Item 1");
        // Every item is a tab stop, none hidden; the page's mask is current.
        expect(masks.every((mask) => mask.tabIndex === 0)).toBe(true);
        expect(
            masks.map((mask) => mask.hasAttribute("data-current")).slice(0, 2),
        ).toEqual([true, false]);
        expect(
            all(ids.item).some((item) => item.hasAttribute("aria-hidden")),
        ).toBe(false);
        expect(all(ids.item)[0]!.getAttribute("aria-roledescription")).toBe(
            "slide",
        );
        expect(all(ids.content)[0]!.textContent).toBe("Item 1");
    });

    it("sizes the masks on the keylines and keeps each slot and its content large", async () => {
        render();
        await frames();
        const keylines = carouselKeylines("multiBrowse", 360, 0);
        expect(widths(ids.mask).slice(0, keylines.length)).toEqual(keylines);
        expect(new Set(widths(ids.item))).toEqual(new Set([keylines[0]]));
        expect(new Set(widths(ids.content))).toEqual(new Set([keylines[0]]));
    });

    it("grows and shrinks the masks as the row scrolls", async () => {
        render();
        await frames();
        const before = widths(ids.mask);
        byTestId(ids.itemGroup).scrollLeft = 150;
        await frames();
        const after = widths(ids.mask);
        expect(after[0]).toBeLessThan(before[0]!);
        expect(after[1]).toBeGreaterThan(before[1]!);
    });

    it("doesn't mask uncontained items", async () => {
        render({ layout: "uncontained", itemWidth: 150 });
        await frames();
        expect(new Set(widths(ids.mask))).toEqual(new Set([150]));
    });

    it("moves focus with the arrow keys, by direction", async () => {
        for (const dir of ["ltr", "rtl"] as const) {
            render({}, { dir, motion: "reduce" });
            await frames();
            all(ids.mask)[0]!.focus();
            await userEvent.keyboard(
                dir === "ltr" ? "{ArrowRight}" : "{ArrowLeft}",
            );
            expect(document.activeElement).toBe(all(ids.mask)[1]);
            document.body.innerHTML = "";
        }
    });

    it("scrolls at once under reduced motion, and smoothly otherwise", async () => {
        for (const motion of ["reduce", "full"] as const) {
            const onPageChange =
                vi.fn<
                    NonNullable<ComponentProps<typeof Carousel>["onPageChange"]>
                >();
            render(
                { layout: "uncontained", itemWidth: 100, onPageChange },
                { motion },
            );
            await frames();
            all(ids.mask)[0]!.focus();
            await userEvent.keyboard("{End}");
            const scrolled = byTestId(ids.itemGroup).scrollLeft;
            // Eight 100px items in a 360px row end 440px in.
            if (motion === "reduce") {
                await frames(1);
                // oxlint-disable-next-line vitest/no-conditional-expect -- each motion's branch asserts its outcome
                expect(byTestId(ids.itemGroup).scrollLeft).toBe(440);
            } else {
                // oxlint-disable-next-line vitest/no-conditional-expect -- each motion's branch asserts its outcome
                expect(scrolled).toBeLessThan(440);
            }
            await frames(30);
            expect(onPageChange).toHaveBeenCalled();
            document.body.innerHTML = "";
        }
    });

    it("takes a function of each item in the per-item parts' keys", async () => {
        mount(
            <PureformProvider registry={displayRegistry()}>
                <Carousel
                    aria-label="Trips"
                    items={ITEMS.slice(0, 3)}
                    className={{
                        item: (item) => `at-${item.index}`,
                        itemGroup: "row",
                    }}
                    style={{
                        content: (item) => ({
                            opacity: item.index === 1 ? 0.5 : 1,
                        }),
                    }}
                    slotProps={{
                        itemGroup: ROW,
                        mask: (item) => ({ title: item.item["aria-label"] }),
                    }}
                    unstyled={{ item: (item) => item.index === 0 }}
                />
            </PureformProvider>,
        );
        await settle();
        const items = all(ids.item);
        expect(items[0]!.className).toBe("at-0");
        expect(items[2]!.classList.contains("at-2")).toBe(true);
        expect(items[2]!.classList.length).toBeGreaterThan(1);
        expect(byTestId(ids.itemGroup).classList.contains("row")).toBe(true);
        expect(all(ids.mask)[1]!.title).toBe("Item 2");
        expect(all(ids.content)[1]!.style.opacity).toBe("0.5");
    });
});
