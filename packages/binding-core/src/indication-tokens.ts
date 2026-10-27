import type { Indication, IndicationTokens } from "./indication";

/** An indication token's name: a component token every interactive component has. */
export type IndicationTokenName = keyof IndicationTokens;

/** Every indication token's name, in the order the preset declares them. */
export const INDICATION_TOKEN_NAMES = [
    "stateHoverOpacity",
    "stateFocusOpacity",
    "statePressedOpacity",
    "stateDraggedOpacity",
    "focusIndicatorThickness",
    "focusIndicatorOuterOffset",
    "focusIndicatorColor",
] as const satisfies readonly IndicationTokenName[];

/** Portable token paths, not CSS variable names or serialized values. */
export const THEME_INDICATION_TOKENS = {
    stateHoverOpacity: "opacity.stateHover",
    stateFocusOpacity: "opacity.stateFocus",
    statePressedOpacity: "opacity.statePressed",
    stateDraggedOpacity: "opacity.stateDragged",
    focusIndicatorThickness: "sizes.focusIndicatorThickness",
    focusIndicatorOuterOffset: "sizes.focusIndicatorOuterOffset",
} as const satisfies Partial<Record<IndicationTokenName, string>>;

/** Whether an indication hides the focus indicator, by setting its thickness to 0. */
export const dropsFocusIndicator = (indication: Indication): boolean => {
    const thickness = indication.tokens?.focusIndicatorThickness;
    if (thickness === undefined) return false;
    return Number.parseFloat(String(thickness)) === 0;
};

/** The development warning for an indication that hides the focus indicator. */
export const droppedFocusIndicatorMessage = (indication: Indication): string =>
    `pureform: the indication "${indication.name}" sets focusIndicatorThickness to 0, which hides where keyboard focus is. Keyboard users need a visible focus indicator (WCAG 2.4.7): keep its thickness above 0, and change the state layer instead.`;
