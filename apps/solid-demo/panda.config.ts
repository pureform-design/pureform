import { defineConfig } from "@pandacss/dev";
import basePreset from "@pandacss/preset-base";
import pandaPreset from "@pandacss/preset-panda";
import typographyPreset from "@pandacss/preset-typography";

import { pureformGeneratedPreset } from "./panda.pureform-generated";

export default defineConfig({
    presets: [
        basePreset,
        pandaPreset,
        typographyPreset(),
        pureformGeneratedPreset,
    ],

    // Whether to use css reset
    preflight: true,

    // Allow only tokens to properties with predefined tokens
    //strictTokens: true,

    // Allow only tokens to properties with predefined list of values in CSS
    strictPropertyValues: true,

    // Where to look for your css declarations
    include: ["./src/**/*.{js,jsx,ts,tsx}", "./pages/**/*.{js,jsx,ts,tsx}"],

    // Files to exclude
    exclude: [],
    // The output directory for your css system
    outdir: "./styled-system",
});
