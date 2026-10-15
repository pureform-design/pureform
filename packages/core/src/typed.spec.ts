import { describe, expect, expectTypeOf, it } from "vitest";

import { hex, literal, px, when } from "./ast";
import { alias as rawAlias } from "./ast/raw";
import { defineConfig, defineStaticUtility } from "./define";
import { defineConfig as rawDefineConfig } from "./raw";
import { typed } from "./typed";
import type { AliasPath } from "./typed";

const base = {
    tokens: {
        colors: { violet600: hex("#6750a4"), white: hex("#ffffff") },
        spacing: { "4": px(16) },
    },
    semanticTokens: { colors: { primary: hex("#6750a4") } },
    fonts: {},
    breakpoints: { md: px(768), lg: px(1024) },
    textStyles: { body: { fontSize: px(16) } },
    utilities: {
        elevation: defineStaticUtility({
            property: "boxShadow",
            values: { low: {}, high: {} },
        }),
    },
};

const pf = typed(base);

describe("typed alias", () => {
    it("builds the same node as the untyped alias", () => {
        expect(pf.alias("tokens", "colors", "violet600")).toEqual({
            type: "alias",
            path: ["tokens", "colors", "violet600"],
        });
    });

    it("offers only paths in the config", () => {
        expectTypeOf<AliasPath<typeof base>>().toEqualTypeOf<
            | ["tokens", "colors", "violet600"]
            | ["tokens", "colors", "white"]
            | ["tokens", "spacing", "4"]
            | ["semanticTokens", "colors", "primary"]
            | ["textStyles", "body"]
        >();
        // @ts-expect-error a misspelled token
        pf.alias("tokens", "colors", "violt600");
        // @ts-expect-error a category that doesn't exist
        pf.alias("tokens", "radii", "full");
        // @ts-expect-error too short a path
        pf.alias("tokens", "colors");
    });

    it("takes any name under a known root with no config", () => {
        typed().alias("tokens", "anything", "here");
    });
});

describe("typed references", () => {
    it("checks utility names and static steps", () => {
        expect(pf.apply({ elevation: "high" })).toEqual({ elevation: "high" });
        // @ts-expect-error not one of the utility's steps
        pf.apply({ elevation: "highest" });
        // @ts-expect-error not a utility
        pf.apply({ elevaton: "high" });
    });

    it("checks breakpoints", () => {
        expect(pf.viewport({ from: "md", until: "lg" })).toEqual({
            type: "viewportBreakpoint",
            from: "md",
            until: "lg",
        });
        // @ts-expect-error not a breakpoint
        pf.viewport("xl");
    });

    it("checks text styles", () => {
        expect(pf.textStyle("body")).toEqual({
            type: "alias",
            path: ["textStyles", "body"],
        });
        // @ts-expect-error not a text style
        pf.textStyle("headline");
    });
});

