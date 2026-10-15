// Node type definitions for the agnostic styling AST.
//
// This module is the single source of node shapes. It emits nothing and knows
// nothing about CSS or any platform: a node is a plain typed object tree that an
// adapter later lowers to a target. Helper constructors live under `helpers/`,
// grouped by concern; the value-kind registry and the typed style map live in
// `value-map.ts` and `style.ts`.

/** Every value the AST can carry, as a single union. Most slots do not use this
 *  directly; they use a narrower semantic union (see the guideline below). */
export type ValueNode =
    | ScalarNode
    | KeywordNode
    | AliasNode
    | DynamicNode
    | PlatformNode
    | ConditionalNode
    | FontFamilyNode
    | ColorMixNode
    | ShadowNode
    | GradientNode
    | TransformNode
    | FilterNode
    | TransitionNode
    | AnimationNode
    | EasingNode
    | CalcNode
    | MathFnNode
    | UtilityArgNode;

/** Placeholder for the call-site value of a value-parameterized utility (a
 *  `DynamicUtilityDef`). When the adapter expands the utility it substitutes each
 *  `arg(key?)` in the utility's `template` with the value supplied through `apply`.
 *  A bare `arg()` is the whole single argument; `arg("x")` or `arg(0)` picks a named
 *  or positional member of an object- or array-valued `apply`. It is valid only inside
 *  a dynamic-utility template, and config validation rejects it anywhere else because it
 *  has no argument to resolve there. It is a `RefNode`, so a value slot accepts it and it
 *  composes inside `calc` and `mathFn`, for example `mul(arg(), px(4))`. */
export interface UtilityArgNode {
    type: "utilityArg";
    /** Named (object `apply`) or positional (array `apply`) member; absent means the single arg. */
    key?: string | number;
}

/** Reference / indirection nodes. Each resolves to some value defined elsewhere: a
 *  token path, a runtime var, a per-target or per-state branch, or a utility's call-site
 *  argument. So each is valid wherever a concrete value of the right kind is. Their
 *  resolved kind is checked at compile time by the adapter, not by TypeScript. This is the
 *  one deliberate hole in kind-safety, since a path, var, or argument is opaque to the type
 *  system. Re-exported from `value-map.ts` so `ValueNodeMap` can fold it into every entry. */
export type RefNode =
    | AliasNode
    | DynamicNode
    | PlatformNode
    | ConditionalNode
    | UtilityArgNode;

/* Semantic value unions.
 *
 * Narrowest-acceptable typing guideline. A field that holds a value never types it as the
 * full `ValueNode`. It uses the narrowest union valid for that slot, so the type system
 * rejects nonsense (`blur: aColorNode`, `easing: px(4)`) at the call site instead of
 * deferring to the adapter. Each union is the concrete leaf kinds that belong there plus
 * `RefNode`, since a ref may resolve to any kind. The exceptions are the generic indirection
 * slots that are kind-agnostic by design (`DynamicNode.default`, `PlatformNode.values` and
 * `default`, `ConditionalNode.base`, `ConditionalCase.value`), which stay `ValueNode` because
 * they forward whatever kind their context expects. `StyleMap` expresses the same intent
 * through its value categories (`Color`, `Dimension`, and so on) built on `ValueNodeMap`.
 * These node-level aliases are the equivalent for composite-node fields, since `nodes.ts`
 * cannot depend on `value-map.ts`. Add a union here when a new field needs one. */

/** A value resolving to a dimension or number: a unit-encoded numeric, infix arithmetic,
 *  a math function, or a reference. No keyword `literal`, since composite numeric slots are
 *  strictly dimensional; reach for `platform()` when an opaque escape is unavoidable. */
export type NumericValue = NumericScalarNode | CalcNode | MathFnNode | RefNode;

/** A value resolving to a single color: a space-encoded color, a `color-mix`, the portable
 *  `transparent` keyword, a raw `literal` escape, or a reference. */
export type ColorValue =
    | ColorNode
    | ColorMixNode
    | KeywordNode<ColorKeyword>
    | LiteralScalarNode
    | RefNode;

/** A value resolving to a timing function: an `EasingNode` or a reference,
 *  for example `alias("easings", ...)`. */
export type EasingValue = EasingNode | RefNode;

