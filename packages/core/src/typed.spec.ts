import { describe, expect, expectTypeOf, it } from "vitest";

import { dynamic, hex, literal, px, viewportBreakpoint, when } from "./ast";
import { alias as rawAlias } from "./ast/raw";
import { defineConfig, defineStaticUtility } from "./define";
import { validateConfig } from "./path";
import { defineConfig as rawDefineConfig } from "./raw";
import { typed } from "./typed";
import type { AliasPath, AliasRoot, AliasSecond, AliasThird } from "./typed";

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
        // @ts-expect-error a name from another tier
        pf.alias("tokens", "colors", "4");
        // @ts-expect-error a root the config doesn't have
        pf.alias("durations", "short1");
    });

    it("takes one name under a flat root, and no more", () => {
        expect(pf.alias("textStyles", "body").path).toEqual([
            "textStyles",
            "body",
        ]);
        // @ts-expect-error a flat root takes one name
        pf.alias("textStyles", "body", "extra");
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

// Editors suggest each alias name from these, given the names before it, so they pin the
// narrowing: if one widened back to every name, suggestions would stop narrowing.
describe("alias narrowing", () => {
    type C = typeof base;

    it("offers only the roots the config has", () => {
        expectTypeOf<AliasRoot<C>>().toEqualTypeOf<
            "tokens" | "semanticTokens" | "fonts" | "textStyles"
        >();
    });

    it("narrows the second name by the root", () => {
        expectTypeOf<AliasSecond<C, "tokens">>().toEqualTypeOf<
            "colors" | "spacing"
        >();
        expectTypeOf<
            AliasSecond<C, "semanticTokens">
        >().toEqualTypeOf<"colors">();
        expectTypeOf<AliasSecond<C, "textStyles">>().toEqualTypeOf<"body">();
    });

    it("narrows the third name by the root and the second", () => {
        expectTypeOf<AliasThird<C, "tokens", "colors">>().toEqualTypeOf<
            "violet600" | "white"
        >();
        expectTypeOf<AliasThird<C, "tokens", "spacing">>().toEqualTypeOf<"4">();
        expectTypeOf<
            AliasThird<C, "semanticTokens", "colors">
        >().toEqualTypeOf<"primary">();
        expectTypeOf<AliasThird<C, "textStyles", "body">>().toBeNever();
    });

    it("narrows component tokens by the component", () => {
        const chip = pf.slotComponent({
            name: "chip",
            slots: ["root"],
            tokens: { height: px(32) },
            recipe: () => ({ base: {} }),
        });
        type WithChip = { components: { chip: typeof chip } };
        expectTypeOf<
            AliasSecond<WithChip, "components">
        >().toEqualTypeOf<"chip">();
        expectTypeOf<
            AliasThird<WithChip, "components", "chip">
        >().toEqualTypeOf<"height">();
    });
});

describe("typed dynamic", () => {
    const withChip = typed({
        components: {
            chip: pf.slotComponent({
                name: "chip",
                slots: ["root"],
                tokens: { height: px(32) },
                recipe: () => ({ base: {} }),
            }),
        },
    });

    it("builds the same node as the untyped dynamic", () => {
        expect(pf.dynamic(["global", "colors", "brand"], hex("#000"))).toEqual(
            dynamic(["global", "colors", "brand"], hex("#000")),
        );
    });

    it("checks the tier", () => {
        // @ts-expect-error not a tier
        pf.dynamic(["theme", "brand"]);
    });

    it("narrows a component path by the config's components", () => {
        expect(withChip.dynamic(["components", "chip", "height"]).path).toEqual(
            ["components", "chip", "height"],
        );
        // @ts-expect-error a component the config doesn't have
        withChip.dynamic(["components", "chop", "height"]);
        // @ts-expect-error a token the component doesn't have
        withChip.dynamic(["components", "chip", "width"]);
        // @ts-expect-error a component path names one token
        withChip.dynamic(["components", "chip"]);
    });

    it("leaves component names open when the config has none", () => {
        pf.dynamic(["components", "anything", "bg"]);
    });
});

describe("typed when", () => {
    it("builds the same node as the untyped when", () => {
        expect(pf.when(pf.viewport("md"), px(2), px(1))).toEqual(
            when(viewportBreakpoint("md"), px(2), px(1)),
        );
    });

    it("checks breakpoints in its conditions", () => {
        pf.when()
            .on(pf.viewport({ until: "lg" }), px(2))
            .else(px(1));
        pf.when([pf.container("lg"), "hover"], px(2), px(1));
        // @ts-expect-error a breakpoint the config doesn't have
        pf.when(viewportBreakpoint("xl"), px(2), px(1));
        // @ts-expect-error a breakpoint the config doesn't have, in the builder
        pf.when().on({ type: "containerBreakpoint", from: "xl" }, px(2));
    });
});

describe("typed variants and slots", () => {
    it("keeps a component's variant values and slots in its type", () => {
        const chip = pf.slotComponent({
            name: "chip",
            slots: ["root", "label"],
            variants: { size: ["small", "large"], selected: ["true", "false"] },
            recipe: () => ({ base: {} }),
        });
        expectTypeOf<NonNullable<(typeof chip)["$variants"]>>().toEqualTypeOf<{
            size: "small" | "large";
            selected: "true" | "false";
        }>();
        expectTypeOf(chip.slots).toEqualTypeOf<("root" | "label")[]>();
    });
});

describe("provided tokens", () => {
    const accent = dynamic(["components", "chip", "accent"], hex("#6750a4"));
    const bar = (slot: "root" | "label" = "root") =>
        pf.slotComponent({
            name: "bar",
            slots: ["root", "label"],
            structure: { root: ["label"] },
            variants: { tone: ["brand", "plain"] },
            recipe: () => ({
                base: {},
                variants: {
                    tone: {
                        brand: {
                            [slot]: {
                                providedTokens: {
                                    chip: { accent: hex("#b3261e") },
                                },
                            },
                        },
                    },
                },
            }),
        });

    it("give another component's tokens by path", () => {
        expect(
            bar().recipe.variants!.tone!.brand!.root!.providedTokens,
        ).toEqual({
            "components.chip.accent": hex("#b3261e"),
        });
    });

    it("may be set on any slot, for what's inside it", () => {
        expect(
            bar("label").recipe.variants!.tone!.brand!.label!.providedTokens,
        ).toEqual({ "components.chip.accent": hex("#b3261e") });
    });

    it("name a token the component has", () => {
        const chip = { kind: "component", name: "chip", tokens: { accent } };
        const config = (component: object) =>
            ({
                tokens: {},
                semanticTokens: {},
                components: { chip, bar: component },
            }) as never;
        expect(() => validateConfig(config(bar()))).not.toThrow();
        // A config without the chip has nothing to provide to.
        expect(() =>
            validateConfig({
                tokens: {},
                semanticTokens: {},
                components: { bar: bar() },
            } as never),
        ).not.toThrow();
        const wrong = pf.slotComponent({
            name: "bar",
            slots: ["root"],
            recipe: () => ({
                base: {
                    root: { providedTokens: { chip: { other: hex("#000") } } },
                },
            }),
        });
        expect(() => validateConfig(config(wrong))).toThrow(
            /components\.chip\.other not found/,
        );
    });
});

describe("variant tokens", () => {
    const accent = dynamic(["components", "chip", "accent"], hex("#6750a4"));
    const chip = () =>
        pf.slotComponent({
            name: "chip",
            slots: ["root", "label"],
            structure: { root: ["label"] },
            tokens: { accent },
            variants: { tone: ["brand", "plain"] },
            recipe: ({ token }) => ({
                base: { root: { backgroundColor: token("accent") } },
                variants: {
                    tone: {
                        brand: {
                            root: {
                                tokens: { accent: hex("#b3261e") },
                                states: {
                                    hover: {
                                        tokens: { accent: hex("#8c1d18") },
                                    },
                                },
                            },
                        },
                    },
                },
            }),
        });

    it("set the component's own tokens by path, through states", () => {
        const root = chip().recipe.variants!.tone!.brand!.root!;
        expect(root.tokens).toEqual({
            "components.chip.accent": hex("#b3261e"),
        });
        expect(root.states?.hover?.tokens).toEqual({
            "components.chip.accent": hex("#8c1d18"),
        });
    });

    it("take only the component's own token names", () => {
        pf.slotComponent({
            name: "chip",
            slots: ["root"],
            tokens: { accent },
            recipe: () => ({
                base: {
                    // @ts-expect-error: not one of the chip's tokens
                    root: { tokens: { other: hex("#000000") } },
                },
            }),
        });
    });

    it("are only set on a root slot", () => {
        expect(() =>
            pf.slotComponent({
                name: "chip",
                slots: ["root", "label"],
                structure: { root: ["label"] },
                tokens: { accent },
                recipe: () => ({
                    base: { label: { tokens: { accent: hex("#000000") } } },
                }),
            }),
        ).toThrow('slot "label" sets tokens');
    });
});
