// `PureformProvider`: the registry, direction, motion, defaults, slot props, and theme for
// everything under it. It writes `dir`, `data-pf-motion`, the theme's attribute, and token
// overrides on its own element (`display: contents`), so the CSS and the browser agree with what
// components read from it, and a runtime theme's `<style>` block in the head with `useHead`.

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
} from "@pureform/binding-core";
import {
    THEME_BLOCK_ATTRIBUTE,
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
import { isDev, isServer, useHead } from "@solidjs/web";
import type { JSX } from "@solidjs/web";
import {
    type Accessor,
    createContext,
    createEffect,
    createMemo,
    createSignal,
    omit,
    untrack,
    useContext,
} from "solid-js";

import { mergePartProps, mergeStyles } from "./props";
import type { PartProps } from "./props";

/** What components read from the nearest provider. */
export type PureformState = ProviderState<PartProps>;

const PureformContext = createContext<Accessor<PureformState>>(
    () => ROOT_PROVIDER,
);

const ThemeVarsContext = createContext<Accessor<ThemeSchemeVars | undefined>>(
    () => undefined,
);

export interface PureformProviderProps
    extends
        ProviderOptions<PartProps>,
        Omit<JSX.HTMLAttributes<HTMLDivElement>, "dir"> {
    children?: JSX.Element;
}

const OPTIONS = [
    "registry",
    "dir",
    "motion",
    "defaults",
    "slotProps",
    "theme",
    "overrides",
    "hydrate",
] as const;

/** Provides the registry and the settings components read, over the nearest provider's. A
 *  `theme` is a named theme from the config or a runtime theme, scoped by the target's attribute
 *  on the provider's element; a runtime theme's vars go in one `<style>` block in the head
 *  (`useHead`, keyed by the theme's scope), and `overrides` in the element's `style`. */
export function PureformProvider(props: PureformProviderProps): JSX.Element {
    const parent = useContext(PureformContext);
    const parentVars = useContext(ThemeVarsContext);
    const state = createMemo(() =>
        resolveProvider(
            parent(),
            {
                registry: props.registry,
                dir: props.dir,
                motion: props.motion,
                defaults: props.defaults,
                slotProps: props.slotProps,
                theme: props.theme,
                overrides: props.overrides,
                hydrate: props.hydrate,
            },
            mergePartProps,
        ),
    );
    if (isDev) {
        createEffect(
            () => props.registry,
            (registry) => {
                const message = registry && trainVersionMismatch(registry);
                if (message) warnOnce(message);
            },
        );
    }
    const themeBlock = useThemeBlock(props, state);
    const rest = omit(props, ...OPTIONS, "children", "style");
    const attributes = createMemo(() =>
        providerAttributes(
            { motion: props.motion, theme: props.theme },
            state(),
        ),
    );
    const themeVars = (): ThemeSchemeVars | undefined =>
        props.theme === undefined ? parentVars() : themeBlock()?.vars;
    return (
        <PureformContext value={state}>
            <ThemeVarsContext value={themeVars}>
                <div
                    {...rest}
                    {...attributes()}
                    style={mergeStyles([
                        { display: "contents" },
                        overrideVars(props.overrides, state().registry),
                        props.style,
                    ])}
                >
                    {props.children}
                </div>
            </ThemeVarsContext>
        </PureformContext>
    );
}

// A runtime theme's block: generated on the server, kept or generated again while hydrating, and
// generated after its generator loads when the theme changes. Written to the head with `useHead`,
// keyed by its scope, so providers with the same theme share one block.
const useThemeBlock = (
    props: PureformProviderProps,
    state: Accessor<PureformState>,
): Accessor<ThemeBlock | undefined> => {
    const [loaded, setLoaded] = createSignal<ThemeBlock | undefined>();
    const block = createMemo(() => {
        const theme = props.theme;
        if (!isRuntimeTheme(theme)) return undefined;
        const { registry, hydrate } = state();
        const generated = loaded();
        if (generated?.scope === themeScope(theme)) return generated;
        const initial = untrack(() =>
            initialThemeBlock(theme, registry, {
                hydrate,
                server: isServer,
                existing: serverThemeCss,
            }),
        );
        if (isServer && isDev && initial.css === undefined) {
            warnOnce(unloadedThemeMessage(theme));
        }
        return initial;
    });
    createEffect(
        () => block(),
        (current) => {
            const theme = props.theme;
            if (isServer || !current || !isRuntimeTheme(theme)) return;
            const { registry, hydrate } = untrack(state);
            if (!needsThemeLoad(current, hydrate)) return;
            let active = true;
            loadThemeVars(theme, registry).then(
                (vars) => {
                    if (active)
                        setLoaded(generatedBlock(theme, registry, vars));
                },
                (error: unknown) =>
                    warnOnce(
                        `pureform: the runtime theme "${theme.source.name}" failed to load: ${String(error)}`,
                    ),
            );
            return () => {
                active = false;
            };
        },
    );
    useHead(() => {
        const current = block();
        return current?.css === undefined
            ? []
            : {
                  tag: "style",
                  key: `pureform-theme:${current.scope}`,
                  props: {
                      [THEME_BLOCK_ATTRIBUTE]: current.scope,
                      children: current.css,
                  },
              };
    });
    return block;
};

/** The vars of the nearest provider's runtime theme, when it generated them: on the server,
 *  while hydrating with `hydrate: "regenerate"`, and after the theme changes on the client.
 *  `undefined` while it reuses the server's block, under a named theme, and with none. */
export const useThemeVars = (): Accessor<ThemeSchemeVars | undefined> =>
    useContext(ThemeVarsContext);

/** The nearest provider's state, or the root's defaults with none. */
export const usePureform = (): Accessor<PureformState> =>
    useContext(PureformContext);

/** The nearest provider's registry. Reading it throws when no provider has one. */
export const useRegistry = (): Accessor<AnyRegistry> => {
    const state = usePureform();
    return () => requireRegistry(state());
};

/** The direction in effect: pass it to every machine as `dir`. */
export const useDirection = (): Accessor<Direction> => {
    const state = usePureform();
    return () => state().dir;
};

/** The motion setting in effect: the nearest `"reduce"` or `"full"`, else `"system"`. Most
 *  components want `useReducedMotion()` instead. */
export const useMotion = (): Accessor<MotionSetting> => {
    const state = usePureform();
    return () => state().motion;
};
