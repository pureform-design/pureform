// The supported, typed style map.
//
// Keys are a curated set of (csstype-derived) property names, the cross-platform common
// vocabulary. Each value is constrained to the node kinds valid for that property, so an
// unsupported value (`color: px(4)`) or an unknown property is a compile error. This replaces
// a bare `Record<string, ValueNode>`.

import type {
    AlignKeyword,
    ColorKeyword,
    CursorKeyword,
    DisplayKeyword,
    KeywordNode,
    LineStyleKeyword,
    PortableCondition,
    PositionKeyword,
    TextAlignKeyword,
    ValueNode,
} from "./nodes";
import type { ValueNodeMap } from "./value-map";

// Value categories: the vocabulary StyleMap properties are typed with. Baseline keyword
// values are a typed `KeywordNode` (`Keyword<V>` below); `literal` is folded in only as the
// raw off-baseline escape. Each category widens by adding leaf keys as new kinds register in
// `LeafNodeMap`.

/** Solid color (plus the `transparent` keyword). */
type Color =
    | ValueNodeMap["color" | "colorMix" | "literal"]
    | KeywordNode<ColorKeyword>;
/** Background: a color, a gradient, or the `transparent` keyword. */
type Background =
    | ValueNodeMap["color" | "colorMix" | "gradient" | "literal"]
    | KeywordNode<ColorKeyword>;
/** A length or number: px, rem, %, calc, min, max, clamp. */
type Dimension = ValueNodeMap["numeric" | "calc" | "mathFn" | "literal"];
/** A portable keyword from a per-property vocabulary, plus a raw `literal` escape and a ref.
 *  `V` narrows the acceptable tokens so `display: keyword("center")` is a type error. */
type Keyword<V extends string = string> =
    | KeywordNode<V>
    | ValueNodeMap["literal"];
/** Family stack, or a literal / alias. */
type Font = ValueNodeMap["fontFamily" | "literal"];
/** Composite box-shadow / elevation, or a `none` reset. */
type Shadow = ValueNodeMap["shadow"] | KeywordNode<"none">;
type Gradient = ValueNodeMap["gradient" | "literal"];
type Transform = ValueNodeMap["transform" | "literal"];
type Filter = ValueNodeMap["filter" | "literal"];
type Transition = ValueNodeMap["transition" | "literal"];
type Animation = ValueNodeMap["animation" | "literal"];
type Easing = ValueNodeMap["easing" | "literal"];

// Length versus unitless is not type-enforced (both are `numeric` nodes); the unit is encoded
// on the value itself, so `Dimension` covers padding, fontWeight, and the rest.

/** Supported style map. Keys are a curated set of (csstype-derived) property names, the
 *  cross-platform common vocabulary (`paddingTop`, `backgroundColor`); each value is
 *  constrained to the node kinds valid for that property, so an unsupported value
 *  (`color: px(4)`) or an unknown property is a compile error. The exhaustive property list
 *  comes from mapping csstype's property keys onto these categories; the excerpt below shows
 *  the pattern. This is a closed, portable set with deliberately no raw CSS custom-property
 *  (`--x`) escape: a runtime-override contract point is read as a `dynamic()` value (the
 *  adapter owns the `--`-var naming) and declared as a component `token`, while anything
 *  genuinely target-specific goes through `rawRules` or `platform()`. */
