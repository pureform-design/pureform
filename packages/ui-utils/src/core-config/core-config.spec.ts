import { mergeConfigs, tokenValue } from "@pureform/core";
import type { ScalarNode } from "@pureform/core/ast";
import type { CoreConfig, Token } from "@pureform/core/types";
import { describe, expect, it } from "vitest";

import { elevation } from "./elevation";
import { palette } from "./palette";

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
    });
});