/** Portable units with a deterministic build-time static lowering on every target.
 *  `px`, `%`, `ms`, and `s` are verbatim. `rem` resolves against a configured base. `em`
 *  is a relative length like `rem`: web-verbatim, and non-web resolves it against the
 *  in-scope font-size (a static approximation, like `rem`'s base, so a runtime font-size
 *  change is not tracked off-web). Angles (`deg`, `rad`, `turn`) are portable since native
 *  transform and animation engines use them. `"none"` means explicitly unitless (fontWeight,
 *  lineHeight, zIndex, opacity, flex).
 *
 *  Some units are excluded because no build-time static lowering exists. Viewport units
 *  (`vh`, `vw`, `vmin`, `vmax`) have no fixed value until runtime, so their only non-web
 *  realization is a live viewport subscription, which style output cannot emit; that needs a
 *  Layer-4 runtime binding, not a `Unit`. `ch` and `ex` need async, font-dependent glyph
 *  measurement, which is lossy. `fr` needs a grid engine React Native lacks. Use `platform()`
 *  with a portable default, or a bare `literal("100vh")` (opaque, web-only), for these. */
export type Unit =
    // length
    | "px"
    | "rem"
    // font-relative (web verbatim; non-web resolves against the in-scope font-size)
    | "em"
    // relative
    | "%"
    // duration / motion
    | "ms"
    | "s"
    // angle (gradients, transforms, conic stops)
    | "deg"
    | "rad"
    | "turn"
    // explicitly unitless
    | "none";

/** Scalar (leaf primitive) value, discriminated by `type`. Each encodes its "unit" at the
 *  source rather than letting an adapter guess. `literal` is a raw opaque string, the
 *  off-baseline escape (`"100vh"`, a vendor value). `numeric` is a number with its `unit`.
 *  `color` is channels with their color `space` (the color analogue of a unit). Baseline
 *  keyword values (`flex`, `center`, `transparent`) are a separate `KeywordNode`, not a
 *  `literal`, so they stay typed and portable. */
export type ScalarNode = LiteralScalarNode | NumericScalarNode | ColorNode;

export interface LiteralScalarNode {
    type: "literal";
    value: string;
}

export interface NumericScalarNode {
    type: "numeric";
    value: number;
    unit: Unit;
}

/** A portable keyword drawn from a closed, per-property vocabulary (`V`). It differs from
 *  `LiteralScalarNode`, the raw opaque-string escape: a keyword carries a canonical,
 *  framework-agnostic token (camelCase, for example `spaceBetween` or `notAllowed`) that the
 *  adapter maps per target. Web spells it out (`spaceBetween` becomes `space-between`, align
 *  `start` becomes `flex-start`); native maps to its own flex or cursor constants, or applies
 *  a compile-time equivalent. The vocabulary is trimmed to tokens with a deterministic
 *  lowering to every target. Values that need a mechanism a target lacks (`grid`, `sticky`,
 *  `double`) are excluded and go through `literal` or `platform()`. `V` narrows the acceptable
 *  tokens per slot, so `display: keyword("center")` is a type error. This mirrors the
 *  easing-keyword precedent (`easeInOut` becomes `ease-in-out`). Leaf-kind "keyword". */
export interface KeywordNode<V extends string = string> {
    type: "keyword";
    value: V;
}

/* Baseline keyword vocabulary.
 *
 * Closed, portable token sets, grouped by the concept a property selects from. Each group is
 * the acceptable `V` for the matching `StyleMap` keyword slots. Tokens are canonical
 * camelCase; the adapter owns the per-target spelling.
 *
 * Portability test: a token is portable if the adapter has a deterministic build-time static
 * lowering for it on every target, meaning it resolves to a concrete static style value at
 * compile time (a native value, a verbatim pass-through, or a per-target spelling). The core
 * only emits static styling, so the lowering may not depend on runtime behavior and may not be
 * a live reference to another property's computed value. `inlineFlex` has no native inline flow
 * so it lowers to `flex`; `clip` lowers to `hidden` where unsupported. A token is excluded when
 * the lowering is ambiguous or lossy, needs runtime information, is a dynamic reference, or
 * needs a mechanism a target lacks: `grid` (a layout engine React Native lacks), `block`,
 * `inline`, and `contents` (a box or inline-flow model React Native lacks), `fixed` and
 * `sticky` (runtime scroll-position mechanics), `double` border (extra render nodes),
 * `currentColor` (a live link to the `color` property, dynamic even on web, so freezing it is
 * unfaithful). Those go through `literal` or `platform()`. A concept whose only non-web
 * realization is runtime, like container queries, is not a keyword at all; it is a portable
 * condition fulfilled by a Layer-4 runtime binding, never by style output. Widen a group (and
 * add the matching `keyword` helper) when a property needs another build-time-portable value. */

