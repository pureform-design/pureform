import { defineConfig, mergeConfigs, tokenValue } from "@pureform/core";
import { alias } from "@pureform/core/ast";
import type { ScalarNode } from "@pureform/core/ast";
import type { CoreConfig, Token } from "@pureform/core/types";
import { describe, expect, it } from "vitest";

import { elevation } from "./elevation";
import { palette } from "./palette";
import { typescale } from "./typescale";

const SEED = "#7c3aed" as const;

/** Unwrap a token entry and keep it only if it is a space-encoded color node. */
const asColor = (entry?: Token<ScalarNode>) => {
    if (!entry) return undefined;
    const node = tokenValue(entry);
    return "space" in node ? node : undefined;
};

describe("palette", () => {
    it("emits primitive color tokens in the hct space by default", () => {
        const brand = asColor(palette(SEED).tokens.colors?.primary);
        expect(brand?.type).toBe("color");
        expect(brand?.space).toBe("hct");
        expect(brand?.components).toHaveLength(3);
    });

    it("emits primitives in oklch when asked", () => {
        const brand = asColor(
            palette(SEED, { space: "oklch" }).tokens.colors?.primary,
        );
        expect(brand?.space).toBe("oklch");
    });

    it("binds semantic roles with aliases into the token tier", () => {
        expect(palette(SEED).semanticTokens.colors?.brand).toEqual({
            type: "alias",
            path: ["tokens", "colors", "primary"],
        });
    });

    it("binds the surface pair under names distinct from the primitives", () => {
        const { semanticTokens } = palette(SEED);
        expect(semanticTokens.colors?.canvas).toEqual({
            type: "alias",
            path: ["tokens", "colors", "surface"],
        });
        expect(semanticTokens.colors?.onCanvas).toEqual({
            type: "alias",
            path: ["tokens", "colors", "onSurface"],
        });
    });

    // Panda shares one `colors` namespace between tokens and semantic tokens, so a role that
    // reuses a primitive's name lowers to a self-reference.
    it("never names a semantic role after a primitive", () => {
        const { tokens, semanticTokens } = palette(SEED);
        const primitives = new Set(Object.keys(tokens.colors ?? {}));
        for (const role of Object.keys(semanticTokens.colors ?? {})) {
            expect(primitives.has(role), role).toBe(false);
        }
    });
});

describe("elevation", () => {
    it("resets level0 to no shadow", () => {
        const util = elevation().utilities?.shadowElevation;
        if (util?.kind !== "static") throw new Error("expected static utility");
        expect(util.values.level0?.boxShadow).toEqual({
            type: "keyword",
            value: "none",
        });
    });

    it("stacks three shadow layers for a raised level", () => {
        const util = elevation().utilities?.shadowElevation;
        if (util?.kind !== "static") throw new Error("expected static utility");
        const boxShadow = util.values.level2?.boxShadow;
        expect(boxShadow && "layers" in boxShadow).toBe(true);
        if (boxShadow && "layers" in boxShadow) {
            expect(boxShadow.layers).toHaveLength(3);
        }
    });

    it("draws each layer from the shadow color and its opacity token", () => {
        const util = elevation().utilities?.shadowElevation;
        if (util?.kind !== "static") throw new Error("expected static utility");
        const boxShadow = util.values.level1?.boxShadow;
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
            path: ["tokens", "colors", "shadow"],
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
        expect(asColor(merged.tokens.colors?.primary)?.type).toBe("color");
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

    it("encodes lengths with their unit and reads the family from a font token", () => {
        expect(typescale().textStyles?.labelLarge).toEqual({
            fontFamily: { type: "alias", path: ["fonts", "plain"] },
            fontSize: { type: "numeric", value: 14, unit: "px" },
            lineHeight: { type: "numeric", value: 1.25, unit: "rem" },
            letterSpacing: { type: "numeric", value: 0.00625, unit: "rem" },
            fontWeight: { type: "numeric", value: 500, unit: "none" },
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
