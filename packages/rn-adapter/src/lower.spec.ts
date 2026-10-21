import {
    dampingCoefficient,
    defineComponent,
    defineSlotComponent,
    formatLinearEasing,
    sampleSpring,
} from "@pureform/core";
import {
    add,
    alias,
    animation,
    linearEasing,
    numeric,
    spring,
    transition,
    tween,
    center,
    colorMix,
    dynamic,
    inlineFlex,
    linearGradient,
    oklch,
    pct,
    px,
    rgb,
    row,
    slot,
    spaceBetween,
    stop,
    unitless,
    viewportBreakpoint,
    viewportSize,
    when,
    wrap,
    wrapReverse,
} from "@pureform/core/ast";
import type { StyleMap, ValueNode } from "@pureform/core/ast";
import type { CoreConfig } from "@pureform/core/types";
import { pureform } from "@pureform/preset";
import { describe, expect, it } from "vitest";

import { lowerRn } from "./lower";
import { select } from "./select";
import { resolveTheme } from "./theme";

const configWith = (root: StyleMap, extra: Partial<CoreConfig> = {}) =>
    ({
        tokens: { colors: { brand: rgb(10, 20, 30) }, spacing: { "2": px(8) } },
        semanticTokens: {},
        components: {
            box: defineComponent({ name: "box", recipe: { base: root } }),
        },
        ...extra,
    }) as unknown as CoreConfig;

const rulesOf = (root: StyleMap, extra?: Partial<CoreConfig>) => {
    const { components, diagnostics } = lowerRn(configWith(root, extra));
    return { rules: components.box!.entries[0]?.rules ?? [], diagnostics };
};

describe("lowerRn values", () => {
    it("writes flexWrap's keywords React Native's way", () => {
        expect(rulesOf({ flexWrap: wrapReverse }).rules[0]?.style).toEqual({
            flexWrap: "wrap-reverse",
        });
        expect(rulesOf({ flexWrap: wrap }).rules[0]?.style).toEqual({
            flexWrap: "wrap",
        });
    });

    it("writes units, colors, keywords, and logical properties React Native's way", () => {
        const { rules } = rulesOf({
            width: px(40),
            fontSize: { type: "numeric", value: 1, unit: "rem" },
            height: pct(50),
            backgroundColor: oklch(0.5, 0, 0),
            display: inlineFlex,
            flexDirection: row,
            justifyContent: spaceBetween,
            alignItems: center,
            paddingInlineStart: alias("tokens", "spacing", "2"),
            paddingBlockEnd: px(4),
            borderStartStartRadius: px(4),
            borderStartEndRadius: px(5),
            borderEndStartRadius: px(6),
            borderEndEndRadius: px(7),
        } as StyleMap);
        expect(rules).toEqual([
            {
                when: [],
                specificity: 0,
                style: {
                    width: 40,
                    fontSize: 16,
                    height: "50%",
                    backgroundColor: "rgba(99, 99, 99, 1)",
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingStart: { $ref: "spacing.2" },
                    paddingBottom: 4,
                    borderTopStartRadius: 4,
                    borderTopEndRadius: 5,
                    borderBottomStartRadius: 6,
                    borderBottomEndRadius: 7,
                },
            },
        ]);
    });

    it("keeps theme-dependent arithmetic and mixes as expressions", () => {
        const { rules } = rulesOf({
            height: add(alias("tokens", "spacing", "2"), px(4)),
            color: colorMix(
                alias("tokens", "colors", "brand"),
                rgb(255, 255, 255),
                pct(10),
            ),
            borderColor: dynamic(["components", "box", "edge"], rgb(0, 0, 0)),
        } as StyleMap);
        expect(rules[0]!.style).toEqual({
            height: { $calc: "+", args: [{ $ref: "spacing.2" }, 4] },
            color: {
                $mix: [
                    { $ref: "colors.brand" },
                    "rgba(255, 255, 255, 1)",
                    "10%",
                ],
            },
            borderColor: {
                $dyn: "components.box.edge",
                default: "rgba(0, 0, 0, 1)",
            },
        });
    });

    it("takes a font stack's first family, or all of it for React Native Web", () => {
        const fonts = {
            fontFamily: {
                type: "fontFamily",
                stack: ["Google Sans", "Roboto"],
                generic: "sans-serif",
            },
        } as unknown as StyleMap;
        const first = lowerRn(configWith(fonts)).components.box!;
        const all = lowerRn(configWith(fonts), { fontStack: "all" }).components
            .box!;
        expect(first.entries[0]!.rules[0]!.style.fontFamily).toBe(
            "Google Sans",
        );
        expect(all.entries[0]!.rules[0]!.style.fontFamily).toBe(
            '"Google Sans", Roboto, sans-serif',
        );
    });

    it("marks a unitless line height to multiply the font size", () => {
        const { rules } = rulesOf({ lineHeight: unitless(1.5) } as StyleMap);
        expect(rules[0]!.style).toEqual({ lineHeight: "1.5x" });
    });

    it("takes a one-color gradient as a tint over the background", () => {
        const tint = rgb(1, 2, 3, 0.5);
        const { rules } = rulesOf({
            backgroundImage: linearGradient([stop(tint), stop(tint)]),
        } as StyleMap);
        expect(rules[0]!.style).toEqual({
            backgroundTint: "rgba(1, 2, 3, 0.5)",
        });
    });
});

