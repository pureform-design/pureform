// Color nodes in sRGB, for React Native, which has no oklch(). This runs when lowering, so the
// color library stays out of the runtime; mixing and parsing at runtime are in `rgba.ts`.

import type { ColorNode } from "@pureform/core/ast";
import chroma from "chroma-js";

import type { Rgba } from "./rgba";

const fromChroma = (color: chroma.Color, alpha: number): Rgba => {
    const [r, g, b] = color.rgb(false);
    return [r, g, b, alpha];
};

/** A color node in sRGB, with channels as the CSS lowering reads them. */
export const colorNodeRgba = (node: ColorNode): Rgba => {
    const [a = 0, b = 0, c = 0] = node.components;
    const alpha = node.alpha ?? 1;
    switch (node.space) {
        case "srgb":
            return [a, b, c, alpha];
        case "hsl":
            return fromChroma(chroma.hsl(a, b / 100, c / 100), alpha);
        case "oklch":
            return fromChroma(chroma.oklch(a, b, c), alpha);
        case "oklab":
            return fromChroma(chroma.oklab(a, b, c), alpha);
        case "lch":
            return fromChroma(chroma.lch(a, b, c), alpha);
        case "lab":
            return fromChroma(chroma.lab(a, b, c), alpha);
        case "display-p3":
        case "hct":
            throw new Error(
                `React Native has no ${node.space} colors; use oklch or srgb`,
            );
    }
};
