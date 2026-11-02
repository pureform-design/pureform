import { useAnimatedSlide } from "@pureform/rn-adapter/animated";
import type { SlideMotion } from "@pureform/rn-adapter/animated";
import { LINEAR } from "@pureform/rn-adapter/factory";
import { Animated } from "react-native";
import { afterEach, describe, expect, it, vi } from "vitest";

import { mount, outside } from "./testing/render";

const Slide = ({ motion }: { motion: SlideMotion }) => {
    useAnimatedSlide(motion);
    return null;
};

afterEach(() => {
    vi.restoreAllMocks();
});

describe("useAnimatedSlide", () => {
    it("B6: stops a delayed spring on replacement and removal", async () => {
        const runs: { stop: ReturnType<typeof vi.fn<() => void>> }[] = [];
        vi.spyOn(Animated, "spring").mockImplementation(() => {
            const run = {
                start: vi.fn<Animated.CompositeAnimation["start"]>(),
                stop: vi.fn<() => void>(),
                reset: vi.fn<() => void>(),
            };
            runs.push(run);
            return run;
        });
        const initial: SlideMotion = {
            from: { translateX: 40, scaleX: 1 },
            duration: 300,
            delay: 120,
            easing: LINEAR,
            spring: { type: "spring", stiffness: 800, damping: 34, mass: 1 },
        };
        const motion = outside<SlideMotion | undefined>(initial);
        function Probe({ value }: { value: SlideMotion | undefined }) {
            useAnimatedSlide(value);
            return null;
        }
        await mount(
            <motion.Holder>{(value) => <Probe value={value} />}</motion.Holder>,
        );
        expect(runs).toHaveLength(1);
        await motion.set({ ...initial, from: { translateX: -40, scaleX: 1 } });
        expect(runs).toHaveLength(2);
        expect(runs[0]!.stop).toHaveBeenCalledTimes(1);
        await motion.set(undefined);
        expect(runs[1]!.stop).toHaveBeenCalledTimes(1);
    });

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
