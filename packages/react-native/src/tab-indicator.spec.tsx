import { sampleSpring } from "@pureform/core";
import { MATERIAL_SPRINGS } from "@pureform/material";
import { act } from "@testing-library/react";
import type { ReactNode } from "react";
import { View } from "react-native";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { PureformProvider } from ".";
import { animated } from "./engine";
import type { MotionEngine } from "./engine";
import { reanimated } from "./engines/reanimated";
import { Tabs } from "./tabs";
import { presetRegistry } from "./testing/registry";
import type { TestRegistry } from "./testing/registry";
import { interact, mount, outside, settle, until } from "./testing/render";

let registry: TestRegistry;

beforeAll(async () => {
    registry = await presetRegistry(["tabs", "ripple"]);
});

// The indicator slides on the spatialDefault spring (its sampled settle time, about 317ms) times
// this, long enough to look at it partway.
const SLOW = 8;
const SLIDE =
    sampleSpring(MATERIAL_SPRINGS.standard.spatialDefault).duration * SLOW;

const ITEMS = [
    { value: "flights", label: "Flights" },
    { value: "hotels", label: "Hotels" },
    { value: "cars", label: "Cars" },
];

const render = (
    node: ReactNode,
    engine: MotionEngine,
    motion: "full" | "reduce" = "full",
    width = 360,
) =>
    mount(
        <PureformProvider
            registry={registry}
            engine={engine}
            motion={motion}
            timeScale={SLOW}
        >
            <View style={{ width }}>{node}</View>
        </PureformProvider>,
    );

const tabs = () => [...document.querySelectorAll<HTMLElement>('[role="tab"]')];

const tabOf = (index: number) => tabs()[index]!;

const partOf = (index: number, part: string) =>
    tabOf(index).querySelector<HTMLElement>(`[data-testid="pf-tabs-${part}"]`);

const indicatorOf = (index: number) => partOf(index, "indicator")!;

interface Box {
    readonly left: number;
    readonly right: number;
    readonly width: number;
}

const boxOf = (element: Element): Box => {
    const { left, right, width } = element.getBoundingClientRect();
    return { left, right, width };
};

const isBetween = (value: number, a: number, b: number) =>
    value > Math.min(a, b) + 1 && value < Math.max(a, b) - 1;

const recording = new Set<() => void>();

afterEach(() => {
    for (const stop of recording) stop();
});

/** Clicks the tab at `index` from the page. A click command wraps the whole round trip in
 *  `act`, which holds React's renders, so Animated's slide shows only once the command comes
 *  back: on a loaded machine, after the slide has ended. */
const select = (index: number) =>
    act(async () => {
        tabOf(index).click();
    });

/** Records the box of the indicator of the tab at `index` at every frame, from now until
 *  `stop()`: the slide as it runs, however long the user event that started it takes to come
 *  back. */
const recordSlide = (index: number) => {
    const boxes: Box[] = [];
    let id = 0;
    const sample = () => {
        boxes.push(boxOf(indicatorOf(index)));
        id = requestAnimationFrame(sample);
    };
    const stop = () => {
        cancelAnimationFrame(id);
        recording.delete(stop);
    };
    recording.add(stop);
    sample();
    return {
        stop,
        /** The frame nearest halfway from `from` to `to`. */
        halfway: (from: Box, to: Box): Box => {
            const middle = (from.left + to.left) / 2;
            return [...boxes].sort(
                (a, b) => Math.abs(a.left - middle) - Math.abs(b.left - middle),
            )[0]!;
        },
    };
};

/** The indicator of the tab at `index` rests in its place: across its tab's content (at least
 *  24px), centered in the tab (primary), or across the tab (secondary). */
const expectAligned = (index: number, variant = "primary") => {
    const indicator = boxOf(indicatorOf(index));
    const tab = boxOf(tabOf(index));
    if (variant === "secondary") {
        expect(indicator.left).toBeCloseTo(tab.left, 0);
        expect(indicator.width).toBeCloseTo(tab.width, 0);
        return;
    }
    const content = boxOf(partOf(index, "tab-content")!);
    expect(indicator.left).toBeCloseTo(content.left, 0);
    expect(indicator.width).toBeCloseTo(content.width, 0);
    expect(indicator.width).toBeGreaterThanOrEqual(24);
    expect(indicator.width).toBeLessThan(tab.width);
    expect(indicator.left - tab.left).toBeCloseTo(
        tab.right - indicator.right,
        0,
    );
    for (const part of ["icon", "label"]) {
        const element = partOf(index, part);
        if (!element) continue;
        const box = boxOf(element);
        expect(box.left).toBeGreaterThanOrEqual(indicator.left - 0.5);
        expect(box.right).toBeLessThanOrEqual(indicator.right + 0.5);
    }
};

