// A full, realistic slotted button modeled as a `CoreConfig`.
//
// This exists to prove the config contract covers a real component before an adapter is
// built, and to serve as the fixture the adapter compiles in its tests. It exercises the
// breadth of the AST on purpose: four slots, the color / variant / size / leading / trailing
// variant groups, compound variants, default variants, per-state styles, a conditional value,
// a color-mix overlay, logical (flow-relative) spacing, component tokens as runtime-overridable
// dynamics, aliases into every token tier, and a static elevation utility applied by name.
//
// It is not re-exported from the package root. The adapter imports it through the dev-only
// `@pureform/core/fixtures/button` entry.

import {
    alias,
    alpha,
    center,
    colorMix,
    cubicBezier,
    dynamic,
    fontFamily,
    hex,
    inlineFlex,
    none,
    notAllowed,
    numeric,
    pct,
    pointer,
    px,
    shadow,
    solid,
    transition,
    transparent,
    tween,
    unitless,
    when,
} from "../ast";
import { defineSlotComponent, defineStaticUtility, stack } from "../define";
import type { CoreConfig } from "../types";

// Material elevation as a static utility: each named step carries a composite box-shadow.
const elevationUtility = {
    shadowElevation: defineStaticUtility({
        property: "boxShadow",
        values: {
            level0: { boxShadow: none },
            level1: {
                boxShadow: shadow(
                    {
                        x: px(0),
                        y: px(1),
                        blur: px(3),
                        color: alpha(hex("#000000"), 0.2),
                    },
                    {
                        x: px(0),
                        y: px(1),
                        blur: px(2),
                        color: alpha(hex("#000000"), 0.12),
                    },
                ),
            },
            level2: {
                boxShadow: shadow(
                    {
                        x: px(0),
                        y: px(2),
                        blur: px(6),
                        color: alpha(hex("#000000"), 0.2),
                    },
                    {
                        x: px(0),
                        y: px(1),
                        blur: px(2),
                        color: alpha(hex("#000000"), 0.12),
                    },
                ),
            },
        },
    }),
};

