import { describe, expect, it } from "vitest";

import { alias, arg, literal, px } from "./ast";
import type { StyleMap } from "./ast";
import { inlineStyles } from "./inline";
import type { CoreConfig } from "./types";

const config = {
    tokens: {},
    components: {},
    textStyles: {
        label: { fontSize: px(14), lineHeight: px(20) },
    },
    utilities: {
        lift: {
            kind: "static",
            values: {
                high: {
                    zIndex: literal("2"),
                    states: { hover: { zIndex: literal("3") } },
                },
            },
        },
        inset: {
            kind: "dynamic",
            scale: ["tokens", "spacing"],
            template: { paddingInlineStart: arg() },
        },
    },
} as unknown as CoreConfig;

describe("inlineStyles", () => {
    it("writes the text style and utilities out, under the map's own properties", () => {
        const style = {
            textStyle: alias("textStyles", "label"),
            apply: { lift: "high", inset: "2" },
            fontSize: px(16),
        } as unknown as StyleMap;
        expect(inlineStyles(style, config)).toEqual({
            fontSize: px(16),
            lineHeight: px(20),
            zIndex: literal("2"),
            paddingInlineStart: alias("tokens", "spacing", "2"),
            states: { hover: { zIndex: literal("3") } },
        });
    });

    it("merges states by condition, through nested maps", () => {
        const style = {
            apply: { lift: "high" },
            states: { hover: { textStyle: alias("textStyles", "label") } },
        } as unknown as StyleMap;
        expect(inlineStyles(style, config).states).toEqual({
            hover: {
                zIndex: literal("3"),
                fontSize: px(14),
                lineHeight: px(20),
            },
        });
    });

    it("rejects unknown text styles and utility values", () => {
        expect(() =>
            inlineStyles(
                {
                    textStyle: alias("textStyles", "nope"),
                } as unknown as StyleMap,
                config,
            ),
        ).toThrow('unknown text style "nope"');
        expect(() =>
            inlineStyles(
                { apply: { lift: "low" } } as unknown as StyleMap,
                config,
            ),
        ).toThrow('utility "lift" has no value "low"');
    });
});
