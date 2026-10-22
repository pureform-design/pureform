import { describe, expect, it } from "vitest";

import { alias, dynamic, hex, platform, px, spring } from "./ast";
import { defineComponent } from "./define";
import {
    AliasCycleError,
    ConfigPathError,
    getByPath,
    isSpringToken,
    resolveAlias,
    tokenAt,
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

describe("tokenAt", () => {
    it("gives the token's value node, or undefined where nothing is", () => {
        const config = {
            tokens: { sizes: { a: { $value: px(4) } } },
        } as unknown as CoreConfig;
        expect(tokenAt(config, ["tokens", "sizes", "a"])).toEqual(px(4));
        expect(tokenAt(config, ["tokens", "sizes", "b"])).toBeUndefined();
        expect(tokenAt(config, ["components", "x", "y"])).toBeUndefined();
    });
});

describe("isSpringToken", () => {
    const slow = spring({ stiffness: 200, damping: 0.9 });
    const config = {
        components: {
            tabs: { tokens: { move: alias("springs", "spatialFast") } },
            loop: {
                tokens: {
                    a: alias("components", "loop", "b"),
                    b: alias("components", "loop", "a"),
                },
            },
        },
    } as unknown as CoreConfig;

    it("takes a literal spring, a role, and a dynamic default", () => {
        expect(isSpringToken(slow)).toBe(true);
        expect(isSpringToken(alias("springs", "spatialFast"))).toBe(true);
        expect(isSpringToken(dynamic(["x"], slow))).toBe(true);
        expect(isSpringToken(dynamic(["x"]))).toBe(false);
        expect(isSpringToken(px(1))).toBe(false);
    });

    it("follows an alias to another token only with the config, and stops on a cycle", () => {
        const other = alias("components", "tabs", "move");
        expect(isSpringToken(other)).toBe(false);
        expect(isSpringToken(other, { config })).toBe(true);
        expect(
            isSpringToken(alias("components", "loop", "a"), { config }),
        ).toBe(false);
        expect(
            isSpringToken(alias("components", "none", "a"), { config }),
        ).toBe(false);
    });

    it("needs every platform choice to be one, or the target's", () => {
        const mixed = platform({ rn: px(1) }, slow);
        expect(isSpringToken(mixed)).toBe(false);
        expect(isSpringToken(mixed, { target: "css" })).toBe(true);
        expect(isSpringToken(mixed, { target: "rn" })).toBe(false);
    });
});
