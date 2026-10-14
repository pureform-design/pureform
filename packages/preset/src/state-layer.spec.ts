import { defineConfig, mergeConfigs } from "@pureform/core";
import { alias, hex } from "@pureform/core/ast";
import type { CoreConfig } from "@pureform/core/types";
import { materialState } from "@pureform/material";
import { compileStyleMap } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { stateLayer } from "./state-layer";

const base = alias("semanticTokens", "colors", "brand");
const content = alias("semanticTokens", "colors", "onBrand");

const config: CoreConfig = mergeConfigs(
    {
        tokens: { colors: { violet: hex("#7c3aed"), white: hex("#ffffff") } },
        semanticTokens: {
            colors: {
                brand: alias("tokens", "colors", "violet"),
                onBrand: alias("tokens", "colors", "white"),
            },
        },
        components: {},
    },
    { tokens: { opacity: materialState().generate({} as never).opacities } },
);

describe("stateLayer", () => {
    it("keeps the base color when no state applies", () => {
        expect(stateLayer({ base, content }).base).toBe(base);
    });

    it("tints the base with the content color per state", () => {
        const layer = stateLayer({ base, content });
        expect(layer.cases.map((c) => c.on)).toEqual([
            "hover",
            "focusVisible",
            "pressed",
            "dragged",
        ]);
        expect(layer.cases[2]?.value).toEqual({
            type: "colorMix",
            space: "srgb",
            base,
            with: content,
            amount: {
                type: "alias",
                path: ["tokens", "opacity", "statePressed"],
            },
        });
    });

    it("resolves against the state layer tokens", () => {
        expect(() => defineConfig(config)).not.toThrow();
    });

    it("lowers to a Panda conditional background", () => {
        const css = compileStyleMap(
            { backgroundColor: stateLayer({ base, content }) },
            { config, target: "css", refStyle: "fn", prefix: undefined },
        );
        expect(css).toEqual({
            backgroundColor: {
                base: "token(colors.brand)",
                _hover: "color-mix(in srgb, token(colors.brand), token(colors.onBrand) token(opacity.stateHover))",
                _focusVisible:
                    "color-mix(in srgb, token(colors.brand), token(colors.onBrand) token(opacity.stateFocus))",
                _active:
                    "color-mix(in srgb, token(colors.brand), token(colors.onBrand) token(opacity.statePressed))",
                _dragging:
                    "color-mix(in srgb, token(colors.brand), token(colors.onBrand) token(opacity.stateDragged))",
            },
        });
    });
});
