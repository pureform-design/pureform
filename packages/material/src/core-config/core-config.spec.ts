import { defineConfig, mergeConfigs, tokenValue } from "@pureform/core";
import { alias } from "@pureform/core/ast";
import type { ScalarNode } from "@pureform/core/ast";
import type { CoreConfig, Token } from "@pureform/core/types";
import { describe, expect, it } from "vitest";

import { elevation } from "./elevation";
import { palette, paletteColorGroups } from "./palette";
import { typescale } from "./typescale";

const SEED = "#7c3aed" as const;

/** Unwrap a token entry and keep it only if it is a space-encoded color node. */
const asColor = (entry?: Token<ScalarNode>) => {
    if (!entry) return undefined;
    const node = tokenValue(entry);
    return "space" in node ? node : undefined;
};

describe("palette", () => {
    it("emits a primitive per scheme in the hct space by default", () => {
        const { colors } = palette(SEED).tokens;
        for (const name of ["primaryLight", "primaryDark"]) {
            const color = asColor(colors?.[name]);
            expect(color?.space, name).toBe("hct");
            expect(color?.components).toHaveLength(3);
        }
        expect(colors?.primaryLight).not.toEqual(colors?.primaryDark);
    });

    it("emits primitives in oklch when asked", () => {
        const color = asColor(
            palette(SEED, { space: "oklch" }).tokens.colors?.primaryLight,
        );
        expect(color?.space).toBe("oklch");
    });

    it("switches each system color on the dark condition", () => {
        expect(palette(SEED).semanticTokens.colors?.primary).toEqual({
            type: "conditional",
            base: { type: "alias", path: ["tokens", "colors", "primaryLight"] },
            cases: [
                {
                    on: "dark",
                    value: {
                        type: "alias",
                        path: ["tokens", "colors", "primaryDark"],
                    },
                },
            ],
        });
    });

    it("fixes the scheme at build time when given a single mode", () => {
        const { tokens, semanticTokens } = palette(SEED, { mode: "dark" });
        expect(tokens.colors?.primaryLight).toBeUndefined();
        expect(semanticTokens.colors?.primary).toEqual({
            type: "alias",
            path: ["tokens", "colors", "primaryDark"],
        });
    });

    it("binds the framework roles to the semantic system colors", () => {
        const { semanticTokens } = palette(SEED);
        expect(semanticTokens.colors?.brand).toEqual({
            type: "alias",
            path: ["semanticTokens", "colors", "primary"],
        });
        expect(semanticTokens.colors?.canvas).toEqual({
            type: "alias",
            path: ["semanticTokens", "colors", "surface"],
        });
    });

    // Panda shares one `colors` namespace between tokens and semantic tokens, so a semantic
    // token that reuses a primitive's name lowers to a self-reference.
    it("never names a semantic token after a primitive", () => {
        const { tokens, semanticTokens } = palette(SEED);
        const primitives = new Set(Object.keys(tokens.colors ?? {}));
        for (const name of Object.keys(semanticTokens.colors ?? {})) {
            expect(primitives.has(name), name).toBe(false);
        }
    });
});

describe("palette color options", () => {
    it("adds every system color for a custom group", () => {
        const { tokens, semanticTokens } = palette(SEED, {
            customSeeds: { coral: "#FF7F50" },
        });
        for (const name of ["coral", "onCoral", "coralContainer"]) {
            expect(semanticTokens.colors?.[name], name).toBeDefined();
            expect(tokens.colors?.[`${name}Light`], name).toBeDefined();
        }
    });

    it("regenerates a built-in group from its custom seed", () => {
        const custom = palette(SEED, {
            customSeeds: { tertiary: { hex: "#00A86B", harmonize: false } },
        });
        expect(custom.tokens.colors?.tertiaryLight).not.toEqual(
            palette(SEED).tokens.colors?.tertiaryLight,
        );
        expect(custom.tokens.colors?.primaryLight).toEqual(
            palette(SEED).tokens.colors?.primaryLight,
        );
    });

    it("pins overridden system colors per scheme", () => {
        const { tokens } = palette(SEED, {
            space: "oklch",
            overrides: { surface: { dark: "#000000" } },
        });
        expect(asColor(tokens.colors?.surfaceDark)?.components[0]).toBe(0);
        expect(
            asColor(tokens.colors?.surfaceLight)?.components[0],
        ).toBeGreaterThan(0.9);
    });

    it("lists the key color groups, built-in first, then custom", () => {
        expect(
            paletteColorGroups({ coral: "#FF7F50", tertiary: "#00A86B" }),
        ).toEqual([
            "primary",
            "secondary",
            "tertiary",
            "positive",
            "notice",
            "negative",
            "info",
            "coral",
        ]);
    });
});

