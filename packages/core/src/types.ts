// Core schema types: the config shape, component specs, utilities, and token metadata.
//
// `StyleMap` (the typed, per-property style map) lives in `ast/style.ts` and constrains each
// property to its valid node kinds. The token maps below stay keyed by `ValueNode`: kind
// constraints are a property-level concern (StyleMap), not a token-map one, since a token may
// hold any kind of value.

import type {
    EasingNode,
    FontFamilyNode,
    NumericScalarNode,
    ScalarNode,
    StyleMap,
    ValueNode,
} from "./ast";

/** Annotations about a token or component spec, independent of its value. Pure data,
 *  platform-agnostic. pureform core owns these names; DTCG is just one target, and a
 *  bidirectional DTCG codec maps `description`, `deprecated`, and `extensions` to and from the
 *  spec's `$description`, `$deprecated`, and `$extensions`. The AST node's own kind already
 *  encodes the token type, so there is deliberately no DTCG `$type` to carry. */
export interface Metadata {
    description?: string;
    /** `true`, or a human message or replacement hint; the adapter warns on it. */
    deprecated?: boolean | string;
    /** Foreign-tool passthrough, carried through verbatim (maps to DTCG `$extensions`), for
     *  example `{ "com.figma": { styleId } }`. pureform never interprets it. */
    extensions?: Record<string, unknown>;
    /** Per-target directives the adapter consumes when lowering (not portable, not interpreted
     *  by core). Keyed by adapter or target id; each adapter reads its own slice and ignores
     *  the rest, the spec-level analogue of the `platform()` value escape. For example
     *  `{ panda: { jsx: ["Button"], className: "btn" } }`. */
    platformHints?: Record<string, unknown>;
}

/** A value annotated with metadata. `$value` is the sentinel key that lets the resolver tell a
 *  wrapped entry apart from a bare node or a nested token group (real content keys never start
 *  with `$`), which is why it keeps the `$`. The annotations sit under `$meta` and use plain,
 *  pureform-owned names. */
export type WithMeta<T> = { $value: T; $meta?: Metadata };

/** A token entry: a bare value node (the un-annotated shorthand) or a `WithMeta` envelope.
 *  Read it through `tokenValue(...)` so consumers ignore which form it is. Widening a map to
 *  `Token<T>` is backward-compatible since a bare `T` still satisfies it. */
export type Token<T> = T | WithMeta<T>;

interface BaseComponentSpec {
    name: string;
    /** The component's token set, created here (not aliased from a central map). Entries are
     *  usually `dynamic(...)` so they compile to overridable `--components-<cmp>-*` vars; the
     *  recipe references them by path. Metadata-wrappable through `meta(...)`
     *  (`Token<ValueNode>`). */
    tokens?: Record<string, Token<ValueNode>>;
    /** Spec-level annotations (`description`, `deprecated`), plus the per-adapter emission
     *  escape through `platformHints`. The emitted class name and JSX binding are derived from
     *  `name` by default (the adapter owns casing: web/Panda produce a `className` and a `jsx`
     *  tag list; native ignores both); override only when the convention does not fit, for
     *  example
     *  `$meta: { platformHints: { panda: { jsx: ["Button", "IconButton"], className: "btn" } } }`.
     *  Keeping these in `platformHints` keeps Panda and web jargon out of core's typed style
     *  map. */
    $meta?: Metadata;
}

/** Styles applied only when several variant selections combine (lowering to Panda
 *  `compoundVariants`). `match` lists variant group to value pairs that must all hold. */
interface CompoundVariant {
    match: Record<string, string>;
    style: StyleMap;
}

/** Slot-recipe form: the combined style is keyed by slot. */
interface SlottedCompoundVariant {
    match: Record<string, string>;
    /** slot to styles. */
    style: Record<string, StyleMap>;
}