describe("typed slot component", () => {
    const button = pf.slotComponent({
        name: "button",
        slots: ["root", "icon", "label"],
        structure: { root: ["icon", "label"] },
        tokens: { height: px(40), radius: px(20) },
        variants: { size: ["small", "medium"], tone: ["plain", "brand"] },
        recipe: ({ slot, token, alias }) => ({
            base: {
                root: {
                    height: token("height"),
                    borderRadius: token("radius"),
                },
                label: {
                    color: when(
                        slot("root", "hover"),
                        alias("semanticTokens", "colors", "primary"),
                        alias("tokens", "colors", "white"),
                    ),
                },
            },
            variants: { size: { small: { root: { height: px(32) } } } },
            compoundVariants: [
                {
                    match: { size: "small", tone: "brand" },
                    style: { label: { color: literal("red") } },
                },
            ],
            defaultVariants: { size: "medium", tone: "plain" },
        }),
    });

    it("builds a plain slot component spec", () => {
        expect(button.kind).toBe("slotComponent");
        expect(button.recipe.base.root?.height).toEqual({
            type: "alias",
            path: ["components", "button", "height"],
        });
        expect(button.recipe.defaultVariants).toEqual({
            size: "medium",
            tone: "plain",
        });
    });

    it("gives every declared variant value an entry", () => {
        expect(Object.keys(button.recipe.variants?.size ?? {})).toEqual([
            "small",
            "medium",
        ]);
        expect(button.recipe.variants?.tone?.brand).toEqual({ root: {} });
    });

    it("validates in a config", () => {
        expect(() =>
            defineConfig({ ...base, components: { button } }),
        ).not.toThrow();
    });

    const spec = {
        slots: ["root", "label"],
        tokens: { height: px(32) },
        variants: { size: ["small"] },
    } as const;

    it("rejects an unknown token", () => {
        pf.slotComponent({
            name: "chip",
            ...spec,
            slots: ["root", "label"],
            recipe: ({ token }) => ({
                // @ts-expect-error not one of the component's tokens
                base: { root: { height: token("hieght") } },
            }),
        });
    });

    it("rejects an unknown slot in a condition", () => {
        pf.slotComponent({
            name: "chip",
            ...spec,
            slots: ["root", "label"],
            recipe: ({ slot }) => ({
                base: {
                    root: {
                        color: when(
                            // @ts-expect-error not a slot
                            slot("rot", "hover"),
                            hex("#000"),
                            hex("#fff"),
                        ),
                    },
                },
            }),
        });
    });

    it("rejects styling an unknown slot", () => {
        pf.slotComponent({
            name: "chip",
            ...spec,
            slots: ["root", "label"],
            // @ts-expect-error not a slot
            recipe: () => ({ base: { lable: {} } }),
        });
        pf.slotComponent({
            name: "chip",
            ...spec,
            slots: ["root", "label"],
            recipe: () => ({
                base: {},
                // @ts-expect-error not a slot
                variants: { size: { small: { icon: {} } } },
            }),
        });
    });

    it("rejects styling an unknown variant value", () => {
        pf.slotComponent({
            name: "chip",
            ...spec,
            slots: ["root", "label"],
            recipe: () => ({
                base: {},
                // @ts-expect-error not one of the group's values
                variants: { size: { large: {} } },
            }),
        });
        pf.component({
            name: "badge",
            variants: { tone: ["plain"] },
            recipe: () => ({
                base: {},
                // @ts-expect-error not one of the group's values
                variants: { tone: { brand: {} } },
            }),
        });
    });

    it("rejects an unknown variant value", () => {
        pf.slotComponent({
            name: "chip",
            ...spec,
            slots: ["root", "label"],
            recipe: () => ({
                base: {},
                // @ts-expect-error not one of the group's values
                defaultVariants: { size: "large" },
            }),
        });
    });
});

describe("typed component", () => {
    it("builds a single-slot component with checked variants", () => {
        const badge = pf.component({
            name: "badge",
            tokens: { size: px(16) },
            variants: { tone: ["plain", "brand"] },
            recipe: ({ token }) => ({
                base: { width: token("size") },
                variants: { tone: { brand: { color: hex("#6750a4") } } },
                defaultVariants: { tone: "plain" },
            }),
        });
        expect(badge.kind).toBe("component");
        expect(badge.recipe.variants?.tone).toEqual({
            plain: {},
            brand: { color: hex("#6750a4") },
        });
    });
});

describe("mixing typed and raw", () => {
    it("accepts raw nodes in a typed recipe", () => {
        const card = pf.slotComponent({
            name: "card",
            slots: ["root"],
            recipe: () => ({
                base: { root: { color: rawAlias("anything", "goes") } },
            }),
        });
        expect(card.recipe.base.root?.color).toEqual({
            type: "alias",
            path: ["anything", "goes"],
        });
    });

    it("accepts typed specs where raw ones go", () => {
        const badge = pf.component({
            name: "badge",
            recipe: () => ({ base: {} }),
        });
        expect(() =>
            rawDefineConfig({ ...base, components: { badge } }),
        ).not.toThrow();
    });
});

describe("typed configs with index signatures", () => {
    it("offers the declared names over the index signature", () => {
        type Config = {
            tokens: Record<string, Record<string, unknown>> & {
                radii: { small: unknown; full: unknown };
            };
        };
        expectTypeOf<AliasPath<Config>>().toEqualTypeOf<
            ["tokens", "radii", "small"] | ["tokens", "radii", "full"]
        >();
    });
});

describe("component tokens", () => {
    it("are offered from a config holding typed components", () => {
        const chip = pf.slotComponent({
            name: "chip",
            slots: ["root"],
            tokens: { height: px(32), radius: px(8) },
            recipe: () => ({ base: {} }),
        });
        const withChip = typed({ ...base, components: { chip } });
        expectTypeOf<
            Extract<
                AliasPath<{ components: { chip: typeof chip } }>,
                ["components", ...string[]]
            >
        >().toEqualTypeOf<["components", "chip", "height" | "radius"]>();
        withChip.alias("components", "chip", "radius");
        // @ts-expect-error not one of the chip's tokens
        withChip.alias("components", "chip", "width");
    });
});