describe("elevation", () => {
    it("resets level0 to no shadow", () => {
        expect(elevation().semanticTokens.shadows?.level0).toEqual({
            type: "keyword",
            value: "none",
        });
    });

    it("applies each level through the shadow and tint tokens", () => {
        const util = elevation().utilities?.shadowElevation;
        if (util?.kind !== "static") throw new Error("expected static utility");
        expect(util.values.level2?.boxShadow).toEqual({
            type: "alias",
            path: ["semanticTokens", "shadows", "level2"],
        });
        expect(elevation().semanticTokens.colors?.elevationTintLevel2).toEqual({
            type: "keyword",
            value: "transparent",
        });
    });

    it("stacks three shadow layers for a raised level", () => {
        const boxShadow = elevation().semanticTokens.shadows?.level2;
        expect(boxShadow && "layers" in boxShadow).toBe(true);
        if (boxShadow && "layers" in boxShadow) {
            expect(boxShadow.layers).toHaveLength(3);
        }
    });

    it("draws each layer from the shadow color and its opacity token", () => {
        const boxShadow = elevation().semanticTokens.shadows?.level1;
        if (!boxShadow || !("layers" in boxShadow)) {
            throw new Error("expected a layered shadow");
        }
        expect(boxShadow.layers[0]?.color).toEqual({
            type: "colorMix",
            space: "srgb",
            base: { type: "keyword", value: "transparent" },
            with: {
                type: "alias",
                path: ["semanticTokens", "colors", "elevationShadow"],
            },
            amount: {
                type: "alias",
                path: ["tokens", "opacity", "elevationUmbra"],
            },
        });
    });

    it("emits the layer opacities as percent tokens", () => {
        expect(elevation().tokens.opacity?.elevationPenumbra).toEqual({
            type: "numeric",
            value: 14,
            unit: "%",
        });
    });

    it("binds the shadow color to the Material shadow by default", () => {
        expect(elevation().semanticTokens.colors?.elevationShadow).toEqual({
            type: "alias",
            path: ["semanticTokens", "colors", "shadow"],
        });
    });

    it("accepts a custom shadow color", () => {
        const custom = alias("tokens", "colors", "ink");
        expect(
            elevation({ shadowColor: custom }).semanticTokens.colors
                ?.elevationShadow,
        ).toBe(custom);
    });
});

describe("fragments compose with mergeConfigs", () => {
    it("layers a palette and an elevation utility over a base config", () => {
        const base: CoreConfig = {
            tokens: {},
            semanticTokens: {},
            components: {},
        };
        const merged = mergeConfigs(base, palette(SEED), elevation());
        expect(asColor(merged.tokens.colors?.primaryLight)?.type).toBe("color");
        expect(merged.semanticTokens.colors?.brand).toBeDefined();
        expect(merged.utilities?.shadowElevation).toBeDefined();
        // Every alias the elevation layers use resolves once a palette is composed in.
        expect(() => defineConfig(merged)).not.toThrow();
    });
});

describe("typescale", () => {
    it("emits a text style per Material role", () => {
        expect(Object.keys(typescale().textStyles ?? {})).toHaveLength(15);
    });

    it("encodes lengths with their unit as tokens the style reads", () => {
        const { tokens, textStyles } = typescale();
        expect(tokens.fontSize?.labelLarge).toEqual({
            type: "numeric",
            value: 14,
            unit: "px",
        });
        expect(tokens.lineHeight?.labelLarge).toEqual({
            type: "numeric",
            value: 1.25,
            unit: "rem",
        });
        expect(tokens.letterSpacing?.labelLarge).toEqual({
            type: "numeric",
            value: 0.00625,
            unit: "rem",
        });
        expect(tokens.fontWeight?.labelLarge).toEqual({
            type: "numeric",
            value: 500,
            unit: "none",
        });
        expect(textStyles?.labelLarge).toEqual({
            fontFamily: { type: "alias", path: ["fonts", "plain"] },
            fontSize: {
                type: "alias",
                path: ["tokens", "fontSize", "labelLarge"],
            },
            lineHeight: {
                type: "alias",
                path: ["tokens", "lineHeight", "labelLarge"],
            },
            letterSpacing: {
                type: "alias",
                path: ["tokens", "letterSpacing", "labelLarge"],
            },
            fontWeight: {
                type: "alias",
                path: ["tokens", "fontWeight", "labelLarge"],
            },
        });
    });

    it("emits a font token per role and points each style at its role", () => {
        const { fonts, textStyles } = typescale();
        expect(Object.keys(fonts ?? {})).toEqual(["brand", "plain"]);
        expect(textStyles?.titleLarge?.fontFamily).toEqual({
            type: "alias",
            path: ["fonts", "brand"],
        });
    });

    it("adds font roles and text styles", () => {
        const { fonts, textStyles } = typescale({
            fonts: {
                mono: { families: ["JetBrains Mono"], generic: "monospace" },
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
        });
        expect(fonts?.mono).toMatchObject({
            stack: ["JetBrains Mono"],
            generic: "monospace",
        });
        expect(Object.keys(textStyles ?? {})).toHaveLength(16);
        expect(textStyles?.code?.fontFamily).toEqual({
            type: "alias",
            path: ["fonts", "mono"],
        });
    });

    it("validates once composed into a config", () => {
        expect(() =>
            defineConfig(
                mergeConfigs(
                    { tokens: {}, semanticTokens: {}, components: {} },
                    typescale(),
                ),
            ),
        ).not.toThrow();
    });
});
