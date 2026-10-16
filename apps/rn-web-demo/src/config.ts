// The demo's pureform config: Material's defaults and a teal theme, two shapes that morph when
// pressed, a panel that lays out by its container's width, and the components the React
// Native adapter covers.

import { defineComponent } from "@pureform/core";
import { containerSize, morph, px, when } from "@pureform/core/ast";
import { materialColor, materialShape } from "@pureform/material";
import { MATERIAL_SHAPES, pureform } from "@pureform/preset";
import { colorRole, radius, spacing, textStyle } from "@pureform/theme";

const preset = pureform({
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

// Roomy and in the primary colors in a container at least 360px wide, compact in the surface
// colors in a narrower one.
const WIDE = containerSize({ min: px(360) });
const panel = defineComponent({
    name: "panel",
    recipe: {
        base: {
            borderRadius: radius("medium"),
            paddingBlockStart: when(WIDE, spacing("6"), spacing("3")),
            paddingBlockEnd: when(WIDE, spacing("6"), spacing("3")),
            paddingInlineStart: when(WIDE, spacing("6"), spacing("3")),
            paddingInlineEnd: when(WIDE, spacing("6"), spacing("3")),
            backgroundColor: when(
                WIDE,
                colorRole("primaryContainer"),
                colorRole("surfaceContainerHighest"),
            ),
            color: when(
                WIDE,
                colorRole("onPrimaryContainer"),
                colorRole("onSurface"),
            ),
            textStyle: textStyle("bodyLarge"),
        },
    },
});

export const config = {
    ...preset,
    components: { ...preset.components, panel },
};

export const COMPONENTS = [
    "panel",
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
