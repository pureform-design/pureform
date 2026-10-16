import { morph } from "@pureform/core/ast";
import { pureform } from "@pureform/preset";
import { MATERIAL_SHAPES } from "@pureform/preset";
import { describe, expect, it } from "vitest";

import { precompute } from "./build";
import {
    dropShadows,
    pathAt,
    placeGradient,
    shapeCoordinates,
    shapePath,
} from "./geometry";
import { stylesFor } from "./resolve";
import { selectWithTransitions } from "./select";

describe("shapePath", () => {
    it("places percentages against each axis and keeps the arithmetic until the box is known", () => {
        const path = shapePath(
            {
                fillRule: "evenodd",
                contours: [
                    {
                        from: ["0%", "50%"],
                        segments: [
                            { op: "line", to: ["100%", 0] },
                            {
                                op: "curve",
                                c1: [
                                    { $math: "min", args: [12, "50%"] },
                                    "100%",
                                ],
                                c2: [{ $calc: "-", args: ["100%", 4] }, "25%"],
                                to: ["50%", "100%"],
                            },
                        ],
                    },
                ],
            },
            { width: 20, height: 40 },
        );
        expect(path).toBe("M 0 20 L 20 0 C 10 40 16 10 10 40 Z");
    });
});

describe("placeGradient", () => {
    it("runs a linear gradient along CSS's gradient line", () => {
        expect(
            placeGradient(
                {
                    kind: "linear",
                    stops: [{ color: "red" }, { color: "blue" }],
                },
                { width: 100, height: 50 },
            ),
        ).toEqual({
            kind: "linear",
            x1: 50,
            y1: 0,
            x2: 50,
            y2: 50,
            stops: [
                { offset: 0, color: "red" },
                { offset: 1, color: "blue" },
            ],
        });
        const diagonal = placeGradient(
            {
                kind: "linear",
                angle: "90deg",
                stops: [{ color: "red" }, { color: "blue" }],
            },
            { width: 100, height: 50 },
        );
        expect([
            diagonal.kind === "linear" && diagonal.x1,
            diagonal.kind === "linear" && diagonal.x2,
        ]).toEqual([0, 100]);
    });

    it("spreads stops with no position between their neighbors, and keeps them in order", () => {
        const placed = placeGradient(
            {
                kind: "linear",
                stops: [
                    { color: "red" },
                    { color: "lime" },
                    { color: "blue", at: "80%" },
                    { color: "white", at: "50%" },
                ],
            },
            { width: 10, height: 10 },
        );
        expect(placed.stops.map((s) => s.offset)).toEqual([0, 0.4, 0.8, 0.8]);
    });

    it("sizes a radial gradient's stops along its radius, and finishes mixes with the current color", () => {
        const placed = placeGradient(
            {
                kind: "radial",
                extent: "closest-side",
                stops: [
                    {
                        color: { $mix: ["transparent", "currentColor", "10%"] },
                        at: {
                            $math: "max",
                            args: [{ $calc: "-", args: ["100%", 70] }, "65%"],
                        },
                    },
                    { color: "transparent", at: "100%" },
                ],
            },
            { width: 400, height: 400 },
            "rgb(0, 0, 255)",
        );
        expect(placed).toEqual({
            kind: "radial",
            r: 0.5,
            stops: [
                { offset: 0.65, color: "rgba(0, 0, 255, 0.1)" },
                { offset: 1, color: "transparent" },
            ],
        });
    });
});

describe("drawings", () => {
    const styles = stylesFor(
        precompute(pureform(), { components: ["iconButton", "ripple"] }),
        "base:light",
    );

    it("draws a shaped slot's fill and outline ring with SVG, only under the svg state", () => {
        const pick = (svg: boolean) =>
            selectWithTransitions(
                styles.iconButton!,
                { shape: "cookie4Sided", variant: "outlined" },
                { svg },
            );
        const off = pick(false);
        expect(off.drawings).toEqual({});
        expect(off.styles.container!.borderRadius).toBe(9999);
        expect(off.styles.outline!.borderWidth).toBe(1);

        const on = pick(true);
        expect(Object.keys(on.drawings).sort()).toEqual([
            "container",
            "outline",
        ]);
        expect(on.styles.container!.borderRadius).toBe(0);
        expect(on.styles.container!.backgroundColor).toBeUndefined();
        expect(on.styles.outline!.borderWidth).toBe(0);
        expect(on.drawings.outline!.shape!.fillRule).toBe("evenodd");
        expect(on.drawings.outline!.fill).toBe(on.styles.outline!.borderColor);
        expect(
            shapePath(on.drawings.container!.shape!, { width: 40, height: 40 }),
        ).toMatch(/^M [\d.-]+ [\d.-]+ (?:[LC] [\d. -]+)+Z$/);
    });

    it("draws the ripple's soft edge as a radial gradient", () => {
        const { drawings } = selectWithTransitions(
            styles.ripple!,
            {},
            { svg: true },
        );
        expect(
            placeGradient(
                drawings.ripple!.gradient!,
                { width: 1000, height: 1000 },
                "rgb(255, 0, 0)",
            ),
        ).toEqual({
            kind: "radial",
            r: 0.5,
            stops: [
                { offset: 0.86, color: "rgba(255, 0, 0, 0.1)" },
                { offset: 1, color: "transparent" },
            ],
        });
    });
});

describe("drop shadows", () => {
    it("follow the shapes as a filter under the svg state, and the box without it", () => {
        const fab = (svg: boolean) =>
            selectWithTransitions(
                stylesFor(
                    precompute(pureform(), { components: ["fab"] }),
                    "base:light",
                ).fab!,
                { shape: "heart" },
                { svg },
            ).styles.root!;
        expect(fab(false).boxShadow).toMatch(/^0px 3px 5px 0px rgba\(/);
        expect(fab(false).filter).toBeUndefined();
        expect(fab(true).filter).toMatch(/^drop-shadow\(/);
        expect(fab(true).boxShadow).toBeUndefined();
    });

    it("turns a box shadow's outer layers into drop shadows", () => {
        expect(
            dropShadows(
                "0px 1px 2px 0px rgba(0, 0, 0, 0.3), inset 0 0 1px red, 0px 2px 6px 2px rgba(0, 0, 0, 0.15)",
            ),
        ).toBe(
            "drop-shadow(0px 1px 2px rgba(0, 0, 0, 0.3)) drop-shadow(0px 2px 6px rgba(0, 0, 0, 0.15))",
        );
    });
});

describe("morphs", () => {
    const config = pureform({
        shapes: { pill: morph(MATERIAL_SHAPES.circle, MATERIAL_SHAPES.square) },
    });
    const button = stylesFor(
        precompute(config, { components: ["iconButton"] }),
        "base:light",
    ).iconButton!;
    const pick = (pressed: boolean) =>
        selectWithTransitions(button, { shape: "pill" }, { svg: true, pressed })
            .drawings.container!;

    it("hands the drawing its shape's transition and its fill's, and changes shape when pressed", () => {
        const [rest, pressed] = [pick(false), pick(true)];
        expect(rest.transitions?.shape).toMatchObject({ property: "clipPath" });
        expect(rest.transitions?.fill).toMatchObject({
            property: "backgroundColor",
        });
        const box = { width: 40, height: 40 };
        const [a, b] = [
            shapeCoordinates(rest.shape!, box),
            shapeCoordinates(pressed.shape!, box),
        ];
        expect(a.length).toBe(b.length);
        expect(a).not.toEqual(b);
        expect(pathAt(pressed.shape!, b)).toBe(shapePath(pressed.shape!, box));
    });
});
