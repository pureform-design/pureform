// A stacking layer's z-index from the theme, for the view an overlay is placed with. React Native's
// `zIndex` only orders a view among its siblings, so the layer a surface takes in its own style
// doesn't lift it over the rest of the page; its outermost wrapper has to take it.

import { useTokens } from "@pureform/rn-adapter/react";

/** The theme's stacking layers, lowest first (Material's scale: `base` 0, then 100 apart). A
 *  theme with a scale of its own may name others. */
export type StackingLayer =
    | "base"
    | "raised"
    | "menu"
    | "scrim"
    | "dialog"
    | "snackbar"
    | "tooltip"
    | (string & {});

/** The theme's z-index for a stacking layer (`zIndices.<name>`), with the provider's overrides;
 *  `undefined` for a layer the theme doesn't name. Give it to the outermost view an overlay
 *  renders, the one that's a sibling of what it covers. */
export function useLayer(name: StackingLayer): number | undefined {
    const value = useTokens()[`zIndices.${name}`];
    if (value === undefined) return undefined;
    const index = typeof value === "number" ? value : Number(value);
    return Number.isFinite(index) ? index : undefined;
}
