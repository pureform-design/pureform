import { describe, expect, it } from "vitest";

import * as kw from "./helpers/keyword";
import {
    add,
    alias,
    alpha,
    clamp,
    colorMix,
    conicGradient,
    cubicBezier,
    div,
    dynamic,
    hex,
    linearGradient,
    literal,
    max,
    min,
    numeric,
    oklch,
    pct,
    platform,
    px,
    rem,
    rgb,
    shadow,
    steps,
    stop,
    sub,
    transform,
    translate,
    unitless,
    viewportBreakpoint,
    when,
    withUnit,
} from "./index";

describe("scalar and unit helpers", () => {
    it("builds literal and numeric nodes", () => {
        expect(literal("100vh")).toEqual({ type: "literal", value: "100vh" });
        expect(numeric(4, "px")).toEqual({
            type: "numeric",
            value: 4,
            unit: "px",
        });
    });

    it("stamps the unit via the sugar", () => {
        expect(px(4)).toEqual({ type: "numeric", value: 4, unit: "px" });
        expect(rem(1)).toEqual({ type: "numeric", value: 1, unit: "rem" });
        expect(pct(50)).toEqual({ type: "numeric", value: 50, unit: "%" });
        expect(unitless(600)).toEqual({
            type: "numeric",
            value: 600,
            unit: "none",
        });
    });
});

describe("reference helpers", () => {
    it("builds an alias from a variadic path", () => {
        expect(alias("tokens", "colors", "violet600")).toEqual({
            type: "alias",
            path: ["tokens", "colors", "violet600"],
        });
    });

    it("omits default when none is given, keeps it otherwise", () => {
        expect(dynamic(["ui", "button", "bg"])).toEqual({
            type: "dynamic",
            path: ["ui", "button", "bg"],
        });
        const d = dynamic(["ui", "button", "bg"], px(2));
        expect(d.default).toEqual(px(2));
    });
});

describe("platform escape hatch", () => {
    it("carries target values and a portable default", () => {
        expect(platform({ css: literal("100vh") }, px(800))).toEqual({
            type: "platform",
            values: { css: { type: "literal", value: "100vh" } },
            default: { type: "numeric", value: 800, unit: "px" },
        });
    });
});

describe("keyword factory", () => {
    it("builds a keyword node and infers its narrow literal", () => {
        expect(kw.center).toEqual({ type: "keyword", value: "center" });
        expect(kw.spaceBetween.value).toBe("spaceBetween");
        expect(kw.staticPos).toEqual({ type: "keyword", value: "static" });
    });
});

describe("color helpers", () => {
    it("encodes the color space on each builder", () => {
        expect(rgb(124, 58, 237)).toEqual({
            type: "color",
            space: "srgb",
            components: [124, 58, 237],
        });
        expect(oklch(0.6, 0.2, 290, 0.5)).toEqual({
            type: "color",
            space: "oklch",
            components: [0.6, 0.2, 290],
            alpha: 0.5,
        });
    });

    it("parses hex shorthand and alpha", () => {
        expect(hex("#fff")).toEqual({
            type: "color",
            space: "srgb",
            components: [255, 255, 255],
        });
        expect(hex("#7c3aed")).toEqual({
            type: "color",
            space: "srgb",
            components: [124, 58, 237],
        });
        expect(hex("#00000080").alpha).toBeCloseTo(0.5019, 3);
    });

    it("alpha sets the channel on a concrete color", () => {
        const result = alpha(hex("#000000"), 0.2);
        expect(result).toEqual({
            type: "color",
            space: "srgb",
            components: [0, 0, 0],
            alpha: 0.2,
        });
    });

    it("alpha over a ref lowers to a color-mix toward transparent", () => {
        const result = alpha(alias("tokens", "colors", "x"), 0.3);
        expect(result).toEqual({
            type: "colorMix",
            space: "srgb",
            base: { type: "keyword", value: "transparent" },
            with: { type: "alias", path: ["tokens", "colors", "x"] },
            amount: { type: "numeric", value: 30, unit: "%" },
        });
    });

    it("colorMix defaults to srgb", () => {
        const mix = colorMix(
            alias("components", "button", "bg"),
            kw.transparent,
            pct(8),
        );
        expect(mix.space).toBe("srgb");
        expect(mix.with).toEqual({ type: "keyword", value: "transparent" });
    });
});

