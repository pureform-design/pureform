// Typed authoring: helpers bound to a config's vocabulary, so references into it autocomplete
// and a typo is a type error instead of a runtime one.
//
//   const pf = typed(base);                      // bound to `base`
//   pf.alias("tokens", "colors", "violet600");   // each segment autocompletes
//
// Or register the project's config once and call `typed()` with no argument:
//
//   declare module "@pureform/core" {
//       interface Register { config: typeof base }
//   }
//
// The helpers build the same nodes and specs as the untyped API (`alias`, `slot`,
// `defineSlotComponent`), so typed and untyped output mix freely, and `defineConfig` still
// validates everything at runtime.

import type {
    AliasNode,
    ContainerBreakpointCondition,
    SlotCondition,
    SlotState,
    StyleMap,
    ValueNode,
    ViewportBreakpointCondition,
} from "./ast";
import {
    alias as rawAlias,
    containerBreakpoint,
    slot as rawSlot,
    viewportBreakpoint,
} from "./ast/helpers";
import { defineComponent, defineSlotComponent } from "./define";
import type {
    ComponentSpec,
    Metadata,
    SlottedComponentSpec,
    Token,
} from "./types";

/** Register the project's config to type `typed()` with no argument:
 *  `declare module "@pureform/core" { interface Register { config: typeof config } }`. */
export interface Register {}

/** The registered config, or an open vocabulary when none is registered. */
export type RegisteredConfig = Register extends { config: infer C } ? C : Open;

/** An open vocabulary: every name is a string. */
type Open = {
    tokens: Record<string, Record<string, unknown>>;
    semanticTokens: Record<string, Record<string, unknown>>;
    fonts: Record<string, unknown>;
    durations: Record<string, unknown>;
    easings: Record<string, unknown>;
    zIndices: Record<string, unknown>;
    textStyles: Record<string, unknown>;
    breakpoints: Record<string, unknown>;
    utilities: Record<string, unknown>;
    components: Record<string, { tokens?: Record<string, unknown> }>;
};

/** The parts of a config that references point into. Any config, or part of one, fits. */
export type Vocabulary = { [K in keyof Open]?: unknown };

// The names a type declares. Where it also has an index signature, as a typed config does
// when it extends `CoreConfig`, the declared names win, so they autocomplete; a type with
// only an index signature gives `string`.
type KnownKeys<T> = keyof {
    [K in keyof T as string extends K ? never : K]: 0;
};
type Keys<T> = Extract<
    T extends object
        ? [Extract<KnownKeys<T>, string>] extends [never]
            ? keyof T
            : KnownKeys<T>
        : never,
    string
>;
type Field<C, K extends string> = C extends { [P in K]?: infer V }
    ? NonNullable<V>
    : never;

type OneLevel<R extends string, T> = { [A in Keys<T>]: [R, A] }[Keys<T>];
type TwoLevel<R extends string, T> = {
    [A in Keys<T>]: { [B in Keys<T[A]>]: [R, A, B] }[Keys<T[A]>];
}[Keys<T>];
type ComponentPaths<T> = {
    [N in Keys<T>]: [
        "components",
        N,
        Keys<T[N] extends { tokens?: infer K } ? NonNullable<K> : never>,
    ];
}[Keys<T>];

/** Every path an `alias` can take into the config, as a tuple: tokens and semantic tokens by
 *  category and name, the single-level tiers by name, and component tokens by component and
 *  name. */
export type AliasPath<C> =
    | TwoLevel<"tokens", Field<C, "tokens">>
    | TwoLevel<"semanticTokens", Field<C, "semanticTokens">>
    | OneLevel<"fonts", Field<C, "fonts">>
    | OneLevel<"durations", Field<C, "durations">>
    | OneLevel<"easings", Field<C, "easings">>
    | OneLevel<"zIndices", Field<C, "zIndices">>
    | OneLevel<"textStyles", Field<C, "textStyles">>
    | ComponentPaths<Field<C, "components">>;

/** A breakpoint name in the config. */
export type BreakpointName<C> = Keys<Field<C, "breakpoints">>;

/** What `apply` takes for each utility: a static utility's step names, or what a dynamic
 *  utility accepts. */
