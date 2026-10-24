import { Pressable, View } from "react-native";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { TouchTarget, useTouchTargetSlop } from ".";
import { PureformProvider } from "..";
import { animated } from "../engine";
import { presetRegistry } from "../testing/registry";
import type { TestRegistry } from "../testing/registry";
import { byTestId, interact, mount } from "../testing/render";

let registry: TestRegistry;

beforeAll(async () => {
    registry = await presetRegistry(["touchTarget"]);
});

describe("TouchTarget", () => {
    it("grows an 18px pressable's area to 48px, centred on it, and a press on it presses", async () => {
        const onPress = vi.fn();
        let slop: object | undefined;
        function Slop() {
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
