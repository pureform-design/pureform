// The config the browser suites test: Material's defaults, two shapes that morph while pressed,
// named densities, a monospace text style, and three named themes. `panda.pureform.ts` compiles
// it into the Panda preset, `pureform generate` writes `.pureform/` from it, and the suites
// compile the CSS, Tailwind, and React Native targets from it too.

import { morph, pct, px } from "@pureform/core/ast";
import {
    materialColor,
    materialLayout,
    materialShape,
    materialTypescale,
} from "@pureform/material";
import { MATERIAL_SHAPES, pureform } from "@pureform/preset";
import { roundedShape } from "@pureform/theme";

// The base theme is Material's defaults plus a monospace `code` text style. Named themes swap
// some providers and apply inside `[data-panda-theme=<name>]`.
// Named density steps, in grid units: one roomier than Material's default, and two denser.
const DENSITIES = { comfortable: 1, default: 0, compact: -1, dense: -3 };

const config = pureform({
    // Material's shapes, and two that change shape while pressed.
    shapes: {
        ...MATERIAL_SHAPES,
        cookieToCircle: morph(
            MATERIAL_SHAPES.cookie9Sided,
            MATERIAL_SHAPES.circle,
        ),
        squareToSunny: morph(MATERIAL_SHAPES.square, MATERIAL_SHAPES.sunny),
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
        teal: {
            color: materialColor({ seed: "#006A60" }),
            shape: materialShape({ full: 12 }, { corner: "squircle" }),
        },
        sharp: { shape: roundedShape({ base: 0 }) },
        dense: {
            layout: materialLayout({ densities: DENSITIES, density: "dense" }),
        },
    },
});

export default {
    ...config,
    themes: {
        ...config.themes,
        indication: {
            components: { button: { tokens: { stateHoverOpacity: pct(40) } } },
        },
        radius: {
            components: Object.fromEntries(
                [
                    "button",
                    "iconButton",
                    "chip",
                    "inputChip",
                    "splitButton",
                ].map((name) => [name, { tokens: { radius: px(6) } }]),
            ),
        },
    },
};
