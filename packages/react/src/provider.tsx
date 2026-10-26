// `PureformProvider`: the registry, direction, motion, defaults, slot props, and theme for
// everything under it. It writes `dir`, `data-pf-motion`, the theme's attribute, and token
// overrides on its own element (`display: contents`), so the CSS and the browser agree with what
// components read from it, and a runtime theme's `<style>` block, which React hoists to the head.
// Components read a second context without the theme, overrides, and hydration, which only the
// provider's element and `usePureform()` use, so switching a theme doesn't render them again.

import {
    providerAttributes,
    requireRegistry,
    resolveProvider,
    ROOT_PROVIDER,
    trainVersionMismatch,
    warnOnce,
} from "@pureform/binding-core";
import type {
    AnyRegistry,
    Direction,
    MotionSetting,
    ProviderOptions,
    ProviderState,
    ProviderTheme,
    ThemeHydration,
} from "@pureform/binding-core";
import { providerIndicationOverrides } from "@pureform/binding-core/indication";
import {
    THEME_PRECEDENCE,
    generatedBlock,
    initialThemeBlock,
    loadThemeVars,
    needsThemeLoad,
    overrideVars,
    serverThemeCss,
    unloadedThemeMessage,
} from "@pureform/binding-web";
import type { ThemeBlock } from "@pureform/binding-web";
import { isRuntimeTheme, themeScope } from "@pureform/styling";
import type { ThemeSchemeVars } from "@pureform/styling";
import {
    createContext,
    type CSSProperties,
    type HTMLAttributes,
    type ReactNode,
    type Ref,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

import { isDev, isServer } from "./env";
import { mergePartProps } from "./props";
import type { PartProps } from "./props";

/** What components read from the nearest provider. */
export type PureformState = ProviderState<PartProps>;

const PureformContext = createContext<PureformState>(ROOT_PROVIDER);

/** The part of the state components read: everything but the theme, the overrides, and the
 *  hydration, which reach them as CSS. */
export type ComponentState = Omit<
    PureformState,
    "theme" | "overrides" | "hydrate"
>;

const ComponentContext = createContext<ComponentState>(ROOT_PROVIDER);

const ThemeVarsContext = createContext<ThemeSchemeVars | undefined>(undefined);

export interface PureformProviderProps
    extends
        ProviderOptions<PartProps>,
        Omit<HTMLAttributes<HTMLDivElement>, "dir"> {
    children?: ReactNode;
    ref?: Ref<HTMLDivElement> | undefined;
}

/** Provides the registry and the settings components read, over the nearest provider's. A
 *  `theme` is a named theme from the config or a runtime theme, scoped by the target's attribute
 *  on the provider's element; a runtime theme's vars go in one `<style href precedence>` block,
 *  which React hoists to the head and dedupes by the theme's scope, and `overrides` in the
 *  element's `style`, with the theme-level tokens of its `indication` under them. Object options (`defaults`, `slotProps`, `overrides`, a runtime `theme`) are
 *  compared by identity: keep them stable (module constants or `useMemo`) so components under it
 *  don't re-render needlessly. A change to the theme, the overrides, or `hydrate` renders the
 *  provider and what calls `usePureform()`, not the components under it. */
export function PureformProvider({
    registry,
    dir,
    motion,
    defaults,
    slotProps,
    theme,
    overrides,
    hydrate,
    indication,
    style,
    children,
    ...rest
}: PureformProviderProps): ReactNode {
    const parent = useContext(PureformContext);
    const parentComponents = useContext(ComponentContext);
    const parentVars = useContext(ThemeVarsContext);
    // Resolved over the parent's component state alone, which a theme change above leaves as is.
    const components = useMemo((): ComponentState => {
        const resolved = resolveProvider(
            { ...ROOT_PROVIDER, ...parentComponents },
            { registry, dir, motion, defaults, slotProps, indication },
            mergePartProps,
        );
        return {
            registry: resolved.registry,
            dir: resolved.dir,
            motion: resolved.motion,
            defaults: resolved.defaults,
            slotProps: resolved.slotProps,
            indication: resolved.indication,
            focusIndicatorColor: resolved.focusIndicatorColor,
        };
    }, [
        parentComponents,
        registry,
        dir,
        motion,
        defaults,
        slotProps,
        indication,
    ]);
    const state = useMemo((): PureformState => {
        const resolved = resolveProvider(parent, { theme, overrides, hydrate });
        return {
            ...components,
            theme: resolved.theme,
            overrides: resolved.overrides,
            hydrate: resolved.hydrate,
        };
    }, [parent, components, theme, overrides, hydrate]);
    useEffect(() => {
        if (!isDev || !registry) return;
        const message = trainVersionMismatch(registry);
        if (message) warnOnce(message);
    }, [registry]);
    const block = useThemeBlock(theme, state.registry, state.hydrate);
    const vars = useMemo(() => {
        // The indication's theme-level tokens, under the provider's own overrides.
        const tokens = providerIndicationOverrides(indication);
        return overrideVars(
            tokens ? { ...tokens, ...overrides } : overrides,
            state.registry,
        );
    }, [indication, overrides, state.registry]);
    return (
        <PureformContext value={state}>
            <ComponentContext value={components}>
                <ThemeVarsContext
                    value={theme === undefined ? parentVars : block?.vars}
                >
                    {block?.css === undefined ? null : (
                        <style href={block.scope} precedence={THEME_PRECEDENCE}>
                            {block.css}
                        </style>
                    )}
                    <div
                        {...rest}
                        {...providerAttributes({ motion, theme }, state)}
                        style={{
                            display: "contents",
                            ...(vars as CSSProperties | undefined),
                            ...style,
                        }}
                    >
                        {children}
                    </div>
                </ThemeVarsContext>
            </ComponentContext>
        </PureformContext>
    );
}

// A runtime theme's block: generated on the server, kept or generated again while hydrating, and
// generated after its generator loads when the theme changes. Keyed by the theme's scope, so a
// new object for the same theme changes nothing.
const useThemeBlock = (
    theme: ProviderTheme | undefined,
    registry: AnyRegistry | undefined,
    hydrate: ThemeHydration,
): ThemeBlock | undefined => {
    const runtime = isRuntimeTheme(theme) ? theme : undefined;
    const scope = runtime ? themeScope(runtime) : undefined;
    const [loaded, setLoaded] = useState<ThemeBlock>();
    const initial = useMemo(
        () =>
            runtime &&
            initialThemeBlock(runtime, registry, {
                hydrate,
                server: isServer,
                existing: serverThemeCss,
            }),
        [scope, registry, hydrate],
    );
    const block = loaded && loaded.scope === scope ? loaded : initial;
    if (isServer && isDev && runtime && block?.css === undefined) {
        warnOnce(unloadedThemeMessage(runtime));
    }
    useEffect(() => {
        if (!runtime || !block || !needsThemeLoad(block, hydrate)) return;
        let active = true;
        loadThemeVars(runtime, registry).then(
            (vars) => {
                if (active) setLoaded(generatedBlock(runtime, registry, vars));
            },
            (error: unknown) =>
                warnOnce(
                    `pureform: the runtime theme "${runtime.source.name}" failed to load: ${String(error)}`,
                ),
        );
        return () => {
            active = false;
        };
    }, [block, registry, hydrate]);
    return block;
};

/** The vars of the nearest provider's runtime theme, when it generated them: on the server,
 *  while hydrating with `hydrate: "regenerate"`, and after the theme changes on the client.
 *  `undefined` while it reuses the server's block, under a named theme, and with none. */
export const useThemeVars = (): ThemeSchemeVars | undefined =>
    useContext(ThemeVarsContext);

/** The nearest provider's state, or the root's defaults with none. */
export const usePureform = (): PureformState => useContext(PureformContext);

/** The nearest provider's state without the theme, overrides, and hydration: what components
 *  read, so a theme change doesn't render them again. */
export const useComponentState = (): ComponentState =>
    useContext(ComponentContext);

/** The nearest provider's registry. Throws when no provider has one. */
export const useRegistry = (): AnyRegistry =>
    requireRegistry(useComponentState());

/** The direction in effect: pass it to every machine as `dir`. */
export const useDirection = (): Direction => useComponentState().dir;

/** The motion setting in effect: the nearest `"reduce"` or `"full"`, else `"system"`. Most
 *  components want `useReducedMotion()` instead. */
export const useMotion = (): MotionSetting => useComponentState().motion;
