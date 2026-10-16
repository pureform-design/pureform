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

    // Variants picked through the registry are invisible to Panda's extractor, so the
    // registered components' `staticCss` from `.pureform/` keeps every one.
    staticCss: {
        themes: ["teal", "sharp", "dense"],
        recipes: { ...staticCss.recipes },
    },

    outdir: "./styled-system",
});
