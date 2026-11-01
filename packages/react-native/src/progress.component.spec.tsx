import { curve } from "@pureform/rn-adapter/animated";
import { useMemo } from "react";
import type { ReactNode } from "react";
import { Animated } from "react-native";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { PureformProvider } from ".";
import { CircularProgress } from "./circular-progress";
import { animated } from "./engine";
import type { MotionEngine } from "./engine";
import { reanimated } from "./engines/reanimated";
import { reanimatedSvg } from "./engines/reanimated-svg";
import { animatedSvg } from "./engines/svg";
import { LinearProgress } from "./linear-progress";
import { presetRegistry } from "./testing/registry";
import type { TestRegistry } from "./testing/registry";
import { byTestId, mount, outside, settle, until } from "./testing/render";

let registry: TestRegistry;

beforeAll(async () => {
    registry = await presetRegistry(["linearProgress", "circularProgress"]);
});

const render = async (node: ReactNode, engine: MotionEngine = animated) => {
    await mount(
        <PureformProvider registry={registry} engine={engine}>
            {node}
        </PureformProvider>,
    );
    await settle(50);
};

const has = (id: string) =>
    document.querySelector(`[data-testid="${id}"]`) !== null;

const wavePoints = (id: string, part = "end-half") => {
    const path = byTestId(`${id}-${part}`).querySelector<SVGPathElement>(
        "path",
    );
    expect(path).not.toBeNull();
    return path!
        .getAttribute("d")!
        .match(/-?\d+(?:\.\d+)?/g)!
        .map(Number);
};

describe.each([animated, reanimated, animatedSvg, reanimatedSvg])(
    "indeterminate circular sweep with $name",
    (engine) => {
        it.each(["ltr", "rtl"] as const)(
            "shares one clock with preset geometry and per-step easing (%s)",
            async (dir) => {
                const clocks: Animated.Value[] = [];
                const timing = Animated.timing;
                const spy = vi
                    .spyOn(Animated, "timing")
                    .mockImplementation((value, config) => {
                        if (config.duration !== 6000)
                            return timing(value, config);
                        clocks.push(value as Animated.Value);
                        return {
                            start() {},
                            stop() {},
                            reset() {},
                            _isUsingNativeDriver: () => false,
                        } as Animated.CompositeAnimation;
                    });
                const options = outside({
                    value: 10,
                    motion: "full" as "full" | "reduce",
                    size: 64,
                });
                const useStyles = vi.fn<typeof engine.useStyles>(
                    engine.useStyles,
                );
                const observed = { ...engine, useStyles };
                try {
                    await mount(
                        <options.Holder>
                            {(state) => (
                                <PureformProvider
                                    registry={registry}
                                    engine={observed}
                                    dir={dir}
                                    motion={state.motion}
                                    timeScale={2}
                                    defaults={{
                                        circularProgress: {
                                            tokens: {
                                                rotationDuration: 1500,
                                                size: state.size,
                                                thickness: 6,
                                                gap: 3,
                                            },
                                        },
                                    }}
                                >
                                    <CircularProgress
                                        testId="live"
                                        tokens={{ gap: 5 }}
                                    />
                                    <PureformProvider motion="reduce">
                                        <CircularProgress
                                            testId="reference"
                                            value={state.value}
                                            tokens={{ gap: 5 }}
                                        />
                                    </PureformProvider>
                                </PureformProvider>
                            )}
                        </options.Holder>,
                    );
                    expect(clocks).toHaveLength(1);
                    const read = (id: string) => {
                        const style = getComputedStyle(byTestId(id));
                        const m = new DOMMatrix(style.transform);
                        return [
                            m.a,
                            m.b,
                            m.c,
                            m.d,
                            m.e,
                            m.f,
                            Number(style.opacity),
                        ];
                    };
                    const ease = curve({
                        type: "easing",
                        kind: "cubicBezier",
                        points: [0.2, 0, 0, 1],
                    });
                    const frames = [0, 0.25, 0.5, 0.75, 1];
                    const parts = [
                        "end-arc",
                        "start-arc",
                        "track",
                        "track-end-arc",
                        "track-start-arc",
                        "head-cap",
                        "tail-cap",
                        "track-head-cap",
                        "track-tail-cap",
                    ];
                    for (const phase of frames) {
                        const local =
                            phase <= 0.5 ? phase * 2 : (phase - 0.5) * 2;
                        const amount =
                            phase <= 0.5
                                ? 10 + 77 * ease(local)
                                : 87 - 77 * ease(local);
                        await options.set({
                            value: amount,
                            motion: "full",
                            size: 64,
                        });
                        const before = useStyles.mock.calls.length;
                        clocks[0]!.setValue(phase);
                        await settle();
                        expect(useStyles).toHaveBeenCalledTimes(before);
                        for (const part of parts) {
                            const actual = read(`live-${part}`);
                            const expected = read(`reference-${part}`);
                            actual.forEach((value, i) =>
                                expect(
                                    value,
                                    `${part} at ${phase}`,
                                ).toBeCloseTo(expected[i]!, 2),
                            );
                        }
                        const degrees =
                            (phase <= 0.5
                                ? 221.4 * ease(local)
                                : 221.4 + 498.6 * ease(local)) *
                            (dir === "rtl" ? -1 : 1);
                        const root = read("live-root");
                        expect(root[0]).toBeCloseTo(
                            Math.cos((degrees * Math.PI) / 180),
                            3,
                        );
                        expect(root[1]).toBeCloseTo(
                            Math.sin((degrees * Math.PI) / 180),
                            3,
                        );
                        expect(clocks).toHaveLength(1);
                    }
                    const host = byTestId("live-root");
                    await options.set({
                        value: 50,
                        motion: "reduce",
                        size: 72,
                    });
                    expect(byTestId("live-root")).toBe(host);
                    for (const part of parts)
                        read(`live-${part}`).forEach((value, i) =>
                            expect(value).toBeCloseTo(
                                read(`reference-${part}`)[i]!,
                                2,
                            ),
                        );
                    expect(read("live-root")[0]).toBeCloseTo(1);
                    await options.set({ value: 50, motion: "full", size: 72 });
                    expect(clocks).toHaveLength(2);
                    expect(byTestId("live-root")).toBe(host);
                } finally {
                    spy.mockRestore();
                }
            },
        );

        it("grows and shrinks the rendered arc rather than only spinning a half circle", async () => {
            await render(
                <CircularProgress
                    testId="sweep"
                    tokens={{ rotationDuration: 250 }}
                />,
                engine,
            );
            const arc = byTestId("sweep-end-arc");
            const before = getComputedStyle(arc).transform;
            await until(() =>
                expect(getComputedStyle(arc).transform).not.toBe(before),
            );
            expect(byTestId("sweep-root").hasAttribute("aria-valuenow")).toBe(
                false,
            );
        });
    },
);

