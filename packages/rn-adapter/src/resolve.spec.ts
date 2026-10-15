import { defineSlotComponent } from "@pureform/core";
import {
    alias,
    colorMix,
    dynamic,
    linearGradient,
    pct,
    px,
    rgb,
    slot,
    stop,
    unitless,
    when,
} from "@pureform/core/ast";
import type { CoreConfig } from "@pureform/core/types";
import { describe, expect, it } from "vitest";

import { precompute, runtimeStyles } from "./build";
import { lowerRn } from "./lower";
import { resolve, stylesFor, themeKey } from "./resolve";
import { select } from "./select";
import { resolveTheme } from "./theme";
import { evaluate } from "./values";

// A button whose container color is a component token, with a hover state layer mixed over
// it, a label inheriting the root's color, and a teal theme.
const config = {
    tokens: {
        colors: {
            violet: rgb(100, 50, 150),
            teal: rgb(0, 100, 100),
            white: rgb(255, 255, 255),
            black: rgb(0, 0, 0),
        },
        spacing: { "2": px(8) },
    },
    semanticTokens: {
        colors: {
            primary: alias("tokens", "colors", "violet"),
            onPrimary: when(
                "dark",
                alias("tokens", "colors", "black"),
                alias("tokens", "colors", "white"),
            ),
        },
    },
    components: {
        button: defineSlotComponent({
            name: "button",
            slots: ["root", "label"],
            structure: { root: ["label"] },
            recipe: {
                base: {
                    root: {
                        backgroundColor: when(
                            slot("root", "hover"),
                            colorMix(
                                dynamic(
                                    ["components", "button", "container"],
                                    alias(
                                        "semanticTokens",
                                        "colors",
                                        "primary",
                                    ),
                                ),
                                alias("semanticTokens", "colors", "onPrimary"),
                                pct(10),
                            ),
                            dynamic(
                                ["components", "button", "container"],
                                alias("semanticTokens", "colors", "primary"),
                            ),
                        ),
                        color: alias("semanticTokens", "colors", "onPrimary"),
                        paddingInlineStart: alias("tokens", "spacing", "2"),
                    },
                    label: { fontSize: px(14), lineHeight: unitless(1.5) },
                },
                variants: {
                    variant: {
                        filled: {},
                        tinted: {
                            root: {
                                backgroundImage: linearGradient([
                                    stop(rgb(255, 255, 255, 0.5)),
                                    stop(rgb(255, 255, 255, 0.5)),
                                ]),
                                outlineStyle: {
                                    type: "keyword",
                                    value: "none",
                                },
                                outlineWidth: px(3),
                            },
                        },
                    },
                },
                defaultVariants: { variant: "filled" },
            },
        }),
    },
    themes: {
        teal: {
            semanticTokens: {
                colors: { primary: alias("tokens", "colors", "teal") },
            },
        },
        boxed: {
            components: { button: { tokens: { container: rgb(1, 2, 3) } } },
        },
    },
} as unknown as CoreConfig;

describe("resolveTheme", () => {
    it("resolves tokens for a scheme", () => {
        expect(resolveTheme(config, { scheme: "light" })).toMatchObject({
            "colors.primary": "rgba(100, 50, 150, 1)",
            "colors.onPrimary": "rgba(255, 255, 255, 1)",
            "spacing.2": 8,
        });
        expect(
            resolveTheme(config, { scheme: "dark" })["colors.onPrimary"],
        ).toBe("rgba(0, 0, 0, 1)");
    });

    it("applies a named theme's tokens and component tokens", () => {
        expect(
            resolveTheme(config, { scheme: "light", theme: "teal" })[
                "colors.primary"
            ],
        ).toBe("rgba(0, 100, 100, 1)");
        expect(
            resolveTheme(config, { scheme: "light", theme: "boxed" })[
                "components.button.container"
            ],
        ).toBe("rgba(1, 2, 3, 1)");
    });

    it("rejects an unknown theme", () => {
        expect(() =>
            resolveTheme(config, { scheme: "light", theme: "nope" }),
        ).toThrow('unknown theme "nope"');
    });
});

