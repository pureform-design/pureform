// A complete config for component specs: every token tier pureform components read, plus the
// components under test.

import { defineConfig, mergeConfigs } from "@pureform/core";
import type { AnyComponentSpec, CoreConfig } from "@pureform/core/types";
import {
    materialColor,
    materialElevation,
    materialMotion,
    materialShape,
    materialState,
    materialTypescale,
} from "@pureform/material";
import { resolveTheme } from "@pureform/theme";

import { foundation } from "../foundation";

const theme = resolveTheme({
    color: materialColor(),
    typography: materialTypescale(),
    shape: materialShape(),
    state: materialState(),
    motion: materialMotion(),
    elevation: materialElevation(),
});

export const configWith = (...components: AnyComponentSpec[]): CoreConfig =>
    defineConfig(
        mergeConfigs(
            { tokens: {}, semanticTokens: {}, components: {} },
            foundation(),
            theme.config,
            {
                components: Object.fromEntries(
                    components.map((c) => [c.name, c]),
                ),
            },
        ),
    );
