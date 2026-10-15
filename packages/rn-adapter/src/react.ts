// React bindings: a provider holding the styles, the scheme, the named theme, and runtime
// overrides, and a hook returning a component's styles for its variants and state.

import { createContext, createElement, useContext, useMemo } from "react";
import type { ReactNode } from "react";

import { overridesFor, stylesFor, themeKey, withDerived } from "./resolve";
import type { Overrides, Resolved, Styles } from "./resolve";
import { selectWithTransitions } from "./select";
import type { Selected, State, Style } from "./select";
import type { Scheme } from "./theme";
import type { ThemeValues } from "./values";

interface Context {
    styles: Styles;
    key: string;
    overrides: ThemeValues;
    resolved: Resolved;
    tokens: ThemeValues;
    scheme: Scheme;
    reducedMotion: boolean;
    width: number | undefined;
}

const PureformContext = createContext<Context | undefined>(undefined);

export interface PureformProviderProps {
    /** From `precompute` or `runtimeStyles`. */
    styles: Styles;
    scheme: Scheme;
    /** A named theme. Default the base theme. */
    theme?: string;
    /** Whether to take the reduced motion styles, as an app reads from `AccessibilityInfo`.
     *  Default `false`. */
    reducedMotion?: boolean;
    /** The window's width, for viewport conditions, as an app reads it from
     *  `useWindowDimensions`. Without it, none of them hold. */
    width?: number;
    /** Token or component token values to override, by key: `colors.primary`,
     *  `components.button.container`, for both schemes or as `{ light, dark }`. Colors are
     *  hex or any of CSS's color functions but `hwb()` and `color-mix()`. */
    overrides?: Overrides;
    children?: ReactNode;
}

export const PureformProvider = (props: PureformProviderProps) => {
    const { styles, scheme, theme } = props;
    const key = themeKey(theme, scheme);
    const overrides = overridesFor(props.overrides, scheme);
    // Overrides are compared by contents, so an inline object doesn't recompute every render.
    const overrideKey = JSON.stringify(overrides ?? {});
    const resolved = useMemo(
        () => stylesFor(styles, key, overrides),
        // oxlint-disable-next-line react-hooks/exhaustive-deps
        [styles, key, overrideKey],
    );
    const tokens = useMemo(
        () => ({
            ...styles.themes[key],
            ...withDerived(styles, key, overrides),
        }),
        // oxlint-disable-next-line react-hooks/exhaustive-deps
        [styles, key, overrideKey],
    );
    const reducedMotion = props.reducedMotion ?? false;
    const value = useMemo(
        () => ({
            styles,
            key,
            overrides,
            resolved,
            tokens,
            scheme,
            reducedMotion,
            width: props.width,
        }),
        // oxlint-disable-next-line react-hooks/exhaustive-deps
        [resolved, tokens, scheme, reducedMotion, props.width],
    );
    return createElement(PureformContext.Provider, { value }, props.children);
};

const useContextOrThrow = (hook: string): Context => {
    const context = useContext(PureformContext);
    if (!context) throw new Error(`${hook} needs a PureformProvider`);
    return context;
};

/** Whether the provider asks for reduced motion. */
export const useReducedMotion = (): boolean =>
    useContextOrThrow("useReducedMotion").reducedMotion;

/** The theme's token values, with overrides, by key: `colors.surface`, `spacing.4`. */
export const useTokens = (): ThemeValues =>
    useContextOrThrow("useTokens").tokens;

/** A component's styles per slot, and each slot's transitions, for its variants and state.
 *  `tokens` gives this one instance its own token values, as the web sets a CSS variable on
 *  one element: `{ "components.linearProgress.value": 40 }`. */
export const useRecipeWithTransitions = (
    name: string,
    variants: Record<string, string | boolean | undefined> = {},
    state: State = {},
    tokens?: ThemeValues,
): Selected => {
    const context = useContextOrThrow("useRecipe");
    const tokenKey = tokens ? JSON.stringify(tokens) : "";
    const own = useMemo(
        () =>
            tokens
                ? stylesFor(context.styles, context.key, {
                      ...context.overrides,
                      ...overridesFor(tokens, context.scheme),
                  })[name]
                : undefined,
        // oxlint-disable-next-line react-hooks/exhaustive-deps
        [context.styles, context.key, context.overrides, name, tokenKey],
    );
    const component = own ?? context.resolved[name];
    if (!component) throw new Error(`no styles for component "${name}"`);
    const variantKey = JSON.stringify(variants);
    const stateKey = JSON.stringify(state);
    return useMemo(
        () =>
            selectWithTransitions(component, variants, {
                scheme: context.scheme,
                reducedMotion: context.reducedMotion,
                ...(context.width === undefined
                    ? {}
                    : { width: context.width }),
                ...state,
            }),
        // oxlint-disable-next-line react-hooks/exhaustive-deps
        [
            component,
            context.scheme,
            context.reducedMotion,
            context.width,
            variantKey,
            stateKey,
        ],
    );
};

/** A component's styles per slot, or its one style under `""` without slots. */
export const useRecipe = (
    name: string,
    variants: Record<string, string | boolean | undefined> = {},
    state: State = {},
    tokens?: ThemeValues,
): Record<string, Style> =>
    useRecipeWithTransitions(name, variants, state, tokens).styles;

// Whether the latest input was a key press rather than a pointer, as browsers decide
// :focus-visible. Native apps have no document, and focus there comes from a keyboard or
// assistive technology, so it's always visible.
let keyboard = true;
if (
    typeof document !== "undefined" &&
    typeof document.addEventListener === "function"
) {
    keyboard = false;
    const options = { capture: true, passive: true } as const;
    document.addEventListener(
        "keydown",
        (event) => {
            if (!event.metaKey && !event.altKey && !event.ctrlKey)
                keyboard = true;
        },
        options,
    );
    for (const type of ["pointerdown", "mousedown", "touchstart"]) {
        document.addEventListener(type, () => (keyboard = false), options);
    }
}

/** A component's state from Pressable's callback state and its own props. Focus is visible
 *  when it came from the keyboard, as browsers show a focus ring, and always on native. */
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
    focusVisible: (interaction.focused ?? false) && keyboard,
});