describe.each([animatedSvg, reanimatedSvg])(
    "linear wave channels with $name",
    (engine) => {
        it("uses provider and instance timings, freezing only the wave under reduced motion", async () => {
            const calls: { duration: number; value: Animated.Value }[] = [];
            const timing = Animated.timing;
            const spy = vi
                .spyOn(Animated, "timing")
                .mockImplementation((progress, config) => {
                    if (![1700, 2000, 3500].includes(config.duration!))
                        return timing(progress, config);
                    calls.push({
                        duration: config.duration!,
                        value: progress as Animated.Value,
                    });
                    return {
                        start() {},
                        stop() {},
                        reset() {},
                        _isUsingNativeDriver: () => false,
                    } as Animated.CompositeAnimation;
                });
            const options = outside<{
                motion: "full" | "reduce";
                duration?: number;
            }>({ motion: "full", duration: 2000 });
            try {
                await mount(
                    <options.Holder>
                        {(value) => (
                            <PureformProvider
                                registry={registry}
                                engine={engine}
                                motion={value.motion}
                                defaults={{
                                    linearProgress: {
                                        tokens: {
                                            waveDuration: 850,
                                            indeterminateDuration: 1750,
                                        },
                                    },
                                }}
                                timeScale={2}
                            >
                                <div style={{ width: 200 }}>
                                    <LinearProgress
                                        testId="policy"
                                        shape="wavy"
                                        tokens={
                                            value.duration === undefined
                                                ? {}
                                                : {
                                                      waveDuration:
                                                          value.duration / 2,
                                                  }
                                        }
                                    />
                                </div>
                            </PureformProvider>
                        )}
                    </options.Holder>,
                );
                await settle(100);
                expect(calls.map((c) => c.duration)).toEqual([3500, 2000]);
                calls[1]!.value.setValue(0.25);
                await settle();
                await options.set({ motion: "reduce", duration: 2000 });
                expect(calls).toHaveLength(2);
                // Disabling the wave resets its native value, leaving the same slide clock alive.
                const indicator = byTestId("policy-indicator");
                const canvas = indicator.firstElementChild!;
                calls[0]!.value.setValue(0.5);
                await settle();
                expect(
                    new DOMMatrix(getComputedStyle(indicator).transform).m41,
                ).toBeCloseTo(60, 0);
                expect(
                    new DOMMatrix(getComputedStyle(canvas).transform).m41,
                ).toBeCloseTo(-60, 0);
                await options.set({ motion: "full" });
                expect(calls.map((c) => c.duration)).toEqual([
                    3500, 2000, 1700,
                ]);
            } finally {
                spy.mockRestore();
            }
        });
        it.each(
            [40, undefined].flatMap((value) =>
                (["ltr", "rtl"] as const).flatMap((dir) => [
                    { value, dir, duration: 1000, amplitude: 3, height: 4 },
                    { value, dir, duration: 2000, amplitude: 5, height: 8 },
                ]),
            ),
        )(
            "moves the rendered wave independently (value $value, $dir, $duration ms, amplitude $amplitude)",
            async ({ value, dir, duration, amplitude, height }) => {
                const clocks = new Map<number, Animated.Value>();
                const timing = Animated.timing;
                const spy = vi
                    .spyOn(Animated, "timing")
                    .mockImplementation((progress, config) => {
                        if (
                            config.duration !== duration &&
                            config.duration !== 1750
                        )
                            return timing(progress, config);
                        clocks.set(config.duration, progress as Animated.Value);
                        return {
                            start() {},
                            stop() {},
                            reset() {},
                            _isUsingNativeDriver: () => false,
                        } as Animated.CompositeAnimation;
                    });
                try {
                    await mount(
                        <PureformProvider
                            registry={registry}
                            engine={engine}
                            motion="full"
                            dir={dir}
                        >
                            <div style={{ width: 220 }}>
                                <LinearProgress
                                    testId="linear-wave"
                                    shape="wavy"
                                    value={value}
                                    tokens={{
                                        waveDuration: duration,
                                        amplitude,
                                        height,
                                    }}
                                />
                            </div>
                        </PureformProvider>,
                    );
                    await settle(100);
                    const slide = clocks.get(1750);
                    slide?.setValue(0.4);
                    clocks.get(duration)!.setValue(0);
                    await settle();
                    const root =
                        byTestId("linear-wave-root").getBoundingClientRect();
                    const path = byTestId(
                        "linear-wave-indicator",
                    ).querySelector("path")!;
                    await until(() =>
                        expect(path.getBBox().width).toBeCloseTo(
                            root.width + 40,
                            0,
                        ),
                    );
                    expect(root.height).toBe(height + 2 * amplitude);
                    expect(path.getBBox().height).toBeCloseTo(
                        height + 2 * amplitude,
                        0,
                    );
                    const upper = (x: number) => {
                        const matrix = path.getScreenCTM()!;
                        const local = new DOMPoint(
                            root.left + (dir === "rtl" ? root.width - x : x),
                            root.top,
                        ).matrixTransform(matrix.inverse());
                        let from = 0;
                        let to = path.getTotalLength() / 2;
                        for (let i = 0; i < 24; i++) {
                            const mid = (from + to) / 2;
                            if (path.getPointAtLength(mid).x < local.x)
                                from = mid;
                            else to = mid;
                        }
                        const point = path.getPointAtLength((from + to) / 2);
                        return (
                            new DOMPoint(point.x, point.y).matrixTransform(
                                matrix,
                            ).y - root.top
                        );
                    };
                    const start = upper(50);
                    expect(start).toBeCloseTo(0, 0);
                    clocks.get(duration)!.setValue(0.25);
                    await settle();
                    expect(upper(60)).toBeCloseTo(start, 1);
                    expect(upper(50)).toBeCloseTo(amplitude, 0);
                    // Changing only the sliding clock leaves the track-relative wave where it was.
                    slide?.setValue(0.45);
                    await settle();
                    expect(upper(60)).toBeCloseTo(start, 1);
                    clocks.get(duration)!.setValue(1);
                    await settle();
                    expect(upper(50)).toBeCloseTo(start, 1);
                } finally {
                    spy.mockRestore();
                }
            },
        );
    },
);

