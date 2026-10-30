import { cleanup } from "@testing-library/react";
import { Animated, Platform } from "react-native";
import { describe, expect, it, vi } from "vitest";

import { animated } from "./engine";
import { reanimated } from "./engines/reanimated";
import { byTestId, mount, outside, settle } from "./testing/render";

describe.each([animated, reanimated])(
    "shared motion timeline with $name",
    (engine) => {
        it("shares driver values without React frames, retains phase through geometry changes, and cleans up", async () => {
            const timed: {
                value: Animated.Value;
                duration: number;
                native: boolean | undefined;
            }[] = [];
            const runs: {
                start: ReturnType<typeof vi.fn>;
                stop: ReturnType<typeof vi.fn>;
            }[] = [];
            const timing = vi
                .spyOn(Animated, "timing")
                .mockImplementation((value, config) => {
                    timed.push({
                        value: value as Animated.Value,
                        duration: config.duration!,
                        native: config.useNativeDriver,
                    });
                    return { start() {}, stop() {}, reset() {} };
                });
            const loop = vi.spyOn(Animated, "loop").mockImplementation(() => {
                    const run = { start: vi.fn<() => void>(), stop: vi.fn<() => void>(), reset() {} };
                runs.push(run);
                return run;
            });
            const options = outside({
                factor: 1,
                duration: 1000,
                enabled: true,
                wave: true,
            });
            const rendered = vi.fn<() => void>();
            function Probe(props: {
                factor: number;
                duration: number;
                enabled: boolean;
                wave: boolean;
            }) {
                rendered();
                const linear = {
                    type: "easing",
                    kind: "keyword",
                    name: "linear",
                } as const;
                const timeline = engine.useTimeline!({
                    slide: {
                        duration: props.duration,
                        easing: linear,
                        enabled: props.enabled,
                    },
                    ...(props.wave
                        ? { wave: { duration: 2000, easing: linear } }
                        : {}),
                });
                const View = timeline.View;
                return (
                    <>
                        <View
                            testID="first"
                            style={{
                                transform: [
                                    {
                                        translateX: timeline.value({
                                            terms: [
                                                {
                                                    clock: "slide",
                                                    from: 0,
                                                    to: 100 * props.factor,
                                                },
                                            ],
                                        }),
                                    },
                                ],
                            }}
                        />
                        <View
                            testID="inverse"
                            style={{
                                transform: [
                                    {
                                        translateX: timeline.value({
                                            terms: [
                                                {
                                                    clock: "slide",
                                                    from: 0,
                                                    to: -100 * props.factor,
                                                },
                                            ],
                                        }),
                                    },
                                ],
                            }}
                        />
                    </>
                );
            }
            const x = (id: string) =>
                new DOMMatrix(getComputedStyle(byTestId(id)).transform).m41;
            try {
                await mount(
                    <options.Holder>
                        {(value) => <Probe {...value} />}
                    </options.Holder>,
                );
                expect(timed.map((t) => t.duration)).toEqual([1000, 2000]);
                expect(
                    timed.every((t) => t.native === (Platform.OS !== "web")),
                ).toBe(true);
                const before = rendered.mock.calls.length;
                timed[0]!.value.setValue(0.5);
                await settle();
                expect([x("first"), x("inverse")]).toEqual([50, -50]);
                expect(rendered).toHaveBeenCalledTimes(before);
                await options.set({
                    factor: 2,
                    duration: 1000,
                    enabled: true,
                    wave: true,
                });
                expect([x("first"), x("inverse")]).toEqual([100, -100]);
                expect(timed).toHaveLength(2);
                expect(runs[0]!.stop).not.toHaveBeenCalled();
                await options.set({
                    factor: 2,
                    duration: 1500,
                    enabled: true,
                    wave: true,
                });
                expect(timed.map((t) => t.duration)).toEqual([
                    1000, 2000, 1500,
                ]);
                expect(runs[0]!.stop).toHaveBeenCalledOnce();
                expect(runs[1]!.stop).not.toHaveBeenCalled();
                await options.set({
                    factor: 2,
                    duration: 1500,
                    enabled: false,
                    wave: false,
                });
                expect([x("first"), x("inverse")]).toEqual([0, 0]);
                expect(timed).toHaveLength(3);
                expect(runs[1]!.stop).toHaveBeenCalledOnce();
                expect(runs[2]!.stop).toHaveBeenCalledOnce();
                await options.set({
                    factor: 2,
                    duration: 1500,
                    enabled: true,
                    wave: false,
                });
                expect(timed).toHaveLength(4);
                cleanup();
                expect(runs[3]!.stop).toHaveBeenCalledOnce();
            } finally {
                timing.mockRestore();
                loop.mockRestore();
            }
        });
    },
);
