// A complete config for component specs: every token tier pureform components read, plus the
// components under test.

import { defineConfig, mergeConfigs } from "@pureform/core";
import type { AnyComponentSpec, CoreConfig } from "@pureform/core/types";
import { elevation, palette, typescale } from "@pureform/material";

import { foundation } from "../foundation";
import { stateLayerTokens } from "../state-layer";

export const configWith = (...components: AnyComponentSpec[]): CoreConfig =>
    defineConfig(
        mergeConfigs(
            { tokens: {}, semanticTokens: {}, components: {} },
            foundation(),
            palette("#6750A4", { space: "oklch" }),
            elevation(),
            typescale(),
            stateLayerTokens(),
            {
                components: Object.fromEntries(
                    components.map((c) => [c.name, c]),
                ),
            },
        ),
    );
