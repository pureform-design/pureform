// Composite box-shadow / elevation.
import type { ShadowLayer, ShadowNode } from "../nodes";

/** Composite box-shadow from an ordered stack of layers (bottom to top). `ui-utils` generates
 *  Material elevation layers; a dedicated `elevation(level)` sugar can live there and return
 *  `shadow(...)`. */
export const shadow = (...layers: ShadowLayer[]): ShadowNode => ({
    type: "shadow",
    layers,
});
