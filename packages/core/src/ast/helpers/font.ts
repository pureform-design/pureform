// Font-family values.
import type { FontFamilyNode } from "../nodes";

/** A portable font-family token value. `generic` is the CSS fallback family. */
export const fontFamily = (
    stack: string[],
    generic?: FontFamilyNode["generic"],
): FontFamilyNode => ({
    type: "fontFamily",
    stack,
    ...(generic ? { generic } : {}),
});
