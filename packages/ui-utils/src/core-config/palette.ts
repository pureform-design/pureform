// Generate a `@pureform/core` token fragment from a single seed color.
//
// `ui-utils` is a value generator that feeds primitives into a `CoreConfig`. A generated
// palette must be indistinguishable from a hand-authored fragment, so it emits the same plain
// AST nodes (`hct(...)` or `oklch(...)` colors, `alias(...)` references) and composes through
// `mergeConfigs`. The dependency only points toward core; core never depends back on this.

import { alias, hct, oklch } from "@pureform/core/ast";
import type { AliasNode, ColorNode } from "@pureform/core/ast";
import type { CoreConfig } from "@pureform/core/types";
import chroma from "chroma-js";

import { ColorScheme } from "../color-scheme";
import type { ColorSchemeMode } from "../color-scheme";
import type { HexColor } from "../types";

/** Color space the generated primitives are encoded in. `hct` preserves Material's generation
 *  space with no round-trip through hex; `oklch` re-encodes through chroma-js for a
 *  perceptually uniform space adapters can gamut-map. */
export type PaletteSpace = "hct" | "oklch";

export interface PaletteOptions {
    /** Which scheme mode seeds the primitive tokens. Default `"light"`. */
    mode?: ColorSchemeMode;
    /** Color space the primitives are encoded in. Default `"hct"`. */
    space?: PaletteSpace;
}

// Semantic role to the Material system color it binds to. The role names are framework-level
// (`brand`, `danger`), so a recipe aliases a role and stays independent of the Material tier.
const SEMANTIC_ROLES: Record<string, string> = {
    brand: "primary",
    onBrand: "onPrimary",
    accent: "secondary",
    onAccent: "onSecondary",
    danger: "negative",
    onDanger: "onNegative",
    surface: "surface",
    onSurface: "onSurface",
};

/** Build a `tokens` and `semanticTokens` fragment from a seed color. Primitives are every
 *  Material system color at the chosen mode; semantic roles alias into them so recipes bind to
 *  a role, not a raw tier. Compose it over a base config:
 *  `mergeConfigs(baseConfig, palette(seed))`. */
export const palette = (
    seed: HexColor,
    options: PaletteOptions = {},
): Pick<CoreConfig, "tokens" | "semanticTokens"> => {
    const { mode = "light", space = "hct" } = options;
    const scheme = ColorScheme.create({ source: seed });

    const colors: Record<string, ColorNode> = {};
    if (space === "oklch") {
        for (const [name, hex] of Object.entries(scheme.getAllHex(mode))) {
            const [l, c, h] = chroma(hex).oklch();
            // chroma reports hue as NaN for achromatic colors; pin it to 0 so the node stays valid.
            colors[name] = oklch(l, c, Number.isNaN(h) ? 0 : h);
        }
    } else {
        for (const [name, color] of Object.entries(scheme.getAllHct(mode))) {
            colors[name] = hct(color.hue, color.chroma, color.tone);
        }
    }

    const semanticColors: Record<string, AliasNode> = {};
    for (const [role, systemColor] of Object.entries(SEMANTIC_ROLES)) {
        if (systemColor in colors) {
            semanticColors[role] = alias("tokens", "colors", systemColor);
        }
    }

    return {
        tokens: { colors },
        semanticTokens: { colors: semanticColors },
    };
};