describe("lowerRn animations", () => {
    it("carries the keyframes with the timing, in React Native's terms", () => {
        const { rules } = rulesOf(
            {
                animation: {
                    type: "animation",
                    name: "slide",
                    duration: { type: "numeric", value: 1, unit: "s" },
                    iterations: "infinite",
                },
            } as unknown as StyleMap,
            {
                keyframes: {
                    slide: {
                        to: {
                            opacity: {
                                type: "numeric",
                                value: 1,
                                unit: "none",
                            },
                        },
                        from: {
                            opacity: {
                                type: "numeric",
                                value: 0,
                                unit: "none",
                            },
                        },
                    },
                },
            },
        );
        expect(rules[0]!.style).toEqual({
            animation: {
                name: "slide",
                duration: 1000,
                easing: "cubic-bezier(0.25, 0.1, 0.25, 1)",
                delay: 0,
                iterations: -1,
                direction: "normal",
                frames: [
                    { offset: 0, style: { opacity: 0 } },
                    { offset: 1, style: { opacity: 1 } },
                ],
            },
        });
    });
});

describe("lowerRn mixes", () => {
    it("keeps the space of a mix outside sRGB, and reports HCT", () => {
        const mix = (space: string) => ({
            type: "colorMix",
            space,
            base: rgb(0, 0, 0),
            with: rgb(255, 255, 255),
            amount: pct(50),
        });
        const { rules, diagnostics } = rulesOf({
            color: mix("oklch"),
            borderColor: mix("hct"),
        } as unknown as StyleMap);
        expect(rules[0]!.style).toEqual({
            color: {
                $mix: ["rgba(0, 0, 0, 1)", "rgba(255, 255, 255, 1)", "50%"],
                space: "oklch",
            },
        });
        expect(diagnostics).toEqual(["box: borderColor: mixing in hct"]);
    });
});

describe("lowerRn raw rules", () => {
    it("skips other targets' raw rules, and reports its own", () => {
        const raw = (target: string) =>
            rulesOf({
                width: px(1),
                rawRules: {
                    [target]: { "&::placeholder": { color: rgb(0, 0, 0) } },
                },
            } as unknown as StyleMap);
        expect(raw("css")).toEqual({
            rules: [{ when: [], specificity: 0, style: { width: 1 } }],
            diagnostics: [],
        });
        expect(raw("rn").diagnostics).toEqual([
            'box: raw rules for "rn" aren\'t supported',
        ]);
    });
});

