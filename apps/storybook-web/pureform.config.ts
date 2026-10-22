// The demo's pureform config: Material's defaults, a monospace text style, and the named themes
// the settings panel switches between at run time. `panda.pureform.ts` compiles it into the Panda
// preset, and `pureform generate` (or the bundler plugin) writes `.pureform/` from it.

import { morph } from "@pureform/core/ast";
import {
    materialColor,
    materialLayout,
    materialShape,
    materialTypescale,
} from "@pureform/material";
import { MATERIAL_SHAPES, pureform } from "@pureform/preset";
import { roundedShape } from "@pureform/theme";

// Named density steps, in grid units: one roomier than Material's default, and two denser.
const DENSITIES = { comfortable: 1, default: 0, compact: -1, dense: -3 };

const density = (step: keyof typeof DENSITIES) => ({
    layout: materialLayout({ densities: DENSITIES, density: step }),
});

// The base theme is Material's defaults plus a monospace `code` text style. Each named theme
// changes one domain and applies inside `[data-panda-theme=<name>]`, so the app nests one
// provider per domain (shape, density, color) and combines them.
export default pureform({
    // Material's shapes, and one that changes shape while pressed.
    shapes: {
        ...MATERIAL_SHAPES,
        cookieToCircle: morph(
            MATERIAL_SHAPES.cookie9Sided,
            MATERIAL_SHAPES.circle,
        ),
    },
    layout: materialLayout({ densities: DENSITIES, density: "default" }),
    typography: materialTypescale({
        fonts: {
            mono: {
                families: ["JetBrains Mono", "ui-monospace", "Menlo"],
                generic: "monospace",
            },
        },
        custom: {
            code: {
                font: "mono",
                fontSize: "0.875rem",
                lineHeight: "1.25rem",
                letterSpacing: "0rem",
                fontWeight: 400,
            },
        },
    }),
    themes: {
        // Color
        teal: { color: materialColor({ seed: "#006A60" }) },
        // Shape
        squircle: {
            shape: materialShape({ full: 12 }, { corner: "squircle" }),
        },
        soft: { shape: roundedShape({ base: 2 }) },
        sharp: { shape: roundedShape({ base: 0 }) },
        // Density
        comfortable: density("comfortable"),
        compact: density("compact"),
        dense: density("dense"),
    },
});
