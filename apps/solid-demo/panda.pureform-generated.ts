// Panda preset generated from a pureform CoreConfig by the adapter.
//
// This proves the Layer 1 -> Layer 2 path end to end: ui-utils generates the color primitives,
// the canonical button is composed over them, and the adapter compiles the whole config to a
// Panda preset. The hand-written `@pureform/pandacss-preset` is left untouched; this preset is
// added alongside it.

import { mergeConfigs } from "@pureform/core";
import { alias } from "@pureform/core/ast";
import { buttonConfig } from "@pureform/core/fixtures/button";
import { compilePreset } from "@pureform/panda-adapter";
import { elevation, palette } from "@pureform/ui-utils";

// ui-utils is the value generator: a seed color yields the primitive palette (oklch, which the
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
