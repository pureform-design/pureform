// `PureformProvider`: the registry, scheme, theme, overrides, direction, motion, defaults, and motion
// engine for everything under it, over the nearest provider's. It renders no view of its own: it
// gives `@pureform/rn-adapter`'s hooks their factories (the registry's entries) and environment, so
// every component selects through the generated `StyleFactory`s.

import {
    requireRegistry,
    resolveProvider,
    resolveReducedMotion,
    ROOT_PROVIDER,
    trainVersionMismatch,
    warnOnce,
} from "@pureform/binding-core";
import type {
    AnyRegistry,
    ComponentDefaults,
    Direction,
    MotionSetting,
} from "@pureform/binding-core";
import { overridesFor } from "@pureform/rn-adapter/factory";
import type {
    NativeFactory,
    Overrides,
    Scheme,
    Styles,
    ThemeValues,
} from "@pureform/rn-adapter/factory";
import { StylesProvider } from "@pureform/rn-adapter/react";
import type { StyleSource } from "@pureform/rn-adapter/react";
import { isRuntimeTheme } from "@pureform/styling";
import {
    createContext,
    use,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import type { ReactNode } from "react";
import {
    AccessibilityInfo,
    I18nManager,
    useColorScheme,
    useWindowDimensions,
} from "react-native";

import { animated } from "./engine";
import type { MotionEngine } from "./engine";
import { isDev } from "./env";

/** Overrides resolved for each scheme. */
export interface SchemeOverrides {
    readonly light: ThemeValues;
    readonly dark: ThemeValues;
}

/** What components read from the nearest provider. */
export interface PureformState {
    readonly registry: AnyRegistry | undefined;
    readonly scheme: Scheme;
    readonly theme: string | undefined;
    readonly overrides: SchemeOverrides;
    readonly dir: Direction;
    readonly motion: MotionSetting;
    readonly defaults: ComponentDefaults;
    readonly engine: MotionEngine;
    readonly width: number | undefined;
    readonly timeScale: number;
}

const NO_OVERRIDES: SchemeOverrides = Object.freeze({
    light: Object.freeze({}),
    dark: Object.freeze({}),
});

const PureformContext = createContext<PureformState | undefined>(undefined);

export interface PureformProviderProps {
    /** The generated registry (`.pureform`'s `registry`), whose entries are each component's
     *  `StyleFactory`. Inherited. */
    readonly registry?: AnyRegistry | undefined;
    /** The color scheme. Inherited; the system's (`useColorScheme`) at the root, else light. */
    readonly scheme?: Scheme | undefined;
    /** A named theme from the config. Inherited; the base theme at the root. Runtime themes are
     *  web only. */
    readonly theme?: string | undefined;
    /** Token or component token values by key (`colors.primary`,
     *  `components.button.container`), for both schemes or as `{ light, dark }`, over the outer
     *  provider's. */
    readonly overrides?: Overrides | undefined;
    /** Text direction: styles under `rtl` apply when it's `"rtl"`. Inherited;
     *  `I18nManager.isRTL` at the root. React Native lays out the whole app in one direction, so
     *  a nested provider changes what the styles read, not the layout. */
    readonly dir?: Direction | undefined;
    /** How much motion to allow. `"system"` follows the system's reduce motion setting
     *  (`AccessibilityInfo`), or the nearest provider that says `"reduce"` or `"full"`. */
    readonly motion?: MotionSetting | undefined;
    /** Default variants and tokens per component, over the outer provider's. */
    readonly defaults?: ComponentDefaults | undefined;
    /** What runs transitions and ripples and draws shapes: `animated` (React Native's Animated,
     *  the default), or `animatedSvg`, `reanimated`, or `reanimatedSvg` from this package's
     *  subpaths. Inherited. */
    readonly engine?: MotionEngine | undefined;
    /** The width viewport conditions hold by. Inherited; the window's at the root. */
    readonly width?: number | undefined;
    /** How much longer every transition and animation runs, for watching motion slowly. */
    readonly timeScale?: number | undefined;
    readonly children?: ReactNode;
}

// One source per registry: each entry's factory, a lazy one through `use()`, and the theme values
// every factory carries.
const sources = new WeakMap<AnyRegistry, StyleSource>();

const NO_REGISTRY: StyleSource = {
    factory: () => requireRegistry({ registry: undefined }) as never,
    themeValues: () => ({ themes: {} }),
};

const factoryOf = (registry: AnyRegistry, name: string): NativeFactory => {
    const entry = registry.entry(name);
    return (
        entry.kind === "static" ? entry.factory : use(entry.load())
    ) as NativeFactory;
};

const registrySource = (registry: AnyRegistry | undefined): StyleSource => {
    if (!registry) return NO_REGISTRY;
    let source = sources.get(registry);
    if (source) return source;
    let values: Pick<Styles, "themes" | "formulas"> | undefined;
    source = {
        factory: (name) => factoryOf(registry, name),
        themeValues: () => {
            if (values) return values;
            const first =
                registry.names.find(
                    (name) => registry.entry(name).kind === "static",
                ) ?? registry.names[0];
            if (first === undefined) return { themes: {} };
            values = factoryOf(registry, first).styles;
            return values;
        },
    };
    sources.set(registry, source);
    return source;
};

// The system's reduce motion setting, read only while a provider follows it.
const useSystemReducedMotion = (follow: boolean): boolean => {
    const [reduced, setReduced] = useState(false);
    useEffect(() => {
        if (!follow) return undefined;
        let active = true;
        AccessibilityInfo.isReduceMotionEnabled().then(
            (value) => active && setReduced(value),
            () => {},
        );
        const subscription = AccessibilityInfo.addEventListener(
            "reduceMotionChanged",
            (value: boolean) => setReduced(value),
        );
        return () => {
            active = false;
            subscription?.remove();
        };
    }, [follow]);
    return follow && reduced;
};

const mergeOverrides = (
    outer: SchemeOverrides,
    own: Overrides | undefined,
): SchemeOverrides =>
    own
        ? {
              light: { ...outer.light, ...overridesFor(own, "light") },
              dark: { ...outer.dark, ...overridesFor(own, "dark") },
          }
        : outer;

/** Provides the registry and the settings components read, over the nearest provider's.
 *  `registry`, `defaults`, and `engine` are compared by identity (keep them stable), `overrides`
 *  by value. */
export function PureformProvider(props: PureformProviderProps): ReactNode {
    const parent = useContext(PureformContext);
    const systemScheme = useColorScheme();
    const window = useWindowDimensions();
    if (isRuntimeTheme(props.theme)) {
        throw new Error(
            "pureform: runtime themes are web only; React Native takes a named theme from the config, or overrides.",
        );
    }
    const overrideKey = JSON.stringify(props.overrides ?? null);
    // The root's own defaults, which only a provider without a parent reads.
    const rootScheme: Scheme | null = parent
        ? null
        : systemScheme === "dark"
          ? "dark"
          : "light";
    const rootWidth = parent ? null : window.width;
    const state = useMemo<PureformState>(() => {
        const base: PureformState = parent ?? {
            ...ROOT_PROVIDER,
            dir: I18nManager.isRTL ? "rtl" : "ltr",
            scheme: rootScheme ?? "light",
            theme: undefined,
            overrides: NO_OVERRIDES,
            engine: animated,
            width: rootWidth ?? undefined,
            timeScale: 1,
        };
        const resolved = resolveProvider(
            {
                ...ROOT_PROVIDER,
                registry: base.registry,
                dir: base.dir,
                motion: base.motion,
                defaults: base.defaults,
            },
            {
                registry: props.registry,
                dir: props.dir,
                motion: props.motion,
                defaults: props.defaults,
            },
        );
        return {
            registry: resolved.registry,
            dir: resolved.dir,
            motion: resolved.motion,
            defaults: resolved.defaults,
            scheme: props.scheme ?? base.scheme,
            theme: props.theme ?? base.theme,
            overrides: mergeOverrides(base.overrides, props.overrides),
            engine: props.engine ?? base.engine,
            width: props.width ?? base.width,
            timeScale: props.timeScale ?? base.timeScale,
        };
    }, [
        parent,
        rootScheme,
        rootWidth,
        props.registry,
        props.dir,
        props.motion,
        props.defaults,
        props.scheme,
        props.theme,
        overrideKey,
        props.engine,
        props.width,
        props.timeScale,
    ]);
    useEffect(() => {
        if (!isDev || !state.registry) return;
        const message = trainVersionMismatch(state.registry);
        if (message) warnOnce(message);
    }, [state.registry]);
    const reducedMotion = resolveReducedMotion(
        state.motion,
        useSystemReducedMotion(state.motion === "system"),
    );
    return (
        <PureformContext value={state}>
            <StylesProvider
                source={registrySource(state.registry)}
                scheme={state.scheme}
                {...(state.theme === undefined ? {} : { theme: state.theme })}
                overrides={state.overrides}
                reducedMotion={reducedMotion}
                rtl={state.dir === "rtl"}
                {...(state.width === undefined ? {} : { width: state.width })}
                svg={state.engine.svg}
                timeScale={state.timeScale}
            >
                {props.children}
            </StylesProvider>
        </PureformContext>
    );
}

/** The nearest provider's state. Throws outside one. */
export function usePureform(): PureformState {
    const state = useContext(PureformContext);
    if (!state) {
        throw new Error(
            "pureform: no PureformProvider. Wrap the app in <PureformProvider registry={registry}>.",
        );
    }
    return state;
}

/** The registry. Throws when no provider gave one. */
export function useRegistry(): AnyRegistry {
    return requireRegistry(usePureform());
}

/** The text direction in effect. */
export function useDirection(): Direction {
    return usePureform().dir;
}

/** The motion setting in effect: the nearest `"reduce"` or `"full"`, else `"system"`. */
export function useMotion(): MotionSetting {
    return usePureform().motion;
}

/** The motion engine in effect. */
export function useEngine(): MotionEngine {
    return usePureform().engine;
}
