// An indication's tokens as the web writes them: theme-level vars on a provider's element, so
// they reach every component under it, and instance tokens on a component's root, so they reach
// that component alone. The focus indicator's color has no theme-level token (it's the
// `secondary` role), so a provider's color reaches each component as an instance token instead.

import type { TokenValue } from "@pureform/styling";

import type { Indication, IndicationTokens } from "./indication";
import type { ThemeOverrides } from "./provider";

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

/** The theme token each indication token defaults to, by its path, for the tokens that have
 *  one: what a provider's indication sets. */
export const THEME_INDICATION_TOKENS = {
    stateHoverOpacity: "opacity.stateHover",
    stateFocusOpacity: "opacity.stateFocus",
    statePressedOpacity: "opacity.statePressed",
    stateDraggedOpacity: "opacity.stateDragged",
    focusIndicatorThickness: "sizes.focusIndicatorThickness",
    focusIndicatorOuterOffset: "sizes.focusIndicatorOuterOffset",
} as const satisfies Partial<Record<IndicationTokenName, string>>;

// Lengths given as numbers are pixels, as React Native takes them.
const LENGTHS: ReadonlySet<string> = new Set([
    "focusIndicatorThickness",
    "focusIndicatorOuterOffset",
]);

// Opacities given as numbers are fractions, as React Native takes them; the web's theme holds
// them as percentages, which `color-mix()` reads (a bare number there drops the declaration).
const OPACITIES: ReadonlySet<string> = new Set([
    "stateHoverOpacity",
    "stateFocusOpacity",
    "statePressedOpacity",
    "stateDraggedOpacity",
]);

/** An indication token's value as CSS: a length given as a number is in pixels, and an opacity
 *  given as a number a percentage. */
export const indicationTokenValue = (
    name: IndicationTokenName,
    value: TokenValue,
): string => {
    if (typeof value !== "number") return String(value);
    if (OPACITIES.has(name)) return `${Math.round(value * 10_000) / 100}%`;
    return LENGTHS.has(name) && value !== 0 ? `${value}px` : String(value);
};

/** An indication's tokens as CSS values, by name; `undefined` when it sets none. */
export const indicationTokenValues = (
    tokens: IndicationTokens | undefined,
): Partial<Record<IndicationTokenName, string>> | undefined => {
    if (!tokens) return undefined;
    let values: Partial<Record<IndicationTokenName, string>> | undefined;
    for (const name of INDICATION_TOKEN_NAMES) {
        const value = tokens[name];
        if (value === undefined) continue;
        (values ??= {})[name] = indicationTokenValue(name, value);
    }
    return values;
};

/** The theme-level tokens a provider's indication sets, as the provider's `overrides` take them
 *  (by token path); `undefined` when it sets none. The focus indicator's color isn't among them:
 *  `componentIndicationTokens` carries it to each component. */
export const providerIndicationOverrides = (
    indication: Indication | undefined,
): ThemeOverrides | undefined => {
    const values = indicationTokenValues(indication?.tokens);
    if (!values) return undefined;
    let overrides: Record<string, string> | undefined;
    for (const [name, path] of Object.entries(THEME_INDICATION_TOKENS)) {
        const value = values[name as IndicationTokenName];
        if (value !== undefined) (overrides ??= {})[path] = value;
    }
    return overrides;
};

/** The instance tokens an interactive component writes on its root: the providers' focus
 *  indicator color, then its own `indication` prop's tokens; `undefined` when there are none.
 *  The component's own `tokens` go over these. */
export const componentIndicationTokens = (
    indication: Indication | undefined,
    providerColor: TokenValue | undefined,
): Readonly<Record<string, string>> | undefined => {
    const own = indicationTokenValues(indication?.tokens);
    if (providerColor === undefined) return own;
    return {
        focusIndicatorColor: indicationTokenValue(
            "focusIndicatorColor",
            providerColor,
        ),
        ...own,
    };
};

/** Whether an indication hides the focus indicator, by setting its thickness to 0. */
export const dropsFocusIndicator = (indication: Indication): boolean => {
    const thickness = indication.tokens?.focusIndicatorThickness;
    if (thickness === undefined) return false;
    return Number.parseFloat(String(thickness)) === 0;
};

/** The development warning for an indication that hides the focus indicator. */
export const droppedFocusIndicatorMessage = (indication: Indication): string =>
    `pureform: the indication "${indication.name}" sets focusIndicatorThickness to 0, which hides where keyboard focus is. Keyboard users need a visible focus indicator (WCAG 2.4.7): keep its thickness above 0, and change the state layer instead.`;
