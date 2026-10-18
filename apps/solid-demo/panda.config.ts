import { defineConfig } from "@pandacss/dev";
import basePreset from "@pandacss/preset-base";
import pandaPreset from "@pandacss/preset-panda";
import typographyPreset from "@pandacss/preset-typography";

import { staticCss } from "./.pureform/panda";
import { pureformPreset } from "./panda.pureform";

export default defineConfig({
    presets: [basePreset, pandaPreset, typographyPreset(), pureformPreset],

    // Whether to use css reset
    preflight: true,

    // pureform leaves document styling to the app: paint the page with the palette's canvas
    // pair so components sit on the surface they were designed for.
    globalCss: {
        "html, body": {
            backgroundColor: "canvas",
            color: "onCanvas",
        },
    },

    // The settings panel's side sheet slides in from the inline end (`--sheet-offset`, negative
    // under `rtl`) and back out.
    theme: {
        extend: {
            keyframes: {
                sheetIn: {
                    from: { transform: "translateX(var(--sheet-offset))" },
                    to: { transform: "translateX(0)" },
                },
                sheetOut: {
                    from: { transform: "translateX(0)" },
                    to: { transform: "translateX(var(--sheet-offset))" },
                },
            },
        },
    },

    // Allow only tokens to properties with predefined tokens
    //strictTokens: true,

    // Allow only tokens to properties with predefined list of values in CSS
    strictPropertyValues: true,

    // Where to look for your css declarations
    include: ["./src/**/*.{js,jsx,ts,tsx}", "./pages/**/*.{js,jsx,ts,tsx}"],

    // The components pick variants and the settings pick themes at run time, which static
    // extraction can't see, so `.pureform/` (generated from `pureform.config.ts`) lists the
    // pureform recipes' variants and every theme: all of them in dev, and in a build only those
    // the app's source uses.
    staticCss,

    // Files to exclude
    exclude: [],
    // The output directory for your css system
    outdir: "./styled-system",
});