describe("lowerRn filters", () => {
    it("keeps drop shadows apart from box shadows, and reports other filters", () => {
        const layer = { x: px(0), y: px(2), blur: px(4), color: rgb(0, 0, 0) };
        const shadow = rulesOf({
            filter: when("disabled", { type: "literal", value: "none" }, {
                type: "filter",
                fns: [{ fn: "dropShadow", layer }],
            } as unknown as ValueNode),
        } as unknown as StyleMap);
        expect(shadow.rules).toEqual([
            {
                when: [],
                specificity: 0,
                style: {
                    dropShadow: {
                        $shadow: [
                            {
                                x: 0,
                                y: 2,
                                blur: 4,
                                spread: 0,
                                color: "rgba(0, 0, 0, 1)",
                            },
                        ],
                    },
                },
            },
            {
                when: ["disabled"],
                specificity: 1,
                style: { dropShadow: "none" },
            },
        ]);
        const blur = rulesOf({
            filter: { type: "filter", fns: [{ fn: "blur", args: [px(2)] }] },
        } as unknown as StyleMap);
        expect(blur.diagnostics).toEqual([
            "box: filter: filters other than drop shadows",
        ]);
    });
});

describe("lowerRn transitions", () => {
    it("lowers durations to milliseconds and easings to curves, with reduced motion a state", () => {
        const motion = {
            type: "transition",
            parts: [
                {
                    property: "backgroundColor",
                    duration: { type: "numeric", value: 0.2, unit: "s" },
                    easing: {
                        type: "easing",
                        kind: "keyword",
                        name: "easeOut",
                    },
                },
                {
                    property: "paddingInlineStart",
                    duration: { type: "numeric", value: 90, unit: "ms" },
                    easing: {
                        type: "easing",
                        kind: "steps",
                        steps: { count: 2 },
                    },
                },
                {
                    property: "clipPath",
                    duration: { type: "numeric", value: 1, unit: "ms" },
                },
            ],
        };
        const { rules } = rulesOf({
            transition: when(
                "reducedMotion",
                { type: "keyword", value: "none" },
                motion as unknown as ValueNode,
            ),
        } as unknown as StyleMap);
        expect(rules).toEqual([
            {
                when: [],
                specificity: 0,
                style: {
                    transition: [
                        {
                            property: "backgroundColor",
                            duration: 200,
                            easing: "cubic-bezier(0, 0, 0.58, 1)",
                            delay: 0,
                        },
                        {
                            property: "paddingStart",
                            duration: 90,
                            easing: "linear",
                            delay: 0,
                        },
                        // A shape's transition, for SVG to morph.
                        {
                            property: "clipPath",
                            duration: 1,
                            easing: "cubic-bezier(0.25, 0.1, 0.25, 1)",
                            delay: 0,
                        },
                    ],
                },
            },
            {
                when: ["reducedMotion"],
                specificity: 1,
                style: { transition: "none" },
            },
        ]);
    });
});

describe("lowerRn springs", () => {
    const fast = spring({ stiffness: 800, damping: 0.6 });

    it("reads a spring token's sampled timing and physics from the theme", () => {
        const { rules } = rulesOf(
            {
                transition: transition(
                    tween("transform", {
                        spring: alias("springs", "spatialFast"),
                    }),
                ),
                animation: animation({
                    name: "grow",
                    spring: alias("springs", "spatialFast"),
                }),
            },
            {
                springs: { spatialFast: fast },
                keyframes: { grow: { to: { opacity: unitless(1) } } },
            },
        );
        const ref = (field: string) => ({
            $ref: `springs.spatialFast.${field}`,
        });
        const timing = {
            duration: ref("duration"),
            easing: ref("easing"),
            delay: 0,
            spring: {
                type: "spring",
                stiffness: ref("stiffness"),
                damping: ref("damping"),
                mass: ref("mass"),
            },
        };
        expect(rules[0]!.style).toMatchObject({
            transition: [{ property: "transform", ...timing }],
            animation: { name: "grow", ...timing },
        });
    });

    it("samples a literal spring, with its damping as a coefficient", () => {
        const { rules } = rulesOf({
            transition: transition(
                tween("transform", { spring: fast, delay: numeric(20, "ms") }),
                tween("opacity", numeric(100, "ms"), linearEasing(0, 1)),
            ),
        });
        const sampled = sampleSpring(fast);
        expect(rules[0]!.style.transition).toEqual([
            {
                property: "transform",
                duration: sampled.duration,
                easing: formatLinearEasing(sampled.points),
                delay: 20,
                spring: {
                    type: "spring",
                    stiffness: 800,
                    damping: 2 * 0.6 * Math.sqrt(800),
                    mass: 1,
                },
            },
            {
                property: "opacity",
                duration: 100,
                easing: "linear(0, 1)",
                delay: 0,
            },
        ]);
    });

    it("resolves a theme's spring tokens to numbers and curves", () => {
        const theme = resolveTheme(
            configWith({}, { springs: { spatialFast: fast } }),
            { scheme: "light" },
        );
        const sampled = sampleSpring(fast);
        expect(theme).toMatchObject({
            "springs.spatialFast.duration": sampled.duration,
            "springs.spatialFast.easing": formatLinearEasing(sampled.points),
            "springs.spatialFast.stiffness": 800,
            "springs.spatialFast.damping": dampingCoefficient(fast),
            "springs.spatialFast.mass": 1,
        });
    });
});