describe.each([animatedSvg, reanimatedSvg])(
    "wavy circular geometry with $name",
    (engine) => {
        it.each(
            [40, undefined].flatMap((value) =>
                (["full", "reduce"] as const).map((motion) => ({
                    value,
                    motion,
                })),
            ),
        )(
            "draws a real wave band for value=$value, motion=$motion",
            async ({ value, motion }) => {
                await mount(
                    <PureformProvider
                        registry={registry}
                        engine={engine}
                        motion={motion}
                    >
                        <CircularProgress
                            testId="wave"
                            shape="wavy"
                            value={value}
                        />
                    </PureformProvider>,
                );
                await settle(100);
                const coordinates = wavePoints("wave");
                const radius = (point: number) =>
                    Math.hypot(
                        coordinates[point * 2]! - 24,
                        coordinates[point * 2 + 1]! - 24,
                    );
                // The outer edge crests at 10 degrees and dips at 30, not a smooth circular arc.
                expect(radius(2)).toBeCloseTo(24, 1);
                expect(radius(6)).toBeCloseTo(21, 1);
                expect(radius(2) - radius(6)).toBeCloseTo(3, 1);
            },
        );

        it("scales its actual band with size, thickness and amplitude, and mirrors it in RTL", async () => {
            await mount(
                <>
                    <PureformProvider
                        registry={registry}
                        engine={engine}
                        motion="reduce"
                        dir="ltr"
                    >
                        <CircularProgress
                            testId="ltr"
                            value={75}
                            shape="wavy"
                            tokens={{ size: 64, thickness: 6, amplitude: 3 }}
                        />
                    </PureformProvider>
                    <PureformProvider
                        registry={registry}
                        engine={engine}
                        motion="reduce"
                        dir="rtl"
                    >
                        <CircularProgress
                            testId="rtl"
                            value={75}
                            shape="wavy"
                            tokens={{ size: 64, thickness: 6, amplitude: 3 }}
                        />
                    </PureformProvider>
                </>,
            );
            await settle(100);
            const ltr = wavePoints("ltr");
            const rtl = wavePoints("rtl");
            const radius = (p: number[], i: number) =>
                Math.hypot(p[i * 2]! - 32, p[i * 2 + 1]! - 32);
            expect(radius(ltr, 2)).toBeCloseTo(32, 1);
            expect(radius(ltr, 6)).toBeCloseTo(26, 1);
            // 73 outer points, then 73 inner points in reverse: both edges are waves, 6px apart.
            expect(radius(ltr, 2) - radius(ltr, 143)).toBeCloseTo(6, 1);
            expect(radius(ltr, 6) - radius(ltr, 139)).toBeCloseTo(6, 1);
            for (let i = 0; i < ltr.length; i += 2) {
                expect(ltr[i]! + rtl[i]!).toBeCloseTo(64, 1);
                expect(ltr[i + 1]).toBeCloseTo(rtl[i + 1]!, 1);
            }
            const start = wavePoints("ltr", "start-half");
            for (let i = 0; i < ltr.length; i += 2) {
                expect(start[i]).toBe(ltr[i]);
                expect(start[i + 1]).toBe(ltr[i + 1]);
            }
            expect(getComputedStyle(byTestId("ltr-end-half")).overflow).toBe(
                "hidden",
            );
            expect(getComputedStyle(byTestId("ltr-start-half")).overflow).toBe(
                "hidden",
            );
        });

        it("updates the drawn sweep, respects range bounds, and preserves arc hosts and customization", async () => {
            const progress = outside(30);
            await mount(
                <PureformProvider
                    registry={registry}
                    engine={engine}
                    motion="reduce"
                >
                    <progress.Holder>
                        {(value) => (
                            <CircularProgress
                                testId="wave"
                                shape="wavy"
                                value={value}
                                min={20}
                                max={60}
                                track={false}
                                style={{
                                    endArc: {
                                        borderTopColor: "rgb(255, 0, 0)",
                                        opacity: 0.6,
                                    },
                                }}
                                slotProps={{
                                    endArc: { accessibilityLabel: "Wave arc" },
                                }}
                            />
                        )}
                    </progress.Holder>
                </PureformProvider>,
            );
            await settle(100);
            const path = () => byTestId("wave-end-half").querySelector("path")!;
            expect(path().getAttribute("fill")).toBe("rgb(255, 0, 0)");
            expect(byTestId("wave-end-arc").getAttribute("aria-label")).toBe(
                "Wave arc",
            );
            expect(getComputedStyle(byTestId("wave-end-arc")).opacity).toBe(
                "0.6",
            );
            expect(
                getComputedStyle(byTestId("wave-end-arc")).borderTopWidth,
            ).toBe("0px");
            expect(has("wave-track")).toBe(false);
            const points = wavePoints("wave");
            // 30 in [20, 60] is 25%, so the last outer point is at the quarter turn.
            expect(points[144]).toBeCloseTo(48, 1);
            expect(points[145]).toBeCloseTo(24, 1);
            await progress.set(50);
            await settle(100);
            const updated = wavePoints("wave");
            expect(updated[144]).toBeCloseTo(3, 1);
            expect(updated[145]).toBeCloseTo(24, 1);
            await progress.set(0);
            await settle(100);
            expect(wavePoints("wave")[144]).toBe(24);
        });
    },
);

