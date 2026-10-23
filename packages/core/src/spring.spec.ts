import { describe, expect, it } from "vitest";

import {
    alias,
    animation,
    linearEasing,
    numeric,
    spring,
    transition,
    tween,
} from "./ast";
import type { SpringNode } from "./ast";

const ms = (value: number) => numeric(value, "ms");
import { MotionConfigError, validateConfig } from "./path";
import {
    dampingCoefficient,
    springFromCurve,
    formatLinearEasing,
    linearEasingAt,
    parseLinearEasing,
    sampleCubicPath,
    sampleSpring,
    settleTime,
    springAt,
} from "./spring";
import type { CoreConfig } from "./types";

const SPRINGS: Record<string, SpringNode> = {
    bouncy: spring({ stiffness: 800, damping: 0.6 }),
    default: spring({ stiffness: 380, damping: 0.8 }),
    critical: spring({ stiffness: 1600, damping: 1 }),
    over: spring({ stiffness: 500, damping: 1.5, mass: 2 }),
    heavy: spring({ stiffness: 200, damping: 0.3, mass: 3 }),
};

describe("springAt", () => {
    it("starts at rest at 0 and heads for 1", () => {
        for (const s of Object.values(SPRINGS)) {
            expect(springAt(s, 0)).toBeCloseTo(0, 10);
            // Released from rest: no velocity at the start.
            expect(springAt(s, 1e-6)).toBeLessThan(1e-6);
            expect(springAt(s, 20)).toBeCloseTo(1, 6);
        }
    });

    it("overshoots only when under-damped", () => {
        const peak = (s: SpringNode) =>
            Math.max(
                ...Array.from({ length: 2000 }, (_, i) =>
                    springAt(s, i / 1000),
                ),
            );
        expect(peak(SPRINGS.bouncy!)).toBeGreaterThan(1.05);
        expect(peak(SPRINGS.critical!)).toBeLessThanOrEqual(1);
        expect(peak(SPRINGS.over!)).toBeLessThanOrEqual(1);
    });

    it("solves the spring's equation", () => {
        // m·x'' + c·x' + k·x = 0 for the displacement x = 1 - springAt.
        for (const s of Object.values(SPRINGS)) {
            const c = dampingCoefficient(s);
            const h = 1e-4;
            for (const t of [0.01, 0.05, 0.1, 0.3]) {
                const x = (u: number) => 1 - springAt(s, u);
                const v = (x(t + h) - x(t - h)) / (2 * h);
                const a = (x(t + h) - 2 * x(t) + x(t - h)) / (h * h);
                const residual = s.mass * a + c * v + s.stiffness * x(t);
                expect(Math.abs(residual) / s.stiffness).toBeLessThan(1e-3);
            }
        }
    });
});

describe("sampleSpring", () => {
    it("stays within tolerance from its settle time", () => {
        for (const s of Object.values(SPRINGS)) {
            const settle = settleTime(s, 0.001);
            for (let t = settle; t < settle + 3; t += 0.001) {
                expect(Math.abs(1 - springAt(s, t))).toBeLessThanOrEqual(
                    0.001 + 1e-9,
                );
            }
            // And not long before it.
            expect(
                Math.abs(1 - springAt(s, settle - 0.01)) > 0.001 ||
                    settle < 0.01,
            ).toBe(true);
        }
    });

    it("agrees with the physics within tolerance", () => {
        for (const s of Object.values(SPRINGS)) {
            const { duration, points } = sampleSpring(s);
            expect(points.at(0)).toEqual([0]);
            expect(points.at(-1)).toEqual([1]);
            expect(points.length).toBeLessThanOrEqual(48);
            for (let i = 0; i <= 500; i++) {
                const x = i / 500;
                const error = Math.abs(
                    linearEasingAt(points, x) -
                        springAt(s, (x * duration) / 1000),
                );
                // The curve's precision, its rounding, and the jump to 1 at the end.
                expect(error).toBeLessThan(0.004);
            }
        }
    });

    it("takes longer for a softer, heavier, or bouncier spring", () => {
        const d = (s: SpringNode) => sampleSpring(s).duration;
        expect(d(spring({ stiffness: 200, damping: 0.8 }))).toBeGreaterThan(
            d(spring({ stiffness: 800, damping: 0.8 })),
        );
        expect(
            d(spring({ stiffness: 400, damping: 0.8, mass: 4 })),
        ).toBeGreaterThan(d(spring({ stiffness: 400, damping: 0.8 })));
        expect(d(spring({ stiffness: 400, damping: 0.3 }))).toBeGreaterThan(
            d(spring({ stiffness: 400, damping: 0.9 })),
        );
    });

    it("caps an undamped spring and its points", () => {
        const { duration, points } = sampleSpring(
            spring({ stiffness: 100, damping: 0 }),
            { maxDuration: 2000, maxPoints: 12 },
        );
        expect(duration).toBe(2000);
        expect(points.length).toBeLessThanOrEqual(12);
    });

    it("rejects a spring that can't run", () => {
        expect(() =>
            sampleSpring({ type: "spring", stiffness: 0, damping: 1, mass: 1 }),
        ).toThrow(/stiffness/);
    });
});

describe("spring()", () => {
    it("converts a perceptual duration and bounce", () => {
        const s = spring({ duration: 500, bounce: 0.3 });
        expect(s.stiffness).toBeCloseTo((2 * Math.PI) ** 2 / 0.25, 6);
        expect(s.damping).toBeCloseTo(0.7, 10);
        expect(s.mass).toBe(1);
        expect(spring({ duration: 500, bounce: -0.5 }).damping).toBe(2);
        expect(spring({ duration: 500 }).damping).toBe(1);
    });
});

