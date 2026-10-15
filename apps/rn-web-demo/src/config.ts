// The demo's pureform config: Material's defaults and a teal theme, and the components the
// React Native adapter covers.

import { materialColor, materialShape } from "@pureform/material";
import { pureform } from "@pureform/preset";

export const config = pureform({
    themes: {
        teal: {
            color: materialColor({ seed: "#006A60" }),
            shape: materialShape({ full: 12 }, { corner: "squircle" }),
        },
    },
});

export const COMPONENTS = [
    "button",
    "card",
    "chip",
    "checkbox",
    "switchControl",
    "text",
    "avatar",
];

/** Brand colors the demo can switch to at runtime, as seeds for Material's primary family. */
export const BRANDS = { crimson: "#B00020", forest: "#1B5E20" };

/** The tokens a brand color replaces: the primary family, and the tints derived from it. */
export const BRAND_TOKENS =
    /^colors\.(\w*[pP]rimary\w*|surfaceTint\w*|elevationTint\w*)$/;