it.each([animated, reanimated])(
    "keeps the non-SVG fallback with $name",
    async (engine) => {
        await render(
            <CircularProgress testId="fallback" value={40} shape="wavy" />,
            engine,
        );
        expect(byTestId("fallback-root").querySelector("svg")).toBeNull();
        expect(
            parseFloat(
                getComputedStyle(byTestId("fallback-end-arc")).borderTopWidth,
            ),
        ).toBeGreaterThan(0);
    },
);

describe("the progress indicators' track", () => {
    it("draws the track by default, determinate and indeterminate, flat and wavy", async () => {
        await render(
            <>
                <LinearProgress testId="a" value={40} />
                <LinearProgress testId="b" shape="wavy" />
                <CircularProgress testId="c" value={40} shape="wavy" />
                <CircularProgress testId="d" />
            </>,
        );
        for (const id of ["a", "b", "c", "d"]) {
            expect(has(`${id}-track`)).toBe(true);
            expect(has(`${id}-indicator`) || has(`${id}-end-half`)).toBe(true);
        }
    });

    it("leaves the track and the stop dot out with track={false}", async () => {
        await render(
            <>
                <LinearProgress testId="a" value={40} track={false} />
                <LinearProgress testId="b" track={false} />
                <CircularProgress testId="c" value={40} track={false} />
                <CircularProgress testId="d" track={false} />
            </>,
        );
        for (const id of ["a", "b", "c", "d"])
            expect(has(`${id}-track`)).toBe(false);
        expect(has("a-indicator")).toBe(true);
        expect(has("a-stop-indicator")).toBe(false);
        expect(has("b-stop-indicator")).toBe(false);
        expect(has("d-head-cap")).toBe(true);
        expect(has("d-end-arc")).toBe(true);
    });
});

