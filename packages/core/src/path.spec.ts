import { describe, expect, it } from "vitest";

import { alias, hex, px } from "./ast";
import { defineComponent } from "./define";
import {
    AliasCycleError,
    ConfigPathError,
    getByPath,
    resolveAlias,
    validateConfig,
} from "./path";
import type { CoreConfig } from "./types";

const baseConfig = (): CoreConfig => ({
    tokens: {
        colors: { violet600: hex("#7c3aed") },
        spacing: { "2": px(8) },
    },
    semanticTokens: {
        colors: { brand: alias("tokens", "colors", "violet600") },
    },
    components: {
        button: defineComponent({
            name: "button",
            tokens: { bg: alias("semanticTokens", "colors", "brand") },
            recipe: { base: {} },
        }),
    },
});

describe("getByPath", () => {
    it("resolves a nested token path", () => {
        expect(
            getByPath(baseConfig(), ["tokens", "colors", "violet600"]),
        ).toEqual(hex("#7c3aed"));
    });

    it("splices tokens into the components namespace", () => {
        expect(getByPath(baseConfig(), ["components", "button", "bg"])).toEqual(
            alias("semanticTokens", "colors", "brand"),
        );
    });

    it("throws naming the nearest ancestor for an unknown key", () => {
        expect(() =>
            getByPath(baseConfig(), ["tokens", "colors", "missing"]),
        ).toThrow(ConfigPathError);
        expect(() =>
            getByPath(baseConfig(), ["tokens", "colors", "missing"]),
        ).toThrow(/nearest: tokens.colors/);
    });

    it("throws for an unknown component", () => {
        expect(() =>
            getByPath(baseConfig(), ["components", "ghost", "bg"]),
        ).toThrow(ConfigPathError);
    });
});

describe("resolveAlias", () => {
    it("follows an alias chain to the first concrete node", () => {
        const resolved = resolveAlias(
            baseConfig(),
            alias("components", "button", "bg"),
        );
        expect(resolved).toEqual(hex("#7c3aed"));
    });

    it("detects a cycle and lists the chain", () => {
        const cyclic: CoreConfig = {
            tokens: {},
            semanticTokens: {
                colors: {
                    a: alias("semanticTokens", "colors", "b"),
                    b: alias("semanticTokens", "colors", "a"),
                },
            },
            components: {},
        };
        expect(() =>
            resolveAlias(cyclic, alias("semanticTokens", "colors", "a")),
        ).toThrow(AliasCycleError);
    });
});

describe("validateConfig", () => {
    it("accepts a valid config", () => {
        expect(() => validateConfig(baseConfig())).not.toThrow();
    });

    it("rejects an unknown alias path", () => {
        const config = baseConfig();
        config.semanticTokens.colors = {
            brand: alias("tokens", "colors", "nope"),
        };
        expect(() => validateConfig(config)).toThrow(ConfigPathError);
    });

    it("rejects an alias cycle anywhere in the tree", () => {
        const config = baseConfig();
        config.semanticTokens.colors = {
            a: alias("semanticTokens", "colors", "b"),
            b: alias("semanticTokens", "colors", "a"),
        };
        expect(() => validateConfig(config)).toThrow(AliasCycleError);
    });
});