/** `alignItems` / `justifyContent` / `alignSelf` / `justifySelf` / `alignContent`. Every
 *  token is a portable flex value (web and React Native both accept them). `space*` is only
 *  valid on the `justify*` and `alignContent` axes, not `alignItems`; the slot type does not
 *  yet split these. */
export type AlignKeyword =
    | "start"
    | "center"
    | "end"
    | "stretch"
    | "baseline"
    | "spaceBetween"
    | "spaceAround"
    | "spaceEvenly";
/** Portable: `inlineFlex` lowers to `flex` on targets with no inline flow (React Native).
 *  Still out: `block`, `inline`, `grid`, and `contents` need a box, inline, or grid model
 *  React Native lacks, so author them web-side with `platform({ css: literal("grid") }, flex)`. */
export type DisplayKeyword = "flex" | "inlineFlex" | "none";
/** Portable only: React Native has no `fixed` or `sticky`. Author those web-side with `platform()`. */
export type PositionKeyword = "relative" | "absolute" | "static";
export type FlexDirectionKeyword =
    | "row"
    | "column"
    | "rowReverse"
    | "columnReverse";
/** Portable only: React Native `borderStyle` has no `double`. */
export type LineStyleKeyword = "none" | "solid" | "dashed" | "dotted";
/** Logical; prefer `start` and `end` over `left` and `right`. */
export type TextAlignKeyword = "start" | "end" | "center" | "justify";
/** Which way a user can resize the element, as a text area's drag handle. Web-only, like
 *  `cursor`: native text inputs have no handle, so the native adapter drops it. */
export type ResizeKeyword = "none" | "vertical" | "horizontal" | "both";
/** Whether a form control grows with its content (`content`) or keeps its set size (`fixed`).
 *  Web-only, like `resize`; browsers without it keep the set size. */
export type FieldSizingKeyword = "fixed" | "content";
/** A pointer-device hint. Inert where there is no pointer (touch), like `hover`; the native
 *  adapter drops it rather than erroring. */
export type CursorKeyword =
    | "auto"
    | "default"
    | "pointer"
    | "text"
    | "notAllowed"
    | "wait"
    | "move"
    | "grab";
/** Portable: `clip` lowers to `hidden` where unsupported (React Native). */
export type OverflowKeyword = "visible" | "hidden" | "scroll" | "auto" | "clip";
/** Whether an element takes pointer or touch input. `none` lets input pass through to what is
 *  beneath, for decorative overlays. React Native's `box-none`/`box-only` have no web
 *  equivalent, so only the portable pair is here. */
export type PointerEventsKeyword = "auto" | "none";
/** `transparent` is a static color constant (verbatim on every target). `currentColor` is
 *  not here: it is a live link to the `color` property (dynamic even on web), so it cannot be
 *  a static keyword. Use `literal("currentColor")` web-side, or model it as a reference to the
 *  `color` source. */
export type ColorKeyword = "transparent";

/** Color spaces the AST can carry. A color encodes its space at the source, the way a numeric
 *  encodes its unit; adapters render to the target's syntax and gamut-downgrade if needed (for
 *  example display-p3 to srgb) rather than assuming sRGB-hex. `hct` and `oklch` are `@pureform/material`'
 *  generation spaces, preserved instead of flattened to hex. */
export type ColorSpace =
    | "srgb"
    | "hsl"
    | "oklch"
    | "oklab"
    | "lab"
    | "lch"
    | "hct"
    | "display-p3";

export interface ColorNode {
    type: "color";
    space: ColorSpace;
    /** Channels for `space` (for example oklch is `[L, C, H]`). */
    components: number[];
    /** 0..1, default 1. */
    alpha?: number;
}

