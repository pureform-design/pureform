// Runtime themes: themes generated while the app runs (from a seed color, or from loaded data)
// rather than compiled into the stylesheet. A theme is its generator and the generator's input.
// The scope a provider writes it under is a hash of the two, so the server and the client agree
// on it without loading or running the generator.

import type { VarOptions } from "./registry";

/** Plain data a generator takes. It's hashed to name the theme's scope, so keep it JSON. */
export type ThemeInput =
    | string
    | number
    | boolean
    | null
    | readonly ThemeInput[]
    | { readonly [key: string]: ThemeInput | undefined };

/** CSS vars by name: `{ "--colors-primary": "oklch(…)" }`. */
export type CssVars = Readonly<Record<`--${string}`, string>>;

/** A theme's vars by color scheme: `light` applies in both, and `dark` holds the ones that
 *  differ in the dark scheme. */
export interface ThemeSchemeVars {
    readonly light: CssVars;
    readonly dark?: CssVars | undefined;
}

/** Turns a theme's input into its vars, named the way the target names them. It must be pure:
 *  the server and the client run it apart and must agree. */
export type ThemeGenerator<I extends ThemeInput = ThemeInput> = (
    input: I,
    vars: VarOptions,
) => ThemeSchemeVars;

/** A generator, loaded on demand and shared by every theme made from it. */
export interface ThemeSource<I extends ThemeInput = ThemeInput> {
    /** Names the generator in the theme's hash and in messages: `"material-seed"`. */
    readonly name: string;
    /** The generator once loaded, else `undefined`. */
    readonly loaded: ThemeGenerator<I> | undefined;
    /** Loads the generator. Every call returns the same promise until it settles; a failed
     *  load is tried again on the next call. */
    load(): Promise<ThemeGenerator<I>>;
}

/** A theme generated at run time: a source and its input. Pass it as a provider's `theme`. */
export interface RuntimeTheme<I extends ThemeInput = ThemeInput> {
    readonly source: ThemeSource<I>;
    readonly input: I;
}

/** Any runtime theme, whatever its input. */
export type AnyRuntimeTheme = RuntimeTheme<any>;

type Loaded<I extends ThemeInput> =
    | ThemeGenerator<I>
    | { readonly default: ThemeGenerator<I> };

/** Declares a kind of runtime theme: `defineRuntimeTheme("material-seed", () =>
 *  import("./generate"))` returns a function from an input to a theme. The loader's module gives
 *  the generator as itself or its default export, and only loads when a theme needs
 *  generating, so apps that never generate one don't ship the generator. */
export const defineRuntimeTheme = <I extends ThemeInput>(
    name: string,
    load: () => Loaded<I> | Promise<Loaded<I>>,
): ((input: I) => RuntimeTheme<I>) => {
    let loaded: ThemeGenerator<I> | undefined;
    let pending: Promise<ThemeGenerator<I>> | undefined;
    const source: ThemeSource<I> = Object.freeze({
        name,
        get loaded() {
            return loaded;
        },
        load: () =>
            (pending ??= Promise.resolve()
                .then(load)
                .then(
                    (module) =>
                        (loaded =
                            typeof module === "function"
                                ? module
                                : module.default),
                    (error: unknown) => {
                        pending = undefined;
                        throw error;
                    },
                )),
    });
    return (input) => Object.freeze({ source, input });
};

/** Whether a provider's `theme` is a runtime theme rather than a named one. */
export const isRuntimeTheme = (theme: unknown): theme is AnyRuntimeTheme =>
    typeof theme === "object" &&
    theme !== null &&
    "source" in theme &&
    "input" in theme;

/** Loads a runtime theme's generator. A server renders a runtime theme only once its generator
 *  is loaded, so await this before rendering; on the client it starts the load early. Never
 *  rejects: a failed load shows when the provider loads it itself. */
export const preloadTheme = (theme: AnyRuntimeTheme): Promise<void> =>
    theme.source.load().then(
        () => undefined,
        () => undefined,
    );

// Keys sorted, `undefined` left out, so equal inputs serialize the same.
const stable = (value: ThemeInput | undefined): string => {
    if (value === null || typeof value !== "object") {
        return JSON.stringify(value) ?? "null";
    }
    if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
    const record = value as { readonly [key: string]: ThemeInput | undefined };
    return `{${Object.keys(record)
        .filter((key) => record[key] !== undefined)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${stable(record[key])}`)
        .join(",")}}`;
};

// cyrb53: a fast 53-bit string hash, plenty to tell themes apart.
const hash53 = (text: string): number => {
    let h1 = 0xdeadbeef;
    let h2 = 0x41c6ce57;
    for (let i = 0; i < text.length; i++) {
        const c = text.charCodeAt(i);
        h1 = Math.imul(h1 ^ c, 2654435761);
        h2 = Math.imul(h2 ^ c, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};

/** The name a runtime theme is scoped by, `pf-<hash>` of its source's name and its input: the
 *  value of the target's theme attribute, `[data-theme="pf-1x2y3z"]`. Equal inputs give equal
 *  names, so two providers with the same theme share one block. */
export const themeScope = (theme: AnyRuntimeTheme): string =>
    `pf-${hash53(`${theme.source.name}\u0000${stable(theme.input)}`).toString(36)}`;