describe.each([animated, reanimated, animatedSvg, reanimatedSvg])(
    "the circular arcs' ends, with $name",
    (engine) => {
        // A part's centre from the circle's.
        const centre = (id: string, part: string) => {
            const root = document
                .querySelector(`[data-testid="${id}-root"]`)!
                .getBoundingClientRect();
            const el = document.querySelector(`[data-testid="${id}-${part}"]`)!;
            const r = el.getBoundingClientRect();
            const x = r.left + r.width / 2 - (root.left + root.width / 2);
            const y = r.top + r.height / 2 - (root.top + root.height / 2);
            return { x, y, el: el as HTMLElement };
        };
        const distance = (
            a: { x: number; y: number },
            b: { x: number; y: number },
        ) => Math.hypot(a.x - b.x, a.y - b.y);

        it.each([
            [48, 4],
            [48, 8],
            [24, 4],
            [96, 12],
        ])(
            "are rounded and keep the gap at %ipx, %ipx thick, with no other token set",
            async (size, thickness) => {
                await render(
                    <CircularProgress
                        testId="c"
                        value={40}
                        tokens={{ size, thickness }}
                    />,
                    engine,
                );
                await settle(600);
                const radius = (size - thickness) / 2;
                const at = (percent: number) => {
                    const a = (percent * 3.6 * Math.PI) / 180;
                    return {
                        x: radius * Math.sin(a),
                        y: -radius * Math.cos(a),
                    };
                };
                const parts = Object.fromEntries(
                    [
                        "tail-cap",
                        "head-cap",
                        "track-tail-cap",
                        "track-head-cap",
                    ].map((part) => [part, centre("c", part)]),
                );
                for (const { el, x, y } of Object.values(parts)) {
                    expect(el.offsetWidth).toBe(thickness);
                    expect(getComputedStyle(el).borderTopLeftRadius).not.toBe(
                        "0px",
                    );
                    expect(Math.hypot(x, y)).toBeCloseTo(radius, 0);
                }
                expect(distance(parts["tail-cap"]!, at(0))).toBeLessThan(0.6);
                expect(distance(parts["head-cap"]!, at(40))).toBeLessThan(0.6);
                // The space between neighbouring dots' edges is the gap, 4px.
                const gap = (a: string, b: string) =>
                    distance(parts[a]!, parts[b]!) - thickness;
                expect(gap("head-cap", "track-tail-cap")).toBeCloseTo(4, 0);
                expect(gap("track-head-cap", "tail-cap")).toBeCloseTo(4, 0);
            },
        );

        it("rides the wavy indicator's ends on its wave, the track keeping the gap", async () => {
            await render(
                <CircularProgress testId="w" value={40} shape="wavy" />,
                engine,
            );
            await settle(600);
            // Nine waves around, 1.5px each way: at 40% the wave is sin(9 × 144°) out.
            const wave = 1.5 * Math.sin((9 * 144 * Math.PI) / 180);
            const head = centre("w", "head-cap");
            const tail = centre("w", "tail-cap");
            expect(Math.hypot(head.x, head.y)).toBeCloseTo(20.5 + wave, 0);
            expect(Math.hypot(tail.x, tail.y)).toBeCloseTo(20.5, 0);
            // The track's ends on its middle line, smaller by the amplitude.
            const trackTail = centre("w", "track-tail-cap");
            const trackHead = centre("w", "track-head-cap");
            expect(Math.hypot(trackTail.x, trackTail.y)).toBeCloseTo(20.5, 0);
            expect(Math.hypot(trackHead.x, trackHead.y)).toBeCloseTo(20.5, 0);
            // The gap as on the flat circle: 4px between the track's ends and the indicator's
            // on the middle line.
            expect(distance(trackHead, tail) - 4).toBeCloseTo(4, 0);
            const angle = (p: { x: number; y: number }) =>
                Math.atan2(p.x, -p.y);
            const chord =
                2 * 20.5 * Math.sin((angle(trackTail) - angle(head)) / 2);
            expect(chord - 4).toBeCloseTo(4, 0);
        });
    },
);