/** A color computed at the target by compositing `with` over `base` by `amount`, in the given
 *  color `space`. It works over a dynamic var whose value is not known until runtime, for
 *  example a hover or press scrim; `alpha()` over a non-concrete color is sugar that lowers to
 *  this (a fade toward `transparent`). Lowers to CSS `color-mix(in <space>, base, with amount)`.
 *  Produces a color (leaf-kind "colorMix"), so it is usable wherever a color is. Material's
 *  state-layer sugar is built on this upstream, not in core. */
export interface ColorMixNode {
    type: "colorMix";
    space: ColorSpace;
    /** The color being tinted (often a dynamic or alias). */
    base: ColorValue;
    /** The overlay / scrim color. */
    with: ColorValue;
    /** Share of `with`, a `%` numeric (or a ref to one). */
    amount: NumericValue;
}

/** Portable font-family value. Web joins `stack` and `generic` into a CSS font-family string.
 *  A non-web adapter uses `stack[0]` (the bundled or primary family) and drops the CSS-only
 *  fallback tail. Font loading (@font-face, bundling) is not core's concern; this only names
 *  families. */
export interface FontFamilyNode {
    type: "fontFamily";
    /** Ordered preference, for example `["Inter", "system-ui"]`. */
    stack: string[];
    generic?: "sans-serif" | "serif" | "monospace" | "cursive" | "system-ui";
}

/** Composite box-shadow: an ordered stack of layers, since Material elevation is several
 *  layered shadows, not one. Web joins layers into a single `box-shadow`. A native adapter
 *  maps to its own elevation model (or reads the layers), typically through `platform()`.
 *  Each layer's `color` is a `ColorValue` so it can reference tokens or vars; offsets, blur,
 *  and spread are `NumericValue` so they can be token-driven or `calc`-derived. */
export interface ShadowNode {
    type: "shadow";
    layers: ShadowLayer[];
}

export interface ShadowLayer {
    x: NumericValue;
    y: NumericValue;
    blur: NumericValue;
    spread?: NumericValue;
    color: ColorValue;
    inset?: boolean;
}

/** Build-time reference to another node by path, for example
 *  `["tokens", "colors", "violet600"]`. */
export interface AliasNode {
    type: "alias";
    path: string[];
}

/** Platform-agnostic contract for runtime dynamic overrides. */
export interface DynamicNode {
    type: "dynamic";
    /** For example `["ui", "button", "bg"]`. */
    path: string[];
    /** Runtime fallback used when the override var is unset in the cascade (lowers to CSS
     *  `var(--name, <default>)`). Nest another `dynamic` here to build a multi-level fallback
     *  chain. This differs from `PlatformNode.default`, which is a build-time selection. */
    default?: ValueNode;
}

/** Escape hatch for values that cannot be expressed portably, for example CSS `100vh` or a
 *  native shadow object. It maps an adapter target id to a raw value, plus a required portable
 *  `default`.
 *
 *  Target ids are open free-form strings; core never enumerates them as a closed union, so any
 *  future adapter can define its own id (`"qt"`, `"skia"`) without changing core. An adapter
 *  with no entry for its own id uses `default`, but may instead read and translate a sibling
 *  target's value, for example a native adapter interpreting the `css` entry. `default` is only
 *  the guaranteed baseline. */
export interface PlatformNode {
    type: "platform";
    /** Open target id (adapter-defined, for example `css`, `rn`, `qt`) to value. */
    values: Record<string, ValueNode>;
    /** Build-time baseline for any target that neither has an entry nor translates one. This
     *  differs from `DynamicNode.default`, which is a runtime var fallback. */
    default: ValueNode;
}

/** Pointer / focus / interactivity states. CSS has no dragging pseudo-class, so `dragged`
 *  matches a `data-dragging` attribute that the drag code sets on the element. */
export type InteractionCondition =
    | "hover"
    | "focus"
    | "focusVisible"
    | "active"
    | "pressed"
    | "dragged"
    | "disabled";

/** Form / selectable-control states. `filled` is a text input holding a value, or an element
 *  containing one, for example to float a text field's label. */
export type FormCondition =
    | "selected"
    | "checked"
    | "invalid"
    | "readOnly"
    | "filled";

/** Color-scheme states (lower to `prefers-color-scheme` or `[data-theme]`). */
export type ColorSchemeCondition = "dark" | "light";

