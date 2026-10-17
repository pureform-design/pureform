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
