// `PureformProvider`: the registry, direction, motion, defaults, slot props, and theme for
// everything under it. It writes `dir`, `data-pf-motion`, the theme's attribute, and token
// overrides on its own element (`display: contents`), so the CSS and the browser agree with what
// components read from it, and a runtime theme's `<style>` block, which React hoists to the head.

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
import {
    THEME_PRECEDENCE,
    generatedBlock,
    initialThemeBlock,
    loadThemeVars,
    needsThemeLoad,
    overrideVars,
    serverThemeCss,
    unloadedThemeMessage,
} from "@pureform/binding-core/dom";
import type { ThemeBlock } from "@pureform/binding-core/dom";
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
 *  element's `style`. Object options (`defaults`, `slotProps`, `overrides`, a runtime `theme`) are
 *  compared by identity: keep them stable (module constants or `useMemo`) so components under it
 *  don't re-render needlessly. */
export function PureformProvider({
    registry,
    dir,
    motion,
    defaults,
    slotProps,
    theme,
    overrides,
    hydrate,
    style,
    children,
    ...rest
}: PureformProviderProps): ReactNode {
    const parent = useContext(PureformContext);
    const parentVars = useContext(ThemeVarsContext);
    const state = useMemo(
        () =>
            resolveProvider(
                parent,
                {
                    registry,
                    dir,
                    motion,
                    defaults,
                    slotProps,
                    theme,
                    overrides,
                    hydrate,
                },
                mergePartProps,
            ),
        [
            parent,
            registry,
            dir,
            motion,
            defaults,
            slotProps,
            theme,
            overrides,
            hydrate,
        ],
    );
    useEffect(() => {
        if (!isDev || !registry) return;
        const message = trainVersionMismatch(registry);
        if (message) warnOnce(message);
    }, [registry]);
    const block = useThemeBlock(theme, state.registry, state.hydrate);
    const vars = useMemo(
        () => overrideVars(overrides, state.registry),
        [overrides, state.registry],
    );
    return (
        <PureformContext value={state}>
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

/** The nearest provider's registry. Throws when no provider has one. */
export const useRegistry = (): AnyRegistry => requireRegistry(usePureform());

/** The direction in effect: pass it to every machine as `dir`. */
export const useDirection = (): Direction => usePureform().dir;

/** The motion setting in effect: the nearest `"reduce"` or `"full"`, else `"system"`. Most
 *  components want `useReducedMotion()` instead. */
export const useMotion = (): MotionSetting => usePureform().motion;