/** Single-slot (cva-style), lowering to Panda `defineRecipe`. */
export interface ComponentSpec extends BaseComponentSpec {
    kind: "component";
    recipe: {
        base: StyleMap;
        variants?: Record<string, Record<string, StyleMap>>;
        compoundVariants?: CompoundVariant[];
        defaultVariants?: Record<string, string>;
    };
}

/** Multi-slot (sva-style), lowering to Panda `defineSlotRecipe`. Slots are the portable
 *  mechanism for a component's structural parts (icon, label, indicator, a decorative layer):
 *  each slot is styled by its own `StyleMap` and the adapter targets it per platform (web: a
 *  class per slot; native: a style object per rendered element), with no selectors in core.
 *  Reach for `StyleMap.rawRules` only for elements the component does not render (arbitrary
 *  consumer children, pseudo-elements), which are irreducibly target-specific. */
export interface SlottedComponentSpec extends BaseComponentSpec {
    kind: "slotComponent";
    slots: string[];
    recipe: {
        /** slot to styles. */
        base: Record<string, StyleMap>;
        /** variant group to value to slot to styles. */
        variants?: Record<string, Record<string, Record<string, StyleMap>>>;
        compoundVariants?: SlottedCompoundVariant[];
        defaultVariants?: Record<string, string>;
    };
}

export type AnyComponentSpec = ComponentSpec | SlottedComponentSpec;

/** A named theme: a partial override of the token tiers, layered over the base config and
 *  emitted by the adapter under a `[data-theme="<name>"]` scope (base is `:root`). Themes
 *  rebind tokens; recipes (which consume tokens) need no theme-awareness. It is orthogonal to
 *  the dark/light scheme axis; a theme may still carry `conditional` dark values. */
export interface ThemeOverride {
    tokens?: Record<string, Record<string, Token<ScalarNode>>>;
    semanticTokens?: Record<string, Record<string, Token<ValueNode>>>;
    fonts?: Record<string, Token<FontFamilyNode>>;
    durations?: Record<string, Token<NumericScalarNode>>;
    easings?: Record<string, Token<EasingNode>>;
    /** Per-component token rebinds, keyed by component name. */
    components?: Record<string, { tokens?: Record<string, Token<ValueNode>> }>;
}

/** A reusable property transform (lowering to Panda `utilities`), invoked from a `StyleMap`
 *  through `apply`. A discriminated union of two flavors; build with `defineStaticUtility` or
 *  `defineDynamicUtility` so `kind` is injected. */
interface BaseUtilityDef {
    /** Advisory label naming the primary property this utility stands in for, for anyone
     *  reading the config. It carries no behavior: the Panda adapter never emits it, and a
     *  utility's actual output comes from its `values` steps (static) or compiled `template`
     *  (dynamic). Leave it off when the steps are already self-describing. */
    property?: string;
}

/** Fixed named steps: each key maps to an arbitrary static `StyleMap` (for example
 *  `shadowElevation: { level0, level1, level2 }`). `apply` passes a value key. */
export interface StaticUtilityDef extends BaseUtilityDef {
    kind: "static";
    values: Record<string, StyleMap>;
}

/** Value-parameterized: the call-site value is substituted into `template` through `arg()`.
 *  Optionally bound to a token `scale`, so a string arg is then a key into that tier (`m: "2"`
 *  resolves to `alias("tokens", "spacing", "2")`, that is `8px`, unit from the token; the
 *  accepted keys are the tier's keys, enum-like but auto-synced). Without a scale the arg is a
 *  `ValueNode` (`size: px(16)`); dimensionalize a unitless arg in the template through
 *  arithmetic (`mul(arg(), px(4))`) or `withUnit`. Multi-arg templates use `arg("x")` or
 *  `arg(0)` fed by an object or array `apply` value. Lowers to a Panda function utility
 *  `transform(value)` (with `values: "<scale>"` when scaled); within our own config it is
 *  expanded to a static `StyleMap` at build, and both lowerings must agree so consumer
 *  `css({ m: "2" })` matches our recipes. */
