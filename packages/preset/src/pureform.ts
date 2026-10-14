// pureform as one composed config: the Material palette, elevation and type scale, pureform's
// foundation and state-layer tokens, and every component, validated together.
//
// The result is a plain `CoreConfig`, so it compiles to any target. For Panda, pass it to
// `compilePreset` from `@pureform/panda-adapter`. Layer brand or app overrides on top with
// `mergeConfigs`.

import { defineConfig, mergeConfigs } from "@pureform/core";
import { alias } from "@pureform/core/ast";
import type { CoreConfig } from "@pureform/core/types";
import {
    elevation,
    palette,
    paletteColorGroups,
    typescale,
} from "@pureform/material";
import type { HexColor, PaletteMode, PaletteOptions } from "@pureform/material";

import { createButton } from "./components/button";
import { card } from "./components/card";
import { createIconButton } from "./components/icon-button";
import { ripple } from "./components/ripple";
import { scrim } from "./components/scrim";
import { foundation } from "./foundation";
import { stateLayerTokens } from "./state-layer";

export interface PureformOptions<
    TCustomColorGroups extends string = never,
> extends Pick<
    PaletteOptions<TCustomColorGroups>,
    "customSeeds" | "overrides"
> {
    /** Seed color the whole palette is generated from. Default Material's baseline purple. */
    seed?: HexColor;
    /** Which schemes to generate. Default `"both"`: the page follows the system preference,
     *  and a `.light` or `.dark` class on `<html>` overrides it. A single mode fixes the scheme
     *  at build time. */
    mode?: PaletteMode;
}

const DEFAULT_SEED: HexColor = "#6750A4";

/** Build the full pureform config. Every alias resolves, or this throws naming the bad path.
 *
 *  `customSeeds` and `overrides` reach the palette, and every new group in `customSeeds`
 *  also becomes a `color` variant of the button and icon button, for example
 *  `button({ color: "coral" })`. */
export const pureform = <TCustomColorGroups extends string = never>(
    options: PureformOptions<TCustomColorGroups> = {},
): CoreConfig => {
    const {
        seed = DEFAULT_SEED,
        mode = "both",
        customSeeds,
        overrides,
    } = options;
    const groups = paletteColorGroups(customSeeds);

    return defineConfig(
        mergeConfigs(
            { tokens: {}, semanticTokens: {}, components: {} },
            foundation(),
            // oklch rather than hct: the Panda adapter can render oklch to CSS, but not hct.
            palette(seed, {
                mode,
                space: "oklch",
                ...(customSeeds ? { customSeeds } : {}),
                ...(overrides ? { overrides } : {}),
            }),
            elevation(),
            typescale(),
            stateLayerTokens(),
            {
                componentBaseStyles: { fontFamily: alias("fonts", "plain") },
                components: {
                    button: createButton(groups),
                    iconButton: createIconButton(groups),
                    card,
                    scrim,
                    ripple,
                },
            },
        ),
    );
};
