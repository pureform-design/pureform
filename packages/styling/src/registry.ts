// The registry: each component's factory by name, static or loaded on demand. An entry's kind is
// fixed when the registry is created, so the server and the client take the same path.

import type { VarPrefix } from "@pureform/css-lowering";

/** Any factory: a function of a selection. */
export type AnyFactory = (selection: never) => unknown;

/** A lazy entry's input: a loader for the module holding the factory. */
export interface LazyInput<M = unknown> {
    lazy: () => Promise<M>;
}

/** What `createRegistry` takes: each name's factory, or a loader for it. */
export type RegistryInput = Record<string, AnyFactory | LazyInput>;

/** An entry whose factory is there from the start. */
export interface StaticEntry<F extends AnyFactory = AnyFactory> {
    readonly kind: "static";
    readonly name: string;
    readonly factory: F;
}

/** An entry whose factory loads on demand. */
export interface LazyEntry<F extends AnyFactory = AnyFactory> {
    readonly kind: "lazy";
    readonly name: string;
    /** Load the factory. Every call returns the same promise until it settles, and after it
     *  resolves; a failed load is tried again on the next call. */
    load(): Promise<F>;
}

export type RegistryEntry<F extends AnyFactory = AnyFactory> =
    | StaticEntry<F>
    | LazyEntry<F>;

// The factory a loaded module holds: the module itself, its default export, or its export
// named after the entry.
type LoadedFactory<M, N> = M extends AnyFactory
    ? M
    : M extends { default: infer D extends AnyFactory }
      ? D
      : N extends keyof M
        ? M[N] extends AnyFactory
            ? M[N]
            : AnyFactory
        : AnyFactory;

/** The factory an input entry gives. */
export type FactoryOf<E extends RegistryInput, N extends keyof E> =
    E[N] extends LazyInput<infer M>
        ? LoadedFactory<M, N>
        : E[N] extends AnyFactory
          ? E[N]
          : never;

/** The entry `entry(name)` returns for an input entry. */
export type EntryOf<
    E extends RegistryInput,
    N extends keyof E,
> = E[N] extends LazyInput
    ? LazyEntry<FactoryOf<E, N>>
    : StaticEntry<FactoryOf<E, N>>;

/** The names of an input's static entries. */
export type StaticEntryName<E extends RegistryInput> = {
    [N in keyof E & string]: E[N] extends LazyInput ? never : N;
}[keyof E & string];

/** The names of an input's lazy entries. */
export type LazyEntryName<E extends RegistryInput> = Exclude<
    keyof E & string,
    StaticEntryName<E>
>;

/** The attributes that put an element and everything under it in a named theme: `{
 *  "data-theme": "teal" }`. Empty for the base theme, and on targets without selectors. */
export type ThemeAttributes = Readonly<Record<string, string>>;

/** How the target names its CSS vars, as its stylesheet was compiled: the component var prefix
 *  (`"pf"` gives `--pf-components-button-container`) and the token var prefix (`"pf"` gives
 *  `--pf-colors-primary`). Both default to none. */
export interface VarOptions {
    readonly prefix?: VarPrefix;
    readonly tokenPrefix?: string;
}

/** What `createRegistry` takes besides the entries. */
export interface RegistryOptions {
    /** The core's version the generated registry was made with. Bindings compare it with
     *  the running `@pureform/styling`'s `VERSION` in development. */
    version?: string;
    /** The attribute the target scopes named themes with, as its stylesheet matches it:
     *  `data-panda-theme` for Panda, the `themeAttribute` option (default `data-theme`) for the
     *  CSS and Tailwind targets. Left out on targets without selectors (React Native). */
    themeAttribute?: string;
    /** How the target names its CSS vars, for providers that write token overrides and runtime
     *  themes. Left out on targets without CSS vars (React Native). */
    vars?: VarOptions;
}

