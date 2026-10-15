import { defineComponent } from "@pureform/core";
import {
    alias,
    animation,
    clamp,
    colorMix,
    cubicBezier,
    dynamic,
    easing,
    fontFamily,
    hex,
    inlineFlex,
    linearGradient,
    radialGradient,
    literal,
    min,
    mul,
    oklch,
    pct,
    platform,
    px,
    auto,
    rgb,
    rotate,
    shadow,
    steps,
    stop,
    sub,
    transform,
    transition,
    translate,
    transparent,
    tween,
    unitless,
    vertical,
    content,
    when,
} from "@pureform/core/ast";
import {
    absolute,
    blur,
    filter,
    hidden,
    none,
    rowReverse,
    solid,
} from "@pureform/core/ast";
import type { CoreConfig } from "@pureform/core/types";
import { describe, expect, it } from "vitest";

import { compileNodeToCSS } from "./compile-node";
import { compileValue } from "./conditions";
import type { CompileCtx } from "./options";
import { compileStyleMap } from "./style-map";

const emptyConfig: CoreConfig = {
    tokens: {},
    semanticTokens: {},
    components: {},
};

const ctx = (over: Partial<CompileCtx> = {}): CompileCtx => ({
    config: emptyConfig,
    prefix: undefined,
    target: "css",
    refStyle: "fn",
    ...over,
});

