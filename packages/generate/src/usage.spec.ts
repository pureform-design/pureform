import type { CoreConfig } from "@pureform/core/types";
import { describe, expect, it } from "vitest";

import { componentShape } from "./shape";
import { keepsValue, narrowConfig, normalizeVariants } from "./usage";

const config = {
    tokens: {},
    semanticTokens: {},
    themes: { teal: {} },
    components: {
        button: {
            kind: "slotComponent",
            name: "button",
            slots: ["root", "label"],
            tokens: { radius: { kind: "raw", value: "4px" } },
            recipe: {
                base: { root: { color: "red" }, label: {} },
                variants: {
                    variant: {
                        filled: { root: { color: "blue" } },
                        text: { root: {} },
                        tonal: { root: {} },
                    },
                    size: { small: { root: {} }, large: { root: {} } },
                    toggle: { true: { root: {} }, false: { root: {} } },
                },
                compoundVariants: [
                    { match: { variant: "filled", toggle: "true" }, style: {} },
                    { match: { variant: "text", toggle: "true" }, style: {} },
                    { match: { size: "large" }, style: {} },
                ],
                defaultVariants: { variant: "filled", toggle: "false" },
            },
        },
        chip: { kind: "component", name: "chip", recipe: { base: {} } },
    },
} as unknown as CoreConfig;

const shape = (name: string) => componentShape(config.components[name]!);

describe("normalizeVariants", () => {
    it("keeps each narrowed group's default and the config's order, and drops what doesn't narrow", () => {
        expect(
            normalizeVariants(
                {
                    button: {
                        variant: ["tonal", "nope"],
                        size: ["large", "small"],
                        toggle: [],
                        missing: ["x"],
                    },
                    chip: { variant: ["a"] },
                    card: { variant: ["a"] },
                },
                ["button", "chip"],
                shape,
            ),
        ).toEqual({
            button: { variant: ["filled", "tonal"], toggle: ["false"] },
        });
    });

    it('takes a "*" group for the groups not listed', () => {
        expect(
            normalizeVariants(
                { button: { "*": [], variant: ["text"] } },
                ["button"],
                shape,
            ),
        ).toEqual({
            button: {
                variant: ["filled", "text"],
                size: [],
                toggle: ["false"],
            },
        });
    });

    it("leaves out components outside the list, and is empty without usage", () => {
        expect(
            normalizeVariants({ button: { size: ["small"] } }, ["chip"], shape),
        ).toEqual({});
        expect(normalizeVariants(undefined, ["button"], shape)).toEqual({});
    });
});

describe("keepsValue", () => {
    it("keeps values of groups and components the usage leaves out", () => {
        const usage = { button: { variant: ["filled"] } };
        expect(keepsValue(usage, "button", "variant", "filled")).toBe(true);
        expect(keepsValue(usage, "button", "variant", "text")).toBe(false);
        expect(keepsValue(usage, "button", "size", "large")).toBe(true);
        expect(keepsValue(usage, "chip", "variant", "x")).toBe(true);
        expect(keepsValue(undefined, "button", "variant", "text")).toBe(true);
    });
});

describe("narrowConfig", () => {
    it("keeps only the components named, narrowing values and the compound variants matching them", () => {
        const narrowed = narrowConfig(config, ["button"], {
            button: { variant: ["filled"], toggle: ["true", "false"] },
        });
        expect(Object.keys(narrowed.components)).toEqual(["button"]);
        const recipe = narrowed.components.button!.recipe as {
            variants: Record<string, Record<string, unknown>>;
            compoundVariants: { match: Record<string, string> }[];
            base: unknown;
            defaultVariants: unknown;
        };
        expect(Object.keys(recipe.variants.variant!)).toEqual(["filled"]);
        expect(Object.keys(recipe.variants.size!)).toEqual(["small", "large"]);
        expect(
            recipe.compoundVariants.map((compound) => compound.match),
        ).toEqual([{ variant: "filled", toggle: "true" }, { size: "large" }]);
        expect(recipe.base).toBe(
            (config.components.button!.recipe as { base: unknown }).base,
        );
        expect(recipe.defaultVariants).toEqual({
            variant: "filled",
            toggle: "false",
        });
        expect(narrowed.themes).toBe(config.themes);
        expect(narrowed.components.button!.tokens).toBe(
            config.components.button!.tokens,
        );
    });

    it("returns components without usage as they are", () => {
        const narrowed = narrowConfig(config, ["button", "chip"]);
        expect(narrowed.components.button).toBe(config.components.button);
        expect(narrowed.components.chip).toBe(config.components.chip);
    });
});