describe("the indeterminate linear track", () => {
    it("derives the indicator and both track segments from one clock", async () => {
        const values: Animated.Value[] = [];
        const timing = Animated.timing;
        const spy = vi
            .spyOn(Animated, "timing")
            .mockImplementation((value, config) => {
                if (config.duration !== 1750) return timing(value, config);
                values.push(value as Animated.Value);
                return {
                    start() {},
                    stop() {},
                    reset() {},
                    _isUsingNativeDriver: () => false,
                } as Animated.CompositeAnimation;
            });
        try {
            await render(
                <div style={{ width: 200 }}>
                    <LinearProgress testId="shared" />
                </div>,
            );
            expect(values).toHaveLength(1);
            values[0]!.setValue(0.5);
            await settle();
            const box = (part: string) =>
                byTestId(`shared-${part}`).getBoundingClientRect();
            const indicator = box("indicator");
            expect(indicator.left).toBeGreaterThan(0);
            expect(box("track-before").right).toBeCloseTo(
                indicator.left - 4,
                0,
            );
            expect(box("track-after").left).toBeCloseTo(indicator.right + 4, 0);
        } finally {
            spy.mockRestore();
        }
    });
    it("leaves a gap either side of the sliding indicator, drawn in two rounded parts moving with it", async () => {
        await render(
            <div style={{ width: 200 }}>
                <LinearProgress testId="p" />
            </div>,
        );
        await settle(300);
        const box = (part: string) =>
            document
                .querySelector(`[data-testid="p-${part}"]`)!
                .getBoundingClientRect();
        const indicator = box("indicator");
        const before = box("track-before");
        const after = box("track-after");
        // Mid-slide, each part is 4px (the gap) from the indicator.
        expect(indicator.left).toBeGreaterThan(0);
        expect(before.right).toBeCloseTo(indicator.left - 4, 0);
        expect(after.left).toBeCloseTo(indicator.right + 4, 0);
        for (const part of ["track-before", "track-after"]) {
            const style = getComputedStyle(
                document.querySelector(`[data-testid="p-${part}"]`)!,
            );
            expect(style.borderTopRightRadius).toBe("9999px");
            expect(style.borderTopLeftRadius).toBe("9999px");
        }
        // The track itself only clips them.
        const track = getComputedStyle(
            document.querySelector('[data-testid="p-track"]')!,
        );
        expect(track.backgroundColor).toBe("rgba(0, 0, 0, 0)");
        expect(track.overflow).toBe("hidden");
    });

    it.each(
        [animated, reanimated].flatMap((engine) =>
            [
                ["20%", 40],
                ["60px", 60],
                [60, 60],
            ].map(([width, px]) => ({ engine, name: engine.name, width, px })),
        ),
    )(
        "moves the parts with an instance's own indicator width ($width), with $name",
        async ({ engine, width, px }) => {
            await render(
                <div style={{ width: 200 }}>
                    <LinearProgress
                        testId="p"
                        tokens={{ indeterminateWidth: width as never }}
                    />
                </div>,
                engine,
            );
            const box = (part: string) =>
                document
                    .querySelector(`[data-testid="p-${part}"]`)!
                    .getBoundingClientRect();
            // Mid-slide, once the indicator has come into the track (later on a loaded machine).
            await settle(300);
            for (let i = 0; i < 40 && box("indicator").left <= 0; i++)
                await settle(50);
            const indicator = box("indicator");
            // The instance's width, and the parts still a gap from it.
            expect(indicator.width).toBeCloseTo(px as number, 0);
            expect(indicator.left).toBeGreaterThan(0);
            expect(box("track-before").right).toBeCloseTo(
                indicator.left - 4,
                0,
            );
            expect(box("track-after").left).toBeCloseTo(indicator.right + 4, 0);
        },
    );

    it("draws no parts while determinate", async () => {
        await render(<LinearProgress testId="p" value={40} />);
        for (const part of ["track-before", "track-after"])
            expect(
                getComputedStyle(
                    document.querySelector(`[data-testid="p-${part}"]`)!,
                ).display,
            ).toBe("none");
    });
});