describe("compileNodeToCSS scalars", () => {
    it("emits literals, keywords, and unit-encoded numerics", () => {
        expect(compileNodeToCSS(literal("100vh"), ctx())).toBe("100vh");
        expect(compileNodeToCSS(inlineFlex, ctx())).toBe("inline-flex");
        expect(compileNodeToCSS(px(16), ctx())).toBe("16px");
        expect(compileNodeToCSS(unitless(600), ctx())).toBe("600");
    });

    it("renders colors in their own space", () => {
        expect(compileNodeToCSS(rgb(124, 58, 237), ctx())).toBe(
            "rgb(124 58 237)",
        );
        expect(compileNodeToCSS(hex("#00000080"), ctx())).toMatch(
            /^rgb\(0 0 0 \/ 0\.50/,
        );
        expect(compileNodeToCSS(oklch(0.6, 0.2, 290), ctx())).toBe(
            "oklch(0.6 0.2 290)",
        );
    });
});

describe("compileNodeToCSS references", () => {
    it("emits a token() ref for a token alias, never an inlined value", () => {
        expect(
            compileNodeToCSS(alias("tokens", "colors", "brand"), ctx()),
        ).toBe("token(colors.brand)");
        expect(compileNodeToCSS(alias("tokens", "fontSize", "md"), ctx())).toBe(
            "token(fontSizes.md)",
        );
        expect(
            compileNodeToCSS(alias("semanticTokens", "colors", "brand"), ctx()),
        ).toBe("token(colors.brand)");
    });

    it("resolves a component-token alias to its dynamic var", () => {
        const config: CoreConfig = {
            tokens: {},
            semanticTokens: {},
            components: {
                button: defineComponent({
                    name: "button",
                    tokens: {
                        radius: dynamic(
                            ["components", "button", "radius"],
                            px(8),
                        ),
                    },
                    recipe: { base: {} },
                }),
            },
        };
        expect(
            compileNodeToCSS(
                alias("components", "button", "radius"),
                ctx({ config }),
            ),
        ).toBe("var(--components-button-radius, 8px)");
    });

    it("emits a nested var() fallback chain for dynamic", () => {
        const node = dynamic(
            ["ui", "button", "bg"],
            dynamic(["components", "button", "bg"], px(0)),
        );
        expect(compileNodeToCSS(node, ctx())).toBe(
            "var(--ui-button-bg, var(--components-button-bg, 0px))",
        );
    });

    it("applies a var prefix only at lowering", () => {
        expect(
            compileNodeToCSS(
                dynamic(["ui", "button", "bg"]),
                ctx({ prefix: "pf" }),
            ),
        ).toBe("var(--pf-ui-button-bg)");
        expect(
            compileNodeToCSS(
                dynamic(["components", "button", "bg"]),
                ctx({ prefix: { components: "internal" } }),
            ),
        ).toBe("var(--internal-components-button-bg)");
    });

    it("chooses the target value for platform, else the default", () => {
        const node = platform({ css: literal("100vh") }, px(800));
        expect(compileNodeToCSS(node, ctx())).toBe("100vh");
        expect(compileNodeToCSS(node, ctx({ target: "rn" }))).toBe("800px");
    });
});

describe("compileNodeToCSS composites", () => {
    it("snapshots each composite node kind", () => {
        expect({
            colorMix: compileNodeToCSS(
                colorMix(
                    alias("tokens", "colors", "brand"),
                    hex("#ffffff"),
                    pct(8),
                ),
                ctx(),
            ),
            shadow: compileNodeToCSS(
                shadow({
                    x: px(0),
                    y: px(1),
                    blur: px(3),
                    color: rgb(0, 0, 0),
                }),
                ctx(),
            ),
            gradient: compileNodeToCSS(
                linearGradient(
                    [stop(hex("#000000")), stop(hex("#ffffff"), pct(100))],
                    unitless(90),
                ),
                ctx(),
            ),
            transform: compileNodeToCSS(
                transform(translate(px(1), px(2)), rotate(unitless(45))),
                ctx(),
            ),
            filter: compileNodeToCSS(filter(blur(px(4))), ctx()),
            transition: compileNodeToCSS(
                transition(
                    tween("backgroundColor", px(150), easing("easeInOut")),
                ),
                ctx(),
            ),
            animation: compileNodeToCSS(
                animation({
                    name: "spin",
                    duration: px(1000),
                    iterations: "infinite",
                }),
                ctx(),
            ),
            easingKeyword: compileNodeToCSS(easing("easeInOut"), ctx()),
            easingCubic: compileNodeToCSS(cubicBezier([0.4, 0, 0.2, 1]), ctx()),
            easingSteps: compileNodeToCSS(steps(4, "end"), ctx()),
            calc: compileNodeToCSS(sub(pct(100), px(16)), ctx()),
            mathFnMin: compileNodeToCSS(min(px(10), pct(50)), ctx()),
            mathFnClamp: compileNodeToCSS(
                clamp(px(10), mul(unitless(2), px(4)), px(40)),
                ctx(),
            ),
            fontFamily: compileNodeToCSS(
                fontFamily(["Inter", "system-ui"], "sans-serif"),
                ctx(),
            ),
        }).toMatchSnapshot();
    });
});

describe("compileValue conditionals", () => {
    it("compiles a conditional to a Panda conditional object", () => {
        const node = when("disabled", unitless(0.38), unitless(1));
        expect(compileValue(node, ctx())).toEqual({
            base: "1",
            _disabled: "0.38",
        });
    });

    it("lowers dragged to a data-dragging selector that outranks hover", () => {
        const node = when("dragged", unitless(0.16), unitless(0));
        expect(compileValue(node, ctx())).toEqual({
            base: "0",
            "&[data-dragging][data-dragging]": "0.16",
        });
    });

    it("lowers selected to aria-selected, aria-pressed, or data-selected", () => {
        const node = when("selected", unitless(1), unitless(0));
        expect(compileValue(node, ctx())).toEqual({
            base: "0",
            "&:is([aria-selected=true], [aria-pressed=true], [data-selected])":
                "1",
        });
    });

    it("lowers filled to an input with a value, its container, or data-filled", () => {
        const node = when("filled", unitless(1), unitless(0));
        expect(compileValue(node, ctx())).toEqual({
            base: "0",
            "&:is(:is(input, textarea):not(:placeholder-shown), :has(:is(input, textarea):not(:placeholder-shown)), [data-filled])":
                "1",
        });
    });
});

describe("compileStyleMap flex items, auto margins, and side borders", () => {
    it("passes flexGrow and flexShrink through as numbers", () => {
        expect(
            compileStyleMap(
                { flexGrow: unitless(1), flexShrink: unitless(0) },
                ctx(),
            ),
        ).toEqual({ flexGrow: "1", flexShrink: "0" });
    });

    it("lowers an auto margin", () => {
        expect(compileStyleMap({ marginInlineStart: auto }, ctx())).toEqual({
            marginInlineStart: "auto",
        });
    });

    it("lowers one side's border", () => {
        expect(
            compileStyleMap(
                {
                    borderBlockEndWidth: px(1),
                    borderBlockEndColor: transparent,
                },
                ctx(),
            ),
        ).toEqual({
            borderBlockEndWidth: "1px",
            borderBlockEndColor: "transparent",
        });
    });
});

describe("compileStyleMap fieldSizing", () => {
    it("passes the field-sizing keyword through", () => {
        expect(compileStyleMap({ fieldSizing: content }, ctx())).toEqual({
            fieldSizing: "content",
        });
    });
});

describe("compileStyleMap resize", () => {
    it("passes the resize keyword through", () => {
        expect(compileStyleMap({ resize: vertical }, ctx())).toEqual({
            resize: "vertical",
        });
    });
});

describe("compileStyleMap layout and interaction properties", () => {
    it("lowers each property to its Panda key and CSS value", () => {
        expect(
            compileStyleMap(
                {
                    position: absolute,
                    top: px(0),
                    insetBlockEnd: px(0),
                    flexDirection: rowReverse,
                    overflow: hidden,
                    aspectRatio: unitless(1),
                    minWidth: px(48),
                    outlineStyle: solid,
                    outlineWidth: px(1),
                    pointerEvents: none,
                },
                ctx(),
            ),
        ).toEqual({
            position: "absolute",
            top: "0px",
            insetBlockEnd: "0px",
            flexDirection: "row-reverse",
            overflow: "hidden",
            aspectRatio: "1",
            minWidth: "48px",
            outlineStyle: "solid",
            outlineWidth: "1px",
            pointerEvents: "none",
        });
    });
});

describe("compileNodeToCSS radial gradients", () => {
    it("emits the extent keyword when one is given", () => {
        expect(
            compileNodeToCSS(
                radialGradient(
                    [
                        stop(hex("#000000"), pct(65)),
                        stop(transparent, pct(100)),
                    ],
                    "closest-side",
                ),
                ctx(),
            ),
        ).toBe(
            "radial-gradient(closest-side, rgb(0 0 0) 65%, transparent 100%)",
        );
    });

    it("omits it otherwise", () => {
        expect(
            compileNodeToCSS(radialGradient([stop(hex("#000000"))]), ctx()),
        ).toBe("radial-gradient(rgb(0 0 0))");
    });
});
