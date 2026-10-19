// The tabs' active indicator moving between tabs (design doc §9.10), as Material's tabs move it:
// when the selected tab changes, the new tab's indicator slides in from where the old one is
// drawn, moving and resizing over the indicator's own motion tokens, and ends in its own place.
// Clicks, the keyboard, and a controlled `value` all slide; a quick change retargets from what's
// on screen; mounting, hydrating, and reduced motion don't slide; a resize or a new label keeps
// it aligned. The suites' browser asks for reduced motion, so these scenes set the provider's
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

/** Checks the indicator rests in its place in its tab: under its label, inset by the tab's
 *  padding, for primary tabs; across the tab for secondary ones. */
const expectAligned = (host: HTMLElement, value: string, variant: string) => {
    const indicator = boxOf(indicatorOf(host, value));
    const tab = boxOf(tabOf(host, value));
    if (variant === "secondary") {
        expect(indicator.left).toBeCloseTo(tab.left, 0);
        expect(indicator.width).toBeCloseTo(tab.width, 0);
        return;
    }
    const label = boxOf(partOf(host, value, "label"));
    expect(indicator.left + indicator.width / 2).toBeCloseTo(
        label.left + label.width / 2,
        0,
    );
    expect(indicator.left).toBeLessThanOrEqual(label.left);
    expect(indicator.right).toBeGreaterThanOrEqual(label.right);
    expect(indicator.left - tab.left).toBeCloseTo(
        tab.right - indicator.right,
        0,
    );
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
