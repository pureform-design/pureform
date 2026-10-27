import { useAnimatedSlide } from "@pureform/rn-adapter/animated";
import type { SlideMotion } from "@pureform/rn-adapter/animated";
import { LINEAR } from "@pureform/rn-adapter/factory";
import { Animated } from "react-native";
import { afterEach, describe, expect, it, vi } from "vitest";

import { mount } from "./testing/render";

const Slide = ({ motion }: { motion: SlideMotion }) => {
    useAnimatedSlide(motion);
    return null;
};

afterEach(() => {
    vi.restoreAllMocks();
});

describe("useAnimatedSlide", () => {
    it("waits out a spring slide's delay inside Animated.spring", async () => {
        const spring = vi.spyOn(Animated, "spring");
        await mount(
            <Slide
                motion={{
                    from: { translateX: 40, scaleX: 0.5 },
                    duration: 300,
                    delay: 120,
                    easing: LINEAR,
                    spring: {
                        type: "spring",
                        stiffness: 800,
                        damping: 34,
                        mass: 1,
                    },
                    velocity: 2,
                }}
            />,
        );
        expect(spring).toHaveBeenCalledTimes(1);
        expect(spring.mock.calls[0]?.[1]).toMatchObject({
            toValue: 1,
            delay: 120,
            velocity: 2,
            restDisplacementThreshold: 0.001,
        });
    });
});
