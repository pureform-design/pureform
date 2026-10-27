import { describe, expect, it } from "vitest";

import { cssDirection, keyframeShapes, pathAt } from "./geometry";
import { fadeOutOpacity } from "./motion";

const square = (inset: number) => ({
    contours: [
        {
            from: [inset, inset] as [number, number],
            segments: [
                {
                    op: "line" as const,
                    to: [100 - inset, inset] as [number, number],
                },
                {
                    op: "line" as const,
                    to: [100 - inset, 100 - inset] as [number, number],
                },
            ],
        },
    ],
});

const BOX = { width: 100, height: 100 };

describe("the SVG engine's cross-fade", () => {
    it("keeps the two fills' coverage at their blend's", () => {
        for (const [from, to] of [
            [0.5, 0.5],
            [1, 0.3],
            [0.2, 0.9],
        ] as const) {
            for (const t of [0, 0.25, 0.5, 0.75]) {
                const old = fadeOutOpacity(to, t);
                // The new fill at `t`, over the old at its opacity.
                const covered = to * t + from * old * (1 - to * t);
                expect(covered).toBeCloseTo(from + (to - from) * t, 6);
            }
        }
    });

    it("keeps the old fill whole under an opaque new one, and ends it", () => {
        expect(fadeOutOpacity(1, 0.5)).toBe(1);
        expect(fadeOutOpacity(1, 1)).toBe(0);
        expect(fadeOutOpacity(0.5, 1)).toBe(0);
    });
});

describe("keyframed shapes", () => {
    it("fills in the drawing's shape where a frame is left out, and draws each frame's path", () => {
        const frames = keyframeShapes(
            {
                duration: 100,
                delay: 0,
                easing: { type: "easing", kind: "keyword", name: "linear" },
                iterations: -1,
                direction: "alternate",
                frames: [{ offset: 0.5, shape: square(20) }],
            },
            square(0),
            BOX,
        )!;
        expect(frames.map((frame) => frame.offset)).toEqual([0, 0.5, 1]);
        expect(frames[1]!.d).toBe(pathAt(square(20), frames[1]!.points));
        expect(frames[0]!.d).toBe(frames[2]!.d);
    });

    it("has none for shapes that can't morph into each other", () => {
        const triangle = {
            contours: [{ from: [0, 0] as [number, number], segments: [] }],
        };
        expect(
            keyframeShapes(
                {
                    duration: 100,
                    delay: 0,
                    easing: { type: "easing", kind: "keyword", name: "linear" },
                    iterations: 1,
                    direction: "normal",
                    frames: [{ offset: 1, shape: triangle }],
                },
                square(0),
                BOX,
            ),
        ).toBeUndefined();
    });

    it("writes the direction as CSS does", () => {
        expect(cssDirection("alternateReverse")).toBe("alternate-reverse");
        expect(cssDirection("alternate")).toBe("alternate");
    });
});
