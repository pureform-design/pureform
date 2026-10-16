// React bindings: a provider holding the styles, the scheme, the named theme, and runtime
// overrides, and a hook returning a component's styles for its variants and state.

import {
    createContext,
    createElement,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import type { ReactNode } from "react";
import { Animated, View } from "react-native";
import type { StyleProp, ViewProps, ViewStyle } from "react-native";

import { curve } from "./animate/curve";
import { overridesFor, stylesFor, themeKey, withDerived } from "./resolve";
import type { Overrides, Resolved, Styles } from "./resolve";
import { selectWithTransitions } from "./select";
import type { Selected, State, Style } from "./select";
import type { Scheme } from "./theme";
import { TOKEN_TRANSITION } from "./values";
import type { ThemeValues, Transition } from "./values";

interface Context {
    styles: Styles;
    key: string;
    overrides: ThemeValues;
    resolved: Resolved;
    tokens: ThemeValues;
    scheme: Scheme;
    reducedMotion: boolean;
    width: number | undefined;
    svg: boolean;
    timeScale: number;
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
    /** Whether the app draws shapes and gradients with SVG, through `SvgDrawing` from
     *  `@pureform/rn-adapter/svg`, which needs `react-native-svg`. Without it, components
     *  take their rounded fallback and gradients drop. Default `false`. */
    svg?: boolean;
    /** How much longer every transition and animation runs, for watching motion slowly: 10
     *  runs it ten times slower. Default 1. */
    timeScale?: number;
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
        [styles, key, overrideKey],
    );
    const tokens = useMemo(
        () => ({
            ...styles.themes[key],
            ...withDerived(styles, key, overrides),
        }),
        [styles, key, overrideKey],
    );
    const reducedMotion = props.reducedMotion ?? false;
    const svg = props.svg ?? false;
    const timeScale = props.timeScale ?? 1;
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
            svg,
            timeScale,
        }),
        [resolved, tokens, scheme, reducedMotion, props.width, svg, timeScale],
    );
    return createElement(PureformContext.Provider, { value }, props.children);
};

// A selection's motion, `by` times as long.
const slowed = (selected: Selected, by: number): Selected => {
    if (by === 1) return selected;
    const time = <T extends { duration: number; delay: number }>(t: T): T => ({
        ...t,
        duration: t.duration * by,
        delay: t.delay * by,
    });
    const map = <T, U>(record: Record<string, T>, f: (value: T) => U) =>
        Object.fromEntries(Object.entries(record).map(([k, v]) => [k, f(v)]));
    return {
        ...selected,
        transitions: map(selected.transitions, (list) => list.map(time)),
        animations: map(selected.animations, time),
        drawings: map(selected.drawings, (drawing) =>
            drawing.transitions
                ? {
                      ...drawing,
                      transitions: map(
                          drawing.transitions,
                          (t) => t && time(t),
                      ),
                  }
                : drawing,
        ),
    };
};

// The widths of the containers around a component: the nearest under "", and named ones by
// name.
const ContainerContext = createContext<Record<string, number>>({});

export interface PureformContainerProps extends ViewProps {
    /** The container's name, for conditions on a named container. It's still the nearest
     *  container for conditions that name none. */
    name?: string;
    style?: StyleProp<ViewStyle>;
    children?: ReactNode;
}

/** A view whose width container conditions inside it hold by, as CSS's `container-type:
 *  inline-size` does. It measures itself, so what's inside first renders without its width,
 *  and again once it's laid out. */
