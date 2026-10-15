import { defineComponent, defineSlotComponent } from "@pureform/core";
import {
    add,
    alias,
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
    viewportSize,
    when,
} from "@pureform/core/ast";
import type { StyleMap } from "@pureform/core/ast";
import type { CoreConfig } from "@pureform/core/types";
import { pureform } from "@pureform/preset";
import { describe, expect, it } from "vitest";

import { lowerRn } from "./lower";

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

    it("takes the fallback where React Native can't clip to a shape", () => {
        const { rules } = rulesOf({
            borderRadius: when("clipShape", px(0), px(12)),
        } as StyleMap);
        expect(rules).toEqual([
            { when: [], specificity: 0, style: { borderRadius: 12 } },
        ]);
    });

    it("keeps the color scheme as a state of the component", () => {
        const { rules } = rulesOf({
            color: when("dark", rgb(9, 9, 9), rgb(0, 0, 0)),
        } as StyleMap);
        expect(rules.at(-1)).toMatchObject({ when: ["dark"] });
    });
});

describe("lowerRn diagnostics", () => {
    it("drops what React Native can't do, and says so", () => {
        const { rules, diagnostics } = rulesOf({
            width: when(viewportSize({ min: px(600) }), px(10), px(5)),
            backgroundImage: linearGradient([
                stop(rgb(0, 0, 0)),
                stop(rgb(9, 9, 9)),
            ]),
            transition: { type: "transition", parts: [] },
            gridTemplateColumns: px(1),
        } as unknown as StyleMap);
        expect(rules).toEqual([]);
        expect(diagnostics).toEqual([
            "box: width: no React Native equivalent for a viewportSize condition",
            "box: backgroundImage: no React Native gradients; only one-color layers",
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