describe("shadow and gradient helpers", () => {
    it("stacks shadow layers in order", () => {
        const s = shadow(
            { x: px(0), y: px(1), blur: px(3), color: hex("#000000") },
            { x: px(0), y: px(2), blur: px(2), color: hex("#000000") },
        );
        expect(s.type).toBe("shadow");
        expect(s.layers).toHaveLength(2);
    });

    it("builds gradients and stops", () => {
        const g = linearGradient([
            stop(hex("#000000")),
            stop(hex("#ffffff"), pct(100)),
        ]);
        expect(g.kind).toBe("linear");
        expect(g.stops[1]?.position).toEqual(pct(100));
        expect(conicGradient([stop(hex("#000000"))]).kind).toBe("conic");
    });
});

describe("transform helper", () => {
    it("collects ops with their args", () => {
        const t = transform(translate(px(1), px(2)));
        expect(t).toEqual({
            type: "transform",
            ops: [{ fn: "translate", args: [px(1), px(2)] }],
        });
    });
});

describe("math helpers", () => {
    it("folds operands under one operator and nests for precedence", () => {
        expect(add(px(1), px(2))).toEqual({
            type: "calc",
            op: "+",
            operands: [px(1), px(2)],
        });
        expect(div(sub(pct(100), px(16)), unitless(2))).toEqual({
            type: "calc",
            op: "/",
            operands: [
                { type: "calc", op: "-", operands: [pct(100), px(16)] },
                unitless(2),
            ],
        });
    });

    it("builds min, max, and the fixed-arity clamp", () => {
        expect(min(px(1), px(2)).fn).toBe("min");
        expect(max(px(1), px(2)).fn).toBe("max");
        expect(clamp(rem(1), pct(50), rem(2))).toEqual({
            type: "mathFn",
            fn: "clamp",
            args: [rem(1), pct(50), rem(2)],
        });
    });

    it("withUnit stamps a unit through multiplication", () => {
        expect(withUnit(unitless(2), "px")).toEqual({
            type: "calc",
            op: "*",
            operands: [unitless(2), numeric(1, "px")],
        });
    });
});

describe("motion helpers", () => {
    it("builds structured easings", () => {
        expect(cubicBezier([0.4, 0, 0.2, 1])).toEqual({
            type: "easing",
            kind: "cubicBezier",
            points: [0.4, 0, 0.2, 1],
        });
        expect(steps(4, "end")).toEqual({
            type: "easing",
            kind: "steps",
            steps: { count: 4, jump: "end" },
        });
    });
});

describe("when conditional", () => {
    it("produces identical nodes for the shorthand and builder forms", () => {
        const shorthand = when("hover", px(2), px(1));
        const builder = when().on("hover", px(2)).else(px(1));
        expect(shorthand).toEqual(builder);
        expect(shorthand).toEqual({
            type: "conditional",
            base: px(1),
            cases: [{ on: "hover", value: px(2) }],
        });
    });

    it("accumulates multiple cases in the builder form", () => {
        const node = when()
            .on("hover", px(2))
            .on("disabled", px(0))
            .else(px(1));
        expect(node.cases).toHaveLength(2);
        expect(node.cases[1]).toEqual({ on: "disabled", value: px(0) });
    });

    it("builds a viewport breakpoint from a string shorthand", () => {
        expect(viewportBreakpoint("md")).toEqual({
            type: "viewportBreakpoint",
            from: "md",
        });
        expect(viewportBreakpoint({ until: "lg" })).toEqual({
            type: "viewportBreakpoint",
            until: "lg",
        });
    });
});
