import { linearEasingAt } from "@pureform/core";
import {
    cubicBezier,
    spring,
    none,
    numeric,
    pct,
    px,
    rem,
    transparent,
} from "@pureform/core/ast";
import { resolveTheme } from "@pureform/theme";
import { describe, expect, it } from "vitest";

import {
    MATERIAL_EASINGS,
    materialColor,
    materialElevation,
    materialLayout,
    materialMotion,
    materialShape,
    materialState,
    materialTypescale,
} from ".";

const material = () => ({
    color: materialColor(),
    typography: materialTypescale(),
    shape: materialShape(),
    layout: materialLayout(),
    state: materialState(),
    motion: materialMotion(),
    elevation: materialElevation(),
});

describe("Material providers", () => {
    it("fill every contract", () => {
        expect(() => resolveTheme(material())).not.toThrow();
    });

    it("lower to the same tokens as the fragment generators", () => {
        const { config } = resolveTheme(material());
        expect(config.semanticTokens.colors?.onPrimaryContainer).toMatchObject({
            type: "conditional",
        });
        expect(config.tokens.colors?.primaryDark).toMatchObject({
            type: "color",
            space: "oklch",
        });
        expect(config.semanticTokens.colors?.elevationShadow).toBeDefined();
        expect(config.tokens.opacity?.elevationUmbra).toEqual(pct(20));
        expect(config.textStyles?.titleLarge?.fontFamily).toEqual({
            type: "alias",
            path: ["fonts", "brand"],
        });
        expect(config.tokens.fontSize?.titleLarge).toEqual(rem(1.375));
        expect(config.semanticTokens.shadows?.level2).toMatchObject({
            type: "shadow",
        });
        expect(config.semanticTokens.shadows?.level0).toEqual(none);
        expect(config.semanticTokens.colors?.elevationTintLevel2).toEqual(
            transparent,
        );
    });

    it("carry custom color groups", () => {
        const theme = resolveTheme({
            ...material(),
            color: materialColor({ customSeeds: { coral: "#FF7F50" } }),
        });
        expect(theme.color.groups).toContain("coral");
        expect(
            theme.config.semanticTokens.colors?.onCoralContainer,
        ).toBeDefined();
    });

    it("carry added font roles and text styles", () => {
        const theme = resolveTheme({
            ...material(),
            typography: materialTypescale({
                fonts: {
                    mono: {
                        families: ["JetBrains Mono"],
                        generic: "monospace",
                    },
                },
                custom: {
                    code: {
                        font: "mono",
                        fontSize: "0.875rem",
                        lineHeight: "1.25rem",
                        letterSpacing: "0rem",
                        fontWeight: 400,
                    },
                },
            }),
        });
        expect(theme.typography.styles.code.font).toBe("mono");
        expect(theme.config.fonts?.mono).toBeDefined();
    });

    it("take changed and added values", () => {
        const theme = resolveTheme({
            ...material(),
            shape: materialShape({ medium: 10, pill: 999 }),
            layout: materialLayout({ grid: 5, sizes: { touchTarget: 44 } }),
            state: materialState(
                { stateHover: 6 },
                { focusIndicatorThickness: 4 },
            ),
            motion: materialMotion({
                durations: { medium2: 200 },
                easings: { bounce: cubicBezier([0.3, 1.5, 0.6, 1]) },
            }),
        });
        expect(theme.shape.radii.medium).toEqual(px(10));
        expect(theme.shape.radii.pill).toEqual(px(999));
        expect(theme.layout.spacing["4"]).toEqual(px(20));
        expect(theme.layout.sizes.touchTarget).toEqual(px(44));
        expect(theme.state.opacities.stateHover).toEqual(pct(6));
        expect(theme.state.focusIndicator.focusIndicatorThickness).toEqual(
            px(4),
        );
        expect(theme.state.focusIndicator.focusIndicatorOuterOffset).toEqual(
            px(2),
        );
        expect(theme.config.tokens.sizes.focusIndicatorThickness).toEqual(
            px(4),
        );
        expect(theme.motion.durations.medium2).toEqual(numeric(200, "ms"));
        expect(theme.motion.easings.bounce).toBeDefined();
    });

    it("gives M3's springs for each motion scheme, standard by default", () => {
        const springs = (options?: Parameters<typeof materialMotion>[0]) =>
            resolveTheme({ ...material(), motion: materialMotion(options) })
                .motion.springs;
        const physics = (s: { stiffness: number; damping: number }) => [
            s.stiffness,
            s.damping,
        ];
        expect(physics(springs().spatialFast)).toEqual([1400, 0.9]);
        expect(physics(springs().spatialDefault)).toEqual([700, 0.9]);
        expect(physics(springs().spatialSlow)).toEqual([300, 0.9]);
        expect(physics(springs().effectsFast)).toEqual([3800, 1]);
        expect(physics(springs().effectsDefault)).toEqual([1600, 1]);
        expect(physics(springs().effectsSlow)).toEqual([800, 1]);
        const expressive = springs({ scheme: "expressive" });
        expect(physics(expressive.spatialFast)).toEqual([800, 0.6]);
        expect(physics(expressive.spatialDefault)).toEqual([380, 0.8]);
        expect(physics(expressive.spatialSlow)).toEqual([200, 0.8]);
        expect(physics(expressive.effectsDefault)).toEqual([1600, 1]);
        expect(
            springs({
                scheme: "expressive",
                springs: { spatialFast: spring({ stiffness: 1, damping: 1 }) },
            }).spatialFast.stiffness,
        ).toBe(1);
        expect(springs().spatialFast.mass).toBe(1);
    });

    it("draws emphasized along M3's two-segment path", () => {
        const emphasized = MATERIAL_EASINGS.emphasized;
        if (emphasized.kind !== "linear") throw new Error("not linear()");
        // Points on the path, from each segment's parameter.
        const cubic = (p: number[], t: number) =>
            (1 - t) ** 3 * p[0]! +
            3 * (1 - t) ** 2 * t * p[1]! +
            3 * (1 - t) * t * t * p[2]! +
            t ** 3 * p[3]!;
        const segments = [
            [
                [0, 0.05, 0.133333, 0.166666],
                [0, 0, 0.06, 0.4],
            ],
            [
                [0.166666, 0.208333, 0.25, 1],
                [0.4, 0.82, 1, 1],
            ],
        ];
        for (const [xs, ys] of segments) {
            for (let i = 0; i <= 50; i++) {
                const t = i / 50;
                expect(
                    Math.abs(
                        linearEasingAt(emphasized.points, cubic(xs!, t)) -
                            cubic(ys!, t),
                    ),
                ).toBeLessThan(0.0012);
            }
        }
        // It's no longer the standard curve.
        expect(emphasized).not.toEqual(MATERIAL_EASINGS.standard);
    });

    it("draw the focus indicator inside the element for an inset focus ring", () => {
        const focus = (state: ReturnType<typeof materialState>) =>
            resolveTheme({ ...material(), state }).state.focusIndicator;
        expect(focus(materialState({}, {}, { focusRing: "outer" }))).toEqual(
            focus(materialState()),
        );
        expect(focus(materialState({}, {}, { focusRing: "inset" }))).toEqual({
            focusIndicatorThickness: px(3),
            focusIndicatorOuterOffset: px(-3),
        });
    });
});
