// React bindings: a provider holding the styles, the scheme, the named theme, and runtime
// overrides, and a hook returning a component's styles for its variants and state.

import { createContext, createElement, useContext, useMemo } from "react";
import type { ReactNode } from "react";

import { stylesFor, themeKey } from "./resolve";
import type { Resolved, Styles } from "./resolve";
import { select } from "./select";
import type { State, Style } from "./select";
import type { Scheme } from "./theme";
import type { ThemeValues } from "./values";

interface Context {
    resolved: Resolved;
    tokens: ThemeValues;
    scheme: Scheme;
}

const PureformContext = createContext<Context | undefined>(undefined);

export interface PureformProviderProps {
    /** From `precompute` or `runtimeStyles`. */
    styles: Styles;
    scheme: Scheme;
    /** A named theme. Default the base theme. */
    theme?: string;
    /** Token or component token values to override, by key: `colors.primary`,
     *  `components.button.container`. Colors are `rgb()`/`rgba()` or hex, which mixes read
     *  without a color library. */
    overrides?: ThemeValues;
    children?: ReactNode;
}

export const PureformProvider = (props: PureformProviderProps) => {
    const { styles, scheme, theme, overrides } = props;
    const key = themeKey(theme, scheme);
    // Overrides are compared by contents, so an inline object doesn't recompute every render.
    const overrideKey = JSON.stringify(overrides ?? {});
    const resolved = useMemo(
        () => stylesFor(styles, key, overrides),
        // oxlint-disable-next-line react-hooks/exhaustive-deps
        [styles, key, overrideKey],
    );
    const tokens = useMemo(
        () => ({ ...styles.themes[key], ...overrides }),
        // oxlint-disable-next-line react-hooks/exhaustive-deps
        [styles, key, overrideKey],
    );
    const value = useMemo(
        () => ({ resolved, tokens, scheme }),
        [resolved, tokens, scheme],
    );
    return createElement(PureformContext.Provider, { value }, props.children);
};

const useContextOrThrow = (hook: string): Context => {
    const context = useContext(PureformContext);
    if (!context) throw new Error(`${hook} needs a PureformProvider`);
    return context;
};

/** The theme's token values, with overrides, by key: `colors.surface`, `spacing.4`. */
export const useTokens = (): ThemeValues =>
    useContextOrThrow("useTokens").tokens;

/** A component's styles per slot, or its one style under `""` without slots. */
export const useRecipe = (
    name: string,
    variants: Record<string, string | boolean | undefined> = {},
    state: State = {},
): Record<string, Style> => {
    const context = useContextOrThrow("useRecipe");
    const component = context.resolved[name];
    if (!component) throw new Error(`no styles for component "${name}"`);
    const variantKey = JSON.stringify(variants);
    const stateKey = JSON.stringify(state);
    return useMemo(
        () => select(component, variants, { scheme: context.scheme, ...state }),
        // oxlint-disable-next-line react-hooks/exhaustive-deps
        [component, context.scheme, variantKey, stateKey],
    );
};

/** A component's state from Pressable's callback state and its own props. Focus counts as
 *  visible focus, since Pressable doesn't tell keyboard focus apart. */
export const pressableState = (
    interaction: { pressed?: boolean; hovered?: boolean; focused?: boolean },
    props: Omit<
        State,
        "pressed" | "hover" | "focus" | "focusVisible" | "active"
    > = {},
): State => ({
    ...props,
    pressed: interaction.pressed ?? false,
    active: interaction.pressed ?? false,
    hover: interaction.hovered ?? false,
    focus: interaction.focused ?? false,
    focusVisible: interaction.focused ?? false,
});