/** Writing-direction states. This is the escape for direction-aware styling that logical
 *  properties cannot express (visual mirroring, a flipped asset); prefer flow-relative
 *  properties (`paddingInlineStart`, `textAlign: "start"`) which flip with no condition.
 *  Lowers to `[dir=rtl]` or `:dir(rtl)` on web, or `I18nManager.isRTL` on native. */
export type DirectionCondition = "ltr" | "rtl";

/** Portable non-size media features (color scheme is its own axis above). */
export type MediaCondition =
    | "reducedMotion"
    | "moreContrast"
    | "lessContrast"
    | "print"
    | "landscape"
    | "portrait"
    | "touch" // pointer: coarse
    | "mouse"; // pointer: fine

/** Portable, cross-target states the core guarantees, split by axis. Adapters own the
 *  lowering (web: pseudo-class, media query, or data-attr; native: press or disabled state),
 *  and core never encodes selectors. This mirrors the `Unit` philosophy: a closed portable set
 *  plus a `rawCondition` escape hatch for everything else. */
export type PortableCondition =
    | InteractionCondition
    | FormCondition
    | ColorSchemeCondition
    | DirectionCondition
    | MediaCondition;

/** Escape hatch for conditions that are not portable: an adapter-target-keyed raw selector
 *  or at-rule, for example `{ css: "&[data-state=open]" }`. This is the condition-level
 *  analogue of `PlatformNode`. */
export interface RawCondition {
    type: "rawCondition";
    /** Target id to raw selector or at-rule. */
    by: Record<string, string>;
}

/* Size queries: {viewport | container} by {breakpoint | size}.
 *
 * All four are ranges. The `*Breakpoint` bounds are breakpoint token keys (into
 * `CoreConfig.breakpoints`) and use `{ from, until }`: a half-open interval `[from, until)`,
 * where `from` is inclusive (min-width) and `until` exclusive. This matches mobile-first bands,
 * so there is no max-width off-by-one. The `*Size` bounds are ad-hoc `NumericScalarNode`s and
 * use `{ min, max }`: inclusive, mapping straight to CSS min-width and max-width. These stay a
 * bare `NumericScalarNode` (not `NumericValue`) on purpose: media and container query bounds
 * must be static lengths, since `var()` and `calc()` are not valid there, so refs are correctly
 * rejected. The adapter owns the exact lowering, including modern `(width < ...)` range syntax. */

/** Viewport `@media` range at named breakpoint tokens. Either bound may be omitted for an
 *  open-ended range: `{ from }` is token-and-up, `{ until }` is below the token. */
export interface ViewportBreakpointCondition {
    type: "viewportBreakpoint";
    /** Breakpoint token key, lower bound (inclusive). */
    from?: string;
    /** Breakpoint token key, upper bound (exclusive). */
    until?: string;
}

/** Viewport `@media` range at ad-hoc sizes (no token). Sizes stay unit-encoded. */
export interface ViewportSizeCondition {
    type: "viewportSize";
    min?: NumericScalarNode; // min-width
    max?: NumericScalarNode; // max-width
}

/** Container `@container` range at named breakpoint tokens (reusing the same
 *  `CoreConfig.breakpoints` scale as the viewport). `from` and `until` are as above;
 *  `container` optionally targets a named container, omit for the nearest. Needs an ancestor
 *  with a container-type established. */
export interface ContainerBreakpointCondition {
    type: "containerBreakpoint";
    /** Breakpoint token key, lower bound (inclusive). */
    from?: string;
    /** Breakpoint token key, upper bound (exclusive). */
    until?: string;
    /** Named container; omit for the nearest. */
    container?: string;
}

/** Container `@container` range at ad-hoc sizes. Named `...SizeCondition` so a future
 *  `ContainerStyleCondition` (`@container style(...)`) can slot in beside it. */
export interface ContainerSizeCondition {
    type: "containerSize";
    min?: NumericScalarNode; // min-width
    max?: NumericScalarNode; // max-width
    container?: string; // named container; omit for the nearest
}

/** A state of one of the component's slots, which any slot inside it can style by. A slot can
 *  read its own state; reading another slot's needs the component to declare `structure`,
 *  and that slot must be an ancestor there. The web lowers it to selectors on the slot's
 *  element (`:focus-within`, `:has(...)`); a native binding passes the component's state to
 *  each slot. Each state can also be set by hand with a data attribute on the slot:
 *  `data-hover`, `data-selected`, `data-checked`, `data-indeterminate`, `data-pressed`,
 *  `data-focused`, `data-focus-visible`, `data-filled`, `data-invalid`, `data-disabled`. */