describe("select", () => {
    const set = resolve(
        lowerRn(config).components,
        resolveTheme(config, { scheme: "light" }),
    );
    const button = set.button!;

    it("passes inherited properties down the slots", () => {
        const { root, label } = select(button);
        expect(root).toEqual({
            backgroundColor: "rgba(100, 50, 150, 1)",
            color: "rgba(255, 255, 255, 1)",
            paddingStart: 8,
        });
        expect(label).toEqual({
            color: "rgba(255, 255, 255, 1)",
            fontSize: 14,
            lineHeight: 21,
        });
    });

    it("applies the state's rules, with the mix computed", () => {
        expect(select(button, {}, { hover: true }).root!.backgroundColor).toBe(
            "rgba(116, 71, 161, 1)",
        );
    });

    it("composites a tint over the background, and reads a `none` outline as no outline", () => {
        const { root } = select(button, { variant: "tinted" });
        expect(root!.backgroundColor).toBe("rgba(178, 153, 203, 1)");
        expect(root!.outlineWidth).toBe(0);
        expect(root!.outlineStyle).toBeUndefined();
    });
});

describe("theme modes", () => {
    const precomputed = precompute(config);
    const runtime = runtimeStyles(config);
    const keys = ["base", "teal", "boxed"].flatMap((theme) =>
        (["light", "dark"] as const).map((scheme) =>
            themeKey(theme === "base" ? undefined : theme, scheme),
        ),
    );

    it("resolve the same, in every theme", () => {
        for (const key of keys) {
            expect(stylesFor(precomputed, key)).toEqual(
                stylesFor(runtime, key),
            );
        }
    });

    it("resolve the same with overrides, recomputing mixes over the overridden token", () => {
        const overrides = {
            "components.button.container": "rgba(200, 0, 0, 1)",
        };
        for (const key of keys) {
            expect(stylesFor(precomputed, key, overrides)).toEqual(
                stylesFor(runtime, key, overrides),
            );
        }
        const styles = stylesFor(
            precomputed,
            themeKey(undefined, "light"),
            overrides,
        );
        expect(select(styles.button!).root!.backgroundColor).toBe(
            "rgba(200, 0, 0, 1)",
        );
        expect(
            select(styles.button!, {}, { hover: true }).root!.backgroundColor,
        ).toBe("rgba(206, 26, 26, 1)");
    });

    it("leave what an override doesn't reach alone", () => {
        const key = themeKey(undefined, "light");
        expect(stylesFor(precomputed, key, { "colors.unused": "red" })).toBe(
            stylesFor(precomputed, key),
        );
        expect(precomputed.dependents["spacing.2"]).toHaveLength(1);
    });

    it("are plain JSON", () => {
        expect(JSON.parse(JSON.stringify(precomputed))).toEqual(precomputed);
    });
});

describe("evaluate", () => {
    it("folds arithmetic and min/max/clamp", () => {
        expect(
            evaluate({ $calc: "*", args: [{ $ref: "a" }, -1] }, { a: 4 }),
        ).toBe(-4);
        expect(evaluate({ $math: "clamp", args: [1, 9, 5] }, {})).toBe(5);
    });

    it("writes shadows as React Native's boxShadow string", () => {
        expect(
            evaluate(
                {
                    $shadow: [
                        {
                            x: 0,
                            y: 1,
                            blur: 2,
                            spread: 0,
                            color: { $ref: "c" },
                        },
                    ],
                },
                {
                    c: "rgba(0, 0, 0, 0.3)",
                },
            ),
        ).toBe("0px 1px 2px 0px rgba(0, 0, 0, 0.3)");
    });

    it("needs every token it reads", () => {
        expect(() => evaluate({ $ref: "nope" }, {})).toThrow(
            'unknown token "nope"',
        );
    });
});