export type ApplyMap<C> = {
    [U in Keys<Field<C, "utilities">>]?: Field<C, "utilities">[U] extends {
        kind: "static";
        values: infer V;
    }
        ? Keys<V>
        : string | ValueNode | Record<string, ValueNode> | ValueNode[];
};

// What the untyped breakpoint conditions take.
type RawRange = string | { from?: string; until?: string };

type BreakpointRange<C> =
    | BreakpointName<C>
    | { from?: BreakpointName<C>; until?: BreakpointName<C> };

/** Variant groups, each listing its values. */
type VariantValues = Record<string, readonly string[]>;
type Choice<V extends VariantValues> = { [G in keyof V]?: V[G][number] };
type Variants<V extends VariantValues, Style> = {
    [G in keyof V]?: { [Value in V[G][number]]?: Style };
};

/** The helpers a typed recipe receives. */
export interface RecipeHelpers<C, T extends string> {
    /** A reference into the config. */
    alias: <const P extends AliasPath<C>>(...path: P) => AliasNode;
    /** One of this component's own tokens. */
    token: (name: T) => AliasNode;
}

/** The helpers a typed slot recipe receives. */
export interface SlotRecipeHelpers<
    C,
    T extends string,
    S extends string,
> extends RecipeHelpers<C, T> {
    /** A state of a slot, which must be an ancestor in `structure`. */
    slot: (name: S, state: SlotState) => SlotCondition;
}

interface TypedComponentSpec<
    C,
    T extends Record<string, Token<ValueNode>>,
    V extends VariantValues,
    R,
> {
    name: string;
    $meta?: Metadata;
    tokens?: T;
    /** The variant groups and their values. Each value gets an entry, empty unless the
     *  recipe styles it. */
    variants?: V;
    recipe: (helpers: RecipeHelpers<C, Keys<T>>) => R;
}

/** What a single-slot recipe returns. */
type Recipe<V extends VariantValues> = {
    base: StyleMap;
    variants?: Variants<V, StyleMap>;
    compoundVariants?: { match: Choice<V>; style: StyleMap }[];
    defaultVariants?: Choice<V>;
};

interface TypedSlotComponentSpec<
    C,
    S extends string,
    T extends Record<string, Token<ValueNode>>,
    V extends VariantValues,
    R,
> {
    name: string;
    $meta?: Metadata;
    slots: S[];
    /** How the slots nest; keys and children must be declared slots. */
    structure?: { [K in NoInfer<S>]?: NoInfer<S>[] };
    tokens?: T;
    /** The variant groups and their values. Each value gets an entry, empty unless the
     *  recipe styles it. */
    variants?: V;
    recipe: (helpers: SlotRecipeHelpers<C, Keys<T>, NoInfer<S>>) => R;
}

/** What a slot recipe returns, styles keyed by slot. */
type SlotRecipe<S extends string, V extends VariantValues> = {
    base: { [K in S]?: StyleMap };
    variants?: Variants<V, { [K in S]?: StyleMap }>;
    compoundVariants?: {
        match: Choice<V>;
        style: { [K in S]?: StyleMap };
    }[];
    defaultVariants?: Choice<V>;
};

// Every declared variant value gets an entry, so a value the recipe leaves unstyled still
// exists for compound variants and defaults to match.
const fillVariants = <Style>(
    declared: VariantValues | undefined,
    styled: Record<string, Record<string, Style> | undefined> | undefined,
    empty: () => Style,
): Record<string, Record<string, Style>> | undefined => {
    if (!declared && !styled) return undefined;
    const out: Record<string, Record<string, Style>> = {};
    for (const [group, values] of Object.entries(declared ?? {})) {
        out[group] = Object.fromEntries(
            values.map((value) => [value, styled?.[group]?.[value] ?? empty()]),
        );
    }
    for (const [group, values] of Object.entries(styled ?? {})) {
        out[group] = { ...values, ...out[group] } as Record<string, Style>;
    }
    return out;
};

const definedOnly = <T extends object>(object: T): T =>
    Object.fromEntries(
        Object.entries(object).filter(([, value]) => value !== undefined),
    ) as T;

