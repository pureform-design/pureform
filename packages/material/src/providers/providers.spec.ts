import { cubicBezier, numeric, pct, px } from "@pureform/core/ast";
import { resolveTheme } from "@pureform/theme";
import { describe, expect, it } from "vitest";

import {
    materialColor,
    materialElevation,
    materialMotion,
    materialShape,
    materialState,
    materialTypescale,
} from ".";

const material = () => ({
    color: materialColor(),
    typography: materialTypescale(),
    shape: materialShape(),
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
            state: materialState({ stateHover: 6 }),
            motion: materialMotion({
                durations: { medium2: 200 },
                easings: { bounce: cubicBezier([0.3, 1.5, 0.6, 1]) },
            }),
        });
        expect(theme.shape.radii.medium).toEqual(px(10));
        expect(theme.shape.radii.pill).toEqual(px(999));
        expect(theme.state.opacities.stateHover).toEqual(pct(6));
        expect(theme.motion.durations.medium2).toEqual(numeric(200, "ms"));
        expect(theme.motion.easings.bounce).toBeDefined();
    });
});
