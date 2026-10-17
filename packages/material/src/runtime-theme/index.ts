// Material themes generated at run time from a seed color: `<PureformProvider theme={seedTheme({
// seed: "#006A60" })}>`. This module is small; the color math loads with the generator, the first
// time a theme needs generating (on the server, or on the client when the theme changes).

import { defineRuntimeTheme } from "@pureform/styling";

import type { MaterialColorOptions } from "../providers";
import type { HexColor } from "../types";

/** A seed theme's input: plain data, hashed to name its scope. The same options as
 *  `materialColor`, less the color space (always `oklch`, which CSS reads). */
export type SeedThemeInput = {
    /** The color the whole palette is generated from. */
    readonly seed: HexColor;
    /** Seeds per color group; a built-in group is regenerated from its seed. A theme can't add
     *  groups the base config doesn't have: components only have variants for those. */
    readonly customSeeds?: MaterialColorOptions["customSeeds"];
    /** Fixed values for individual system colors, for both schemes or per scheme. */
    readonly overrides?: MaterialColorOptions["overrides"];
};

/** A Material color theme from a seed color, for a provider's `theme`. It changes every color
 *  token (both schemes) and leaves the rest of the config's tokens alone, so it draws as a
 *  named theme with `color: materialColor({ seed })` does. */
export const seedTheme = defineRuntimeTheme<SeedThemeInput>(
    "material-seed",
    () => import("./generate"),
);
