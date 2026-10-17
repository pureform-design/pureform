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
import { componentFactory } from "./factory";
import type { Environment, NativeFactory } from "./factory";
import { movingTokens, tokenTransitions, tokensAt } from "./motion";
import { overridesFor, themeKey, withDerived } from "./resolve";
import type { Overrides, Styles } from "./resolve";
import type { Selected, State, Style } from "./select";
import type { Scheme } from "./theme";
import type { ThemeValues, Transition } from "./values";

interface Context {
    factory: (name: string) => NativeFactory;
    theme: string | undefined;
    overrides: ThemeValues;
    tokens: ThemeValues;
    scheme: Scheme;
    reducedMotion: boolean;
    rtl: boolean;
    width: number | undefined;
    svg: boolean;
    timeScale: number;
}

const PureformContext = createContext<Context | undefined>(undefined);

/** Where the hooks get each component's styles: its factory, and the token values and formulas
 *  `useTokens()` reads. A binding's provider gives its registry's factories; `PureformProvider`
 *  gives factories over its `styles`. */
export interface StyleSource {
    /** A component's factory, by name. Called while rendering, so it may suspend. */
    factory(name: string): NativeFactory;
    /** Each theme's token values and formulas by theme key, as every factory's `styles` holds
     *  them. Called while rendering, so it may suspend. */
    themeValues(): Pick<Styles, "themes" | "formulas">;
}

/** A source over styles from `precompute` or `runtimeStyles`. */
export const stylesSource = (styles: Styles): StyleSource => ({
    factory: (name) => componentFactory(styles, name),
    themeValues: () => styles,
});

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

/** What `StylesProvider` takes: `PureformProvider`'s props, with a source in place of the
 *  styles, and the direction. */
export interface StylesProviderProps extends Omit<
    PureformProviderProps,
    "styles"
> {
    source: StyleSource;
    /** Whether the layout runs right to left: styles under `rtl` apply. Default `false`. */
    rtl?: boolean;
}

/** The provider the hooks read, over any source of factories. Bindings build theirs on it. */
export const StylesProvider = (props: StylesProviderProps) => {
    const { source, scheme, theme } = props;
    const key = themeKey(theme, scheme);
    const overrides = overridesFor(props.overrides, scheme);
    // Overrides are compared by contents, so an inline object doesn't recompute every render.
    const overrideKey = JSON.stringify(overrides ?? {});
    const values = source.themeValues();
    const tokens = useMemo(
        () => ({
            ...values.themes[key],
            ...withDerived(values, key, overrides),
        }),
        [values, key, overrideKey],
    );
    const reducedMotion = props.reducedMotion ?? false;
    const rtl = props.rtl ?? false;
    const svg = props.svg ?? false;
    const timeScale = props.timeScale ?? 1;
    const value = useMemo(
        () => ({
            factory: source.factory,
            theme,
            overrides,
            tokens,
            scheme,
            reducedMotion,
            rtl,
            width: props.width,
            svg,
            timeScale,
        }),
        [
            source,
            overrideKey,
            tokens,
            theme,
            scheme,
            reducedMotion,
            rtl,
            props.width,
            svg,
            timeScale,
        ],
    );
    return createElement(PureformContext.Provider, { value }, props.children);
};

/** The styles' provider: the hooks select from `styles` in its scheme, theme, and
 *  overrides. */
export const PureformProvider = ({
    styles,
    ...props
}: PureformProviderProps) => {
    const source = useMemo(() => stylesSource(styles), [styles]);
    return createElement(StylesProvider, { ...props, source });
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

/** Where the caller renders, for calling a component's factory directly: the provider's theme,
 *  scheme, overrides, and drawing, the window's width, and the containers around it.
 *  `factory.for(useStyleEnvironment())` selects as the hooks do. */
export const useStyleEnvironment = (): Environment => {
    const context = useContextOrThrow("useStyleEnvironment");
    const containers = useContext(ContainerContext);
    return useMemo(
        () => ({
            ...(context.theme === undefined ? {} : { theme: context.theme }),
            scheme: context.scheme,
            overrides: context.overrides,
            svg: context.svg,
            ...(context.width === undefined ? {} : { width: context.width }),
            containers,
        }),
        [context, containers],
    );
};

// The selection for given token values, from the component's factory over the provider's
// styles: one cached, frozen selection per variants and state.
const useSelected = (
    name: string,
    variants: Record<string, string | boolean | undefined> = {},
    state: State = {},
    tokens?: ThemeValues,
): Selected => {
    const context = useContextOrThrow("useComponentStyles");
    const containers = useContext(ContainerContext);
    const factory = context.factory(name);
    const {
        scheme = context.scheme,
        svg = context.svg,
        width = context.width,
        containers: within = containers,
        ...states
    } = state;
    const at = useMemo(
        () =>
            factory.for({
                ...(context.theme === undefined
                    ? {}
                    : { theme: context.theme }),
                scheme,
                overrides: context.overrides,
                svg,
                ...(width === undefined ? {} : { width }),
                containers: within,
            }),
        [factory, context.theme, scheme, context.overrides, svg, width, within],
    );
    const selected = at.selected({
        reducedMotion: context.reducedMotion,
        // Only when it holds, so left to right selects as with no direction at all.
        ...(context.rtl ? { rtl: true } : {}),
        ...states,
        ...variants,
        ...(tokens ? { tokens } : {}),
    });
    return useMemo(
        () => slowed(selected, context.timeScale),
        [selected, context.timeScale],
    );
};

// Instance tokens, each moving to its new value over their transitions: the tokens
// as they are now, or `tokens` itself when nothing moves.
const useMovingTokens = (
    tokens: ThemeValues | undefined,
    transitions: Map<string, Transition>,
): ThemeValues | undefined => {
    const [now, setNow] = useState<ThemeValues>();
    const shown = useRef<ThemeValues | undefined>(tokens);
    const key = tokens ? JSON.stringify(tokens) : "";
    const movingFrom = (from: ThemeValues | undefined) =>
        movingTokens(from, tokens, transitions);
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
            const next = tokensAt(from!, tokens, moving, value);
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
 *  transitions moves to each new value, a number, color, length, angle, percentage or time,
 *  and the styles reading it with it. */
export const useComponentState = (
    name: string,
    variants: Record<string, string | boolean | undefined> = {},
    state: State = {},
    tokens?: ThemeValues,
): Selected => {
    const target = useSelected(name, variants, state, tokens);
    const moving = useMovingTokens(
        tokens,
        tokenTransitions(target.transitions, useReducedMotion()),
    );
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