describe("linear() easings", () => {
    it("fills in missing inputs as CSS does", () => {
        const points = linearEasing(0, 0.25, [0.5, 75], 1).points;
        expect(linearEasingAt(points, 0)).toBe(0);
        expect(linearEasingAt(points, 0.375)).toBeCloseTo(0.25, 10);
        expect(linearEasingAt(points, 0.75)).toBeCloseTo(0.5, 10);
        expect(linearEasingAt(points, 1)).toBe(1);
    });

    it("formats and parses", () => {
        const points = linearEasing(0, [0.4, 20], [1.05, 60.5], 1).points;
        const text = formatLinearEasing(points);
        expect(text).toBe("linear(0, 0.4 20%, 1.05 60.5%, 1)");
        expect(parseLinearEasing(text)).toEqual(points);
        expect(parseLinearEasing("linear(0, 0.5 10% 20%, 1)")).toEqual([
            [0],
            [0.5, 10],
            [0.5, 20],
            [1],
        ]);
        expect(parseLinearEasing("cubic-bezier(0, 0, 1, 1)")).toBeUndefined();
    });

    it("samples a cubic path within its precision", () => {
        const segment: [number, number][] = [
            [0, 0],
            [0.42, 0],
            [0.58, 1],
            [1, 1],
        ];
        const easing = sampleCubicPath([segment as never], {
            precision: 0.001,
        });
        // The same curve as cubic-bezier(0.42, 0, 0.58, 1), checked by its parameter.
        for (let i = 0; i <= 100; i++) {
            const t = i / 100;
            const u = 1 - t;
            const x = 3 * u * u * t * 0.42 + 3 * u * t * t * 0.58 + t ** 3;
            const y = 3 * u * t * t + t ** 3;
            expect(Math.abs(linearEasingAt(easing.points, x) - y)).toBeLessThan(
                0.0011,
            );
        }
    });
});

describe("validation", () => {
    const config = (style: Record<string, unknown>): CoreConfig =>
        ({
            tokens: {},
            semanticTokens: {},
            springs: { fast: spring({ stiffness: 800, damping: 0.6 }) },
            keyframes: { spin: {} },
            components: {
                box: {
                    kind: "component",
                    name: "box",
                    recipe: { base: style },
                },
            },
        }) as unknown as CoreConfig;

    it("accepts springs, linear easings, and spring timings", () => {
        expect(() =>
            validateConfig(
                config({
                    transition: transition(
                        tween("transform", {
                            spring: alias("springs", "fast"),
                        }),
                        tween("opacity", ms(100), linearEasing(0, 1)),
                    ),
                    animation: animation({
                        name: "spin",
                        spring: spring({ stiffness: 100, damping: 1 }),
                    }),
                }),
            ),
        ).not.toThrow();
    });

    it("rejects a spring with a duration or easing", () => {
        expect(() =>
            validateConfig(
                config({
                    transition: {
                        type: "transition",
                        parts: [
                            {
                                property: "transform",
                                spring: alias("springs", "fast"),
                                duration: ms(100),
                            },
                        ],
                    },
                }),
            ),
        ).toThrow(MotionConfigError);
        expect(() =>
            validateConfig(
                config({
                    animation: {
                        type: "animation",
                        name: "spin",
                        spring: alias("springs", "fast"),
                        easing: linearEasing(0, 1),
                    },
                }),
            ),
        ).toThrow(/a spring sets both/);
    });

    it("rejects springs and linear easings that can't run", () => {
        expect(() =>
            validateConfig({
                ...config({}),
                springs: {
                    bad: { type: "spring", stiffness: 1, damping: -1, mass: 1 },
                },
            }),
        ).toThrow(/damping/);
        expect(() =>
            validateConfig({
                ...config({}),
                easings: { bad: linearEasing([0, 50], [1, 20]) },
            }),
        ).toThrow(/must not decrease/);
        expect(() =>
            validateConfig({
                ...config({}),
                easings: { bad: linearEasing(0) },
            }),
        ).toThrow(/two points/);
    });

    it("types a spring timing without a duration", () => {
        const both = { spring: alias("springs", "fast"), duration: ms(1) };
        // @ts-expect-error a spring sets the duration
        tween("transform", both);
        // @ts-expect-error a spring sets the easing
        animation({
            name: "spin",
            spring: alias("springs", "x"),
            easing: linearEasing(0, 1),
        });
        expect(true).toBe(true);
    });
});

describe("a spring let go mid-flight", () => {
    const sheet: SpringNode = {
        type: "spring",
        stiffness: 700,
        damping: 0.9,
        mass: 1,
    };

    it("starts at the given speed and still ends at 1", () => {
        const still = sampleSpring(sheet);
        const moving = sampleSpring(sheet, { velocity: 20 });
        // Faster from the start: further along at the first kept point.
        expect(linearEasingAt(moving.points, 0.05)).toBeGreaterThan(
            linearEasingAt(still.points, 0.05),
        );
        expect(moving.points.at(-1)).toEqual([1]);
        expect(sampleSpring(sheet, { velocity: 0 })).toEqual(still);
    });

    it("takes the spring back from its sampled curve", () => {
        const { duration, points } = sampleSpring(sheet);
        const fitted = springFromCurve(points, duration);
        expect(fitted.damping).toBeCloseTo(0.9, 1);
        expect(Math.sqrt(fitted.stiffness)).toBeCloseTo(Math.sqrt(700), -0.5);
    });
});
