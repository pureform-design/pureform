// The web registry: the neutral registry plus how the target's stylesheet scopes named themes and
// names its CSS vars. It adds options, never entries, so its entries are the neutral registry's.

import type { VarPrefix } from "@pureform/css-lowering";
import { createRegistry } from "@pureform/styling";
import type {
    Registry,
    RegistryInput,
    RegistryOptions,
} from "@pureform/styling";

/** The attributes that put an element and everything under it in a named theme: `{
 *  "data-theme": "teal" }`. Empty for the base theme. */
export type ThemeAttributes = Readonly<Record<string, string>>;

/** How the target names its CSS vars, as its stylesheet was compiled: the component var prefix
 *  (`"pf"` gives `--pf-components-button-container`) and the token var prefix (`"pf"` gives
 *  `--pf-colors-primary`). Both default to none. */
export interface VarOptions {
    readonly prefix?: VarPrefix;
    readonly tokenPrefix?: string;
}

/** What a web registry adds to a neutral one's options. */
export interface WebOptions {
    /** The attribute the target scopes named themes with, as its stylesheet matches it:
     *  `data-panda-theme` for Panda, the `themeAttribute` option (default `data-theme`) for the
     *  CSS and Tailwind targets. */
    themeAttribute?: string;
    /** How the target names its CSS vars, for providers that write token overrides and runtime
     *  themes. */
    vars?: VarOptions;
}

/** What `createWebRegistry` takes besides the entries. */
export interface WebRegistryOptions extends RegistryOptions, WebOptions {}

export interface WebRegistry<
    E extends RegistryInput = RegistryInput,
> extends Registry<E> {
    /** The attribute the target scopes named themes with, when it has one. */
    readonly themeAttribute: string | undefined;
    /** The attributes that apply a named theme to an element and everything under it, the way
     *  the target's stylesheet scopes it: `{ "data-theme": "teal" }` on the CSS target. Empty for
     *  no name (the base theme) and without a theme attribute. Providers write them on their
     *  element; an app can spread them on any element. */
    themeAttributes(name: string | undefined): ThemeAttributes;
    /** How the target names its CSS vars. Empty when the registry recorded none. */
    readonly vars: VarOptions;
}

/** Any web registry, whatever its entries. */
export type AnyWebRegistry = WebRegistry<any>;

const NO_ATTRIBUTES: ThemeAttributes = Object.freeze({});
const NO_VARS: VarOptions = Object.freeze({});

/** A neutral registry with the target's web options: the same entries, the same objects, and the
 *  same lazy loads. */
export const webRegistry = <E extends RegistryInput>(
    registry: Registry<E>,
    options: WebOptions = {},
): WebRegistry<E> => {
    const { themeAttribute } = options;
    return Object.freeze({
        version: registry.version,
        names: registry.names,
        has: registry.has.bind(registry),
        entry: registry.entry.bind(registry),
        preload: registry.preload.bind(registry),
        themeAttribute,
        themeAttributes: (name: string | undefined): ThemeAttributes =>
            themeAttribute && name
                ? Object.freeze({ [themeAttribute]: name })
                : NO_ATTRIBUTES,
        vars: options.vars ? Object.freeze({ ...options.vars }) : NO_VARS,
    });
};

/** A web target's registry of factories by name: `createWebRegistry({ button, card: { lazy: () =>
 *  import("./web/card") } }, { version, themeAttribute: "data-theme", vars: { prefix: "pf" } })`.
 *  Entries are typed and served as `createRegistry`'s. */
export const createWebRegistry = <const E extends RegistryInput>(
    input: E,
    options: WebRegistryOptions = {},
): WebRegistry<E> => webRegistry(createRegistry(input, options), options);