export interface StyleMap {
    // layout / box
    display?: Keyword<DisplayKeyword>;
    position?: Keyword<PositionKeyword>;
    alignItems?: Keyword<AlignKeyword>;
    justifyContent?: Keyword<AlignKeyword>;
    // color
    color?: Color;
    backgroundColor?: Color;
    borderColor?: Color;
    // sizing / spacing (physical)
    width?: Dimension;
    height?: Dimension;
    paddingTop?: Dimension;
    paddingRight?: Dimension;
    paddingBottom?: Dimension;
    paddingLeft?: Dimension;
    borderRadius?: Dimension;
    borderWidth?: Dimension;
    borderStyle?: Keyword<LineStyleKeyword>;
    gap?: Dimension;
    // sizing / spacing (logical / flow-relative). Prefer these for direction-aware layout:
    // they auto-flip in RTL on every target (web inline/block, native start/end), so you
    // rarely need a `dir` condition. `inline` is the text-flow axis, `block` the cross axis.
    paddingInlineStart?: Dimension;
    paddingInlineEnd?: Dimension;
    paddingBlockStart?: Dimension;
    paddingBlockEnd?: Dimension;
    marginInlineStart?: Dimension;
    marginInlineEnd?: Dimension;
    marginBlockStart?: Dimension;
    marginBlockEnd?: Dimension;
    insetInlineStart?: Dimension;
    insetInlineEnd?: Dimension;
    borderStartStartRadius?: Dimension;
    borderStartEndRadius?: Dimension;
    borderEndStartRadius?: Dimension;
    borderEndEndRadius?: Dimension;
    // prefer logical "start"/"end" over "left"/"right"
    textAlign?: Keyword<TextAlignKeyword>;
    // numerics
    opacity?: Dimension;
    // prefer alias("zIndices", <name>) over magic numbers
    zIndex?: Dimension;
    fontWeight?: Dimension;
    lineHeight?: Dimension;
    // typography
    fontFamily?: Font;
    fontSize?: Dimension;
    letterSpacing?: Dimension;
    // e.g. alias("textStyles", "body"), a RefNode
    textStyle?: Keyword;
    // backgrounds & effects
    background?: Background;
    backgroundImage?: Gradient;
    boxShadow?: Shadow;
    transform?: Transform;
    filter?: Filter;
    backdropFilter?: Filter;
    // interaction / motion
    cursor?: Keyword<CursorKeyword>;
    transition?: Transition;
    transitionTimingFunction?: Easing;
    animation?: Animation;
    // ... (generated for the full CSS property set)

    /** Invoke named utilities (defined in `CoreConfig.utilities`): utility name to argument.
     *  The adapter expands each to its `UtilityDef` styles (Panda emits the native utility
     *  usage; other targets inline the expansion), merged under this map's own properties, so
     *  explicit props and `states` / `when(...)` overrides win over a utility expansion. It
     *  stays portable: an expansion is itself a `StyleMap`. The argument shape depends on the
     *  target utility. A `static` utility takes a value key (string). A `dynamic` utility with
     *  a `scale` takes a scale key (string). A plain `dynamic` utility takes a `ValueNode`
     *  (`size: px(16)`). A multi-arg `dynamic` template takes an object (`{ x, y }`) or array
     *  (`[a, b]`) of `ValueNode`s matching its `arg("x")` / `arg(0)` placeholders. Vary by
     *  state or breakpoint by nesting `apply` under `states` (or a nested conditional). Names
     *  and keys resolve against the config at compile time (the same ref hole as `alias(...)`);
     *  `defineConfig` validates them. */
    apply?: Record<
        string,
        string | ValueNode | Record<string, ValueNode> | ValueNode[]
    >;

    /** Block-form self-state styles, the dual of the per-value `when(...)` conditional. Keyed
     *  by the same closed, portable `PortableCondition` set (`hover`, `focus`, `dark`,
     *  `disabled`); the adapter lowers each to its target idiom (web: pseudo-class, media
     *  query, or data-attr; native: press or disabled state). It carries no selectors, so it
     *  stays agnostic. Recursive: a state block is a full `StyleMap`. Prefer this for
     *  multi-property state changes; reach for `when(...)` when a single value varies (or the
     *  value itself is a token that differs per state). */
    states?: Partial<Record<PortableCondition, StyleMap>>;

    /** Escape hatch for nested rules with no portable form: arbitrary descendant selectors
     *  (`& svg`), pseudo-elements (`&::before`, `&::placeholder`), or platform widget parts.
     *  Target-keyed exactly like `rawCondition.by`: core assigns no meaning to the inner keys
     *  (raw per-target selectors or at-rules), but their values stay portable `StyleMap`s. The
     *  web adapter reads `css` and emits `<key> { ... }`; a target with no entry emits nothing,
     *  purely additive, so (unlike `platform()`) no portable default is needed. Prefer slots
     *  for parts the component itself renders; use this only for elements you cannot model
     *  portably. */
    // targetId to (rawSelector to styles)
    rawRules?: Record<string, Record<string, StyleMap>>;
}