/** The canonical multi-slot button. Passes `defineConfig` validation. */
export const buttonConfig: CoreConfig = {
    tokens: {
        colors: {
            violet600: hex("#7c3aed"),
            violet700: hex("#6d28d9"),
            red600: hex("#dc2626"),
            red700: hex("#b91c1c"),
            white: hex("#ffffff"),
        },
        spacing: {
            "1": px(4),
            "2": px(8),
            "3": px(12),
            "4": px(16),
            "5": px(20),
        },
        radii: { sm: px(4), md: px(8), lg: px(12), full: px(9999) },
        fontSize: { sm: px(14), md: px(16), lg: px(18) },
        sizes: { iconSm: px(16), iconMd: px(20), iconLg: px(24) },
    },

    semanticTokens: {
        colors: {
            brand: dynamic(
                ["global", "colors", "brand"],
                alias("tokens", "colors", "violet600"),
            ),
            brandHover: dynamic(
                ["global", "colors", "brandHover"],
                alias("tokens", "colors", "violet700"),
            ),
            onBrand: alias("tokens", "colors", "white"),
            danger: alias("tokens", "colors", "red600"),
            dangerHover: alias("tokens", "colors", "red700"),
            onDanger: alias("tokens", "colors", "white"),
        },
    },

    fonts: {
        sans: fontFamily(["Inter", "system-ui"], "sans-serif"),
    },

    durations: { fast: numeric(150, "ms") },
    easings: { standard: cubicBezier([0.2, 0, 0, 1]) },

    breakpoints: { sm: px(640), md: px(768), lg: px(1024) },

    zIndices: stack(["base", "raised", "overlay"]),

    textStyles: {
        buttonLabel: {
            fontWeight: unitless(600),
            lineHeight: unitless(1.2),
            letterSpacing: px(0),
        },
    },

    utilities: elevationUtility,

    // Shared base merged under every generated component (never reaches the host page).
    componentBaseStyles: {
        fontFamily: alias("fonts", "sans"),
    },

    components: {
        button: defineSlotComponent({
            name: "button",
            $meta: {
                description:
                    "Primary action button with leading/trailing icon slots.",
                platformHints: { panda: { jsx: ["Button"], className: "btn" } },
            },
            // Component tokens, created here as overridable --components-button-* vars and
            // aliased from the recipe.
            tokens: {
                bg: dynamic(
                    ["components", "button", "bg"],
                    alias("semanticTokens", "colors", "brand"),
                ),
                fg: dynamic(
                    ["components", "button", "fg"],
                    alias("semanticTokens", "colors", "onBrand"),
                ),
                radius: dynamic(
                    ["components", "button", "radius"],
                    alias("tokens", "radii", "md"),
                ),
            },
            slots: ["root", "label", "leadingIcon", "trailingIcon"],
            recipe: {
                base: {
                    root: {
                        display: inlineFlex,
                        alignItems: center,
                        justifyContent: center,
                        gap: alias("tokens", "spacing", "2"),
                        cursor: pointer,
                        borderRadius: dynamic(
                            ["ui", "button", "radius"],
                            alias("components", "button", "radius"),
                        ),
                        backgroundColor: dynamic(
                            ["ui", "button", "bg"],
                            alias("components", "button", "bg"),
                        ),
                        color: dynamic(
                            ["ui", "button", "fg"],
                            alias("components", "button", "fg"),
                        ),
                        // Dim and lock the pointer only in the disabled state.
                        opacity: when("disabled", unitless(0.38), unitless(1)),
                        transition: transition(
                            tween(
                                "all",
                                alias("durations", "fast"),
                                alias("easings", "standard"),
                            ),
                        ),
                        apply: { shadowElevation: "level1" },
                        states: {
                            disabled: {
                                cursor: notAllowed,
                                apply: { shadowElevation: "level0" },
                            },
                            hover: { apply: { shadowElevation: "level2" } },
                        },
                    },
                    label: {
                        textStyle: alias("textStyles", "buttonLabel"),
                    },
                    leadingIcon: {
                        width: alias("tokens", "sizes", "iconMd"),
                        height: alias("tokens", "sizes", "iconMd"),
                    },
                    trailingIcon: {
                        width: alias("tokens", "sizes", "iconMd"),
                        height: alias("tokens", "sizes", "iconMd"),
                    },
                },
                variants: {
                    color: {
                        brand: {
                            root: {
                                backgroundColor: alias(
                                    "semanticTokens",
                                    "colors",
                                    "brand",
                                ),
                                color: alias(
                                    "semanticTokens",
                                    "colors",
                                    "onBrand",
                                ),
                            },
                        },
                        danger: {
                            root: {
                                backgroundColor: alias(
                                    "semanticTokens",
                                    "colors",
                                    "danger",
                                ),
                                color: alias(
                                    "semanticTokens",
                                    "colors",
                                    "onDanger",
                                ),
                            },
                        },
                    },
                    variant: {
                        solid: { root: {} },
                        outline: {
                            root: {
                                backgroundColor: transparent,
                                borderWidth: px(1),
                                borderStyle: solid,
                                borderColor: alias(
                                    "semanticTokens",
                                    "colors",
                                    "brand",
                                ),
                                color: alias(
                                    "semanticTokens",
                                    "colors",
                                    "brand",
                                ),
                            },
                        },
                        ghost: {
                            root: {
                                backgroundColor: transparent,
                                color: alias(
                                    "semanticTokens",
                                    "colors",
                                    "brand",
                                ),
                            },
                        },
                    },
                    size: {
                        sm: {
                            root: {
                                paddingBlockStart: alias(
                                    "tokens",
                                    "spacing",
                                    "1",
                                ),
                                paddingBlockEnd: alias(
                                    "tokens",
                                    "spacing",
                                    "1",
                                ),
                                paddingInlineStart: alias(
                                    "tokens",
                                    "spacing",
                                    "2",
                                ),
                                paddingInlineEnd: alias(
                                    "tokens",
                                    "spacing",
                                    "2",
                                ),
                            },
                            label: {
                                fontSize: alias("tokens", "fontSize", "sm"),
                            },
                            leadingIcon: {
                                width: alias("tokens", "sizes", "iconSm"),
                                height: alias("tokens", "sizes", "iconSm"),
                            },
                            trailingIcon: {
                                width: alias("tokens", "sizes", "iconSm"),
                                height: alias("tokens", "sizes", "iconSm"),
                            },
                        },
                        md: {
                            root: {
                                paddingBlockStart: alias(
                                    "tokens",
                                    "spacing",
                                    "2",
                                ),
                                paddingBlockEnd: alias(
                                    "tokens",
                                    "spacing",
                                    "2",
                                ),
                                paddingInlineStart: alias(
                                    "tokens",
                                    "spacing",
                                    "4",
                                ),
                                paddingInlineEnd: alias(
                                    "tokens",
                                    "spacing",
                                    "4",
                                ),
                            },
                            label: {
                                fontSize: alias("tokens", "fontSize", "md"),
                            },
                        },
                        lg: {
                            root: {
                                paddingBlockStart: alias(
                                    "tokens",
                                    "spacing",
                                    "3",
                                ),
                                paddingBlockEnd: alias(
                                    "tokens",
                                    "spacing",
                                    "3",
                                ),
                                paddingInlineStart: alias(
                                    "tokens",
                                    "spacing",
                                    "5",
                                ),
                                paddingInlineEnd: alias(
                                    "tokens",
                                    "spacing",
                                    "5",
                                ),
                            },
                            label: {
                                fontSize: alias("tokens", "fontSize", "lg"),
                            },
                            leadingIcon: {
                                width: alias("tokens", "sizes", "iconLg"),
                                height: alias("tokens", "sizes", "iconLg"),
                            },
                            trailingIcon: {
                                width: alias("tokens", "sizes", "iconLg"),
                                height: alias("tokens", "sizes", "iconLg"),
                            },
                        },
                    },
                    // Boolean-style variant groups toggling the icon slots.
                    leading: {
                        true: {},
                        false: { leadingIcon: { display: none } },
                    },
                    trailing: {
                        true: {},
                        false: { trailingIcon: { display: none } },
                    },
                },
                compoundVariants: [
                    {
                        match: { variant: "outline", color: "danger" },
                        style: {
                            root: {
                                borderColor: alias(
                                    "semanticTokens",
                                    "colors",
                                    "danger",
                                ),
                                color: alias(
                                    "semanticTokens",
                                    "colors",
                                    "danger",
                                ),
                            },
                        },
                    },
                    {
                        match: { variant: "solid", size: "sm" },
                        style: {
                            root: {
                                // Faint fill overlay for compact solid buttons.
                                backgroundColor: colorMix(
                                    alias("semanticTokens", "colors", "brand"),
                                    alias("tokens", "colors", "white"),
                                    pct(8),
                                ),
                            },
                        },
                    },
                ],
                defaultVariants: {
                    color: "brand",
                    variant: "solid",
                    size: "md",
                    leading: "false",
                    trailing: "false",
                },
            },
        }),
    },
};
