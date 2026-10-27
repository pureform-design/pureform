import { Animated } from "react-native";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { runKeyframes } from "./keyframes";

vi.mock("react-native", async (original) => {
    const actual = await original<typeof import("react-native")>();
    // RN Web substitutes no-op sequences/loops under NODE_ENV=test. Exercise its real driver.
    const { default: implementation } =
        // @ts-expect-error RN Web's internal implementation has no public declaration.
        await import("react-native-web/dist/vendor/react-native/Animated/AnimatedImplementation");
    return { ...actual, Animated: { ...actual.Animated, ...implementation } };
});

describe("finite keyframe iterations", () => {
    const legs: number[] = [];
    beforeEach(() => {
        vi.useFakeTimers();
        legs.length = 0;
        // Exercise the real sequence/loop orchestration with a deterministic timing driver.
        vi.spyOn(Animated, "timing").mockImplementation((value, config) => {
            let timer: ReturnType<typeof setTimeout> | undefined;
            let complete: Parameters<Animated.CompositeAnimation["start"]>[0];
            return {
                start(callback) {
                    complete = callback;
                    if (config.duration) legs.push(config.toValue as number);
                    timer = setTimeout(
                        () => {
                            (value as Animated.Value).setValue(
                                config.toValue as number,
                            );
                            callback?.({ finished: true });
                        },
                        (config.duration ?? 0) + (config.delay ?? 0),
                    );
                },
                stop() {
                    clearTimeout(timer);
                    complete?.({ finished: false });
                },
                reset() {},
            };
        });
        vi.spyOn(Animated, "delay").mockImplementation((delay) =>
            Animated.timing(new Animated.Value(0), {
                toValue: 0,
                duration: 0,
                delay,
                useNativeDriver: false,
            }),
        );
    });
    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it.each([
        ["alternate", 0, []],
        ["normal", 3, [1, 1, 1]],
        ["reverse", 3, [0, 0, 0]],
        ["alternate", 1, [1]],
        ["alternate", 2, [1, 0]],
        ["alternate", 3, [1, 0, 1]],
        ["alternateReverse", 3, [0, 1, 0]],
    ] as const)(
        "runs %s for exactly %s legs",
        (direction, iterations, expected) => {
            const progress = new Animated.Value(0);
            const complete = vi.fn<(result: { finished: boolean }) => void>();
            runKeyframes(progress, {
                direction,
                iterations,
                duration: 100,
                delay: 0,
            }).start(complete);
            vi.runAllTimers();
            expect(legs).toEqual(expected);
            expect(complete).toHaveBeenCalledExactlyOnceWith({
                finished: true,
            });
        },
    );

    it("does not start another leg after cancellation", () => {
        const running = runKeyframes(new Animated.Value(0), {
            direction: "alternate",
            iterations: 3,
            duration: 100,
            delay: 0,
        });
        const complete = vi.fn<(result: { finished: boolean }) => void>();
        running.start(complete);
        vi.advanceTimersByTime(50);
        running.stop();
        vi.runAllTimers();
        expect(legs).toEqual([1]);
        expect(complete).toHaveBeenCalledExactlyOnceWith({ finished: false });
    });

    it("waits once before a reversed animation and initializes at its far endpoint", () => {
        const progress = new Animated.Value(0);
        const values: number[] = [];
        progress.addListener(({ value }) => values.push(value));
        runKeyframes(progress, {
            direction: "alternateReverse",
            iterations: 1,
            duration: 100,
            delay: 20,
        }).start();
        vi.advanceTimersByTime(19);
        expect(legs).toEqual([]);
        vi.runAllTimers();
        expect(legs).toEqual([0]);
        expect(values).toEqual([1, 0]);
    });
});