describe.each([animated, reanimated])("with $name", (engine) => {
    it.each(["primary", "secondary"])(
        "slides the %s indicator from the old tab to the new one, and rests in its place",
        async (variant) => {
            await render(
                <Tabs items={ITEMS} variant={variant as never} />,
                engine,
            );
            await settle(50);
            // In place from the start, nothing moving.
            expectAligned(0, variant);
            const from = boxOf(indicatorOf(0));
            const to = boxOf(indicatorOf(2));
            const slide = recordSlide(2);
            await select(2);
            await until(() => expect(boxOf(indicatorOf(2))).toEqual(to));
            slide.stop();
            const middle = slide.halfway(from, to);
            expect(isBetween(middle.left, from.left, to.left)).toBe(true);
            expect(isBetween(middle.right, from.right, to.right)).toBe(true);
            if (variant === "primary") {
                // Flights is wider than Cars: the slide resizes it on the way.
                expect(from.width).toBeGreaterThan(to.width + 4);
                expect(isBetween(middle.width, from.width, to.width)).toBe(
                    true,
                );
            }
            expectAligned(2, variant);
        },
    );

    it.each([
        ["text", ITEMS],
        [
            "an icon",
            ITEMS.map(({ value }) => ({
                value,
                icon: "★",
                "aria-label": value,
            })),
        ],
        ["an icon and text", ITEMS.map((item) => ({ ...item, icon: "★" }))],
    ])(
        "sizes a primary indicator to its tab's content, of %s",
        async (_, items) => {
            // Reduced motion, so each change is in place at once.
            await render(<Tabs items={items} />, engine, "reduce");
            await settle(50);
            for (const index of [0, 1, 2]) {
                await interact(() => userEvent.click(tabOf(index)));
                await settle(50);
                expectAligned(index);
            }
            if (!("label" in items[0]!)) {
                expect(partOf(0, "label")).toBeNull();
                expect(boxOf(indicatorOf(0)).width).toBeCloseTo(24, 0);
                expect(tabOf(0).getAttribute("aria-label")).toBe("flights");
            }
        },
    );

    it("slides when a controlled value changes, and when a key presses a tab", async () => {
        const value = outside("flights");
        await render(
            <value.Holder>
                {(current) => <Tabs items={ITEMS} value={current} />}
            </value.Holder>,
            engine,
        );
        await settle(50);
        const from = boxOf(indicatorOf(0));
        const to = boxOf(indicatorOf(1));
        await value.set("hotels");
        await settle(SLIDE / 4);
        expect(isBetween(boxOf(indicatorOf(1)).left, from.left, to.left)).toBe(
            true,
        );
        await settle(SLIDE);
        expect(boxOf(indicatorOf(1))).toEqual(to);
    });

    it("slides when a key presses a tab", async () => {
        await render(<Tabs items={ITEMS} />, engine);
        await settle(50);
        const from = boxOf(indicatorOf(0));
        const to = boxOf(indicatorOf(1));
        tabOf(1).focus();
        const slide = recordSlide(1);
        await interact(() => userEvent.keyboard("{Enter}"));
        expect(tabOf(1).getAttribute("aria-selected")).toBe("true");
        await until(() => expect(boxOf(indicatorOf(1))).toEqual(to));
        slide.stop();
        expect(
            isBetween(slide.halfway(from, to).left, from.left, to.left),
        ).toBe(true);
    });

    it("retargets from where it has got to when the selection changes mid-slide", async () => {
        await render(<Tabs items={ITEMS} />, engine);
        await settle(50);
        const from = boxOf(indicatorOf(0));
        const to = boxOf(indicatorOf(2));
        const rest = boxOf(indicatorOf(1));
        // Selected from the page, so the second comes mid-slide.
        await select(2);
        expect(tabOf(2).getAttribute("aria-selected")).toBe("true");
        // Three quarters of the way, and not there yet: well past the tab it turns back to, and
        // where the slide has slowed, since under load what it draws can trail where it has got
        // to by some frames.
        await until(() => {
            const left = boxOf(indicatorOf(2)).left;
            expect(isBetween(left, from.left, to.left)).toBe(true);
            expect(Math.abs(left - from.left)).toBeGreaterThan(
                (Math.abs(to.left - from.left) * 3) / 4,
            );
        });
        // Where the slide has got to as the click arrives, and where the next one starts.
        let gotTo!: Box;
        tabOf(1).addEventListener(
            "click",
            () => {
                gotTo = boxOf(indicatorOf(2));
            },
            { capture: true, once: true },
        );
        act(() => tabOf(1).click());
        const restarted = boxOf(indicatorOf(1));
        expect(tabOf(1).getAttribute("aria-selected")).toBe("true");
        // It starts near where the last slide had got to, not at its own place.
        expect(Math.abs(restarted.left - gotTo.left)).toBeLessThan(
            Math.abs(rest.left - gotTo.left) / 2,
        );
        await until(() => expect(boxOf(indicatorOf(1))).toEqual(rest));
    });

    it("changes at once under reduced motion", async () => {
        await render(<Tabs items={ITEMS} />, engine, "reduce");
        await settle(50);
        const to = boxOf(indicatorOf(2));
        await interact(() => userEvent.click(tabOf(2)));
        await settle(50);
        expect(boxOf(indicatorOf(2))).toEqual(to);
    });

    it("stays aligned when the tabs resize", async () => {
        const width = outside(360);
        await mount(
            <PureformProvider
                registry={registry}
                engine={engine}
                motion="full"
                timeScale={SLOW}
            >
                <width.Holder>
                    {(current) => (
                        <View style={{ width: current }}>
                            <Tabs items={ITEMS} />
                        </View>
                    )}
                </width.Holder>
            </PureformProvider>,
        );
        await settle(50);
        await interact(() => userEvent.click(tabOf(1)));
        await settle(SLIDE / 4);
        await width.set(300);
        await settle(SLIDE);
        expectAligned(1);
        await width.set(400);
        await settle(50);
        expectAligned(1);
        // A slide after the resize starts from the old indicator's new place.
        const from = boxOf(indicatorOf(1));
        const to = boxOf(indicatorOf(0));
        const slide = recordSlide(0);
        await select(0);
        await until(() => expect(boxOf(indicatorOf(0))).toEqual(to));
        slide.stop();
        expect(
            isBetween(slide.halfway(from, to).left, from.left, to.left),
        ).toBe(true);
    });
});
