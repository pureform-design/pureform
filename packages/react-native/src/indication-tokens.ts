// An indication's tokens as React Native takes them: theme-level values in a provider's overrides,
// so they reach every component under it, and instance tokens in a component's selection, so they
// reach that component alone. Values stay native (lengths as numbers). The focus indicator's color
// has no theme-level token, so a provider's color reaches each component as an instance token.

import {
    INDICATION_TOKEN_NAMES,
    THEME_INDICATION_TOKENS,
} from "@pureform/binding-core/indication";
import type { Indication } from "@pureform/binding-core/indication";
import type { ThemeValues } from "@pureform/rn-adapter/factory";
import type { TokenValue } from "@pureform/styling";

/** The theme-level tokens a provider's indication sets, by token path (`opacity.stateHover`,
 *  `sizes.focusIndicatorThickness`); `undefined` when it sets none. */
export const providerIndicationValues = (
    indication: Indication | undefined,
): ThemeValues | undefined => {
    const tokens = indication?.tokens;
    if (!tokens) return undefined;
    let values: ThemeValues | undefined;
    for (const [name, path] of Object.entries(THEME_INDICATION_TOKENS)) {
        const value = tokens[name as keyof typeof THEME_INDICATION_TOKENS];
        if (value !== undefined) (values ??= {})[path] = value;
    }
    return values;
};

/** The instance tokens an interactive component selects with: the providers' focus indicator
 *  color, then its own `indication` prop's tokens; `undefined` when there are none. The
 *  component's own `tokens` go over these. */
export const instanceIndicationTokens = (
    indication: Indication | undefined,
    providerColor: TokenValue | undefined,
): Readonly<Record<string, TokenValue>> | undefined => {
    let tokens: Record<string, TokenValue> | undefined;
    if (providerColor !== undefined) {
        tokens = { focusIndicatorColor: providerColor };
    }
    const own = indication?.tokens;
    if (own) {
        for (const name of INDICATION_TOKEN_NAMES) {
            const value = own[name];
            if (value !== undefined) (tokens ??= {})[name] = value;
        }
    }
    return tokens;
};

/** A selection with an indication's instance tokens under its own. */
export const withIndicationTokens = <S extends object>(
    selection: S,
    tokens: Readonly<Record<string, TokenValue>> | undefined,
): S => {
    if (!tokens) return selection;
    const own = (selection as { tokens?: Record<string, unknown> }).tokens;
    return { ...selection, tokens: { ...tokens, ...own } };
};
