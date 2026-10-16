import { defineConfig } from "@pandacss/dev";
import basePreset from "@pandacss/preset-base";

import { staticCss } from "./.pureform/panda";
import { pureformPreset } from "./panda.pureform";

export default defineConfig({
    presets: [basePreset, pureformPreset],

    preflight: true,

    // pureform leaves document styling to the app: paint the page with the palette's canvas
    // pair so components sit on the surface they were designed for.
    globalCss: {
        "html, body": {
            backgroundColor: "canvas",
            color: "onCanvas",
        },
    },

    strictPropertyValues: true,

    include: ["./src/**/*.{js,jsx,ts,tsx}"],

    // Variants and themes picked at run time are invisible to Panda's extractor, so
    // `.pureform/` (generated from `pureform.config.ts` for the registered components) lists
    // every variant of each, and every theme.
    staticCss,

    outdir: "./styled-system",
});