export interface Registry<E extends RegistryInput = RegistryInput> {
    /** The core's version the registry was made with, when it recorded one. */
    readonly version: string | undefined;
    /** The attribute the target scopes named themes with, when it has one. */
    readonly themeAttribute: string | undefined;
    /** The attributes that apply a named theme to an element and everything under it, the way
     *  the target's stylesheet scopes it: `{ "data-theme": "teal" }` on the CSS target. Empty for
     *  no name (the base theme) and on targets without one. Providers write them on their
     *  element; an app can spread them on any element. */
    themeAttributes(name: string | undefined): ThemeAttributes;
    /** How the target names its CSS vars. Empty when the registry recorded none. */
    readonly vars: VarOptions;
    /** Every entry's name, in the order given. */
    readonly names: readonly (keyof E & string)[];
    /** Whether the registry has an entry by this name. */
    has(name: string): name is keyof E & string;
    /** The entry by this name. The same object on every call. Throws for an unknown name. */
    entry<N extends keyof E & string>(name: N): EntryOf<E, N>;
    /** Start loading a lazy entry, such as from a router loader or on hover. Resolves when it's
     *  loaded, and at once for a static entry. Never rejects: a failed load shows when the
     *  component loads the entry itself. Throws for an unknown name. */
    preload(name: keyof E & string): Promise<void>;
}

const NO_ATTRIBUTES: ThemeAttributes = Object.freeze({});
const NO_VARS: VarOptions = Object.freeze({});

const isLazy = (input: AnyFactory | LazyInput): input is LazyInput =>
    typeof input === "object" && input !== null && "lazy" in input;

const factoryIn = (module: unknown, name: string): AnyFactory => {
    if (typeof module === "function") return module as AnyFactory;
    if (typeof module === "object" && module !== null) {
        const exports = module as Record<string, unknown>;
        if (typeof exports.default === "function") {
            return exports.default as AnyFactory;
        }
        if (typeof exports[name] === "function") {
            return exports[name] as AnyFactory;
        }
    }
    throw new Error(
        `pureform: the module loaded for "${name}" exports no factory as its default or as "${name}"`,
    );
};

const lazyEntry = (name: string, input: LazyInput): LazyEntry => {
    let pending: Promise<AnyFactory> | undefined;
    return Object.freeze({
        kind: "lazy" as const,
        name,
        load: () =>
            (pending ??= input.lazy().then(
                (module) => factoryIn(module, name),
                (error: unknown) => {
                    pending = undefined;
                    throw error;
                },
            )),
    });
};

/** A registry of factories by name: `createRegistry({ button, card: { lazy: () =>
 *  import("./web/card") } })`. A lazy loader's module gives its factory as the module itself,
 *  its default export, or its export named after the entry. A generated registry also passes the
 *  core's version, the target's theme attribute, and its var prefixes: `createRegistry({ button },
 *  { version, themeAttribute: "data-theme", vars: { prefix: "pf" } })`. */
export const createRegistry = <const E extends RegistryInput>(
    input: E,
    options: RegistryOptions = {},
): Registry<E> => {
    const entries = new Map<string, RegistryEntry>();
    for (const [name, value] of Object.entries(input)) {
        entries.set(
            name,
            isLazy(value)
                ? lazyEntry(name, value)
                : Object.freeze({
                      kind: "static" as const,
                      name,
                      factory: value,
                  }),
        );
    }
    const names = Object.freeze([...entries.keys()]);
    const { themeAttribute } = options;
    const themeAttributes = (name: string | undefined): ThemeAttributes =>
        themeAttribute && name
            ? Object.freeze({ [themeAttribute]: name })
            : NO_ATTRIBUTES;
    const get = (name: string): RegistryEntry => {
        const found = entries.get(name);
        if (found) return found;
        throw new Error(
            `pureform: no component "${name}" in the registry (it has ${names.length > 0 ? names.map((n) => `"${n}"`).join(", ") : "none"}). Run \`pureform generate\` or check the bundler plugin's \`components\` option.`,
        );
    };
    return Object.freeze({
        version: options.version,
        themeAttribute,
        themeAttributes,
        vars: options.vars ? Object.freeze({ ...options.vars }) : NO_VARS,
        names,
        has: (name: string): name is keyof E & string => entries.has(name),
        entry: (name: string) => get(name),
        preload: (name: string): Promise<void> => {
            const found = get(name);
            if (found.kind === "static") return Promise.resolve();
            return found.load().then(
                () => undefined,
                () => undefined,
            );
        },
    }) as unknown as Registry<E>;
};
