import { defineConfig } from "@pandacss/dev";
import { pureformPreset } from "@pureform/pandacss-preset";

export default defineConfig({
    presets: [
        pureformPreset({
            prefix: "pf",
            colors: {
                source: "#6a5acd",
            },
        }),
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
    outdir: "./src/styled-system",
    importMap: "$",

    jsxFramework: "solid",
});
