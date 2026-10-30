import { Animated } from "react-native";
import { afterEach, describe, expect, it, vi } from "vitest";

import { timelineLoop } from "./timeline";

vi.mock("react-native", async (original) => {
    const actual = await original<typeof import("react-native")>();
    return { ...actual, Platform: { ...actual.Platform, OS: "ios" } };
});

afterEach(() => vi.restoreAllMocks());

describe("device timeline driver", () => {
    it("lowers transform clocks to the native driver with no interaction handle", () => {
        const leg = {
            start: vi.fn<() => void>(),
            stop: vi.fn<() => void>(),
            reset: vi.fn<() => void>(),
        };
        const timing = vi.spyOn(Animated, "timing").mockReturnValue(leg);
        const loop = vi.spyOn(Animated, "loop").mockReturnValue(leg);
        const value = new Animated.Value(0);
        timelineLoop(value, {
            duration: 1000,
            easing: { type: "easing", kind: "keyword", name: "linear" },
        });
        expect(timing).toHaveBeenCalledExactlyOnceWith(value, {
            toValue: 1,
            duration: 1000,
            easing: expect.any(Function),
            useNativeDriver: true,
            isInteraction: false,
        });
        expect(loop).toHaveBeenCalledExactlyOnceWith(leg);
    });
});
