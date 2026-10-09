import { describe, expect, it } from "vitest";

import { alias, arg, hex, mul, px, unitless } from "./ast";
import {
    defineComponent,
    defineConfig,
    defineDynamicUtility,
    defineSlotComponent,
    defineStaticUtility,
    mergeConfigs,
    meta,
    stack,
    tokenValue,
} from "./define";
import { ConfigPathError, UtilityRefError } from "./path";
import type { CoreConfig } from "./types";

describe("spec builders", () => {
    it("inject the discriminant kind", () => {
        expect(defineComponent({ name: "x", recipe: { base: {} } }).kind).toBe(
            "component",
        );
        expect(
            defineSlotComponent({
                name: "x",
                slots: ["root"],
                recipe: { base: {} },
            }).kind,
        ).toBe("slotComponent");
        expect(defineStaticUtility({ values: {} }).kind).toBe("static");
        expect(defineDynamicUtility({ template: {} }).kind).toBe("dynamic");
    });
});

const configWithUtilities = (apply: Record<string, string>): CoreConfig => ({
    tokens: { spacing: { "2": px(8), "4": px(16) } },
    semanticTokens: {},
    utilities: {
        shadowElevation: defineStaticUtility({
            property: "boxShadow",
            values: { level0: {}, level1: {} },
        }),
        m: defineDynamicUtility({
            scale: ["tokens", "spacing"],
            template: { marginInlineStart: mul(arg(), px(1)) },
        }),
    },
    components: {
        button: defineComponent({
            name: "button",
            recipe: { base: { apply } },
        }),
    },
});

describe("defineConfig", () => {
    it("returns the config unchanged when valid", () => {
        const config = configWithUtilities({
            shadowElevation: "level1",
            m: "2",
        });
        expect(defineConfig(config)).toBe(config);
    });

    it("rejects an unknown utility name in apply", () => {
        expect(() => defineConfig(configWithUtilities({ nope: "x" }))).toThrow(
            UtilityRefError,
        );
    });

    it("rejects an unknown static-utility step", () => {
        expect(() =>
            defineConfig(configWithUtilities({ shadowElevation: "level9" })),
        ).toThrow(UtilityRefError);
    });

    it("rejects an unknown dynamic-utility scale key", () => {
        expect(() => defineConfig(configWithUtilities({ m: "99" }))).toThrow(
            ConfigPathError,
        );
    });
});

describe("mergeConfigs", () => {
    it("deep-merges fragments with the later fragment winning", () => {
        const base: CoreConfig = {
            tokens: { colors: { brand: hex("#7c3aed") } },
            semanticTokens: {},
            components: {},
        };
        const merged = mergeConfigs(base, {
            tokens: { colors: { brand: hex("#000000") } },
        });
        expect(merged.tokens.colors?.brand).toEqual(hex("#000000"));
    });
});

describe("meta and tokenValue", () => {
    it("wraps and unwraps a token value", () => {
        const wrapped = meta(px(4), { description: "gap" });
        expect(wrapped).toEqual({
            $value: px(4),
            $meta: { description: "gap" },
        });
        expect(tokenValue(wrapped)).toEqual(px(4));
        expect(tokenValue(px(4))).toEqual(px(4));
    });
});

describe("stack", () => {
    it("spaces layer names by the step in declared order", () => {
        expect(stack(["base", "modal", "toast"])).toEqual({
            base: unitless(0),
            modal: unitless(100),
            toast: unitless(200),
        });
    });

    it("honours a custom base and step", () => {
        expect(stack(["a", "b"], { base: 10, step: 5 })).toEqual({
            a: unitless(10),
            b: unitless(15),
        });
    });
});

describe("alias helper reused in config", () => {
    it("stays a plain node", () => {
        expect(alias("tokens", "spacing", "2")).toEqual({
            type: "alias",
            path: ["tokens", "spacing", "2"],
        });
    });
});
