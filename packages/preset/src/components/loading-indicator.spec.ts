import { px } from "@pureform/core/ast";
import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { MATERIAL_SHAPES } from "../shapes";
import {
    LOADING_INDICATOR_KEYFRAMES,
    LOADING_INDICATOR_SHAPES,
    loadingIndicator,
} from "./loading-indicator";
import {
    PROGRESS_KEYFRAMES,
    circularProgress,
    linearProgress,
} from "./progress";
import { morphSequence, waveBand, wavyRing } from "./shape-paths";

const slotRecipe = (
    component: Parameters<typeof configWith>[0],
    name: string,
) => compilePreset(configWith(component)).theme?.slotRecipes?.[name];

// A shape node's structure: each contour's segment ops, which a morph needs to match.
const structure = (shape: unknown) =>
    (shape as { contours: { segments: { op: string }[] }[] }).contours.map(
        (contour) => contour.segments.map((s) => s.op).join(),
    );

describe("morphSequence", () => {
    it("redraws a cycle of shapes with one structure, keeping their fit", () => {
        const shapes = [
            MATERIAL_SHAPES.circle,
            MATERIAL_SHAPES.pentagon,
            MATERIAL_SHAPES.sunny,
        ];
        const morphs = morphSequence(shapes);
        const lengths = morphs.map((m) => m.contours[0]!.segments.length);
        expect(new Set(lengths).size).toBe(1);
        expect(lengths[0]).toBeGreaterThanOrEqual(
            Math.max(...shapes.map((s) => s.contours[0]!.segments.length)),
        );
        for (const [i, m] of morphs.entries()) {
            expect(m.fit).toEqual(shapes[i]!.fit);
            expect(m.contours[0]!.segments.every((s) => s.op === "curve")).toBe(
                true,
            );
        }
    });

    it("rejects a shape with more than one contour", () => {
        const two = {
            ...MATERIAL_SHAPES.circle,
            contours: [
                MATERIAL_SHAPES.circle.contours[0]!,
                MATERIAL_SHAPES.circle.contours[0]!,
            ],
        };
        expect(() => morphSequence([two])).toThrow(/one contour/);
    });
});

describe("wave paths", () => {
    it("bands a wave from the box's start, folding past its end", () => {
        const band = waveBand({
            waves: 2,
            wavelength: 40,
            top: px(3),
            bottom: px(7),
            amplitude: px(3),
        });
        expect(band.contours).toHaveLength(1);
        // Four quarter curves a wave, along each edge, and the flat end.
        expect(
            structure(band)[0]!
                .split(",")
                .filter((op) => op === "curve"),
        ).toHaveLength(16);
        expect(JSON.stringify(band)).toContain('"fn":"min"');
    });

    it("rings a circle with an inner and outer wavy edge, as a hole", () => {
        const ring = wavyRing({
            waves: 9,
            thickness: px(4),
            amplitude: px(1.5),
        });
        expect(ring.fillRule).toBe("evenodd");
        expect(ring.contours).toHaveLength(2);
    });

    it("rings a half's box with its share of the circle, in the circle's frame", () => {
        const options = { waves: 9, thickness: px(4), amplitude: px(1.5) };
        const xs = (half?: "left" | "right") =>
            wavyRing({ ...options, half }).contours[0]!.segments.map((s) =>
                JSON.stringify(
                    (s as { readonly to: readonly unknown[] }).to[0],
                ),
            );
        const ys = (half?: "left" | "right") =>
            wavyRing({ ...options, half }).contours[0]!.segments.map((s) =>
                JSON.stringify(
                    (s as { readonly to: readonly unknown[] }).to[1],
                ),
            );
        // The top of the circle (its first point) is the left half's right edge and the right
        // half's left edge; heights are the circle's.
        const first = (half?: "left" | "right") =>
            JSON.stringify(wavyRing({ ...options, half }).contours[0]!.from[0]);
        expect(first()).toContain('"value":50');
        expect(first("left")).toContain('"value":100');
        expect(first("right")).toContain('"value":0');
        expect(ys("left")).toEqual(ys());
        expect(ys("right")).toEqual(ys());
        expect(xs("left")).not.toEqual(xs("right"));
    });

    it("draws the waves from the progress tokens, with no compound per thickness", () => {
        const clips = [
            [
                linearProgress.recipe.variants?.shape?.wavy?.indicator
                    ?.clipPath,
                ["linearProgress", "height", "amplitude"],
            ],
            [
                circularProgress.recipe.variants?.shape?.wavy?.endHalf
                    ?.clipPath,
                ["circularProgress", "thickness", "amplitude"],
            ],
        ] as const;
        for (const [clip, [name, ...read]] of clips) {
            for (const token of read) {
                expect(JSON.stringify(clip)).toContain(
                    `"path":["components","${name}","${token}"]`,
                );
            }
        }
        for (const compound of circularProgress.recipe.compoundVariants ?? []) {
            expect(compound.match).not.toHaveProperty("thickness");
        }
        // Only the indeterminate line's travelling wave, which no thickness changes.
        expect(
            linearProgress.recipe.compoundVariants?.map((c) => c.match),
        ).toEqual([{ shape: "wavy", indeterminate: "true" }]);
        expect(circularProgress.recipe.compoundVariants ?? []).toHaveLength(0);
    });
});

