// Generate a `@pureform/core` token fragment from a single seed color.
//
// `@pureform/material` is a value generator that feeds primitives into a `CoreConfig`. A generated
// palette must be indistinguishable from a hand-authored fragment, so it emits the same plain
// AST nodes (`hct(...)` or `oklch(...)` colors, `alias(...)` references) and composes through
// `mergeConfigs`. The dependency only points toward core; core never depends back on this.

import { alias, hct, oklch, when } from "@pureform/core/ast";
import type { AliasNode, ColorNode, ValueNode } from "@pureform/core/ast";
import type { CoreConfig } from "@pureform/core/types";
import { BASE_COLOR_GROUPS } from "@pureform/theme";
import chroma from "chroma-js";

import { ColorScheme } from "../color-scheme";
import type { ColorSchemeArgs, ColorSchemeMode } from "../color-scheme";
import type { BaseKeyColorGroup, HexColor } from "../types";

/** Color space the generated primitives are encoded in. `hct` preserves Material's generation
 *  space with no round-trip through hex; `oklch` re-encodes through chroma-js for a
 *  perceptually uniform space adapters can gamut-map. */
export type PaletteSpace = "hct" | "oklch";

/** Which schemes to generate. `"both"` lets the page follow the system preference or a toggle
 *  at runtime; a single mode fixes the scheme at build time. */
export type PaletteMode = ColorSchemeMode | "both";

export interface PaletteOptions<TCustomColorGroups extends string = never> {
    /** Which schemes to generate. Default `"both"`. */
    mode?: PaletteMode;
    /** Color space the primitives are encoded in. Default `"hct"`. */
    space?: PaletteSpace;
    /** Seeds per color group. A built-in group (`tertiary`, `error`) is regenerated from
     *  its seed; a new name (`brandAlt`) adds a group with its full set of system colors. A
     *  bare hex is harmonized toward the main seed; `{ hex, harmonize: false }` keeps it. */
    customSeeds?: ColorSchemeArgs<TCustomColorGroups>["customSeeds"];
    /** Fixed values for individual system colors, for both schemes or per scheme:
     *  `{ surface: "#ffffff" }` or `{ primary: { dark: "#a0c4ff" } }`. */
    overrides?: ColorSchemeArgs<TCustomColorGroups>["overrides"];
}

/** The color groups a palette generates key colors for: the built-in accent and semantic
 *  groups, then any new groups named in `customSeeds`, in order. Neutral groups are left out,
 *  since components tint with key colors only. */
export const paletteColorGroups = <TCustomColorGroups extends string = never>(
    customSeeds: PaletteOptions<TCustomColorGroups>["customSeeds"] = {},
): (BaseKeyColorGroup | TCustomColorGroups)[] => {
    const groups: string[] = [...BASE_COLOR_GROUPS];
    for (const name of Object.keys(customSeeds)) {
        if (
            !groups.includes(name) &&
            name !== "neutral" &&
            name !== "neutralVariant"
        ) {
            groups.push(name);
        }
    }
    return groups as (BaseKeyColorGroup | TCustomColorGroups)[];
};

// Semantic role to the Material system color it binds to. The role names are framework-level
// (`brand`, `danger`), so a recipe aliases a role and stays independent of the Material tier.
//
// A role name must never equal a system color name. Panda puts tokens and semantic tokens in
// one `colors` namespace, so a role named `surface` aliasing the `surface` system color lowers
// to `{colors.surface}` pointing at itself. That is why the default surface pair is
// `canvas`/`onCanvas` (Material already uses `background`).
const SEMANTIC_ROLES: Record<string, string> = {
    brand: "primary",
    onBrand: "onPrimary",
    accent: "secondary",
    onAccent: "onSecondary",
    danger: "error",
    onDanger: "onError",
    canvas: "surface",
    onCanvas: "onSurface",
};

const MODES: ColorSchemeMode[] = ["light", "dark"];

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The primitive token name for a system color in one scheme, for example `primaryDark`. */
export const schemeColorName = (
    systemColor: string,
    mode: ColorSchemeMode,
): string => `${systemColor}${capitalize(mode)}`;

const primitives = (
    scheme: ColorScheme<string>,
    mode: ColorSchemeMode,
    space: PaletteSpace,
): Record<string, ColorNode> => {
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
    return colors;
};

/** Build a `tokens` and `semanticTokens` fragment from a seed color.
 *
 *  Every Material system color is emitted as a primitive per scheme (`primaryLight`,
 *  `primaryDark`) and as a semantic token under its plain name (`primary`) that picks the
 *  scheme through the `dark` condition. Recipes alias the semantic token, so they follow the
 *  scheme with no scheme-awareness of their own. The framework roles (`brand`, `canvas`)
 *  alias the semantic system colors. `customSeeds` and `overrides` pass through to
 *  `ColorScheme`, so custom groups get the same primitives and semantic tokens as the built-in
 *  ones. Compose it over a base config:
 *  `mergeConfigs(baseConfig, palette(seed))`. */
export const palette = <TCustomColorGroups extends string = never>(
    seed: HexColor,
    options: PaletteOptions<TCustomColorGroups> = {},
): Pick<CoreConfig, "tokens" | "semanticTokens"> => {
    const { mode = "both", space = "hct", customSeeds, overrides } = options;
    const scheme = ColorScheme.create<TCustomColorGroups>({
        source: seed,
        ...(customSeeds ? { customSeeds } : {}),
        ...(overrides ? { overrides } : {}),
    });
    const modes = mode === "both" ? MODES : [mode];

    const colors: Record<string, ColorNode> = {};
    for (const m of modes) {
        for (const [name, node] of Object.entries(
            primitives(scheme, m, space),
        )) {
            colors[schemeColorName(name, m)] = node;
        }
    }

    const systemColors = Object.keys(scheme.getAllHex("light"));
    const semanticColors: Record<string, ValueNode> = {};
    for (const name of systemColors) {
        const ref = (m: ColorSchemeMode): AliasNode =>
            alias("tokens", "colors", schemeColorName(name, m));
        semanticColors[name] =
            mode === "both"
                ? when("dark", ref("dark"), ref("light"))
                : ref(mode);
    }
    for (const [role, systemColor] of Object.entries(SEMANTIC_ROLES)) {
        if (systemColor in semanticColors) {
            semanticColors[role] = alias(
                "semanticTokens",
                "colors",
                systemColor,
            );
        }
    }

    return {
        tokens: { colors },
        semanticTokens: { colors: semanticColors },
    };
};
