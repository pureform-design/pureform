// The demo's pureform config: Material's defaults and a teal theme, two shapes that morph when
// pressed, a panel that lays out by its container's width, a gradient swatch, and a square whose
// typed tokens tween. The bundler plugin (and `pureform generate`) write `.pureform/` from it.

import { defineComponent, defineSlotComponent } from "@pureform/core";
import {
    alias,
    conicGradient,
    containerSize,
    dynamic,
    rotate,
    transform,
    transition,
    tween,
    linearGradient,
    morph,
    numeric,
    pct,
    px,
    radialGradient,
    stop,
    when,
} from "@pureform/core/ast";
import { materialColor, materialShape } from "@pureform/material";
import { MATERIAL_SHAPES, pureform } from "@pureform/preset";
import {
    colorRole,
    duration,
    easing,
    radius,
    spacing,
    textStyle,
} from "@pureform/theme";

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

// A swatch of each gradient kind in the primary, tertiary, and secondary colors, which React
// Native draws with SVG.
const STOPS = [
    stop(colorRole("primary")),
    stop(colorRole("tertiary"), pct(50)),
    stop(colorRole("secondary")),
];
const swatch = defineComponent({
    name: "swatch",
    recipe: {
        base: {
            width: px(96),
            height: px(96),
            borderRadius: radius("medium"),
            overflow: { type: "keyword", value: "hidden" },
        },
        variants: {
            kind: {
                linear: {
                    backgroundImage: linearGradient(STOPS, numeric(135, "deg")),
                },
                radial: { backgroundImage: radialGradient(STOPS) },
                conic: {
                    backgroundImage: conicGradient(STOPS, numeric(45, "deg")),
                },
            },
        },
        defaultVariants: { kind: "linear" },
    },
});

// A square whose tokens each hold a type of value that moves: its size a length, its color a
// color, its turn an angle, its opacity a number, and its bar's fill a percentage. Set them on
// one instance, and each new value tweens.
const TWEENS = {
    size: dynamic(["components", "tweens", "size"], px(64), "length"),
    tint: dynamic(
        ["components", "tweens", "tint"],
        colorRole("primary"),
        "color",
    ),
    turn: dynamic(["components", "tweens", "turn"], numeric(0, "deg"), "angle"),
    level: dynamic(
        ["components", "tweens", "level"],
        numeric(1, "none"),
        "number",
    ),
    fill: dynamic(["components", "tweens", "fill"], pct(50), "percentage"),
};
const token = (name: keyof typeof TWEENS) =>
    alias("components", "tweens", name);
const tweens = defineSlotComponent({
    name: "tweens",
    tokens: TWEENS,
    slots: ["root", "bar"],
    structure: { root: ["bar"] },
    recipe: {
        base: {
            root: {
                width: token("size"),
                height: token("size"),
                borderRadius: radius("small"),
                backgroundColor: token("tint"),
                opacity: token("level"),
                transform: transform(rotate(token("turn"))),
                overflow: { type: "keyword", value: "hidden" },
                transition: transition(
                    ...Object.values(TWEENS).map((value) =>
                        tween(value, duration("long2"), easing("emphasized")),
                    ),
                ),
            },
            bar: {
                width: token("fill"),
                height: px(8),
                backgroundColor: colorRole("onPrimary"),
            },
        },
    },
});

const config = {
    ...preset,
    components: { ...preset.components, panel, swatch, tweens },
};

export default config;

/** The components the page draws. */
export const COMPONENTS = [
    "panel",
    "swatch",
    "tweens",
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