describe("lowerRn conditions", () => {
    it("turns a conditional inside out, a rule per case in order", () => {
        const { rules } = rulesOf({
            color: when()
                .on("hover", rgb(1, 1, 1))
                .on(["hover", "pressed"], rgb(2, 2, 2))
                .else(rgb(0, 0, 0)),
        } as StyleMap);
        expect(
            rules.map(({ when, specificity }) => [when, specificity]),
        ).toEqual([
            [[], 0],
            [["hover"], 1],
            [["hover", "pressed"], 2],
        ]);
    });

    it("ranks a slot condition above an element's own, as its selector does", () => {
        const { rules } = rulesOf({
            color: when(
                slot("root", "focusVisibleWithin"),
                rgb(1, 1, 1),
                rgb(0, 0, 0),
            ),
            states: { disabled: { opacity: unitless(0.5) } },
        } as StyleMap);
        expect(
            rules.map(({ when, specificity }) => [when, specificity]),
        ).toEqual([
            [[], 0],
            [["focusVisible"], 2],
            [["disabled"], 1],
        ]);
    });

    it("clips to a shape under the svg state, and takes the fallback without it", () => {
        const { rules } = rulesOf({
            borderRadius: when("clipShape", px(0), px(12)),
        } as StyleMap);
        expect(rules).toEqual([
            { when: [], specificity: 0, style: { borderRadius: 12 } },
            { when: ["svg"], specificity: 0, style: { borderRadius: 0 } },
        ]);
    });

    it("keeps the color scheme as a state of the component", () => {
        const { rules } = rulesOf({
            color: when("dark", rgb(9, 9, 9), rgb(0, 0, 0)),
        } as StyleMap);
        expect(rules.at(-1)).toMatchObject({ when: ["dark"] });
    });
});

describe("lowerRn viewport conditions", () => {
    it("bounds the window's width, by size or breakpoint", () => {
        const { rules } = rulesOf(
            {
                width: when(
                    viewportSize({ min: px(600), max: px(900) }),
                    px(10),
                    px(5),
                ),
                height: when(
                    viewportBreakpoint({ from: "md", until: "lg" }),
                    px(2),
                    px(1),
                ),
            } as StyleMap,
            {
                breakpoints: {
                    md: px(768),
                    lg: { type: "numeric", value: 64, unit: "rem" },
                },
            },
        );
        expect(rules).toEqual([
            { when: [], specificity: 0, style: { width: 5, height: 1 } },
            {
                when: ["width<=900", "width>=600"],
                specificity: 0,
                style: { width: 10 },
            },
            {
                when: ["width<1024", "width>=768"],
                specificity: 0,
                style: { height: 2 },
            },
        ]);
    });
});

describe("lowerRn percentages", () => {
    it("keeps them where React Native takes them, and reports the rest", () => {
        const { rules, diagnostics } = rulesOf({
            width: pct(50),
            borderTopLeftRadius: pct(50),
            fontSize: pct(120),
            borderWidth: pct(10),
        } as unknown as StyleMap);
        expect(rules[0]!.style).toEqual({
            width: "50%",
            borderTopLeftRadius: "50%",
        });
        expect(diagnostics).toEqual([
            "box: fontSize: React Native takes no percentage for fontSize",
            "box: borderWidth: React Native takes no percentage for borderWidth",
        ]);
    });
});

