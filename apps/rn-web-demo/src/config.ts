// The demo's pureform config: Material's defaults and a teal theme, two shapes that morph when
// pressed, and the components the React Native adapter covers.

import { morph } from "@pureform/core/ast";
import { materialColor, materialShape } from "@pureform/material";
import { MATERIAL_SHAPES, pureform } from "@pureform/preset";

export const config = pureform({
    shapes: {
        ...MATERIAL_SHAPES,
        circleToSquare: morph(MATERIAL_SHAPES.circle, MATERIAL_SHAPES.square),
        cookieToClover: morph(
            MATERIAL_SHAPES.cookie4Sided,
            MATERIAL_SHAPES.clover8Leaf,
        ),
    },
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
    "icon",
    "iconButton",
    "fab",
    "separator",
    "listItem",
    "linearProgress",
    "circularProgress",
    "radio",
    "scrim",
    "supportingText",
    "media",
    "textField",
    "textArea",
    "searchBar",
    "select",
    "slider",
    "menu",
    "tabs",
    "navigationBar",
    "navigationRail",
    "dialog",
    "snackbar",
    "tooltip",
    "ripple",
];

/** Brand colors the demo can switch to at runtime, as seeds for Material's primary family. */
export const BRANDS = { crimson: "#B00020", forest: "#1B5E20" };

/** The tokens a brand color replaces: the primary family, and the tints derived from it. */
export const BRAND_TOKENS =
    /^colors\.(\w*[pP]rimary\w*|surfaceTint\w*|elevationTint\w*)$/;
