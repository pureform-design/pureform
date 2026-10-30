// HTML projection of portable provider state.
import type {
    Direction,
    ProviderOptions,
    ProviderState,
    MergePartProps,
} from "@pureform/binding-core";
import { resolveProvider, ROOT_PROVIDER } from "@pureform/binding-core";
import type { TokenValue } from "@pureform/styling";
import type { AnyRuntimeTheme, AnyWebRegistry } from "@pureform/styling-web";
import { isRuntimeTheme, themeScope } from "@pureform/styling-web";
import { MOTION_ATTRIBUTE } from "@pureform/web-contracts";

/** A static theme's name, as the config names it. */
export type ThemeName = string;

/** What a provider's `theme` takes: a named theme from the config, or a runtime theme
 *  (`seedTheme({ seed })` from `@pureform/material/runtime-theme`). */
export type ProviderTheme = ThemeName | AnyRuntimeTheme;

/** Token values set for everything under the provider, by token path:
 *  `{ "colors.primary": "#006a60", "components.button.container": "…" }`. A key that's already a
 *  CSS var (`--brand`) is written as is. */
export type ThemeOverrides = Readonly<Record<string, TokenValue | undefined>>;

/** How the client gets a server-rendered runtime theme: keep the server's block, or generate it
 *  again while hydrating. */
export type ThemeHydration = "reuse" | "regenerate";

/** A web provider's own options: the portable ones, with the web registry (its target's theme
 *  attribute and var prefixes), plus its CSS theme. */
export interface WebProviderOptions<P = object> extends ProviderOptions<
    P,
    AnyWebRegistry
> {
    /** The theme for everything under the provider: a named theme from the config, or a runtime
     *  theme. The provider writes the target's theme attribute on its element (`data-theme`,
     *  `data-panda-theme`): the name, or a runtime theme's scope (`pf-<hash>` of its input), whose
     *  vars it writes in one `<style>` block in the document's head. */
    readonly theme?: ProviderTheme | undefined;
    /** Token values for everything under the provider, written as CSS vars in its element's
     *  `style` (on the server too). Scheme-independent; for a scheme-aware palette use a runtime
     *  theme. An override changes its own var only: tokens declared from it at the root keep
     *  their value. */
    readonly overrides?: ThemeOverrides | undefined;
    /** How the client gets a server-rendered runtime theme: `"reuse"` (the default) keeps the
     *  server's block and generates nothing until the theme changes; `"regenerate"` runs the
     *  generator again while hydrating, for code that reads the theme's vars. */
    readonly hydrate?: ThemeHydration | undefined;
}

/** What a web provider resolves to: the portable state plus its inherited theme. */
export interface WebProviderState<P = object> extends ProviderState<
    P,
    AnyWebRegistry
> {
    readonly theme: ProviderTheme | undefined;
    readonly overrides: ThemeOverrides;
    readonly hydrate: ThemeHydration;
}

/** What web components see with no provider above them. */
export const ROOT_WEB_PROVIDER: WebProviderState<never> = Object.freeze({
    ...ROOT_PROVIDER,
    theme: undefined,
    overrides: Object.freeze({}),
    hydrate: "reuse",
});

/** Portable inheritance plus web-only theme inheritance. Projection still uses own options. */
export const resolveWebProvider = <P>(
    parent: WebProviderState<P> | undefined,
    own: WebProviderOptions<P>,
    merge?: MergePartProps<P>,
): WebProviderState<P> => {
    const base = (parent ?? ROOT_WEB_PROVIDER) as WebProviderState<P>;
    return {
        ...resolveProvider(base, own, merge),
        theme: own.theme ?? base.theme,
        overrides: own.overrides
            ? { ...base.overrides, ...own.overrides }
            : base.overrides,
        hydrate: own.hydrate ?? base.hydrate,
    };
};

/** The attributes a provider writes on its element: the direction, the motion setting, and its
 *  theme's attributes, which depend on the target. */
export interface ProviderAttributes {
    readonly dir: Direction;
    readonly [MOTION_ATTRIBUTE]: "system" | "reduce" | "full" | undefined;
    readonly [themeAttribute: string]: string | undefined;
}

/** The attribute a registry's target scopes themes with; `data-theme` when it has none, which
 *  still scopes runtime themes, whose blocks the provider writes itself. */
export const themeAttributeOf = (
    registry: Pick<AnyWebRegistry, "themeAttribute"> | undefined,
): string => registry?.themeAttribute ?? "data-theme";

/** The attributes that scope a theme to an element: the registry's for a named theme, the
 *  scope for a runtime theme; `undefined` without a theme. */
export const themeAttributes = (
    theme: ProviderTheme | undefined,
    registry: AnyWebRegistry | undefined,
): Readonly<Record<string, string>> | undefined => {
    if (theme === undefined) return undefined;
    if (isRuntimeTheme(theme))
        return { [themeAttributeOf(registry)]: themeScope(theme) };
    return registry?.themeAttributes(theme);
};

/** Direction in effect, but only this provider's own motion and theme attributes. */
export const providerAttributes = (
    own: Pick<WebProviderOptions, "motion" | "theme">,
    state: Pick<WebProviderState, "dir"> &
        Partial<Pick<WebProviderState, "registry">>,
): ProviderAttributes => ({
    ...themeAttributes(own.theme, state.registry),
    dir: state.dir,
    [MOTION_ATTRIBUTE]: own.motion,
});
