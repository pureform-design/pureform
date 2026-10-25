import { defineConfig } from "@pandacss/dev";
import basePreset from "@pandacss/preset-base";
import pandaPreset from "@pandacss/preset-panda";
import typographyPreset from "@pandacss/preset-typography";
import { compilePreset } from "@pureform/panda-adapter";

import { staticCss } from "./.pureform/panda";
import { PREFIX } from "./pureform.codegen.ts";
import pureformConfig from "./pureform.config.ts";

export const pureformPreset = compilePreset(pureformConfig, {
    name: "pureform",
    prefix: PREFIX,
});

export default defineConfig({
    presets: [basePreset, pandaPreset, typographyPreset(), pureformPreset],

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

    // The suites pick variants and themes at run time, which static extraction can't see, so
    // `.pureform/` (generated from `pureform.config.ts`) lists every variant of every pureform
    // recipe, and every theme.
    staticCss,

    outdir: "./styled-system",
});
