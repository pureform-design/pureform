import type { ReactNode } from "react";
import { View } from "react-native";
import { beforeAll, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { PureformProvider } from ".";
import { animated } from "./engine";
import type { MotionEngine } from "./engine";
import { reanimated } from "./engines/reanimated";
import { Tabs } from "./tabs";
import { presetRegistry } from "./testing/registry";
import type { TestRegistry } from "./testing/registry";
import { interact, mount, outside, settle } from "./testing/render";

let registry: TestRegistry;

beforeAll(async () => {
    registry = await presetRegistry(["tabs", "ripple"]);
});

// The indicator slides over medium1 (250ms) times this, long enough to look at it partway.
const SLOW = 8;
const SLIDE = 250 * SLOW;

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

const indicatorOf = (index: number) =>
    tabOf(index).querySelector<HTMLElement>(
        '[data-testid="pf-tabs-indicator"]',
    )!;

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

/** The indicator of the tab at `index` rests in its place: centered in its tab, inset alike on
 *  both sides (primary) or across it (secondary). */
const expectAligned = (index: number, variant = "primary") => {
    const indicator = boxOf(indicatorOf(index));
    const tab = boxOf(tabOf(index));
    if (variant === "secondary") {
        expect(indicator.left).toBeCloseTo(tab.left, 0);
        expect(indicator.width).toBeCloseTo(tab.width, 0);
        return;
    }
    expect(indicator.width).toBeLessThan(tab.width);
    expect(indicator.left - tab.left).toBeCloseTo(
        tab.right - indicator.right,
        0,
    );
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
            await interact(() => userEvent.click(tabOf(2)));
            await settle(SLIDE / 4);
            const middle = boxOf(indicatorOf(2));
            expect(isBetween(middle.left, from.left, to.left)).toBe(true);
            expect(isBetween(middle.right, from.right, to.right)).toBe(true);
            await settle(SLIDE);
            expect(boxOf(indicatorOf(2))).toEqual(to);
            expectAligned(2, variant);
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
        await interact(() => userEvent.keyboard("{Enter}"));
        expect(tabOf(1).getAttribute("aria-selected")).toBe("true");
        await settle(SLIDE / 4);
        expect(isBetween(boxOf(indicatorOf(1)).left, from.left, to.left)).toBe(
            true,
        );
    });

    it("retargets from where it has got to when the selection changes mid-slide", async () => {
        await render(<Tabs items={ITEMS} />, engine);
        await settle(50);
        const rest = boxOf(indicatorOf(1));
        await interact(() => userEvent.click(tabOf(2)));
        await settle(SLIDE / 3);
        const midway = boxOf(indicatorOf(2));
        await interact(() => userEvent.click(tabOf(1)));
        const restarted = boxOf(indicatorOf(1));
        // It starts near where the last slide had got to, not at its own place.
        expect(Math.abs(restarted.left - midway.left)).toBeLessThan(
            Math.abs(rest.left - midway.left) / 2,
        );
        await settle(SLIDE + 100);
        expect(boxOf(indicatorOf(1))).toEqual(rest);
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
        await interact(() => userEvent.click(tabOf(0)));
        await settle(SLIDE / 4);
        expect(isBetween(boxOf(indicatorOf(0)).left, from.left, to.left)).toBe(
            true,
        );
    });
});
