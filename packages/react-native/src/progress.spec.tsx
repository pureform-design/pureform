import type { ReactNode } from "react";
import { beforeAll, describe, expect, it } from "vitest";

import { PureformProvider } from ".";
import { CircularProgress } from "./circular-progress";
import { animated } from "./engine";
import type { MotionEngine } from "./engine";
import { reanimated } from "./engines/reanimated";
import { LinearProgress } from "./linear-progress";
import { presetRegistry } from "./testing/registry";
import type { TestRegistry } from "./testing/registry";
import { mount, settle } from "./testing/render";

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

describe.each([animated, reanimated])(
    "the circular arcs' ends, with $name",
    (engine) => {
        it("are rounded, the track kept the gap away from the indicator's", async () => {
            await render(<CircularProgress testId="c" value={40} />, engine);
            await settle(600);
            const root = document
                .querySelector('[data-testid="c-root"]')!
                .getBoundingClientRect();
            const center = (part: string) => {
                const el = document.querySelector(`[data-testid="c-${part}"]`)!;
                const r = el.getBoundingClientRect();
                expect((el as HTMLElement).offsetWidth).toBe(4);
                expect(getComputedStyle(el).borderTopLeftRadius).not.toBe(
                    "0px",
                );
                return [
                    r.left + r.width / 2 - (root.left + root.width / 2),
                    r.top + r.height / 2 - (root.top + root.height / 2),
                ] as const;
            };
            // Clockwise from the top, on the ring's middle line, 22px out.
            const at = (percent: number) => {
                const a = (percent * 3.6 * Math.PI) / 180;
                return [22 * Math.sin(a), -22 * Math.cos(a)];
            };
            const near = (p: readonly number[], q: readonly number[]) => {
                expect(p[0]).toBeCloseTo(q[0]!, 0);
                expect(p[1]).toBeCloseTo(q[1]!, 0);
            };
            near(center("tail-cap"), at(0));
            near(center("head-cap"), at(40));
            near(center("track-tail-cap"), at(40 + 3 + 2.9));
            near(center("track-head-cap"), at(100 - 3 - 2.9));
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
            await settle(300);
            const box = (part: string) =>
                document
                    .querySelector(`[data-testid="p-${part}"]`)!
                    .getBoundingClientRect();
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