/** Typed authoring helpers for a config. Pass the config (or the part of it that holds the
 *  names you reference: tokens, utilities, breakpoints, components), or nothing to use the
 *  registered one. */
export const typed = <C extends Vocabulary = RegisteredConfig>(_config?: C) => {
    const alias = <const P extends AliasPath<C>>(...path: P): AliasNode =>
        rawAlias(...(path as unknown as string[]));

    return {
        /** A reference into the config: each segment autocompletes from the one before. */
        alias,

        /** A text style, for `textStyle`. */
        textStyle: (name: Keys<Field<C, "textStyles">>): AliasNode =>
            rawAlias("textStyles", name as string),

        /** Utilities to apply, by name, each with a value it accepts. */
        apply: (map: ApplyMap<C>): NonNullable<StyleMap["apply"]> =>
            map as NonNullable<StyleMap["apply"]>,

        /** A viewport range at the config's breakpoints. */
        viewport: (range: BreakpointRange<C>): ViewportBreakpointCondition =>
            viewportBreakpoint(range as RawRange),

        /** A container range at the config's breakpoints, optionally of a named container. */
        container: (
            range: BreakpointRange<C>,
            name?: string,
        ): ContainerBreakpointCondition =>
            containerBreakpoint(range as RawRange, name),

        /** A single-slot component whose recipe receives typed `alias` and `token` helpers,
         *  with its variant groups and values checked. */
        component: <
            const T extends Record<string, Token<ValueNode>> = {},
            const V extends VariantValues = {},
            R extends Recipe<NoInfer<V>> = Recipe<V>,
        >(
            spec: TypedComponentSpec<C, T, V, R>,
        ): ComponentSpec => {
            const recipe = spec.recipe({
                alias,
                token: (name) => rawAlias("components", spec.name, name),
            });
            return defineComponent(
                definedOnly({
                    name: spec.name,
                    $meta: spec.$meta,
                    tokens: spec.tokens,
                    recipe: definedOnly({
                        base: recipe.base,
                        variants: fillVariants<StyleMap>(
                            spec.variants,
                            recipe.variants as Record<
                                string,
                                Record<string, StyleMap>
                            >,
                            () => ({}),
                        ),
                        compoundVariants: recipe.compoundVariants as
                            | {
                                  match: Record<string, string>;
                                  style: StyleMap;
                              }[]
                            | undefined,
                        defaultVariants: recipe.defaultVariants as
                            | Record<string, string>
                            | undefined,
                    }),
                }) as Omit<ComponentSpec, "kind">,
            );
        },

        /** A slot component whose recipe receives typed `slot`, `alias`, and `token` helpers,
         *  with its slots and variant groups and values checked. */
        slotComponent: <
            const S extends string,
            const T extends Record<string, Token<ValueNode>> = {},
            const V extends VariantValues = {},
            R extends SlotRecipe<NoInfer<S>, NoInfer<V>> = SlotRecipe<S, V>,
        >(
            spec: TypedSlotComponentSpec<C, S, T, V, R>,
        ): SlottedComponentSpec => {
            const recipe = spec.recipe({
                alias,
                token: (name) => rawAlias("components", spec.name, name),
                slot: (name, state) => rawSlot(name, state),
            });
            type Slots = Record<string, StyleMap>;
            return defineSlotComponent(
                definedOnly({
                    name: spec.name,
                    $meta: spec.$meta,
                    tokens: spec.tokens,
                    slots: spec.slots,
                    structure: spec.structure,
                    recipe: definedOnly({
                        base: recipe.base as Slots,
                        variants: fillVariants<Slots>(
                            spec.variants,
                            recipe.variants as Record<
                                string,
                                Record<string, Slots>
                            >,
                            () => ({ [spec.slots[0]!]: {} }),
                        ),
                        compoundVariants: recipe.compoundVariants as
                            | { match: Record<string, string>; style: Slots }[]
                            | undefined,
                        defaultVariants: recipe.defaultVariants as
                            | Record<string, string>
                            | undefined,
                    }),
                }) as Parameters<typeof defineSlotComponent>[0],
            );
        },
    };
};
