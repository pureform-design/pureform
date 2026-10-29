import type { ReactNode } from "react";
import { beforeAll, describe, expect, it } from "vitest";

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
import { byTestId, mount, outside, settle } from "./testing/render";

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