describe("narrowConfig keyframes", () => {
    const frames = { from: {}, to: {} };
    const animated = {
        ...config,
        keyframes: {
            chipSpin: frames,
            chipFade: frames,
            buttonPulse: frames,
            buttonPulseRtl: frames,
            appOwned: frames,
        },
        components: {
            button: {
                ...config.components.button!,
                recipe: {
                    ...(config.components.button!.recipe as object),
                    variants: {
                        variant: {
                            filled: { root: {} },
                            text: { root: { animation: "buttonPulse 1s" } },
                        },
                    },
                    compoundVariants: [],
                    defaultVariants: { variant: "filled" },
                },
            },
            chip: {
                kind: "component",
                name: "chip",
                recipe: {
                    base: {
                        animation: { type: "animation", name: "chipSpin" },
                        rawRules: {
                            css: { "&:hover": { animationName: "chipFade" } },
                        },
                    },
                },
            },
        },
    } as unknown as CoreConfig;

    it("drops keyframes only a left-out component used, keeping the kept components' and those nothing in the config uses", () => {
        const narrowed = narrowConfig(animated, ["button"]);
        // The chip left, so do its two; the app's own keyframes, which nothing here names, stay.
        expect(Object.keys(narrowed.keyframes!).sort()).toEqual([
            "appOwned",
            "buttonPulse",
            "buttonPulseRtl",
        ]);
        // Nothing is left out: nothing goes.
        expect(
            Object.keys(narrowConfig(animated, ["button", "chip"]).keyframes!),
        ).toHaveLength(5);
    });

    it("drops keyframes a kept component only used through a variant value the app doesn't select", () => {
        const narrowed = narrowConfig(animated, ["button", "chip"], {
            button: { variant: ["filled"] },
        });
        expect(Object.keys(narrowed.keyframes!).sort()).toEqual([
            "appOwned",
            "buttonPulseRtl",
            "chipFade",
            "chipSpin",
        ]);
    });
});

describe("narrowConfig (tokens and themes)", () => {
    const alias = (...path: string[]) => ({ type: "alias", path });
    const lit = (value: string) => ({ type: "literal", value });
    const base = {
        tokens: {
            colors: {
                primary: lit("red"),
                primaryContainer: lit("pink"),
                base: lit("blue"),
                unused: lit("black"),
            },
            fontSize: { body: lit("1rem"), huge: lit("4rem") },
        },
        semanticTokens: {
            colors: { brand: alias("tokens", "colors", "base") },
        },
        durations: { fast: lit("100ms"), slow: lit("400ms") },
        springs: { spatial: lit("spring") },
        textStyles: {
            body: { fontSize: alias("tokens", "fontSize", "body") },
            display: { fontSize: alias("tokens", "fontSize", "huge") },
        },
        themes: {
            teal: { tokens: { colors: { primary: lit("teal") } } },
            rose: { tokens: { colors: { unused: lit("rose") } } },
        },
        components: {
            button: {
                kind: "component",
                name: "button",
                recipe: {
                    base: {
                        color: alias("semanticTokens", "colors", "brand"),
                        background: alias("tokens", "colors", "primary"),
                        textStyle: alias("textStyles", "body"),
                        transition: alias("durations", "fast"),
                    },
                },
            },
            chip: {
                kind: "component",
                name: "chip",
                recipe: {
                    base: { color: alias("tokens", "colors", "unused") },
                },
            },
        },
    } as unknown as CoreConfig;
    const prune = (
        pruning: Parameters<typeof narrowConfig>[3],
        components = ["button"],
    ) => narrowConfig(base, components, {}, pruning);

    it("keeps everything unless asked", () => {
        expect(prune({}).tokens).toEqual(base.tokens);
        expect(prune({}).themes).toEqual(base.themes);
    });

    it("keeps what kept components reach, through aliases and text styles", () => {
        const pruned = prune({ pruneTokens: true });
        expect(Object.keys(pruned.tokens["colors"]!).sort()).toEqual([
            "base",
            "primary",
        ]);
        expect(Object.keys(pruned.tokens["fontSize"]!)).toEqual(["body"]);
        expect(Object.keys(pruned.textStyles!)).toEqual(["body"]);
        expect(Object.keys(pruned.durations!)).toEqual(["fast"]);
    });

    it("never takes a token by its prefix", () => {
        expect(
            prune({ pruneTokens: true }).tokens["colors"],
        ).not.toHaveProperty("primaryContainer");
    });

    it("keeps every spring", () => {
        expect(Object.keys(prune({ pruneTokens: true }).springs!)).toEqual([
            "spatial",
        ]);
    });

    it("keeps what keepTokens names, by config path or var ref", () => {
        const pruned = prune({
            pruneTokens: true,
            keepTokens: ["colors.primaryContainer", "durations.*"],
        });
        expect(pruned.tokens["colors"]).toHaveProperty("primaryContainer");
        expect(Object.keys(pruned.durations!).sort()).toEqual(["fast", "slow"]);
    });

    it("keeps a token a raw var names", () => {
        const withRaw = {
            ...base,
            componentBaseStyles: {
                color: {
                    type: "literal",
                    value: "var(--colors-primary-container)",
                },
            },
        } as unknown as CoreConfig;
        const pruned = narrowConfig(
            withRaw,
            ["button"],
            {},
            { pruneTokens: true },
        );
        expect(pruned.tokens["colors"]).toHaveProperty("primaryContainer");
    });

    it("drops a theme's unreached tokens, and the themes the app doesn't select", () => {
        const pruned = prune({ pruneTokens: true });
        expect(pruned.themes!["rose"]).toEqual({ tokens: {} });
        expect(pruned.themes!["teal"]!.tokens!["colors"]).toHaveProperty(
            "primary",
        );
        expect(Object.keys(prune({ themes: ["teal"] }).themes!)).toEqual([
            "teal",
        ]);
        expect(prune({ themes: [] }).themes).toEqual({});
    });
});
