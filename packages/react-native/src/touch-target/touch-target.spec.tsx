import type { ComponentProps } from "react";
import { Pressable, View } from "react-native";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { TouchTarget, touchTargetSlopOf, useTouchTargetSlop } from ".";
import { PureformProvider } from "..";
import { Checkbox } from "../checkbox";
import { Chip } from "../chip";
import { animated } from "../engine";
import { IconButton } from "../icon-button";
import { RadioGroup } from "../radio-group";
import { Switch } from "../switch";
import { presetRegistry } from "../testing/registry";
import type { TestRegistry } from "../testing/registry";
import { byTestId, interact, mount } from "../testing/render";

let registry: TestRegistry;

beforeAll(async () => {
    registry = await presetRegistry([
        "touchTarget",
        "checkbox",
        "radio",
        "switchControl",
        "iconButton",
        "chip",
        "ripple",
    ]);
});

describe("TouchTarget", () => {
    it("grows an 18px pressable's area to 48px, centred on it, and a press on it presses", async () => {
        const onPress =
            vi.fn<NonNullable<ComponentProps<typeof Pressable>["onPress"]>>();
        let slop: object | undefined;
        function Slop() {
            // oxlint-disable-next-line react/globals -- the test harness captures what it drives from outside the component
            slop = useTouchTargetSlop(18, 24);
            return null;
        }
        await mount(
            <PureformProvider registry={registry} engine={animated}>
                <View style={{ padding: 40 }}>
                    <Pressable
                        onPress={onPress}
                        style={{ width: 18, height: 18 }}
                        testID="dot"
                    >
                        <TouchTarget />
                    </Pressable>
                    <Slop />
                </View>
            </PureformProvider>,
        );
        const target = byTestId("pf-touch-target-root");
        const box = target.getBoundingClientRect();
        const dot = byTestId("dot").getBoundingClientRect();
        expect([box.width, box.height]).toEqual([48, 48]);
        expect(box.left + box.width / 2).toBeCloseTo(dot.left + 9, 0);
        expect(box.top + box.height / 2).toBeCloseTo(dot.top + 9, 0);
        expect(target.parentElement!.getAttribute("aria-hidden")).toBe("true");
        // Outside the dot, inside the target.
        await interact(() =>
            userEvent.click(target, { position: { x: 2, y: 2 } }),
        );
        expect(onPress).toHaveBeenCalledTimes(1);
        expect(slop).toEqual({ top: 12, bottom: 12, left: 15, right: 15 });
    });
});

// The `hitSlop` the pressable around a DOM element was given (React Native Web keeps it off the
// element): the nearest fiber up from it with one.
const hitSlopOf = (element: Element): unknown => {
    const key = Object.keys(element).find((name) =>
        name.startsWith("__reactFiber$"),
    )!;
    type Fiber = { memoizedProps?: { hitSlop?: unknown }; return?: Fiber };
    for (
        let fiber = (element as unknown as Record<string, Fiber>)[key];
        fiber;
        fiber = fiber.return
    ) {
        if (fiber.memoizedProps?.hitSlop !== undefined)
            return fiber.memoizedProps.hitSlop;
    }
    return undefined;
};

describe("the small pressables' hit slop", () => {
    it("grows each to its touch target, the side a label sets left alone", async () => {
        await mount(
            <PureformProvider registry={registry} engine={animated}>
                <View
                    style={{ padding: 40, gap: 40, alignItems: "flex-start" }}
                >
                    <Checkbox aria-label="Check" />
                    <RadioGroup
                        aria-label="Pick"
                        items={[{ value: "a", label: "A" }]}
                    />
                    <Switch aria-label="Switch" />
                    <IconButton aria-label="More" icon="⋮" />
                    <Chip label="Chip" />
                </View>
            </PureformProvider>,
        );
        const cases = [
            "pf-checkbox-root",
            "pf-radio-root",
            "pf-switch-control-root",
            "pf-icon-button-root",
            "pf-chip-root",
        ];
        for (const id of cases) {
            const root = byTestId(id);
            const box = root.getBoundingClientRect();
            const slop = hitSlopOf(root) as Record<string, number>;
            expect(slop, id).toBeDefined();
            // Grown to 48 each way where it's smaller (a chip's width aside).
            if (box.height < 47.5)
                // oxlint-disable-next-line vitest/no-conditional-expect -- only a part smaller than 48 grows
                expect(box.height + slop.top! + slop.bottom!, id).toBeCloseTo(
                    48,
                    0,
                );
            if (box.width < 47.5 && id !== "pf-chip-root")
                // oxlint-disable-next-line vitest/no-conditional-expect -- only a part smaller than 48 grows
                expect(box.width + slop.left! + slop.right!, id).toBeCloseTo(
                    48,
                    0,
                );
        }
        // A chip's width comes from its label: no slop sideways.
        expect(hitSlopOf(byTestId("pf-chip-root"))).toMatchObject({
            left: 0,
            right: 0,
        });
    });

    it("reads the root's size and the target's minimum", () => {
        expect(
            touchTargetSlopOf(
                { width: 40, height: 40 },
                { minWidth: 48, minHeight: 48 },
            ),
        ).toEqual({ top: 4, bottom: 4, left: 4, right: 4 });
        expect(touchTargetSlopOf({ height: 32 }, {})).toEqual({
            top: 8,
            bottom: 8,
            left: 0,
            right: 0,
        });
        expect(touchTargetSlopOf({ minHeight: 56, width: 56 })).toEqual({
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
        });
    });
});
