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
    Condition,
    ConditionalNode,
    ContainerBreakpointCondition,
    DynamicNode,
    SlotCondition,
    SlotState,
    StyleMap,
    ValueNode,
    ViewportBreakpointCondition,
} from "./ast";
import {
    alias as rawAlias,
    containerBreakpoint,
    dynamic as rawDynamic,
    slot as rawSlot,
    viewportBreakpoint,
    when as rawWhen,
} from "./ast/helpers";
import { defineComponent, defineSlotComponent } from "./define";
import type {
    ComponentSpec,
    IndicationDeclaration,
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

// The alias roots, by how many names follow them.
type NestedRoot = "tokens" | "semanticTokens" | "components";
type FlatRoot = "fonts" | "durations" | "easings" | "zIndices" | "textStyles";

/** The alias roots the config has. */
export type AliasRoot<C> = Extract<NestedRoot | FlatRoot, Keys<C>>;

/** The names that can follow an alias root. */
export type AliasSecond<C, A> = A extends string ? Keys<Field<C, A>> : never;

/** The names that can follow an alias root and a second name: a token under a tier, or a
 *  component's token. Flat roots take none. */
export type AliasThird<C, A, B> = A extends "components"
    ? B extends string
        ? Keys<
              Field<C, "components">[B & keyof Field<C, "components">] extends {
                  tokens?: infer K;
              }
                  ? NonNullable<K>
                  : never
          >
        : never
    : A extends NestedRoot
      ? B extends string
          ? Keys<Field<C, A>[B & keyof Field<C, A>]>
          : never
      : never;

/** A reference into the config. Each name is its own type parameter, inferred from the ones
 *  before it, so an editor narrows each name's suggestions by the names already written. */
export type AliasFn<C> = <
    const A extends AliasRoot<C>,
    const B extends AliasSecond<C, A>,
    const Z extends AliasThird<C, A, B>,
>(
    root: A,
    name: B,
    ...rest: A extends NestedRoot ? [token: Z] : []
) => AliasNode;

/** The tiers a runtime override var lives in. */
export type DynamicTier = "ui" | "components" | "global";

// A config with no components leaves component names open.
type ComponentsOf<C> = [Field<C, "components">] extends [never]
    ? Record<string, { tokens?: Record<string, unknown> }>
    : Field<C, "components">;

/** The names that can follow a dynamic tier: a component, when the tier is `components`. */
export type DynamicSecond<C, A> = A extends "components"
    ? Keys<ComponentsOf<C>>
    : string;

/** The component token names that can follow `components` and a component. */
export type DynamicThird<C, A, B> = A extends "components"
    ? B extends string
        ? Keys<
              ComponentsOf<C>[B & keyof ComponentsOf<C>] extends {
                  tokens?: infer K;
              }
                  ? NonNullable<K>
                  : never
          >
        : never
    : string;

/** A runtime override var, by tier and names, with an optional fallback. Under
 *  `components`, the component and token narrow to the config's, like `alias`. */
export type DynamicFn<C> = <
    const A extends DynamicTier,
    const B extends DynamicSecond<C, A>,
    const Z extends DynamicThird<C, A, B>,
>(
    path: A extends "components"
        ? readonly [tier: A, component: B, token: Z]
        : readonly [tier: A, name: B, ...rest: string[]],
    fallback?: ValueNode,
) => DynamicNode;

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

type InRange<C> = { from?: BreakpointName<C>; until?: BreakpointName<C> };

/** A viewport range at the config's breakpoints. */
export type TypedViewportCondition<C> = ViewportBreakpointCondition &
    InRange<C>;

/** A container range at the config's breakpoints. */
export type TypedContainerCondition<C> = ContainerBreakpointCondition &
    InRange<C>;

/** A condition whose breakpoints, if any, are the config's. */
export type TypedCondition<C> =
    | Exclude<
          Condition,
          ViewportBreakpointCondition | ContainerBreakpointCondition
      >
    | TypedViewportCondition<C>
    | TypedContainerCondition<C>;

/** `when`, with breakpoint conditions checked against the config. */
export interface TypedWhen<C> {
    (): TypedConditionalBuilder<C>;
    (
        conditions: TypedCondition<C> | TypedCondition<C>[],
        value: ValueNode,
        base: ValueNode,
    ): ConditionalNode;
}

export interface TypedConditionalBuilder<C> {
    /** Add a case. `conditions` is one condition or an AND-list. Chainable. */
    on(
        conditions: TypedCondition<C> | TypedCondition<C>[],
        value: ValueNode,
    ): TypedConditionalBuilder<C>;
    /** Supply the fallback and finish. */
    else(base: ValueNode): ConditionalNode;
}

/** Variant groups, each listing its values. */
type VariantValues = Record<string, readonly string[]>;
type Choice<V extends VariantValues> = { [G in keyof V]?: V[G][number] };
type Variants<V extends VariantValues, Style> = {
    [G in keyof V]?: { [Value in V[G][number]]?: Style };
};

/** A style whose `tokens` set the component's own tokens, by name. */
export type TypedStyle<T extends string> = Omit<
    StyleMap,
    "tokens" | "states"
> & {
    /** Values for the component's own tokens where this style applies. */
    tokens?: { [K in T]?: ValueNode };
    states?: {
        [C in keyof NonNullable<StyleMap["states"]>]?: TypedStyle<T>;
    };
};

/** The helpers a typed recipe receives. */
export interface RecipeHelpers<C, T extends string> {
    /** A reference into the config. */
    alias: AliasFn<C>;
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
    N extends string,
    T extends Record<string, Token<ValueNode>>,
    V extends VariantValues,
    R,
> {
    name: N;
    $meta?: Metadata;
    /** Where it shows indication, its one slot being `root`. */
    indication?: IndicationDeclaration<"root">[];
    tokens?: T;
    /** The variant groups and their values. Each value gets an entry, empty unless the
     *  recipe styles it. */
    variants?: V;
    recipe: (helpers: RecipeHelpers<C, Keys<T>>) => R;
}

/** A typed component's name and token names, kept in its type so a config holding it offers
 *  `alias("components", name, token)`, and its variant values, by group, for an adapter's
 *  runtime to type its selections by. The variants exist in the type only. */
export type Named<N extends string, T, V = {}> = {
    name: N;
    tokens?: T;
    readonly $variants?: {
        -readonly [G in keyof V]: V[G] extends readonly string[]
            ? V[G][number]
            : string;
    };
};

/** A typed slot component's slots, kept in its type. */
export type Slotted<S extends string> = { slots: S[] };

/** What a single-slot recipe returns. */
type Recipe<V extends VariantValues, T extends string> = {
    base: TypedStyle<T>;
    variants?: Variants<V, TypedStyle<T>>;
    compoundVariants?: { match: Choice<V>; style: TypedStyle<T> }[];
    defaultVariants?: Choice<V>;
};

interface TypedSlotComponentSpec<
    C,
    N extends string,
    S extends string,
    T extends Record<string, Token<ValueNode>>,
    V extends VariantValues,
    R,
> {
    name: N;
    $meta?: Metadata;
    slots: S[];
    /** How the slots nest; keys and children must be declared slots. */
    structure?: { [K in NoInfer<S>]?: NoInfer<S>[] };
    /** Where it shows indication, one entry per interactive surface, naming declared slots. */
    indication?: IndicationDeclaration<NoInfer<S>>[];
    tokens?: T;
    /** The variant groups and their values. Each value gets an entry, empty unless the
     *  recipe styles it. */
    variants?: V;
    recipe: (helpers: SlotRecipeHelpers<C, Keys<T>, NoInfer<S>>) => R;
}

/** What a slot recipe returns, styles keyed by slot. */
type SlotRecipe<S extends string, V extends VariantValues, T extends string> = {
    base: { [K in S]?: TypedStyle<T> };
    variants?: Variants<V, { [K in S]?: TypedStyle<T> }>;
    compoundVariants?: {
        match: Choice<V>;
        style: { [K in S]?: TypedStyle<T> };
    }[];
    defaultVariants?: Choice<V>;
};

// A style with its own tokens' names made into paths under the component, through its states
// and raw rules.
const qualify = (style: StyleMap, component: string): StyleMap => {
    const { tokens, states, rawRules } = style;
    if (!tokens && !states && !rawRules) return style;
    const out: StyleMap = { ...style };
    if (tokens) {
        out.tokens = Object.fromEntries(
            Object.entries(tokens).map(([name, value]) => [
                ["components", component, name].join("."),
                value,
            ]),
        );
    }
    if (states) {
        out.states = Object.fromEntries(
            Object.entries(states).map(([condition, sub]) => [
                condition,
                sub && qualify(sub, component),
            ]),
        );
    }
    if (rawRules) {
        out.rawRules = Object.fromEntries(
            Object.entries(rawRules).map(([target, rules]) => [
                target,
                Object.fromEntries(
                    Object.entries(rules).map(([selector, sub]) => [
                        selector,
                        qualify(sub, component),
                    ]),
                ),
            ]),
        );
    }
    return out;
};

// Whether a style sets tokens anywhere, through its states and raw rules.
const setsTokens = (style: StyleMap | undefined): boolean =>
    !!style &&
    (!!style.tokens ||
        Object.values(style.states ?? {}).some(setsTokens) ||
        Object.values(style.rawRules ?? {}).some((rules) =>
            Object.values(rules).some(setsTokens),
        ));

// Each slot's style qualified, after checking only root slots set tokens: React Native resolves
// a component at once, so a token set lower down couldn't stay in that slot's subtree as it
// does on the web.
const qualifySlots = (
    bySlot: Record<string, StyleMap | undefined>,
    component: string,
    nested: ReadonlySet<string>,
): Record<string, StyleMap> =>
    Object.fromEntries(
        Object.entries(bySlot).flatMap(([slot, style]) => {
            if (!style) return [];
            if (nested.has(slot) && setsTokens(style)) {
                throw new Error(
                    `${component}: slot "${slot}" sets tokens, which only a root slot can`,
                );
            }
            return [[slot, qualify(style, component)]];
        }),
    );

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

// Each variant value's style mapped through `fn`.
const mapVariants = <In, Out>(
    variants: object | undefined,
    fn: (style: In) => Out,
): Record<string, Record<string, Out>> | undefined =>
    variants &&
    Object.fromEntries(
        Object.entries(
            variants as Record<string, Record<string, In> | undefined>,
        ).map(([group, values]) => [
            group,
            Object.fromEntries(
                Object.entries(values ?? {}).map(([value, style]) => [
                    value,
                    fn(style),
                ]),
            ),
        ]),
    );

const definedOnly = <T extends object>(object: T): T =>
    Object.fromEntries(
        Object.entries(object).filter(([, value]) => value !== undefined),
    ) as T;

/** Typed authoring helpers for a config. Pass the config (or the part of it that holds the
 *  names you reference: tokens, utilities, breakpoints, components), or nothing to use the
 *  registered one. */
export const typed = <C extends Vocabulary = RegisteredConfig>(_config?: C) => {
    const alias: AliasFn<C> = (...path: string[]) => rawAlias(...path);

    return {
        /** A reference into the config: each segment autocompletes from the one before. */
        alias,

        /** A runtime override var: `components` paths name a component and its token. */
        dynamic: ((path: readonly string[], fallback?: ValueNode) =>
            rawDynamic([...path], fallback)) as DynamicFn<C>,

        /** A conditional value, its breakpoint conditions checked against the config. */
        when: rawWhen as TypedWhen<C>,

        /** A text style, for `textStyle`. */
        textStyle: (name: Keys<Field<C, "textStyles">>): AliasNode =>
            rawAlias("textStyles", name as string),

        /** Utilities to apply, by name, each with a value it accepts. */
        apply: (map: ApplyMap<C>): NonNullable<StyleMap["apply"]> =>
            map as NonNullable<StyleMap["apply"]>,

        /** A viewport range at the config's breakpoints. */
        viewport: (range: BreakpointRange<C>): TypedViewportCondition<C> =>
            viewportBreakpoint(range as RawRange) as TypedViewportCondition<C>,

        /** A container range at the config's breakpoints, optionally of a named container. */
        container: (
            range: BreakpointRange<C>,
            name?: string,
        ): TypedContainerCondition<C> =>
            containerBreakpoint(
                range as RawRange,
                name,
            ) as TypedContainerCondition<C>,

        /** A single-slot component whose recipe receives typed `alias` and `token` helpers,
         *  with its variant groups and values checked. */
        component: <
            const N extends string,
            const T extends Record<string, Token<ValueNode>> = {},
            const V extends VariantValues = {},
            R extends Recipe<NoInfer<V>, Keys<NoInfer<T>>> = Recipe<V, Keys<T>>,
        >(
            spec: TypedComponentSpec<C, N, T, V, R>,
        ): ComponentSpec & Named<N, T, V> => {
            const recipe = spec.recipe({
                alias,
                token: (name) => rawAlias("components", spec.name, name),
            });
            const own = (style: TypedStyle<Keys<T>>) =>
                qualify(style as StyleMap, spec.name);
            return defineComponent(
                definedOnly({
                    name: spec.name,
                    $meta: spec.$meta,
                    indication: spec.indication,
                    tokens: spec.tokens,
                    recipe: definedOnly({
                        base: own(recipe.base),
                        variants: fillVariants<StyleMap>(
                            spec.variants,
                            mapVariants(recipe.variants, own),
                            () => ({}),
                        ),
                        compoundVariants: recipe.compoundVariants?.map(
                            (compound) => ({
                                match: compound.match as Record<string, string>,
                                style: own(compound.style),
                            }),
                        ),
                        defaultVariants: recipe.defaultVariants as
                            | Record<string, string>
                            | undefined,
                    }),
                }) as Omit<ComponentSpec, "kind">,
            ) as ComponentSpec & Named<N, T, V>;
        },

        /** A slot component whose recipe receives typed `slot`, `alias`, and `token` helpers,
         *  with its slots and variant groups and values checked. */
        slotComponent: <
            const N extends string,
            const S extends string,
            const T extends Record<string, Token<ValueNode>> = {},
            const V extends VariantValues = {},
            R extends SlotRecipe<NoInfer<S>, NoInfer<V>, Keys<NoInfer<T>>> =
                SlotRecipe<S, V, Keys<T>>,
        >(
            spec: TypedSlotComponentSpec<C, N, S, T, V, R>,
        ): Omit<SlottedComponentSpec, "slots"> &
            Named<N, T, V> &
            Slotted<S> => {
            const recipe = spec.recipe({
                alias,
                token: (name) => rawAlias("components", spec.name, name),
                slot: (name, state) => rawSlot(name, state),
            });
            type Slots = Record<string, StyleMap>;
            const nested = new Set<string>(
                Object.values<string[] | undefined>(
                    spec.structure ?? {},
                ).flatMap((children) => children ?? []),
            );
            const own = (bySlot: object) =>
                qualifySlots(bySlot as Slots, spec.name, nested);
            return defineSlotComponent(
                definedOnly({
                    name: spec.name,
                    $meta: spec.$meta,
                    indication: spec.indication,
                    tokens: spec.tokens,
                    slots: spec.slots,
                    structure: spec.structure,
                    recipe: definedOnly({
                        base: own(recipe.base),
                        variants: fillVariants<Slots>(
                            spec.variants,
                            mapVariants(recipe.variants, own),
                            () => ({ [spec.slots[0]!]: {} }),
                        ),
                        compoundVariants: recipe.compoundVariants?.map(
                            (compound) => ({
                                match: compound.match as Record<string, string>,
                                style: own(compound.style),
                            }),
                        ),
                        defaultVariants: recipe.defaultVariants as
                            | Record<string, string>
                            | undefined,
                    }),
                }) as Parameters<typeof defineSlotComponent>[0],
            ) as Omit<SlottedComponentSpec, "slots"> &
                Named<N, T, V> &
                Slotted<S>;
        },
    };
};
