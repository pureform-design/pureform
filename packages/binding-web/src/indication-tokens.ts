// An indication's tokens as the web writes them: theme-level vars on a provider's element, so
// they reach every component under it, and instance tokens on a component's root, so they reach
// that component alone. The focus indicator's color has no theme-level token (it's the
// `secondary` role), so a provider's color reaches each component as an instance token instead.

import type {
    Indication,
    IndicationTokens,
    IndicationTokenName,
} from "@pureform/binding-core/indication";
import {
    INDICATION_TOKEN_NAMES,
    THEME_INDICATION_TOKENS,
} from "@pureform/binding-core/indication";
import type { TokenValue } from "@pureform/styling";

import type { ThemeOverrides } from "./provider";

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