describe("lowerRn container conditions", () => {
    it("bounds the nearest container's width, or a named one's", () => {
        const { rules } = rulesOf(
            {
                width: when(
                    { type: "containerSize", min: px(600) } as never,
                    px(10),
                    px(5),
                ),
                height: when(
                    {
                        type: "containerBreakpoint",
                        until: "md",
                        container: "card",
                    } as never,
                    px(2),
                    px(1),
                ),
            } as StyleMap,
            { breakpoints: { md: px(768) } },
        );
        expect(rules).toEqual([
            { when: [], specificity: 0, style: { width: 5, height: 1 } },
            { when: ["container>=600"], specificity: 0, style: { width: 10 } },
            {
                when: ["container@card<768"],
                specificity: 0,
                style: { height: 2 },
            },
        ]);
    });

    it("hold by the widths selection gets, and not without one", () => {
        const { components } = lowerRn(
            configWith({
                width: when(
                    { type: "containerSize", min: px(600) } as never,
                    px(10),
                    px(5),
                ),
                height: when(
                    {
                        type: "containerSize",
                        max: px(300),
                        container: "card",
                    } as never,
                    px(2),
                    px(1),
                ),
            } as StyleMap),
        );
        const box = (containers?: Record<string, number>) =>
            select(components.box!, {}, containers ? { containers } : {})[""];
        expect(box()).toMatchObject({ width: 5, height: 1 });
        expect(box({ "": 700 })).toMatchObject({ width: 10, height: 1 });
        expect(box({ "": 200, card: 200 })).toMatchObject({
            width: 5,
            height: 2,
        });
    });
});

describe("lowerRn diagnostics", () => {
    it("drops what React Native can't do, and says so", () => {
        const { rules, diagnostics } = rulesOf({
            width: when(
                {
                    type: "rawCondition",
                    by: { css: "@supports (x: y)" },
                } as never,
                px(10),
                px(5),
            ),
            gridTemplateColumns: px(1),
        } as unknown as StyleMap);
        expect(rules).toEqual([]);
        expect(diagnostics).toEqual([
            "box: width: no React Native equivalent for a rawCondition condition",
            'box: no React Native property for "gridTemplateColumns"',
        ]);
    });
});

describe("lowerRn components", () => {
    it("lays slots, variants, and compound variants out as the CSS layers", () => {
        const config = configWith({}, {
            components: {
                chip: defineSlotComponent({
                    name: "chip",
                    slots: ["root", "label"],
                    structure: { root: ["label"] },
                    recipe: {
                        base: {
                            root: { width: px(1) },
                            label: { color: rgb(0, 0, 0) },
                        },
                        variants: {
                            size: {
                                small: { root: { height: px(2) } },
                                large: { root: { height: px(3) } },
                            },
                        },
                        compoundVariants: [
                            {
                                match: { size: "small" },
                                style: { label: { width: px(4) } },
                            },
                        ],
                        defaultVariants: { size: "small" },
                    },
                }),
            },
        } as Partial<CoreConfig>);
        const chip = lowerRn(config).components.chip!;
        expect(chip.slots).toEqual(["root", "label"]);
        expect(chip.structure).toEqual({ root: ["label"] });
        expect(chip.variants).toEqual({ size: ["small", "large"] });
        expect(chip.defaultVariants).toEqual({ size: "small" });
        expect(chip.entries.map((e) => [e.layer, e.slot, e.match])).toEqual([
            [0, "root", {}],
            [0, "label", {}],
            [1, "root", { size: "small" }],
            [1, "root", { size: "large" }],
            [2, "label", { size: "small" }],
        ]);
    });

    it("lowers the core set of the preset with nothing left over", () => {
        const { diagnostics, components } = lowerRn(pureform(), {
            components: [
                "button",
                "card",
                "chip",
                "checkbox",
                "switchControl",
                "text",
                "avatar",
            ],
        });
        expect(diagnostics).toEqual([]);
        expect(Object.keys(components)).toHaveLength(7);
    });
});