export interface SlotCondition {
    type: "slot";
    slot: string;
    state: SlotState;
}

/** The slot states. Each describes the slot's element together with what it contains:
 *  `focusWithin` is focus on it or inside it, `filled` is a text input inside holding a value,
 *  `invalid` an input inside marked invalid, `disabled` a disabled control inside, `checked`
 *  and `indeterminate` a checkbox, radio, or switch inside in that state. `selected` and
 *  `pressed` describe the slot's element only: selected (or toggled on) and pressed. */
export type SlotState =
    | "hover"
    | "selected"
    | "checked"
    | "indeterminate"
    | "pressed"
    | "focusWithin"
    | "focusVisibleWithin"
    | "filled"
    | "invalid"
    | "disabled";

export type Condition =
    | PortableCondition
    | SlotCondition
    | ViewportBreakpointCondition
    | ViewportSizeCondition
    | ContainerBreakpointCondition
    | ContainerSizeCondition
    | RawCondition;

/** A value that varies by state. `base` applies when no case matches; each case's `on` lists
 *  one or more conditions that must all hold. When several cases apply at once, the target's
 *  normal cascade and specificity resolve them (adapter-defined). Case `value`s are themselves
 *  `ValueNode`s, so conditionals nest and compose with `alias`, `dynamic`, and `platform`. */
export interface ConditionalNode {
    type: "conditional";
    base: ValueNode;
    cases: ConditionalCase[];
}

export interface ConditionalCase {
    /** A single condition, or an array meaning all must hold (AND). */
    on: Condition | Condition[];
    value: ValueNode;
}

/* Gradients. */

/** A color gradient (a background image). Stops reuse `ColorNode` and refs so they stay
 *  themeable. `angle` applies to `linear` (default `180deg`, top to bottom) and `conic`;
 *  `radial` ignores it. Lowers to CSS `linear`, `radial`, or `conic-gradient()`; native
 *  targets use their own gradient API (or `platform()`). Leaf-kind "gradient". */
export interface GradientNode {
    type: "gradient";
    kind: "linear" | "radial" | "conic";
    stops: GradientStop[];
    /** deg or turn (linear and conic only). */
    angle?: NumericValue;
    /** How far a radial gradient reaches (radial only). Omitted means `farthest-corner`. */
    extent?: RadialExtent;
}

/** The ending-shape size keyword of a radial gradient. */
export type RadialExtent =
    | "closest-side"
    | "closest-corner"
    | "farthest-side"
    | "farthest-corner";

export interface GradientStop {
    color: ColorValue;
    /** % or length; omit to auto-distribute. */
    position?: NumericValue;
}

/* Transforms and filters. */

/** Ordered transform ops (lowering to CSS `transform`). Rotate and skew args carry an angle
 *  unit, translate args a length, and scale is unitless; each arg is a `NumericValue` (a
 *  unit-encoded numeric, a `calc`, or a token/var ref). Native targets map op-for-op.
 *  Leaf-kind "transform". */
export interface TransformNode {
    type: "transform";
    ops: TransformOp[];
}

export interface TransformOp {
    fn:
        | "translate"
        | "translateX"
        | "translateY"
        | "scale"
        | "scaleX"
        | "scaleY"
        | "rotate"
        | "skewX"
        | "skewY";
    args: NumericValue[];
}

/** Ordered filter functions (lowering to CSS `filter` or `backdrop-filter`). Web-leaning;
 *  use `platform()` where a target lacks an equivalent. Leaf-kind "filter". */
export interface FilterNode {
    type: "filter";
    fns: {
        fn:
            | "blur"
            | "brightness"
            | "contrast"
            | "grayscale"
            | "saturate"
            | "opacity";
        args: NumericValue[];
    }[];
}

/* Motion: easing, transitions, animations. */

/** A timing function, discriminated by `kind`. `keyword` is the portable preset set;
 *  `cubicBezier` and `steps` are the structured forms, universal across web and native
 *  animation engines. Usually stored as a token under `CoreConfig.easings` and referenced by
 *  alias. Leaf-kind "easing": every variant shares `type: "easing"`, and `kind` discriminates. */
