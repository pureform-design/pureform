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
import type { ValueNode } from "@pureform/core/ast";
import type { CoreConfig } from "@pureform/core/types";
import { describe, expect, it } from "vitest";

import { precompute, runtimeStyles } from "./build";
import { lowerRn } from "./lower";
import {
    overridesFor,
    resolve,
    stylesFor,
    themeKey,
    withDerived,
} from "./resolve";
import { select, selectWithTransitions } from "./select";
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
        expect(root!.zIndex).toBeUndefined();
    });
});

describe("flex direction", () => {
    it("runs a flex box in a row as CSS does, unless it says otherwise", () => {
        const kw = (value: string) => ({ type: "keyword", value });
        const box = lowerRn({
            ...config,
            components: {
                box: {
                    kind: "component",
                    name: "box",
                    recipe: {
                        base: { display: kw("flex") },
                        variants: {
                            dir: {
                                column: { flexDirection: kw("column") },
                                none: {},
                            },
                        },
                    },
                },
                block: {
                    kind: "component",
                    name: "block",
                    recipe: { base: { width: px(1) } },
                },
            },
        } as unknown as CoreConfig).components;
        expect(select(box.box!, { dir: "none" })[""]!.flexDirection).toBe(
            "row",
        );
        expect(select(box.box!, { dir: "column" })[""]!.flexDirection).toBe(
            "column",
        );
        expect(select(box.block!)[""]!.flexDirection).toBeUndefined();
    });

    it("lets a flex box's slots shrink, as CSS's flex items do", () => {
        const kw = (value: string) => ({ type: "keyword", value });
        const row = lowerRn({
            ...config,
            components: {
                row: {
                    kind: "slotComponent",
                    name: "row",
                    slots: ["root", "text", "fixed"],
                    structure: { root: ["text", "fixed"] },
                    recipe: {
                        base: {
                            root: { display: kw("flex") },
                            text: { width: pct(100) },
                            fixed: {
                                flexShrink: {
                                    type: "numeric",
                                    value: 0,
                                    unit: "none",
                                },
                            },
                        },
                    },
                },
            },
        } as unknown as CoreConfig).components.row!;
        const styles = select(row);
        expect(styles.text!.flexShrink).toBe(1);
        expect(styles.fixed!.flexShrink).toBe(0);
        expect(styles.root!.flexShrink).toBeUndefined();
    });
});

describe("outlines", () => {
    it("lift a slot drawing one over its neighbors, as CSS paints outlines last", () => {
        const kw = (value: string) => ({ type: "keyword", value }) as ValueNode;
        const ring = lowerRn({
            ...config,
            components: {
                ring: {
                    kind: "component",
                    name: "ring",
                    recipe: {
                        base: {
                            outlineStyle: when(
                                "focusVisible",
                                kw("solid"),
                                kw("none"),
                            ),
                            outlineWidth: px(3),
                        },
                    },
                },
            },
        } as unknown as CoreConfig).components.ring!;
        expect(select(ring, {}, { focusVisible: true })[""]!.zIndex).toBe(1);
        expect(select(ring)[""]!.zIndex).toBeUndefined();
    });
});

describe("withDerived", () => {
    it("recomputes the tokens derived from an override, in either mode", () => {
        const violet = { "colors.violet": "rgba(200, 0, 0, 1)" };
        for (const styles of [
            precompute(config, { schemes: ["light"] }),
            runtimeStyles(config, { schemes: ["light"] }),
        ]) {
            expect(withDerived(styles, "base:light", violet)).toEqual({
                ...violet,
                "colors.primary": "rgba(200, 0, 0, 1)",
            });
            const root = select(
                stylesFor(styles, "base:light", violet).button!,
            ).root!;
            expect(root.backgroundColor).toBe("rgba(200, 0, 0, 1)");
        }
    });

    it("keeps a token given outright", () => {
        const styles = precompute(config, { schemes: ["light"] });
        const given = {
            "colors.violet": "rgba(200, 0, 0, 1)",
            "colors.primary": "rgba(0, 0, 200, 1)",
        };
        expect(withDerived(styles, "base:light", given)).toEqual(given);
    });
});