describe("loadingIndicator", () => {
    it("has the M3 parts: root, container, indicator", () => {
        expect(loadingIndicator.slots).toEqual([
            "root",
            "container",
            "indicator",
        ]);
        expect(
            Object.keys(loadingIndicator.recipe.variants?.variant ?? {}),
        ).toEqual(["uncontained", "contained"]);
        expect(loadingIndicator.recipe.compoundVariants ?? []).toHaveLength(0);
    });

    it("morphs through Material's seven shapes and back, two turns a cycle", () => {
        const frames = LOADING_INDICATOR_KEYFRAMES.loadingIndicatorMorph!;
        const keys = Object.keys(frames);
        expect(keys).toHaveLength(LOADING_INDICATOR_SHAPES.length + 1);
        expect(keys[0]).toBe("0%");
        expect(keys.at(-1)).toBe("100%");
        const shapes = keys.map((k) => frames[k]!.clipPath);
        // Every frame has one structure, so each animates into the next.
        expect(
            new Set(shapes.map((s) => JSON.stringify(structure(s)))).size,
        ).toBe(1);
        expect(shapes.at(-1)).toEqual(shapes[0]);
        expect(JSON.stringify(frames["100%"]!.transform)).toContain(
            '"value":720',
        );
    });

    it("keeps turning under reduced motion, without reshaping", () => {
        const animation = loadingIndicator.recipe.base?.indicator?.animation;
        const json = JSON.stringify(animation);
        expect(json).toContain('"reducedMotion"');
        expect(json).toContain("loadingIndicatorSpin");
        expect(json).toContain("loadingIndicatorMorph");
        expect(
            Object.keys(LOADING_INDICATOR_KEYFRAMES.loadingIndicatorSpin!),
        ).toEqual(["from", "to"]);
        for (const frame of Object.values(
            LOADING_INDICATOR_KEYFRAMES.loadingIndicatorSpin!,
        )) {
            expect(frame).not.toHaveProperty("clipPath");
        }
    });

    it("is a circle where a target can't clip to a shape", () => {
        const recipe = slotRecipe(loadingIndicator, "loadingIndicator");
        expect(JSON.stringify(recipe?.base?.indicator)).toContain("@supports");
        expect(recipe?.base?.indicator?.clipPath).toMatch(/^shape\(/);
    });

    it("colours the contained container and indicator from the group's tokens", () => {
        const recipe = slotRecipe(loadingIndicator, "loadingIndicator");
        expect(recipe?.variants?.variant?.contained?.container).toEqual({
            backgroundColor:
                "var(--components-loadingIndicator-containerColor, token(colors.primaryContainer))",
        });
        expect(recipe?.variants?.color?.tertiary?.root).toMatchObject({
            "--components-loadingIndicator-indicatorColor":
                "token(colors.tertiary)",
            "--components-loadingIndicator-containedIndicatorColor":
                "token(colors.onTertiaryContainer)",
        });
    });
});

describe("indeterminate progress tracks", () => {
    it("keeps the circular track while indeterminate, turning with the arc's value", () => {
        const indeterminate =
            circularProgress.recipe.variants?.indeterminate?.true;
        expect(indeterminate).not.toHaveProperty("track");
        expect(JSON.stringify(circularProgress.recipe.base?.track)).toContain(
            '"path":["components","circularProgress","value"]',
        );
    });

    it("leaves a gap on each side of the sliding linear indicator, on the web", () => {
        const track = linearProgress.recipe.variants?.indeterminate?.true
            ?.track as { rawRules?: { css?: Record<string, unknown> } };
        const css = JSON.stringify(track.rawRules?.css?.["&"]);
        // The track's color, less the indicator's width and a gap each side, at `slide`, which
        // the track animates in step with the indicator.
        expect(css).toContain('"type":"gradient"');
        expect(css).toContain('"path":["components","linearProgress","slide"]');
        expect(css).toContain('"path":["components","linearProgress","gap"]');
        expect(css).toContain(
            '"path":["components","linearProgress","indeterminateWidth"]',
        );
        expect(css).toContain("linearProgressTrackGap");
        expect(css).toContain("linearProgressTrackGapRtl");
        expect(PROGRESS_KEYFRAMES["linearProgressTrackGap"]).toEqual({
            from: {
                tokens: {
                    "components.linearProgress.slide": expect.anything(),
                },
            },
            to: {
                tokens: {
                    "components.linearProgress.slide": expect.anything(),
                },
            },
        });
    });
});

describe("wavy progress", () => {
    it("adds shape flat and wavy, flat by default, to both indicators", () => {
        for (const progress of [linearProgress, circularProgress]) {
            expect(Object.keys(progress.recipe.variants?.shape ?? {})).toEqual([
                "flat",
                "wavy",
            ]);
            expect(progress.recipe.defaultVariants?.shape).toBe("flat");
        }
    });

    it("clips the linear indicator to a wave, flat where clipping isn't drawn", () => {
        const wavy = linearProgress.recipe.variants?.shape?.wavy;
        expect(wavy?.indicator?.clipPath).toMatchObject({ type: "shape" });
        expect(JSON.stringify(wavy?.indicator?.top)).toContain("clipShape");
        // The wave reads the height, so a thick bar needs no compound; the indeterminate
        // line's wave travels along the track, clipping the root rather than the bar.
        expect(linearProgress.recipe.compoundVariants).toEqual([
            expect.objectContaining({
                match: { shape: "wavy", indeterminate: "true" },
            }),
        ]);
    });

    it("clips the circular halves to one wavy ring, the spinner too while indeterminate", () => {
        const wavy = circularProgress.recipe.variants?.shape?.wavy;
        // The halves clip, not the turning arcs, so the wave stays put in the circle and the
        // two halves' waves meet at the seam whatever the arcs' turns.
        expect(wavy?.endArc).not.toHaveProperty("clipPath");
        expect(wavy?.startArc).not.toHaveProperty("clipPath");
        const clip = (half: "endHalf" | "startHalf") =>
            wavy?.[half]?.clipPath as unknown as {
                type: string;
                base: { type: string; fillRule: string };
                cases: { value: unknown }[];
            };
        expect(clip("endHalf").type).toBe("conditional");
        expect(clip("endHalf").base).toMatchObject({
            type: "shape",
            fillRule: "evenodd",
        });
        // The end half is the right one (left under right to left), the start half the other.
        expect(clip("endHalf").base).toEqual(clip("startHalf").cases[0]!.value);
        expect(clip("startHalf").base).toEqual(clip("endHalf").cases[0]!.value);
        expect(clip("endHalf").base).not.toEqual(clip("startHalf").base);
        // The ring reads the thickness, and the spinner draws with the same arcs.
        expect(circularProgress.recipe.compoundVariants ?? []).toHaveLength(0);
    });
});
