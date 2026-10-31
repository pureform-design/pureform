// `PureformProvider`: the registry, direction, motion, defaults, slot props, and theme for
// everything under it. It writes `dir`, `data-pf-motion`, the theme's attribute, and token
// overrides on its own element (`display: contents`), so the CSS and the browser agree with what
// components read from it, and a runtime theme's `<style>` block in the head with `useHead`.
// The fields components read resolve apart from the theme, overrides, and hydration, which only
// the provider's element and `usePureform()` use, so switching a theme runs no component again.

import {
    requireRegistry,
    resolveProvider,
    ROOT_PROVIDER,
    trainVersionMismatch,
    warnOnce,
} from "@pureform/binding-core";
import type { Direction, MotionSetting } from "@pureform/binding-core";
import type { ProviderOptions, ProviderState } from "@pureform/binding-core";
import type {
    WebProviderOptions,
    WebProviderState,
    ThemeOverrides,
} from "@pureform/binding-web";
import { ROOT_WEB_PROVIDER } from "@pureform/binding-web";
import { providerAttributes } from "@pureform/binding-web";
import {
    THEME_BLOCK_ATTRIBUTE,
    generatedBlock,
    initialThemeBlock,
    loadThemeVars,
    needsThemeLoad,
    overrideVars,
    serverThemeCss,
    unloadedThemeMessage,
} from "@pureform/binding-web";
import type { ThemeBlock } from "@pureform/binding-web";
import { providerIndicationOverrides } from "@pureform/binding-web/indication";
import type { Indication } from "@pureform/binding-web/indication";
import { isRuntimeTheme, themeScope } from "@pureform/styling-web";
import type { AnyWebRegistry, ThemeSchemeVars } from "@pureform/styling-web";
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
export type PureformState = WebProviderState<PartProps>;

const PureformContext = createContext<Accessor<PureformState>>(
    () => ROOT_WEB_PROVIDER,
);

const ThemeVarsContext = createContext<Accessor<ThemeSchemeVars | undefined>>(
    () => undefined,
);

export interface PureformProviderProps
    extends
        WebProviderOptions<PartProps>,
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
    "indication",
] as const;

/** Provides the registry and the settings components read, over the nearest provider's. A
 *  `theme` is a named theme from the config or a runtime theme, scoped by the target's attribute
 *  on the provider's element; a runtime theme's vars go in one `<style>` block in the head
 *  (`useHead`, keyed by the theme's scope), and `overrides` in the element's `style`, with the
 *  theme-level tokens of its `indication` under them. */
export function PureformProvider(props: PureformProviderProps): JSX.Element {
    const parent = useContext(PureformContext);
    const parentVars = useContext(ThemeVarsContext);
    // The fields components read resolve over the parent's same fields alone, so a theme change,
    // here or above, leaves them as they are. The own options compare by identity, as when they
    // come from one object (`{...options()}`) that changes with the theme.
    let lastBase: object = {};
    let lastOwn: object = {};
    let last: ProviderState<PartProps, AnyWebRegistry> | undefined;
    const components = createMemo(
        () => {
            const base = componentFieldsOf(parent());
            const own: ProviderOptions<PartProps, AnyWebRegistry> = {
                registry: props.registry,
                dir: props.dir,
                motion: props.motion,
                defaults: props.defaults,
                slotProps: props.slotProps,
                indication: props.indication,
            };
            if (
                last &&
                sameEntries(base, lastBase) &&
                sameEntries(own, lastOwn)
            ) {
                return last;
            }
            lastBase = base;
            lastOwn = own;
            last = resolveProvider(
                base as ProviderState<PartProps, AnyWebRegistry>,
                own,
                mergePartProps,
            );
            return last;
        },
        { name: "provider.components" },
    );
    // The theme's fields resolve each over the parent's same field, as `resolveProvider` does.
    // oxlint-disable-next-line solid/reactivity -- fieldsOf calls it inside the memos it makes
    const view = fieldsOf((key) => {
        switch (key) {
            case "theme":
                return props.theme ?? parent().theme;
            case "overrides":
                return props.overrides
                    ? { ...parent().overrides, ...props.overrides }
                    : parent().overrides;
            case "hydrate":
                return props.hydrate ?? parent().hydrate;
            default:
                return components()[key];
        }
    });
    const state = () => view;
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
                        overrideVars(
                            withIndicationOverrides(
                                props.indication,
                                props.overrides,
                            ),
                            state().registry,
                        ),
                        props.style,
                    ])}
                >
                    {props.children}
                </div>
            </ThemeVarsContext>
        </PureformContext>
    );
}