describe("the indeterminate circular progress's sampled motion", () => {
    // What a rebuild costs (one style resolution per sample, over a hundred of them) is counted at
    // the timeline, which each animated property reads once per rebuild.
    const counting = (builds: { count: number }): MotionEngine => ({
        ...animated,
        useTimeline(options) {
            const timeline = animated.useTimeline!(options);
            return useMemo(
                () => ({
                    ...timeline,
                    value: (...args: Parameters<typeof timeline.value>) => {
                        builds.count++;
                        return timeline.value(...args);
                    },
                }),
                [timeline],
            );
        },
    });

    it("is built again only when what it draws changes, not when its parent renders", async () => {
        const builds = { count: 0 };
        const engine = counting(builds);
        const parent = outside({ renders: 0, gap: 5 });
        await render(
            <parent.Holder>
                {(state) => (
                    <PureformProvider
                        registry={registry}
                        engine={engine}
                        timeScale={2}
                        defaults={{
                            circularProgress: { tokens: { size: 64 } },
                        }}
                    >
                        <CircularProgress
                            testId="spinner"
                            tokens={{ gap: state.gap }}
                        />
                    </PureformProvider>
                )}
            </parent.Holder>,
            engine,
        );
        const built = builds.count;
        expect(built).toBeGreaterThan(0);
        // New props and a new `defaults` object each time, with the same content (and `timeScale`, which
        // makes the selection's animations a new object each time).
        for (const renders of [1, 2, 3]) await parent.set({ renders, gap: 5 });
        expect(builds.count).toBe(built);
        await parent.set({ renders: 3, gap: 9 });
        expect(builds.count).toBeGreaterThan(built);
    });
});
