// Font-family and variable font values.
import type { FontFamilyNode, FontVariationNode, NumericValue } from "../nodes";

/** A portable font-family token value. `generic` is the CSS fallback family. */
export const fontFamily = (
    stack: string[],
    generic?: FontFamilyNode["generic"],
): FontFamilyNode => ({
    type: "fontFamily",
    stack,
    ...(generic ? { generic } : {}),
});

/** A variable font's axis settings, by four-letter axis tag, for `fontVariationSettings`:
 *  `fontVariations({ FILL: unitless(1) })` draws Material Symbols filled. */
export const fontVariations = (
    axes: Record<string, NumericValue>,
): FontVariationNode => ({ type: "fontVariation", axes });