// The provider's own indication's theme-level tokens, under its own overrides.
const withIndicationOverrides = (
    indication: Indication | undefined,
    overrides: ThemeOverrides | undefined,
): ThemeOverrides | undefined => {
    const tokens = providerIndicationOverrides(indication);
    return tokens ? { ...tokens, ...overrides } : overrides;
};

// The fields whose values are records, rebuilt when the provider resolves again: equal when their
// entries are.
const RECORD_FIELDS: ReadonlySet<keyof PureformState> = new Set([
    "defaults",
    "slotProps",
    "overrides",
]);

const sameEntries = (a: object, b: object): boolean => {
    if (a === b) return true;
    const keys = Object.keys(a);
    if (keys.length !== Object.keys(b).length) return false;
    return keys.every(
        (key) =>
            Object.hasOwn(b, key) &&
            Object.is(
                (a as Record<string, unknown>)[key],
                (b as Record<string, unknown>)[key],
            ),
    );
};

// The fields components read: all but the theme, the overrides, and the hydration, which reach
// them as CSS on the provider's element.
const COMPONENT_FIELDS = (
    Object.keys(ROOT_PROVIDER) as (keyof PureformState)[]
).filter((key) => key !== "theme" && key !== "overrides" && key !== "hydrate");

// The fields of a state components read, read alone.
const componentFieldsOf = (state: PureformState): Partial<PureformState> => {
    const fields: Record<string, unknown> = {};
    for (const key of COMPONENT_FIELDS) fields[key] = state[key];
    return fields;
};

// The state as one object with a memo behind each field, so a component depends on the fields it
// reads, and only a field that changed updates its readers: every component reads the provider,
// and most of a page's would otherwise run again when any setting changes.
const fieldsOf = (
    resolve: (key: keyof PureformState) => unknown,
): PureformState => {
    const view = {};
    for (const key of Object.keys(
        ROOT_WEB_PROVIDER,
    ) as (keyof PureformState)[]) {
        const field = createMemo(() => resolve(key), {
            name: `provider.${key}`,
            ...(RECORD_FIELDS.has(key) && {
                equals: (a: unknown, b: unknown) =>
                    sameEntries(a as object, b as object),
            }),
        });
        Object.defineProperty(view, key, { get: field, enumerable: true });
    }
    return view as PureformState;
};

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
        () => ({ current: block(), theme: props.theme }),
        ({ current, theme }) => {
            if (isServer || !current || !isRuntimeTheme(theme)) return;
            const { registry, hydrate } = untrack(() => ({
                registry: state().registry,
                hydrate: state().hydrate,
            }));
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
export const useRegistry = (): Accessor<AnyWebRegistry> => {
    const state = usePureform();
    return () => requireRegistry(state());
};

/** The direction in effect: pass it to every machine as `dir`. */
export const useDirection = (): Accessor<Direction> => {
    const state = usePureform();
    return () => state().dir;
};

/** The motion setting in effect: the nearest supplied setting, or `"system"`. Most
 *  components want `useReducedMotion()` instead. */
export const useMotion = (): Accessor<MotionSetting> => {
    const state = usePureform();
    return () => state().motion;
};
