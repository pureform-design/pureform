import { defineConfig, mergeConfigs } from "@pureform/core";
import { alias, hex } from "@pureform/core/ast";
import type { CoreConfig } from "@pureform/core/types";
import { materialState } from "@pureform/material";
import { compileStyleMap, pandaContext } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { INDICATION_TOKENS, stateLayer, themeIndication } from "./state-layer";

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
        expect(stateLayer(themeIndication, { base, content }).base).toBe(base);
    });

    it("tints the base with the content color per state", () => {
        const layer = stateLayer(themeIndication, { base, content });
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

    it("reads the opacities through the tokens it's given", () => {
        const layer = stateLayer(
            (token) => alias("components", "button", token),
            { base, content },
        );
        expect(layer.cases.map((c) => c.value)).toEqual(
            (
                [
                    "stateHoverOpacity",
                    "stateFocusOpacity",
                    "statePressedOpacity",
                    "stateDraggedOpacity",
                ] as const
            ).map((token) => ({
                type: "colorMix",
                space: "srgb",
                base,
                with: content,
                amount: alias("components", "button", token),
            })),
        );
    });

    it("defaults the indication tokens to the theme's", () => {
        expect(INDICATION_TOKENS).toEqual({
            stateHoverOpacity: alias("tokens", "opacity", "stateHover"),
            stateFocusOpacity: alias("tokens", "opacity", "stateFocus"),
            statePressedOpacity: alias("tokens", "opacity", "statePressed"),
            stateDraggedOpacity: alias("tokens", "opacity", "stateDragged"),
            focusIndicatorThickness: alias(
                "tokens",
                "sizes",
                "focusIndicatorThickness",
            ),
            focusIndicatorOuterOffset: alias(
                "tokens",
                "sizes",
                "focusIndicatorOuterOffset",
            ),
            focusIndicatorColor: alias("semanticTokens", "colors", "secondary"),
        });
    });

    it("resolves against the state layer tokens", () => {
        expect(() => defineConfig(config)).not.toThrow();
    });

    it("lowers to a conditional background keyed by selector", () => {
        const css = compileStyleMap(
            { backgroundColor: stateLayer(themeIndication, { base, content }) },
            pandaContext(config),
        );
        expect(css).toEqual({
            backgroundColor: {
                base: "token(colors.brand)",
                "&:is(:hover, [data-pf-hover])":
                    "color-mix(in srgb, token(colors.brand), token(colors.onBrand) token(opacity.stateHover))",
                "&:focus-visible":
                    "color-mix(in srgb, token(colors.brand), token(colors.onBrand) token(opacity.stateFocus))",
                "&:is(:active, [data-pf-active])":
                    "color-mix(in srgb, token(colors.brand), token(colors.onBrand) token(opacity.statePressed))",
                "&[data-pf-dragging][data-pf-dragging]":
                    "color-mix(in srgb, token(colors.brand), token(colors.onBrand) token(opacity.stateDragged))",
            },
        });
    });
});
