// The tabs' active indicator moving between tabs (design doc §9.10), as Material's tabs move it:
// when the selected tab changes, the new tab's indicator slides in from where the old one is
// drawn, moving and resizing over the indicator's own motion tokens, and ends in its own place.
// Clicks, the keyboard, and a controlled `value` all slide; a quick change retargets from what's
// on screen; mounting, hydrating, and reduced motion don't slide; a resize or a new label keeps
// it aligned. A primary indicator spans its tab's content (at least 24px), as Material's does, so
// the slide resizes it between tabs whose labels differ; a secondary one spans the tab. The suites' browser asks for reduced motion, so these scenes set the provider's
// `motion` to `"full"` unless they test reducing it.

import { MATERIAL_DURATIONS } from "@pureform/material";
import { describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { harness } from "#binding";

import { tabsCase } from "./components/tabs";
import { hydrate } from "./harness/hydration";
import { mountCase, settlePlaced } from "./harness/page";
import type { SceneProps, SceneProvider } from "./harness/scene";

const FULL: SceneProvider = { motion: "full" };

interface Box {
    readonly left: number;
    readonly right: number;
    readonly width: number;
}

const boxOf = (element: Element): Box => {
    const { left, right, width } = element.getBoundingClientRect();
    return { left, right, width };
};

const tabOf = (host: HTMLElement, value: string) =>
    host.querySelector<HTMLElement>(
        `[data-pf-part="tab"][data-value="${value}"]`,
    )!;

const partOf = (host: HTMLElement, value: string, part: string) =>
    tabOf(host, value).querySelector<HTMLElement>(`[data-pf-part="${part}"]`)!;

const indicatorOf = (host: HTMLElement, value: string) =>
    partOf(host, value, "indicator");

/** Every animation on the tabs' indicators. */
const slides = (host: HTMLElement) =>
    [
        ...host.querySelectorAll<HTMLElement>('[data-pf-part="indicator"]'),
    ].flatMap((indicator) => indicator.getAnimations());

/** The one slide running on `indicator`, paused. */
const heldSlide = (indicator: HTMLElement): Animation => {
    const running = indicator
        .getAnimations()
        .filter((animation) => animation.playState !== "finished");
    expect(running).toHaveLength(1);
    running[0]!.pause();
    return running[0]!;
};

const mount = async (
    props: SceneProps = {},
    provider: SceneProvider = FULL,
    width = 600,
) => {
    const host = document.createElement("div");
    host.style.width = `${width}px`;
    document.body.append(host);
    const scene = mountCase(tabsCase, props, { host, provider });
    await settlePlaced();
    return { ...scene, host };
};

const isBetween = (value: number, a: number, b: number) =>
    value > Math.min(a, b) + 1 && value < Math.max(a, b) - 1;

/** Checks the indicator rests in its place in its tab: across the tab's content (its icon and
 *  label, at least 24px wide), centered in the tab, for primary tabs; across the tab for secondary
 *  ones. */
const expectAligned = (host: HTMLElement, value: string, variant: string) => {
    const indicator = boxOf(indicatorOf(host, value));
    const tab = boxOf(tabOf(host, value));
    if (variant === "secondary") {
        expect(indicator.left).toBeCloseTo(tab.left, 0);
        expect(indicator.width).toBeCloseTo(tab.width, 0);
        return;
    }
    const content = boxOf(partOf(host, value, "tab-content"));
    expect(indicator.left).toBeCloseTo(content.left, 0);
    expect(indicator.width).toBeCloseTo(content.width, 0);
    expect(indicator.width).toBeGreaterThanOrEqual(24);
    expect(indicator.width).toBeLessThan(tab.width);
    expect(indicator.left - tab.left).toBeCloseTo(
        tab.right - indicator.right,
        0,
    );
    // The parts the content holds sit over the indicator, the widest of them edge to edge.
    const parts = ["icon", "label"]
        .map((part) =>
            tabOf(host, value).querySelector(`[data-pf-part="${part}"]`),
        )
        .filter((part): part is HTMLElement => part !== null)
        .map(boxOf);
    for (const part of parts) {
        expect(part.left).toBeGreaterThanOrEqual(indicator.left - 0.5);
        expect(part.right).toBeLessThanOrEqual(indicator.right + 0.5);
    }
    // Stacked, the wider part spans it; inline, the parts and the gap between them do.
    const span =
        Math.max(...parts.map((part) => part.right)) -
        Math.min(...parts.map((part) => part.left));
    if (span >= 24) expect(indicator.width).toBeCloseTo(span, 0);
};

describe.each(["primary", "secondary"])("%s tabs", (variant) => {
    it.each(["ltr", "rtl"] as const)(
        "slide the indicator from the old tab to the new one (%s)",
        async (dir) => {
            const { host } = await mount(
                { variant, defaultValue: "flights" },
                { ...FULL, dir },
            );
            expect(slides(host)).toEqual([]);
            const from = boxOf(indicatorOf(host, "flights"));
            const to = boxOf(indicatorOf(host, "cars"));
            await userEvent.click(tabOf(host, "cars"));
            await harness.settle();
            const indicator = indicatorOf(host, "cars");
            const slide = heldSlide(indicator);
            // Material's medium1, on the emphasized curve, from the tabs' tokens.
            const timing = slide.effect!.getComputedTiming();
            expect(timing.duration).toBe(MATERIAL_DURATIONS.medium1);
            expect(timing.easing).toBe("cubic-bezier(0.2, 0, 0, 1)");

            slide.currentTime = 0;
            const start = boxOf(indicator);
            expect(start.left).toBeCloseTo(from.left, 0);
            expect(start.width).toBeCloseTo(from.width, 0);

            slide.currentTime = MATERIAL_DURATIONS.medium1 / 2;
            const middle = boxOf(indicator);
            expect(isBetween(middle.left, from.left, to.left)).toBe(true);
            expect(isBetween(middle.right, from.right, to.right)).toBe(true);
            if (variant === "primary") {
                // Flights is wider than Cars: the slide resizes the indicator on the way.
                expect(from.width).toBeGreaterThan(to.width + 4);
                expect(isBetween(middle.width, from.width, to.width)).toBe(
                    true,
                );
            }

            slide.finish();
            expectAligned(host, "cars", variant);
            expect(boxOf(indicator)).toEqual(to);
            // The old indicator just goes.
            expect(getComputedStyle(indicatorOf(host, "flights")).opacity).toBe(
                "0",
            );
        },
    );

    it("rest aligned with their tab when the tabs resize or a label changes", async () => {
        const { host, update } = await mount({
            variant,
            defaultValue: "flights",
        });
        await userEvent.click(tabOf(host, "hotels"));
        await harness.settle();
        const slide = heldSlide(indicatorOf(host, "hotels"));
        slide.currentTime = MATERIAL_DURATIONS.medium1 / 2;
        // Resized mid-slide, it still ends in its place.
        host.style.width = "420px";
        slide.play();
        await slide.finished;
        expectAligned(host, "hotels", variant);
        host.style.width = "900px";
        expectAligned(host, "hotels", variant);
        const items = tabsCase.props!.items as readonly { value: string }[];
        await update({
            items: items.map((item) =>
                item.value === "hotels"
                    ? { ...item, label: "Hotels and apartments" }
                    : item,
            ),
        });
        expectAligned(host, "hotels", variant);
        expect(slides(host)).toEqual([]);
    });
});

const ITEMS = tabsCase.props!.items as readonly {
    value: string;
    label: string;
}[];

describe("a primary indicator", () => {
    it.each([
        ["text", ITEMS, {}, 48],
        [
            "an icon",
            ITEMS.map(({ value }) => ({
                value,
                icon: "★",
                "aria-label": value,
            })),
            {},
            64,
        ],
        [
            "an icon over text",
            ITEMS.map((item) => ({ ...item, icon: "★" })),
            {},
            64,
        ],
        [
            "an icon beside text",
            ITEMS.map((item) => ({ ...item, icon: "★" })),
            { inlineIcon: true },
            48,
        ],
    ] as const)(
        "spans its tab's content, of %s, centered in the tab",
        async (_, items, props, height) => {
            const { host } = await mount(
                { ...props, items },
                { motion: "reduce" },
            );
            for (const { value } of ITEMS) {
                await userEvent.click(tabOf(host, value));
                await harness.settle();
                expect(slides(host)).toEqual([]);
                expectAligned(host, value, "primary");
            }
            expect(tabOf(host, "flights").getBoundingClientRect().height).toBe(
                height,
            );
            if (!("label" in items[0]!)) {
                // Only the icon, 24px: the indicator's least width.
                expect(boxOf(indicatorOf(host, "flights")).width).toBeCloseTo(
                    24,
                    0,
                );
                expect(tabOf(host, "flights").getAttribute("aria-label")).toBe(
                    "flights",
                );
            }
        },
    );

    it("is 3px with rounded top corners; a secondary one 2px and square", async () => {
        const { host } = await mount({}, { motion: "reduce" });
        const primary = getComputedStyle(indicatorOf(host, "flights"));
        expect(primary.height).toBe("3px");
        expect(primary.borderTopLeftRadius).toBe("3px");
        expect(primary.borderTopRightRadius).toBe("3px");
        expect(primary.borderBottomLeftRadius).toBe("0px");
        const other = await mount(
            { variant: "secondary" },
            { motion: "reduce" },
        );
        const secondary = getComputedStyle(indicatorOf(other.host, "flights"));
        expect(secondary.height).toBe("2px");
        expect(secondary.borderTopLeftRadius).toBe("0px");
    });
});

describe("the indicator", () => {
    it("starts sliding before the change is first drawn", async () => {
        const { host } = await mount({ defaultValue: "flights" });
        tabOf(host, "cars").click();
        const [selected, sliding] = await new Promise<[string | null, number]>(
            (resolve) =>
                requestAnimationFrame(() =>
                    resolve([
                        tabOf(host, "cars").getAttribute("aria-selected"),
                        indicatorOf(host, "cars").getAnimations().length,
                    ]),
                ),
        );
        expect(selected).toBe("true");
        expect(sliding).toBe(1);
    });

    it("slides with the keyboard", async () => {
        const { host } = await mount({ defaultValue: "flights" });
        tabOf(host, "flights").focus();
        await userEvent.keyboard("{ArrowRight}");
        await harness.settle();
        expect(tabOf(host, "hotels").getAttribute("aria-selected")).toBe(
            "true",
        );
        const slide = heldSlide(indicatorOf(host, "hotels"));
        slide.currentTime = 0;
        expect(boxOf(indicatorOf(host, "hotels")).left).toBeCloseTo(
            boxOf(indicatorOf(host, "flights")).left,
            0,
        );
    });

    it("slides when a controlled value changes", async () => {
        const { host, update } = await mount({ value: "cars" });
        expect(slides(host)).toEqual([]);
        const from = boxOf(indicatorOf(host, "cars"));
        await update({ value: "flights" });
        const slide = heldSlide(indicatorOf(host, "flights"));
        slide.currentTime = 0;
        expect(boxOf(indicatorOf(host, "flights")).left).toBeCloseTo(
            from.left,
            0,
        );
    });

    it("retargets from where it has got to when the selection changes mid-slide", async () => {
        const { host } = await mount({ defaultValue: "flights" });
        await userEvent.click(tabOf(host, "cars"));
        await harness.settle();
        const first = heldSlide(indicatorOf(host, "cars"));
        first.currentTime = MATERIAL_DURATIONS.medium1 / 2;
        const midway = boxOf(indicatorOf(host, "cars"));
        await userEvent.click(tabOf(host, "hotels"));
        await harness.settle();
        expect(first.playState).toBe("idle");
        const second = heldSlide(indicatorOf(host, "hotels"));
        second.currentTime = 0;
        const start = boxOf(indicatorOf(host, "hotels"));
        expect(start.left).toBeCloseTo(midway.left, 0);
        expect(start.width).toBeCloseTo(midway.width, 0);
        second.finish();
        expectAligned(host, "hotels", "primary");
        expect(
            slides(host).filter(
                (animation) => animation.playState === "running",
            ),
        ).toEqual([]);
    });

    it.each([
        ["the provider reduces motion", { motion: "reduce" }],
        ["the system reduces motion", { motion: "system" }],
    ] as const)("changes at once when %s", async (_, provider) => {
        const { host } = await mount({ defaultValue: "flights" }, provider);
        await userEvent.click(tabOf(host, "cars"));
        await harness.settle();
        expect(slides(host)).toEqual([]);
        expectAligned(host, "cars", "primary");
    });

    it("doesn't slide while hydrating, and slides once hydrated", async () => {
        const { host, logged, changes } = await hydrate({
            component: "Tabs",
            props: { ...tabsCase.props, defaultValue: "hotels" },
            provider: FULL,
        });
        expect(logged).toEqual([]);
        expect(changes).toEqual([]);
        expect(slides(host)).toEqual([]);
        await userEvent.click(tabOf(host, "flights"));
        await harness.settle();
        expect(slides(host)).toHaveLength(1);
    });
});
