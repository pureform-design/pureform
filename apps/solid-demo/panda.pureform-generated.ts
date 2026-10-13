// Panda preset generated from a pureform CoreConfig by the adapter.
//
// This proves the Layer 1 -> Layer 2 path end to end: `@pureform/material` generates the color
// primitives, the canonical button is composed over them, and the adapter compiles the whole
// config to a Panda preset.

import { mergeConfigs } from "@pureform/core";
import { alias } from "@pureform/core/ast";
import { buttonConfig } from "@pureform/core/fixtures/button";
import { elevation, palette } from "@pureform/material";
import { compilePreset } from "@pureform/panda-adapter";

// `@pureform/material` is the value generator: a seed color yields the primitive palette (oklch, which the
// adapter can lower to CSS) and the Material elevation utility.
const ui = palette("#AD32F0", { space: "oklch" });

const demoConfig = mergeConfigs(
    buttonConfig,
    // Feed the generated primitives in as additional color tokens.
    {
        tokens: { colors: ui.tokens.colors },
        semanticTokens: { colors: ui.semanticTokens.colors },
    },
    // Replace the elevation utility with the Material-generated one.
    elevation(),
    // Drive the button's brand from the generated palette.
    {
        semanticTokens: {
            colors: {
                brand: alias("tokens", "colors", "primary"),
                onBrand: alias("tokens", "colors", "onPrimary"),
            },
        },
    },
);

export const pureformGeneratedPreset = compilePreset(demoConfig, {
    name: "pureform-generated",
    prefix: "pfg",
});
