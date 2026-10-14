// A complete config for component specs: every token tier pureform components read, plus the
// components under test.

import { defineConfig, mergeConfigs } from "@pureform/core";
import type { AnyComponentSpec, CoreConfig } from "@pureform/core/types";
import {
    materialColor,
    materialElevation,
    materialLayout,
    materialMotion,
    materialShape,
    materialState,
    materialTypescale,
} from "@pureform/material";
import { resolveTheme } from "@pureform/theme";

const theme = resolveTheme({
    color: materialColor(),
    typography: materialTypescale(),
    shape: materialShape(),
    layout: materialLayout(),
    state: materialState(),
    motion: materialMotion(),
    elevation: materialElevation(),
});

export const configWith = (...components: AnyComponentSpec[]): CoreConfig =>
    defineConfig(
        mergeConfigs(
            { tokens: {}, semanticTokens: {}, components: {} },
            theme.config,
            {
                components: Object.fromEntries(
                    components.map((c) => [c.name, c]),
                ),
            },
        ),
    );