export interface DynamicUtilityDef extends BaseUtilityDef {
    kind: "dynamic";
    scale?: string[];
    template: StyleMap;
}

export type UtilityDef = StaticUtilityDef | DynamicUtilityDef;

export interface CoreConfig {
    /** Primitive token values are `ScalarNode`s so their unit is encoded at the source (for
     *  example spacing in px, fontWeight unitless, colors as literals). Any token value is
     *  metadata-wrappable through `meta(...)`, hence `Token<...>` (bare values still valid). */
    tokens: Record<string, Record<string, Token<ScalarNode>>>;
    /** Named viewport breakpoints (sizes stay unit-encoded, px or rem). Referenced by name
     *  from `viewportBreakpoint(...)` and `containerBreakpoint(...)` (both reuse this scale).
     *  Build-time only: CSS forbids `var()` in `@media` and `@container` conditions, so the
     *  adapter inlines the resolved size; breakpoints cannot be runtime-overridable vars. */
    breakpoints?: Record<string, NumericScalarNode>;
    /** Font-family tokens (structured, portable). Font loading is out of core. Referenced
     *  through `alias("fonts", <key>)`; valid as a CSS var. */
    fonts?: Record<string, Token<FontFamilyNode>>;
    /** System-level semantics only (brand, danger), keyed directly by group (colors).
     *  Component-level tokens live on each component's own `tokens`, so there is no further
     *  nesting level here. */
    semanticTokens: Record<string, Record<string, Token<ValueNode>>>;
    /** Composite typescale roles (family, size, weight, lineHeight, tracking), lowering to
     *  Panda `textStyles`. A recipe applies one through `textStyle: alias("textStyles", <name>)`. */
    textStyles?: Record<string, StyleMap>;
    /** Durations are ms or s numerics. Referenced through `alias("durations", <name>)` from
     *  transition and animation nodes. */
    durations?: Record<string, Token<NumericScalarNode>>;
    /** Reusable timing functions. Referenced through `alias("easings", <name>)`. */
    easings?: Record<string, Token<EasingNode>>;
    /** Semantic stacking-order scale: name to unitless z-index (not CSS `@layer` or cascade
     *  layers, which are a separate concern). Build it with `stack([...])` so authors declare
     *  relative order, not magic numbers; hand entries are still allowed for one-offs.
     *  Referenced through `alias("zIndices", <name>)` from `StyleMap.zIndex`. Metadata-wrappable
     *  and theme-overridable. */
    zIndices?: Record<string, Token<NumericScalarNode>>;
    /** Keyframe sets: name to (stop to styles), where `stop` is `0%`, `from`, `to`, and the
     *  like. Referenced by `AnimationNode.name`, lowering to Panda `keyframes`. */
    keyframes?: Record<string, Record<string, StyleMap>>;
    /** Reusable property transforms, lowering to Panda `utilities` (for example `elevation`). */
    utilities?: Record<string, UtilityDef>;
    /** Portable base styles merged into every component this framework generates, at lowest
     *  precedence (a component's own base, variants, and states always win). Scoped to our own
     *  output only, so it never reaches the host document. The adapter merges it into each
     *  component's base (slot recipes: the root slot); web emits a shared base, native folds it
     *  into each style object. Use it for design intent shared by all components (base font,
     *  box model, default transition). Document-level styling (`:root`/`body` resets, `*`,
     *  `::selection`) is deliberately not here: it reaches outside our output into the host
     *  page, so it is an adapter or app concern (the Panda adapter owns its own `globalCss`). */
    componentBaseStyles?: StyleMap;
    /** Named themes: partial token overrides layered over this (base) config. The base is the
     *  default theme; each named theme emits under `[data-theme=<name>]`. */
    themes?: Record<string, ThemeOverride>;
    components: Record<string, AnyComponentSpec>;
}