export const PureformContainer = ({
    name,
    children,
    onLayout,
    ...props
}: PureformContainerProps) => {
    const outer = useContext(ContainerContext);
    const [width, setWidth] = useState<number>();
    const widths = useMemo(
        () =>
            width === undefined
                ? outer
                : { ...outer, "": width, ...(name ? { [name]: width } : {}) },
        [outer, width, name],
    );
    return createElement(
        View,
        {
            ...props,
            onLayout: (
                event: Parameters<NonNullable<ViewProps["onLayout"]>>[0],
            ) => {
                setWidth(event.nativeEvent.layout.width);
                onLayout?.(event);
            },
        },
        createElement(ContainerContext.Provider, { value: widths }, children),
    );
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

// The selection for given token values.
const useSelected = (
    name: string,
    variants: Record<string, string | boolean | undefined> = {},
    state: State = {},
    tokens?: ThemeValues,
): Selected => {
    const context = useContextOrThrow("useComponentStyles");
    const containers = useContext(ContainerContext);
    const tokenKey = tokens ? JSON.stringify(tokens) : "";
    const own = useMemo(
        () =>
            tokens
                ? stylesFor(context.styles, context.key, {
                      ...context.overrides,
                      ...overridesFor(tokens, context.scheme),
                  })[name]
                : undefined,
        [context.styles, context.key, context.overrides, name, tokenKey],
    );
    const component = own ?? context.resolved[name];
    if (!component) throw new Error(`no styles for component "${name}"`);
    const variantKey = JSON.stringify(variants);
    const stateKey = JSON.stringify(state);
    return useMemo(
        () =>
            slowed(
                selectWithTransitions(component, variants, {
                    scheme: context.scheme,
                    reducedMotion: context.reducedMotion,
                    svg: context.svg,
                    ...(context.width === undefined
                        ? {}
                        : { width: context.width }),
                    containers,
                    ...state,
                }),
                context.timeScale,
            ),
        [
            component,
            context.scheme,
            context.reducedMotion,
            context.width,
            context.svg,
            context.timeScale,
            containers,
            variantKey,
            stateKey,
        ],
    );
};

// A token value's transition, as selection names it, by the token's key.
const tokenTransitions = (selected: Selected): Map<string, Transition> => {
    const out = new Map<string, Transition>();
    for (const list of Object.values(selected.transitions)) {
        for (const t of list) {
            if (t.property.startsWith(TOKEN_TRANSITION)) {
                out.set(t.property.slice(TOKEN_TRANSITION.length), t);
            }
        }
    }
    return out;
};

// Instance tokens, their numbers moving to each new value over their transitions: the tokens
// as they are now, or `tokens` itself when nothing moves.
const useMovingTokens = (
    tokens: ThemeValues | undefined,
    transitions: Map<string, Transition>,
): ThemeValues | undefined => {
    const [now, setNow] = useState<ThemeValues>();
    const shown = useRef<ThemeValues | undefined>(tokens);
    const key = tokens ? JSON.stringify(tokens) : "";
    const movingFrom = (from: ThemeValues | undefined) =>
        [...transitions].filter(
            ([token]) =>
                typeof tokens?.[token] === "number" &&
                typeof from?.[token] === "number" &&
                from[token] !== tokens[token],
        );
    // Until the tween's first frame, the tokens stay where they were, rather than jumping to
    // the new values for a frame.
    const held =
        movingFrom(shown.current).length > 0 ? shown.current : undefined;
    useEffect(() => {
        const from = shown.current;
        const moving = movingFrom(from);
        if (!tokens || moving.length === 0) {
            shown.current = tokens;
            setNow(undefined);
            return;
        }
        // One clock for every moving token, on the first one's timing.
        const timing = moving[0]![1];
        const progress = new Animated.Value(0);
        const listener = progress.addListener(({ value }) => {
            const next = { ...tokens };
            for (const [token] of moving) {
                const a = from![token] as number;
                next[token] = a + ((tokens[token] as number) - a) * value;
            }
            shown.current = next;
            setNow(next);
        });
        Animated.timing(progress, {
            toValue: 1,
            duration: timing.duration,
            delay: timing.delay,
            easing: curve(timing.easing),
            useNativeDriver: false,
        }).start(({ finished }) => {
            if (!finished) return;
            shown.current = tokens;
            setNow(undefined);
        });
        return () => {
            progress.removeListener(listener);
            progress.stopAnimation();
        };
    }, [key]);
    return now ?? held ?? tokens;
};

/** A component's styles per slot, and each slot's transitions, for its variants and state.
 *  `tokens` gives this one instance its own token values, as the web sets a CSS variable on
 *  one element: `{ "components.linearProgress.value": 40 }`. A token whose own value
 *  transitions moves to each new number, and the styles reading it with it. */
export const useComponentState = (
    name: string,
    variants: Record<string, string | boolean | undefined> = {},
    state: State = {},
    tokens?: ThemeValues,
): Selected => {
    const target = useSelected(name, variants, state, tokens);
    const moving = useMovingTokens(tokens, tokenTransitions(target));
    const now = useSelected(name, variants, state, moving);
    return moving === tokens ? target : now;
};

/** A component's styles per slot, or its one style under `""` without slots. */
export const useComponentStyles = (
    name: string,
    variants: Record<string, string | boolean | undefined> = {},
    state: State = {},
    tokens?: ThemeValues,
): Record<string, Style> =>
    useComponentState(name, variants, state, tokens).styles;

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