describe("viewport conditions", () => {
    it("hold by the window's width, and not without one", () => {
        const box = lowerRn({
            ...config,
            breakpoints: { md: px(768) },
            components: {
                box: {
                    kind: "component",
                    name: "box",
                    recipe: {
                        base: {
                            width: when(
                                { type: "viewportBreakpoint", from: "md" },
                                px(10),
                                px(5),
                            ),
                        },
                    },
                },
            },
        } as unknown as CoreConfig).components.box!;
        expect(select(box, {}, { width: 800 })[""]!.width).toBe(10);
        expect(select(box, {}, { width: 700 })[""]!.width).toBe(5);
        expect(select(box)[""]!.width).toBe(5);
    });
});

describe("evaluate with units", () => {
    it("carries a unit through calc and min/max, and refuses to mix units", () => {
        const theme = { value: 40 };
        expect(
            evaluate({ $calc: "*", args: [{ $ref: "value" }, "1%"] }, theme),
        ).toBe("40%");
        expect(evaluate({ $calc: "+", args: ["-135deg", "9deg"] }, theme)).toBe(
            "-126deg",
        );
        expect(evaluate({ $math: "max", args: ["10%", "40%"] }, theme)).toBe(
            "40%",
        );
        expect(evaluate({ $calc: "+", args: [4, 8] }, theme)).toBe(12);
        expect(evaluate({ $calc: "-", args: ["100%", 8] }, theme)).toEqual({
            percent: 100,
            offset: -8,
        });
        expect(() =>
            evaluate({ $calc: "*", args: ["2%", "3%"] }, theme),
        ).toThrow(`calc can't multiply "2%" by "3%"`);
    });
});

describe("percentages plus pixels", () => {
    it("put the pixels on an inset's margin", () => {
        const handle = lowerRn({
            ...config,
            components: {
                handle: {
                    kind: "component",
                    name: "handle",
                    recipe: {
                        base: {
                            insetInlineStart: {
                                type: "calc",
                                op: "-",
                                operands: [pct(40), px(10)],
                            },
                            width: {
                                type: "calc",
                                op: "+",
                                operands: [pct(50), px(4)],
                            },
                        },
                    },
                },
            },
        } as unknown as CoreConfig).components.handle!;
        const style = select(resolve({ handle }, {}).handle!)[""]!;
        expect(style).toMatchObject({
            start: "40%",
            marginStart: -10,
            width: "50%",
        });
    });
});

describe("overridesFor", () => {
    it("writes override colors in other notations as rgba()", () => {
        expect(
            overridesFor(
                {
                    light: {
                        "colors.primary": "hsl(120, 100%, 25%)",
                        "spacing.2": 8,
                    },
                },
                "light",
            ),
        ).toEqual({ "colors.primary": "rgba(0, 128, 0, 1)", "spacing.2": 8 });
    });
});

describe("selectWithTransitions", () => {
    it("returns transitions beside the styles, not in them", () => {
        const motion = lowerRn({
            ...config,
            components: {
                box: {
                    kind: "component",
                    name: "box",
                    recipe: {
                        base: {
                            color: rgb(0, 0, 0),
                            transition: {
                                type: "transition",
                                parts: [
                                    {
                                        property: "color",
                                        duration: {
                                            type: "numeric",
                                            value: 100,
                                            unit: "ms",
                                        },
                                    },
                                ],
                            },
                        },
                    },
                },
            },
        } as unknown as CoreConfig).components.box!;
        const { styles, transitions } = selectWithTransitions(motion);
        expect(styles[""]).toEqual({ color: "rgba(0, 0, 0, 1)" });
        expect(transitions[""]).toEqual([
            {
                property: "color",
                duration: 100,
                easing: "cubic-bezier(0.25, 0.1, 0.25, 1)",
                delay: 0,
            },
        ]);
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

describe("overridesFor", () => {
    it("applies flat overrides to both schemes, and per-scheme ones to theirs", () => {
        const flat = { "colors.primary": "rgba(1, 1, 1, 1)" };
        expect(overridesFor(flat, "dark")).toBe(flat);
        const perScheme = { light: flat };
        expect(overridesFor(perScheme, "light")).toBe(flat);
        expect(overridesFor(perScheme, "dark")).toEqual({});
        expect(overridesFor(undefined, "light")).toEqual({});
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
