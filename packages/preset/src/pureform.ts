// pureform as one composed config: the Material palette, elevation and type scale, pureform's
// foundation and state-layer tokens, and every component, validated together.
//
// The result is a plain `CoreConfig`, so it compiles to any target. For Panda, pass it to
// `compilePreset` from `@pureform/panda-adapter`. Layer brand or app overrides on top with
// `mergeConfigs`.

import { defineConfig, mergeConfigs } from "@pureform/core";
import { alias } from "@pureform/core/ast";
import type { CoreConfig } from "@pureform/core/types";
import { elevation, palette, typescale } from "@pureform/material";
import type { HexColor, PaletteMode } from "@pureform/material";

import { button } from "./components/button";
import { card } from "./components/card";
import { iconButton } from "./components/icon-button";
import { ripple } from "./components/ripple";
import { scrim } from "./components/scrim";
import { foundation } from "./foundation";
import { stateLayerTokens } from "./state-layer";

export interface PureformOptions {
    /** Seed color the whole palette is generated from. Default Material's baseline purple. */
    seed?: HexColor;
    /** Which schemes to generate. Default `"both"`: the page follows the system preference,
     *  and a `.light` or `.dark` class on `<html>` overrides it. A single mode fixes the scheme
     *  at build time. */
    mode?: PaletteMode;
}

const DEFAULT_SEED: HexColor = "#6750A4";

/** Build the full pureform config. Every alias resolves, or this throws naming the bad path. */
export const pureform = (options: PureformOptions = {}): CoreConfig => {
    const { seed = DEFAULT_SEED, mode = "both" } = options;

    return defineConfig(
        mergeConfigs(
            { tokens: {}, semanticTokens: {}, components: {} },
            foundation(),
            // oklch rather than hct: the Panda adapter can render oklch to CSS, but not hct.
            palette(seed, { mode, space: "oklch" }),
            elevation(),
            typescale(),
            stateLayerTokens(),
            {
                componentBaseStyles: { fontFamily: alias("fonts", "plain") },
                components: { button, iconButton, card, scrim, ripple },
            },
        ),
    );
};