export type EasingNode =
    | KeywordEasingNode
    | CubicBezierEasingNode
    | StepsEasingNode;

/** Portable keyword easing, for example `ease-in-out`. */
export interface KeywordEasingNode {
    type: "easing";
    kind: "keyword";
    name: "linear" | "ease" | "easeIn" | "easeOut" | "easeInOut";
}

/** Cubic-bézier control points `[x1, y1, x2, y2]`. */
export interface CubicBezierEasingNode {
    type: "easing";
    kind: "cubicBezier";
    points: [number, number, number, number];
}

/** Stepped easing (`steps(count[, jump])`). */
export interface StepsEasingNode {
    type: "easing";
    kind: "steps";
    steps: { count: number; jump?: "start" | "end" };
}

/** One or more transitions (lowering to CSS `transition`). `property` is a style-property
 *  name or `"all"`. `duration` and `delay` are `ms` or `s` numerics or an alias into
 *  `durations`. `easing` is an `EasingNode` or an alias into `easings`. Leaf-kind "transition". */
export interface TransitionNode {
    type: "transition";
    parts: TransitionPart[];
}

export interface TransitionPart {
    property: string;
    /** ms or s numeric, or `alias("durations", ...)`. */
    duration: NumericValue;
    /** EasingNode or `alias("easings", ...)`. */
    easing?: EasingValue;
    /** ms or s numeric, or `alias("durations", ...)`. */
    delay?: NumericValue;
}

/** A keyframe-animation instance (lowering to CSS `animation`). `name` references a
 *  `CoreConfig.keyframes` entry; the rest are the usual longhands. `duration` and `delay`
 *  are `ms` or `s` numerics or an alias into `durations`. Leaf-kind "animation". */
export interface AnimationNode {
    type: "animation";
    /** Keyframes key. */
    name: string;
    /** ms or s numeric, or `alias("durations", ...)`. */
    duration: NumericValue;
    easing?: EasingValue;
    /** ms or s numeric, or `alias("durations", ...)`. */
    delay?: NumericValue;
    iterations?: number | "infinite";
    direction?: "normal" | "reverse" | "alternate" | "alternateReverse";
    fillMode?: "none" | "forwards" | "backwards" | "both";
}

/* Math. */

/** Portable infix arithmetic over numerics and refs (lowering to CSS `calc()`; a native
 *  target evaluates eagerly when every operand is static). A single node applies one operator
 *  to `operands`, folded left to right. Build mixed-operator expressions and explicit
 *  precedence by nesting: operands are `NumericValue`, so a `CalcNode` nests inside another.
 *  `div(sub(pct(100), px(16)), unitless(2))` becomes `calc(calc(100% - 16px) / 2)`. Mixed units
 *  are the author's call (`100% - 16px` is valid). Produces a dimension, so leaf-kind "calc" is
 *  usable wherever a `numeric` is. */
export interface CalcNode {
    type: "calc";
    op: "+" | "-" | "*" | "/";
    /** Two or more operands. */
    operands: NumericValue[];
}

/** CSS math functions: the comparison and clamping family the infix form of `calc()` cannot
 *  express, discriminated by `fn` so arity is enforced at the type level (`clamp` is a fixed
 *  3-tuple; `min` and `max` are variadic). Args are `NumericValue`, so they nest `calc`, refs,
 *  and units freely. A native target maps to its own min, max, and clamp (or `platform()`).
 *  Fluid values that need viewport units (`clamp(1rem, ...vw, 2rem)`) carry the `vw` leg
 *  through `platform()` or `literal`, since `vw` is not a portable `Unit`. Also a dimension:
 *  leaf-kind "mathFn", where every variant shares `type: "mathFn"` and `fn` discriminates. */
export type MathFnNode = MinMaxNode | ClampNode;

/** `min()` / `max()`: the smallest / largest of one or more operands. */
export interface MinMaxNode {
    type: "mathFn";
    fn: "min" | "max";
    /** One or more operands. */
    args: NumericValue[];
}

/** `clamp(lower, preferred, upper)`: a fluid or bounded value. */
export interface ClampNode {
    type: "mathFn";
    fn: "clamp";
    /** Exactly `[lower, preferred, upper]`. */
    args: [NumericValue, NumericValue, NumericValue];
}
