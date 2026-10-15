# Multi-config UI library, working design doc

> **Status:** draft, refining. This is a living document. Nothing here is final.
> Sections tagged **[OPEN]** are decisions we still need to make. **[DECIDED]**
> marks things we've settled. **[REPO]** notes reconcile the abstract design with
> what exists in this monorepo today.
>
> **Scope of this doc:** capture the architecture, the AST contract, and the
> resolution/override model for a multi-config UI library, adapted to the
> `pureform` repo (SolidJS, `@pureform/*`, Panda CSS beta).

---

## 1. Context and goals

We want a UI system where **one agnostic source of truth** describes design tokens
and component recipes, and multiple **adapters** compile that source into concrete
build-tool assets (starting with Panda CSS). Consumers pick the layer of convenience
they want: raw config, copy-paste source, or a turnkey package. They override styling
at runtime through CSS custom properties without rebuilding.

**Primary goals**

- Single agnostic definition of tokens + component recipes (no CSS/platform baked in).
- Deterministic compilation to Panda CSS (first target), open to Tailwind v4 / others.
- Runtime override at four cascade levels (global, then component, then contextual scope, then instance).
- Copy-paste (shadcn-style) delivery **and** a packaged component library.

**Non-goals (for now)**

- Multi-framework component runtime. **[REPO]** This repo is **SolidJS**-first; React
  is out of scope until Solid is solid. (See §8 Open Questions.)
- A visual theme editor / GUI.

---

## 2. Reconciliation with the actual repo **[REPO]**

The originating spec used generic `@org/*` names and React. This repo differs, and
the design must track reality:

| Spec assumption         | Repo reality                                            |
| ----------------------- | ------------------------------------------------------- |
| `@org/*` scope          | `@pureform/*`                                           |
| React (`@org/ui-react`) | **SolidJS** (`apps/solid-demo`, `solid-js` 2.0 rc)      |
| `@org/core` AST package | **Does not exist yet**                                  |
| `@org/adapter-panda`    | **Does not exist yet**                                  |
| Panda CSS               | `@pandacss/*` **2.0.1** (stable)                        |
| Hand-authored preset    | `@pureform/pandacss-preset` already exists (imperative) |

### What already exists that we can lean on

- **`@pureform/pandacss-preset`**. A working, hand-written Panda preset. Components:
  `button`, `card`, `icon-button`, `ripple-layer`, `scrim`, `state-container`.
  It _already_ uses the "CSS-var contract with a token fallback" pattern this design
  formalizes. Example from `button.ts`:
    - defines vars like `--<prefix>-button-color-main`
    - sets them from tokens: `[buttonMainVar]: 'token(colors.<...>)'`
    - consumes them: `bg: 'var(--<prefix>-button-color-main)'`
    - falls back to primitives for disabled states via `opacityMix(...)`.
- **`@pureform/ui-utils`**. Material-style building blocks: `ColorScheme` (HCT / tonal
  palettes via chroma-js), elevation (shadow + surface), typography. These generate
  primitive and semantic token _values_.
- **`@pureform/utils`**. `deepMerge`, `clone`, `keyOf`, `capitalize`, `lowerFirst`, and more.
- **`@pureform/type-utils`**. `DeepMerge`, `FlattenKeyOf`, `UnionToIntersection`, and more.
- **omni `ts-package` generator**. Scaffolds new packages consistently (used for
  Layer 1 and 2 packages when we get there).

### Implication for the design

The current preset is effectively a **hand-written Layer 2**. Introducing the AST
(Layer 1) means the preset stops being the source of truth and instead becomes
_generated output_ of the Panda adapter. That is a migration, not a greenfield build.
See §7 Migration Path.

---

## 3. Architecture and distribution layers

```
[ Layer 1: Core AST DSL ]   @pureform/core
        tokens · semanticTokens · components (recipes) · dynamic contract points
        Zero CSS / platform assumptions. Agnostic typed object tree.
                    │
                    ▼
[ Layer 2: Style Adapters ] @pureform/panda-adapter (+ future @pureform/tailwind-adapter)
        Consumes AST, emits panda preset (presets, recipes, semanticTokens, utilities)
                    │
                    ▼
[ Layer 3: Delivery (CLI) ] copy-paste source (shadcn-style) + Zag.js behaviors
        `npx @pureform/cli add button` drops a Solid component + recipe binding into the consumer
                    │
                    ▼
[ Layer 4: Packaged UI ]    @pureform/solid (turnkey npm install)
```

- **Layer 1, core DSL.** The agnostic AST. Primitive tokens, semantic tokens,
  component recipes, and platform-agnostic dynamic contract points (`dynamic`).
- **Layer 2, style adapters.** Compiler plugins that consume the AST and generate
  target build-tool assets. First target: Panda preset (matching today's preset shape).
- **Layer 3, component delivery (CLI).** Copies accessible behavior (Zag.js state
  machines) + recipe-bound Solid elements directly into consumer code.
- **Layer 4, full library package.** Pre-compiled, turnkey Solid component library. Also
  home to the per-platform runtime bindings behind portable contracts, such as the
  size-observer that evaluates `containerSize`/`containerBreakpoint` where there's no native
  CSS `@container` (`ResizeObserver` on web, `onLayout` on native; §4.5), and runtime
  override contract points (`--ui-*`, §6).

**[DECIDED]** Layer 1 (`@pureform/core`) **owns** the canonical token values and is the
dependency root. `ui-utils` depends on core and feeds its generated palettes and elevation
_into_ core's contract, rather than core consuming `ui-utils` as an upstream input. There
is no bespoke interchange type. The hand-off is `Partial<CoreConfig>` fragments built with
core's own node constructors and composed via `mergeConfigs`. (See §8 #5.)

**[DECIDED] Theme contracts sit between core and the generators.** `@pureform/theme`
depends only on core. It names what components read from each foundation (the contracts) and
how a generator fills one (a provider). `@pureform/material` implements Material's providers
against it, and `@pureform/preset` builds `pureform()` from providers. See §4.8.

**[DECIDED] Core stays design-system-agnostic.** Design-system-specific conveniences (e.g.
Material _state layers_ and _elevation_ steps) do NOT live in core. They belong to a
Material layer (`@pureform/ui-utils` / a `@pureform/material` generator) that takes a
Material config and emits a plain `@pureform/core` config, using only core's generic
primitives (`colorMix`, `shadow`, …) through internal helpers. Core ships the primitives.
The Material-flavoured sugar lives upstream.

---

## 4. Core AST specification (`@pureform/core`)

Typed object node model with `string[]` path structures. It avoids hardcoded CSS string
functions (`var(...)`, `{tokens.path}`), which are an adapter concern.

### 4.1 AST node definitions and helpers (`src/ast/`)

The AST lives in a small directory: node **types** in `nodes.ts`, and **helper
constructors** grouped by concern under `helpers/` (each namespace-importable), all
re-exported from an `index.ts` barrel.

```ts
// src/ast/nodes.ts: node type definitions
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

/** Placeholder for the call-site value of a value-parameterized utility
 *  (`DynamicUtilityDef`, §4.2). At expansion the adapter substitutes each `arg(key?)` in a
 *  utility's `template` with the value supplied via `apply`: `arg()` is the whole single arg,
 *  and `arg("x")` / `arg(0)` is a named or positional member (object- or array-valued
 *  `apply`). Valid only inside a dynamic-utility template; `defineConfig` validation rejects
 *  it anywhere else (it has no argument to resolve). It is a `RefNode`, so it's accepted
 *  wherever a value is and composes inside `calc`/`mathFn` (e.g. `mul(arg(), px(4))`). */
export interface UtilityArgNode {
    type: "utilityArg";
    /** Named (object `apply`) or positional (array `apply`) member; absent means the single arg. */
    key?: string | number;
}

/** Reference / indirection nodes. Each resolves to some value defined elsewhere (a token
 *  path, a runtime var, a per-target or per-state branch, or a utility's call-site arg), so
 *  it's valid wherever any concrete value of the right kind is. Their resolved kind is
 *  checked at compile time by the adapter, not by TS: this is the one deliberate hole in
 *  kind-safety (a path/var/arg is opaque to the type system). Re-exported from
 *  `value-map.ts` for `ValueNodeMap`. */
export type RefNode =
    AliasNode | DynamicNode | PlatformNode | ConditionalNode | UtilityArgNode;

/* ── Semantic value unions ───────────────────────────────
 * Guideline (narrowest-acceptable): a field that holds a value never types it as the full
 * `ValueNode`. It uses the narrowest union valid for that slot, so the type system rejects
 * nonsense (`blur: aColorNode`, `easing: px(4)`) at the call site instead of deferring to
 * the adapter. Each union is the concrete leaf kinds that belong there plus `RefNode` (a ref
 * may resolve to any kind). The exceptions are the generic indirection slots that are
 * kind-agnostic by design (`DynamicNode.default`, `PlatformNode.values`/`default`,
 * `ConditionalNode.base`, `ConditionalCase.value`), which stay `ValueNode` because they
 * forward whatever kind their context expects. `StyleMap` expresses the same intent via
 * its `ValueNodeMap`-derived categories (`Color`/`Dimension`/…, §4.1 value-map); these
 * node-level aliases are the upstream equivalent for composite-node fields, since
 * `nodes.ts` can't depend on `value-map.ts`. Add a union here when a new field needs one. */

/** A value resolving to a dimension / number: a unit-encoded numeric, infix arithmetic, a
 *  math function, or a reference. No keyword `literal`, since composite numeric slots are
 *  strictly dimensional; reach for `platform()` when an opaque escape is unavoidable. */
export type NumericValue = NumericScalarNode | CalcNode | MathFnNode | RefNode;

/** A value resolving to a single color: a space-encoded color, a `color-mix`, the portable
 *  `transparent` keyword (a `KeywordNode`), a raw `literal` escape, or a reference. */
export type ColorValue =
    | ColorNode
    | ColorMixNode
    | KeywordNode<ColorKeyword>
    | LiteralScalarNode
    | RefNode;

/** A value resolving to a timing function: an `EasingNode` or a reference
 *  (`alias('easings', …)`). */
export type EasingValue = EasingNode | RefNode;

/** Portable units with a deterministic BUILD-TIME STATIC lowering on every target (see §4.4
 *  and the keyword portability test below). `px`/`%`/`ms`/`s` are verbatim; `rem` resolves
 *  against a configured base; `em` is a relative length like `rem`: web-verbatim, and non-web
 *  resolves it against the in-scope font-size (a static approximation, like `rem`'s base, so
 *  a runtime font-size change isn't tracked off-web); angles (`deg`/`rad`/`turn`) are portable
 *  since native transform/animation engines use them. `'none'` means explicitly unitless
 *  (fontWeight, lineHeight, zIndex, opacity, flex, …).
 *
 *  Excluded because no build-time static lowering exists: viewport units (`vh`/`vw`/`vmin`/
 *  `vmax`) have no fixed value until runtime, so their only non-web realization is a live
 *  viewport subscription, which style output can't emit (it would need a Layer-4 runtime
 *  binding like container queries, §3/§4.5, not a `Unit`); `ch`/`ex` need async, font-
 *  dependent glyph measurement (lossy); `fr` needs a grid engine RN lacks. Use `platform()`
 *  (with a portable default) or a bare `literal('100vh')` (opaque, web-only) for these. */
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

/** Scalar (leaf primitive) value, discriminated by `type`. Each encodes its "unit" at
 *  the source rather than letting an adapter guess (see §4.4):
 *  - `literal`: raw opaque string, the off-baseline escape (`'100vh'`, a vendor value);
 *  - `numeric`: a number with its `unit`;
 *  - `color`: channels with their color `space` (the color analogue of a unit).
 *  Baseline keyword values (`flex`, `center`, `transparent`, …) are a separate
 *  `KeywordNode`, not a `literal`, so they stay typed and portable (see below). */
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

/** A portable keyword drawn from a closed, per-property vocabulary (`V`). Distinct from
 *  `LiteralScalarNode`, which is the raw opaque-string escape: a keyword carries a canonical,
 *  framework-agnostic token (camelCase, e.g. `spaceBetween`/`notAllowed`) that the adapter
 *  maps per target (web spells it out: `spaceBetween` becomes `space-between`, align `start`
 *  becomes `flex-start`; native maps to its own flex / cursor constants, or applies a
 *  compile-time equivalent). The vocabulary is trimmed to tokens with a deterministic
 *  lowering to every target; values that need a mechanism a target lacks (`grid`, `sticky`,
 *  `double`) are excluded and go through `literal` / `platform()`. `V` narrows
 *  the acceptable tokens per slot, so `display: keyword("center")` is a type error. Mirrors
 *  the easing-keyword precedent (`easeInOut` becomes `ease-in-out`). Leaf-kind "keyword". */
export interface KeywordNode<V extends string = string> {
    type: "keyword";
    value: V;
}

/* ── Baseline keyword vocabulary ─────────────────────────
 * Closed, portable token sets, grouped by the concept a property selects from. Each group is
 * the acceptable `V` for the matching `StyleMap` keyword slots (§4.1 value-map). Tokens are
 * canonical camelCase; the adapter owns the per-target spelling.
 *
 * Portability test: a token is portable if the Layer-2 adapter has a DETERMINISTIC
 * BUILD-TIME STATIC lowering for it on every target, i.e. it resolves to a concrete static
 * style value at compile time (a native value, a verbatim pass-through, or a per-target
 * spelling). The core only emits static styling, so the lowering may NOT depend on runtime
 * behavior, and may NOT be a live reference to another property's computed value. `inlineFlex`
 * has no native inline flow so it lowers to `flex`; `clip` lowers to `hidden` where
 * unsupported. A token is excluded when the lowering is ambiguous or lossy, needs runtime
 * info, is a dynamic reference, or needs a mechanism a target lacks: `grid` (a layout engine
 * RN lacks), `block`/`inline`/`contents` (a box/inline-flow model RN lacks), `fixed`/`sticky`
 * (runtime scroll-position mechanics), `double` border (extra render nodes), `currentColor`
 * (a live link to the `color` property, dynamic even on web, so freezing it is unfaithful).
 * Those go through `literal` or `platform()`. (A concept whose only non-web
 * realization is runtime, like container queries, isn't a keyword at all; it's a portable
 * CONDITION fulfilled by a Layer-4 runtime binding, see §3 and §4.5, never by style output.)
 * Widen a group (and add the matching `keyword.*` helper) when a property needs another
 * build-time-portable value. */

/** `alignItems` / `justifyContent` / `alignSelf` / `justifySelf` / `alignContent`. Every
 *  token is a portable flex value (web and RN both accept them); `space*` is only valid on
 *  the `justify*` / `alignContent` axes, not `alignItems` (the slot type doesn't yet split
 *  these, see §9). */
export type AlignKeyword =
    | "start"
    | "center"
    | "end"
    | "stretch"
    | "baseline"
    | "spaceBetween"
    | "spaceAround"
    | "spaceEvenly";
/** Portable: `inlineFlex` lowers to `flex` on targets with no inline flow (RN). Still out:
 *  `block`/`inline`/`grid`/`contents` need a box/inline/grid model RN lacks, so author them
 *  web-side with `platform({ css: literal("grid") }, flex)`. */
export type DisplayKeyword = "flex" | "inlineFlex" | "none";
/** Portable only: RN has no `fixed`/`sticky`. Author those web-side with `platform()`. */
export type PositionKeyword = "relative" | "absolute" | "static";
export type FlexDirectionKeyword =
    "row" | "column" | "rowReverse" | "columnReverse";
/** Portable only: RN `borderStyle` has no `double`. */
export type LineStyleKeyword = "none" | "solid" | "dashed" | "dotted";
export type TextAlignKeyword = "start" | "end" | "center" | "justify"; // logical; prefer start/end
/** A pointer-device hint. Inert where there's no pointer (touch), like `hover`; the native
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
/** Portable: `clip` lowers to `hidden` where unsupported (RN). */
export type OverflowKeyword = "visible" | "hidden" | "scroll" | "auto" | "clip";
/** `transparent` is a static color constant (verbatim on every target). `currentColor` is
 *  NOT here: it's a live link to the `color` property (dynamic even on web), so it can't be a
 *  static keyword; use `literal("currentColor")` web-side, or model it as a reference to the
 *  `color` source (§9). */
export type ColorKeyword = "transparent";

/** Color spaces the AST can carry. A color encodes its SPACE at the source (like a
 *  numeric encodes its unit); adapters render to the target's syntax and gamut-downgrade
 *  if needed (e.g. display-p3 to srgb) rather than assuming sRGB-hex. `hct`/`oklch` are
 *  `ui-utils`' generation spaces, preserved instead of flattened to hex. */
export type ColorSpace =
    "srgb" | "hsl" | "oklch" | "oklab" | "lab" | "lch" | "hct" | "display-p3";

export interface ColorNode {
    type: "color";
    space: ColorSpace;
    components: number[]; // channels for `space` (e.g. oklch is [L, C, H]); ranges per §4.4
    alpha?: number; // 0..1, default 1
}

/** A color computed at the target by compositing `with` over `base` by `amount`, in the
 *  given color `space`. Works over a dynamic var whose value isn't known until runtime (e.g.
 *  a hover/press scrim); `alpha()` over a non-concrete color is sugar that lowers to this
 *  (fade toward `transparent`). Lowers to CSS `color-mix(in <space>, base, with amount)`.
 *  Produces a color (leaf-kind "colorMix"), so it's usable wherever a color is. (Material's
 *  state-layer sugar is built on this upstream, see §3, not in core.) */
export interface ColorMixNode {
    type: "colorMix";
    space: ColorSpace;
    base: ColorValue; // the color being tinted (often a dynamic / alias)
    with: ColorValue; // the overlay / scrim color
    amount: NumericValue; // share of `with`, a `%` numeric (or a ref to one)
}

/** Portable font-family value. Web joins `stack` and `generic` into a CSS font-family
 *  string; a non-web adapter uses `stack[0]` (the bundled/primary family) and drops the
 *  CSS-only fallback tail. Font *loading* (@font-face / bundling) is not core's concern
 *  (§4.6); this only names families. */
export interface FontFamilyNode {
    type: "fontFamily";
    stack: string[]; // ordered preference, e.g. ["Inter", "system-ui"]
    generic?: "sans-serif" | "serif" | "monospace" | "cursive" | "system-ui";
}

/** Composite box-shadow: an ordered stack of layers (Material elevation is several
 *  layered shadows, not one). Web joins layers into a single `box-shadow`; a native
 *  adapter maps to its own elevation model (or reads the layers), typically via
 *  `platform()`. Each layer's `color` is a `ColorValue` so it can reference tokens / vars;
 *  offsets/blur/spread are `NumericValue` so they can be token-driven or `calc`-derived. */
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

export interface AliasNode {
    type: "alias";
    path: string[]; // e.g. ['tokens', 'colors', 'violet600']
}

/** Platform-agnostic contract for runtime dynamic overrides. */
export interface DynamicNode {
    type: "dynamic";
    path: string[]; // e.g. ['ui', 'button', 'bg']
    /** Runtime fallback: used when the override var is unset in the cascade
     *  (lowers to CSS `var(--name, <default>)`). Nest another `dynamic` here to
     *  build a multi-level fallback chain. Distinct from PlatformNode.default,
     *  which is a build-time selection. */
    default?: ValueNode;
}

/** Escape hatch for values that can't be expressed portably (e.g. CSS `100vh`,
 *  a native shadow object). Maps an adapter target id to a raw value, plus a
 *  required portable `default`.
 *
 *  Target ids are open free-form strings; core never enumerates them as a closed
 *  union, so any future adapter can define its own id (`'qt'`, `'skia'`, …) without
 *  changing core. An adapter with no entry for its own id uses `default`, but may
 *  instead read and translate a sibling target's value (e.g. a native adapter
 *  interpreting the `css` entry). `default` is only the guaranteed baseline. */
export interface PlatformNode {
    type: "platform";
    /** open target id (adapter-defined, e.g. 'css', 'rn', 'qt') to value */
    values: Record<string, ValueNode>;
    /** Build-time baseline for any target that neither has an entry nor translates
     *  one. Distinct from DynamicNode.default (a runtime var fallback). */
    default: ValueNode;
}

/** Pointer / focus / interactivity states. */
export type InteractionCondition =
    "hover" | "focus" | "focusVisible" | "active" | "pressed" | "disabled";

/** Form / selectable-control states. */
export type FormCondition = "selected" | "checked" | "invalid" | "readOnly";

/** Color-scheme states (lower to `prefers-color-scheme` or `[data-theme]`). */
export type ColorSchemeCondition = "dark" | "light";

/** Writing-direction states. The escape for direction-aware styling that logical
 *  properties can't express (visual mirroring, a flipped asset); prefer flow-relative
 *  properties (`paddingInlineStart`, `textAlign: 'start'`; §4.1 StyleMap) which flip with no
 *  condition. Lowers to `[dir=rtl]` / `:dir(rtl)` (web) or `I18nManager.isRTL` (native). */
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

/** Portable, cross-target states the core guarantees, split by axis. Adapters own
 *  the lowering (web: pseudo-class / media query / data-attr; native: press/disabled
 *  state; …), and core never encodes selectors. Mirrors the `Unit` philosophy (§4.4): a
 *  closed portable set plus a `rawCondition` escape hatch for everything else. */
export type PortableCondition =
    | InteractionCondition
    | FormCondition
    | ColorSchemeCondition
    | DirectionCondition
    | MediaCondition;

/** Escape hatch for conditions that aren't portable: an adapter-target-keyed raw
 *  selector/at-rule, e.g. `{ css: "&[data-state=open]" }`. Condition-level analogue
 *  of PlatformNode. */
export interface RawCondition {
    type: "rawCondition";
    by: Record<string, string>; // target id to raw selector/at-rule
}

/* ── Size queries: {viewport|container} × {breakpoint|size} ──────
 * All four are ranges. `*Breakpoint` bounds are breakpoint token keys
 * (into CoreConfig.breakpoints) and use `{ from, until }`: a half-open interval
 * `[from, until)`, where `from` is inclusive (min-width) and `until` exclusive (matches
 * mobile-first bands, so no max-width off-by-one). `*Size` bounds are ad-hoc
 * `NumericScalarNode`s and use `{ min, max }`: inclusive, mapping straight to CSS
 * min-width/max-width. These stay a bare `NumericScalarNode` (not `NumericValue`) on
 * purpose: media/container query bounds must be static lengths (`var()`/`calc()` aren't
 * valid there), so refs are correctly rejected. The adapter owns the exact lowering (incl.
 * modern `(width < …)` range syntax). */

/** Viewport `@media` range at named breakpoint tokens. Either bound may be omitted for an
 *  open-ended range (`{ from }` is token-and-up, `{ until }` is below token). */
export interface ViewportBreakpointCondition {
    type: "viewportBreakpoint";
    from?: string; // breakpoint token key, lower bound (inclusive)
    until?: string; // breakpoint token key, upper bound (exclusive)
}

/** Viewport `@media` range at ad-hoc sizes (no token). Sizes stay unit-encoded. */
export interface ViewportSizeCondition {
    type: "viewportSize";
    min?: NumericScalarNode; // min-width
    max?: NumericScalarNode; // max-width
}

/** Container `@container` range at named breakpoint tokens (reuses the same
 *  `CoreConfig.breakpoints` scale as the viewport). `from`/`until` as above; `container`
 *  optionally targets a named container; omit for the nearest. Needs an ancestor with a
 *  container-type established. */
export interface ContainerBreakpointCondition {
    type: "containerBreakpoint";
    from?: string; // breakpoint token key, lower bound (inclusive)
    until?: string; // breakpoint token key, upper bound (exclusive)
    container?: string; // named container; omit for the nearest
}

/** Container `@container` range at ad-hoc sizes. Named `…SizeCondition` so a future
 *  `ContainerStyleCondition` (`@container style(…)`) can slot in beside it. */
export interface ContainerSizeCondition {
    type: "containerSize";
    min?: NumericScalarNode; // min-width
    max?: NumericScalarNode; // max-width
    container?: string; // named container; omit for the nearest
}

export type Condition =
    | PortableCondition
    | ViewportBreakpointCondition
    | ViewportSizeCondition
    | ContainerBreakpointCondition
    | ContainerSizeCondition
    | RawCondition;

/** A value that varies by state. `base` applies when no case matches; each case's
 *  `on` lists one or more conditions that must all hold. When several cases apply at
 *  once, the target's normal cascade/specificity resolves them (adapter-defined).
 *  Case `value`s are themselves `ValueNode`s, so conditionals nest and compose with
 *  `alias`/`dynamic`/`platform`. */
export interface ConditionalNode {
    type: "conditional";
    base: ValueNode;
    cases: ConditionalCase[];
}

export interface ConditionalCase {
    on: Condition | Condition[]; // array means AND
    value: ValueNode;
}

/* ── Gradients ───────────────────────────────────────── */

/** A color gradient (a background image). Stops reuse `ColorNode`/refs so they stay
 *  themeable. `angle` applies to `linear` (default `180deg`, top to bottom) and `conic`;
 *  `radial` ignores it. Lowers to CSS `linear|radial|conic-gradient()`; native targets
 *  use their own gradient API (or `platform()`). Leaf-kind "gradient". */
export interface GradientNode {
    type: "gradient";
    kind: "linear" | "radial" | "conic";
    stops: GradientStop[];
    angle?: NumericValue; // deg/turn (linear/conic only)
}

export interface GradientStop {
    color: ColorValue;
    position?: NumericValue; // % or length; omit to auto-distribute
}

/* ── Transforms & filters ──────────────────────────────── */
/* ── Transforms & filters ─────────────────────── */

/** Ordered transform ops (lowering to CSS `transform`). Rotate/skew args carry an angle
 *  unit, translate args a length, and scale is unitless; each arg is a `NumericValue` (a
 *  unit-encoded numeric, a `calc`, or a token/var ref; see §4.4). Native targets map
 *  op-for-op. Leaf-kind "transform". */
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

/** Ordered filter functions (lowering to CSS `filter` / `backdrop-filter`). Web-leaning;
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

/* ── Motion: easing, transitions, animations ────────────────── */

/** A timing function, discriminated by `kind`. `keyword` is the portable preset set;
 *  `cubicBezier`/`steps` are the structured forms (universal across web and native animation
 *  engines). Usually stored as a token under `CoreConfig.easings` and referenced by alias.
 *  Leaf-kind "easing" (every variant shares `type: "easing"`; `kind` discriminates). */
export type EasingNode =
    KeywordEasingNode | CubicBezierEasingNode | StepsEasingNode;

/** Portable keyword easing (`ease-in-out`, …). */
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
 *  name or 'all'; `duration`/`delay` are `ms`/`s` numerics or an alias into `durations`;
 *  `easing` is an `EasingNode` or an alias into `easings`. Leaf-kind "transition". */
export interface TransitionNode {
    type: "transition";
    parts: TransitionPart[];
}

export interface TransitionPart {
    property: string;
    duration: NumericValue; // ms/s numeric or alias('durations', …)
    easing?: EasingValue; // EasingNode or alias('easings', …)
    delay?: NumericValue; // ms/s numeric or alias('durations', …)
}

/** A keyframe-animation instance (lowering to CSS `animation`). `name` references a
 *  `CoreConfig.keyframes` entry; the rest are the usual longhands. `duration`/`delay` are
 *  `ms`/`s` numerics or an alias into `durations`. Leaf-kind "animation". */
export interface AnimationNode {
    type: "animation";
    name: string; // keyframes key
    duration: NumericValue; // ms/s numeric or alias('durations', …)
    easing?: EasingValue;
    delay?: NumericValue; // ms/s numeric or alias('durations', …)
    iterations?: number | "infinite";
    direction?: "normal" | "reverse" | "alternate" | "alternateReverse";
    fillMode?: "none" | "forwards" | "backwards" | "both";
}

/* ── Math ──────────────────────────────────────────── */

/** Portable infix arithmetic over numerics / refs (lowering to CSS `calc()`; a native
 *  target evaluates eagerly when every operand is static). A single node applies one
 *  operator to `operands` (folded left-to-right); mixed-operator expressions and explicit
 *  precedence are built by nesting (operands are `NumericValue`, so a CalcNode nests inside
 *  another): `div(sub(pct(100), px(16)), unitless(2))` becomes `calc(calc(100% - 16px) / 2)`.
 *  Mixed units are the author's call (`100% - 16px` is valid). Produces a dimension, so
 *  leaf-kind "calc" is usable wherever a `numeric` is. */
export interface CalcNode {
    type: "calc";
    op: "+" | "-" | "*" | "/";
    operands: NumericValue[]; // >= 2
}

/** CSS math functions: the comparison / clamping family `calc()`'s infix form can't
 *  express, discriminated by `fn` so arity is enforced at the type level (`clamp` is a
 *  fixed 3-tuple; `min`/`max` are variadic). Args are `NumericValue`, so they nest
 *  `calc`/refs/units freely. A native target maps to its own min/max/clamp (or
 *  `platform()`). Fluid values that need viewport units (`clamp(1rem, …vw, 2rem)`) carry
 *  the `vw` leg via `platform()`/`literal`, since `vw` isn't a portable `Unit` (§4.4). Also
 *  a dimension: leaf-kind "mathFn" (every variant shares `type: "mathFn"`; `fn` discriminates). */
export type MathFnNode = MinMaxNode | ClampNode;

/** `min()` / `max()`: the smallest / largest of one or more operands. */
export interface MinMaxNode {
    type: "mathFn";
    fn: "min" | "max";
    args: NumericValue[]; // >= 1
}

/** `clamp(lower, preferred, upper)`: a fluid / bounded value. */
export interface ClampNode {
    type: "mathFn";
    fn: "clamp";
    args: [NumericValue, NumericValue, NumericValue]; // exactly [lower, preferred, upper]
}
```

```ts
// src/ast/helpers/scalar.ts: scalar node builders
import type { LiteralScalarNode, NumericScalarNode, Unit } from "../nodes";

/** Raw opaque string, the off-baseline escape (`'100vh'`, a vendor value). Numbers are not
 *  accepted here; use `numeric` or the `unit.*` sugar so a unit is always encoded. For a
 *  baseline keyword (`flex`, `center`, `solid`, `transparent`, …) use the typed
 *  `keyword.*` helpers instead, so the value stays portable and type-checked. */
export const literal = (value: string): LiteralScalarNode => ({
    type: "literal",
    value,
});
/** Numeric value with an explicit unit. Prefer the `unit.*` sugar at call sites. */
export const numeric = (value: number, unit: Unit): NumericScalarNode => ({
    type: "numeric",
    value,
    unit,
});
```

```ts
// src/ast/helpers/keyword/ : baseline keyword builders, one submodule per concept.
// namespace-import one group:  import * as align from "@pureform/core/ast/helpers/keyword/align"
// or the whole set:            import * as kw from "@pureform/core/ast/helpers/keyword"

// ── kw.ts (shared builder; not re-exported from the barrel) ──
import type { KeywordNode } from "../../nodes";
/** Generic keyword builder. Each export infers its narrow literal (`kw("center")` is
 *  `KeywordNode<"center">`), assignable to every slot whose vocabulary includes that token
 *  (`KeywordNode` is covariant in `V`). So one `center` serves both `Keyword<AlignKeyword>`
 *  and `Keyword<TextAlignKeyword>`, while a slot still rejects a token outside its
 *  vocabulary. Reach for `literal` only for an off-baseline value. */
export const kw = <const V extends string>(value: V): KeywordNode<V> => ({
    type: "keyword",
    value,
});

// ── align.ts (alignItems / justifyContent / *Self / alignContent) ──
import { kw } from "./kw";
export const start = kw("start");
export const center = kw("center");
export const end = kw("end");
export const stretch = kw("stretch");
export const baseline = kw("baseline");
export const spaceBetween = kw("spaceBetween");
export const spaceAround = kw("spaceAround");
export const spaceEvenly = kw("spaceEvenly");

// ── display.ts (inlineFlex lowers to flex on native; block/inline/grid are web-only) ──
import { kw } from "./kw";
export const flex = kw("flex");
export const inlineFlex = kw("inlineFlex");

// ── position.ts (fixed/sticky are web-only) ──
import { kw } from "./kw";
export const relative = kw("relative");
export const absolute = kw("absolute");
export const staticPos = kw("static"); // `static` is a reserved word

// ── flexDirection.ts ──
import { kw } from "./kw";
export const row = kw("row");
export const column = kw("column");
export const rowReverse = kw("rowReverse");
export const columnReverse = kw("columnReverse");

// ── lineStyle.ts (border / outline; `double` is web-only) ──
import { kw } from "./kw";
export const solid = kw("solid");
export const dashed = kw("dashed");
export const dotted = kw("dotted");

// ── textAlign.ts (start / center / end come from align) ──
import { kw } from "./kw";
export const justify = kw("justify");

// ── cursor.ts (pointer hint; inert on touch) ──
import { kw } from "./kw";
export const pointer = kw("pointer");
export const notAllowed = kw("notAllowed");
export const text = kw("text");
export const move = kw("move");
export const grab = kw("grab");

// ── overflow.ts (clip lowers to hidden where unsupported) ──
import { kw } from "./kw";
export const visible = kw("visible");
export const hidden = kw("hidden");
export const scroll = kw("scroll");
export const clip = kw("clip");

// ── color.ts (transparent only; currentColor is a dynamic color reference, not a keyword) ──
import { kw } from "./kw";
export const transparent = kw("transparent");

// ── common.ts (tokens that span several concepts) ──
import { kw } from "./kw";
export const none = kw("none"); // display / line-style / overflow
export const auto = kw("auto"); // cursor / overflow / sizing

// ── index.ts (flat barrel; `kw.*` sees every token — no name clashes across groups) ──
export * from "./align";
export * from "./display";
export * from "./position";
export * from "./flexDirection";
export * from "./lineStyle";
export * from "./textAlign";
export * from "./cursor";
export * from "./overflow";
export * from "./color";
export * from "./common";
```

```ts
// src/ast/helpers/unit.ts: unit sugar over scalar.numeric
import type { NumericScalarNode } from "../nodes";
import { numeric } from "./scalar";

export const px = (value: number): NumericScalarNode => numeric(value, "px");
export const rem = (value: number): NumericScalarNode => numeric(value, "rem");
/** Font-relative: web verbatim; non-web resolves against the in-scope font-size (§4.4). */
export const em = (value: number): NumericScalarNode => numeric(value, "em");
export const pct = (value: number): NumericScalarNode => numeric(value, "%");
/** Explicitly unitless number (fontWeight, lineHeight, zIndex, opacity, …). */
export const unitless = (value: number): NumericScalarNode =>
    numeric(value, "none");
```

```ts
// src/ast/helpers/ref.ts: reference nodes
import type { AliasNode, DynamicNode, ValueNode } from "../nodes";

/** Build-time reference to another node by path. */
export const alias = (...path: string[]): AliasNode => ({
    type: "alias",
    path,
});
/** Runtime dynamic override by path, with an optional fallback node. */
export const dynamic = (
    path: string[],
    defaultValue?: ValueNode,
): DynamicNode => ({
    type: "dynamic",
    path,
    default: defaultValue,
});
```

```ts
// src/ast/helpers/platform.ts: target-specific escape hatch
import type { PlatformNode, ValueNode } from "../nodes";

/** `values` is keyed by adapter target id; `default` is the required portable
 *  fallback. e.g. `platform({ css: literal('100vh') }, px(800))`. */
export const platform = (
    values: Record<string, ValueNode>,
    defaultValue: ValueNode,
): PlatformNode => ({
    type: "platform",
    values,
    default: defaultValue,
});
```

```ts
// src/ast/helpers/condition.ts: conditional value builder
import type {
    Condition,
    ConditionalCase,
    ConditionalNode,
    ContainerBreakpointCondition,
    ContainerSizeCondition,
    NumericScalarNode,
    RawCondition,
    ValueNode,
    ViewportBreakpointCondition,
    ViewportSizeCondition,
} from "../nodes";

export interface ConditionalBuilder {
    /** Add a case. `conditions` is one condition or an AND-list. Chainable. */
    on(
        conditions: Condition | Condition[],
        value: ValueNode,
    ): ConditionalBuilder;
    /** Supply the fallback and finish; returns the ConditionalNode. */
    else(base: ValueNode): ConditionalNode;
}

/** Conditional value. Two forms:
 *  - `when(cond, value, base)`: shorthand for a single condition;
 *  - `when().on(cond, value)….else(base)`: fluent builder for multiple/compound
 *    cases (the terminal `else` supplies the required base). */
export function when(): ConditionalBuilder;
export function when(
    conditions: Condition | Condition[],
    value: ValueNode,
    base: ValueNode,
): ConditionalNode;
export function when(
    conditions?: Condition | Condition[],
    value?: ValueNode,
    base?: ValueNode,
): ConditionalBuilder | ConditionalNode {
    if (conditions !== undefined) {
        return {
            type: "conditional",
            base: base as ValueNode,
            cases: [{ on: conditions, value: value as ValueNode }],
        };
    }
    const cases: ConditionalCase[] = [];
    const builder: ConditionalBuilder = {
        on(c, v) {
            cases.push({ on: c, value: v });
            return builder;
        },
        else(b) {
            return { type: "conditional", base: b, cases };
        },
    };
    return builder;
}
/** Viewport `@media` range at breakpoint token(s). String shorthand = `from` (the common
 *  "token and up" case); object form for bands / `until` (exclusive upper bound). */
export const viewportBreakpoint = (
    bp: string | { from?: string; until?: string },
): ViewportBreakpointCondition => ({
    type: "viewportBreakpoint",
    ...(typeof bp === "string" ? { from: bp } : bp),
});
/** Viewport `@media` range at an ad-hoc, inclusive size. */
export const viewportSize = (opts: {
    min?: NumericScalarNode;
    max?: NumericScalarNode;
}): ViewportSizeCondition => ({ type: "viewportSize", ...opts });
/** Container `@container` range at breakpoint token(s) (reuses CoreConfig.breakpoints).
 *  String shorthand = `from`; `container` optionally targets a named container. */
export const containerBreakpoint = (
    bp: string | { from?: string; until?: string },
    container?: string,
): ContainerBreakpointCondition => ({
    type: "containerBreakpoint",
    ...(typeof bp === "string" ? { from: bp } : bp),
    ...(container ? { container } : {}),
});
/** Container `@container` range at an ad-hoc size (container optional; sizes are NumericScalarNodes). */
export const containerSize = (opts: {
    min?: NumericScalarNode;
    max?: NumericScalarNode;
    container?: string;
}): ContainerSizeCondition => ({ type: "containerSize", ...opts });
/** Escape hatch: a target-specific raw condition (selector/at-rule per target id). */
export const rawCondition = (by: Record<string, string>): RawCondition => ({
    type: "rawCondition",
    by,
});
```

```ts
// src/ast/helpers/font.ts: font-family values
import type { FontFamilyNode } from "../nodes";

/** A portable font-family token value. `generic` is the CSS fallback family. */
export const fontFamily = (
    stack: string[],
    generic?: FontFamilyNode["generic"],
): FontFamilyNode => ({
    type: "fontFamily",
    stack,
    ...(generic ? { generic } : {}),
});
```

```ts
// src/ast/helpers/color.ts: color values (space-encoded)
import type {
    ColorMixNode,
    ColorNode,
    ColorSpace,
    ColorValue,
    NumericValue,
} from "../nodes";
import { pct } from "./unit";
import { transparent } from "./keyword/color";

const color = (
    space: ColorSpace,
    components: number[],
    alpha?: number,
): ColorNode => ({
    type: "color",
    space,
    components,
    ...(alpha != null ? { alpha } : {}),
});

export const rgb = (r: number, g: number, b: number, a?: number): ColorNode =>
    color("srgb", [r, g, b], a);
export const hsl = (h: number, s: number, l: number, a?: number): ColorNode =>
    color("hsl", [h, s, l], a);
export const oklch = (l: number, c: number, h: number, a?: number): ColorNode =>
    color("oklch", [l, c, h], a);
/** Material HCT, `ui-utils`' generation space. */
export const hct = (h: number, c: number, t: number, a?: number): ColorNode =>
    color("hct", [h, c, t], a);
/** sRGB hex sugar (`#rgb` / `#rrggbb[aa]`), parsed to channels at build time. */
export const hex = (value: string): ColorNode => color("srgb", hexToRgb(value));
/** Opacity sugar. A concrete color just carries its `alpha` channel. A ref / keyword /
 *  existing mix has no build-time channels, so it fades toward transparent via `color-mix`
 *  (`color-mix(in srgb, transparent, <c> <a*100>%)`), which works over a dynamic var whose
 *  value isn't known until runtime (e.g. `alpha(alias('tokens','colors','x'), 0.3)`). `a` is
 *  the resulting opacity (0..1) in both forms. */
export function alpha(c: ColorNode, a: number): ColorNode;
export function alpha(
    c: Exclude<ColorValue, ColorNode>,
    a: number,
): ColorMixNode;
export function alpha(c: ColorValue, a: number): ColorNode | ColorMixNode {
    return c.type === "color"
        ? { ...c, alpha: a }
        : colorMix(transparent, c, pct(a * 100));
}
/** Composite `over` on top of `base` by `amount` in color `space` (CSS `color-mix`). Works
 *  over a dynamic base (a var) whose value isn't known at build time (e.g. a hover/press
 *  scrim); `alpha()` over a non-concrete color is sugar that lowers to this. The generic
 *  primitive only: design-system conveniences (Material's `stateLayer`, elevation steps)
 *  live upstream in a Material layer (`@pureform/material`) that emits a core config (§3),
 *  not here. */
export const colorMix = (
    base: ColorValue,
    over: ColorValue,
    amount: NumericValue,
    space: ColorSpace = "srgb",
): ColorMixNode => ({ type: "colorMix", space, base, with: over, amount });
```

```ts
// src/ast/helpers/shadow.ts: composite box-shadow / elevation
import type { ShadowLayer, ShadowNode } from "../nodes";

/** Composite box-shadow from an ordered stack of layers (bottom to top). `ui-utils`
 *  generates Material elevation layers; a dedicated `elevation(level)` sugar can live
 *  there and return `shadow(...)`. */
export const shadow = (...layers: ShadowLayer[]): ShadowNode => ({
    type: "shadow",
    layers,
});
```

```ts
// src/ast/helpers/gradient.ts: gradients
import type {
    ColorValue,
    GradientNode,
    GradientStop,
    NumericValue,
} from "../nodes";

const grad = (
    kind: GradientNode["kind"],
    stops: GradientStop[],
    angle?: NumericValue,
): GradientNode => ({
    type: "gradient",
    kind,
    stops,
    ...(angle ? { angle } : {}),
});

export const linearGradient = (stops: GradientStop[], angle?: NumericValue) =>
    grad("linear", stops, angle);
export const radialGradient = (stops: GradientStop[]) => grad("radial", stops);
export const conicGradient = (stops: GradientStop[], angle?: NumericValue) =>
    grad("conic", stops, angle);
/** A gradient stop; `position` is an optional %/length. */
export const stop = (
    color: ColorValue,
    position?: NumericValue,
): GradientStop => ({
    color,
    ...(position ? { position } : {}),
});
```

```ts
// src/ast/helpers/transform.ts: transforms
import type { NumericValue, TransformNode, TransformOp } from "../nodes";

export const transform = (...ops: TransformOp[]): TransformNode => ({
    type: "transform",
    ops,
});
const op = (fn: TransformOp["fn"], ...args: NumericValue[]): TransformOp => ({
    fn,
    args,
});

export const translate = (x: NumericValue, y: NumericValue) =>
    op("translate", x, y);
export const translateX = (x: NumericValue) => op("translateX", x);
export const translateY = (y: NumericValue) => op("translateY", y);
export const scale = (s: NumericValue) => op("scale", s);
export const rotate = (a: NumericValue) => op("rotate", a); // a: deg/turn/rad
```

```ts
// src/ast/helpers/filter.ts: filters
import type { FilterNode, NumericValue } from "../nodes";

type Fn = FilterNode["fns"][number];
export const filter = (...fns: Fn[]): FilterNode => ({ type: "filter", fns });
const fn =
    (name: Fn["fn"]) =>
    (...args: NumericValue[]): Fn => ({ fn: name, args });
export const blur = fn("blur");
export const brightness = fn("brightness");
export const saturate = fn("saturate");
```

```ts
// src/ast/helpers/motion.ts: easing, transitions, animations
import type {
    AnimationNode,
    CubicBezierEasingNode,
    EasingValue,
    KeywordEasingNode,
    NumericValue,
    StepsEasingNode,
    TransitionNode,
    TransitionPart,
} from "../nodes";

/** Keyword easing (`easeInOut`, …). */
export const easing = (name: KeywordEasingNode["name"]): KeywordEasingNode => ({
    type: "easing",
    kind: "keyword",
    name,
});
export const cubicBezier = (
    points: [number, number, number, number],
): CubicBezierEasingNode => ({ type: "easing", kind: "cubicBezier", points });
export const steps = (
    count: number,
    jump?: "start" | "end",
): StepsEasingNode => ({
    type: "easing",
    kind: "steps",
    steps: { count, ...(jump ? { jump } : {}) },
});

/** One transition leg; `property` is a style-property name or 'all'. `duration`/`delay`
 *  accept a numeric or an alias into `durations`; `ease` an EasingNode or `easings` alias. */
export const tween = (
    property: string,
    duration: NumericValue,
    ease?: EasingValue,
    delay?: NumericValue,
): TransitionPart => ({
    property,
    duration,
    ...(ease ? { easing: ease } : {}),
    ...(delay ? { delay } : {}),
});
export const transition = (...parts: TransitionPart[]): TransitionNode => ({
    type: "transition",
    parts,
});
export const animation = (
    opts: Omit<AnimationNode, "type">,
): AnimationNode => ({ type: "animation", ...opts });
```

```ts
// src/ast/helpers/math.ts: calc / arithmetic and math functions
import type { CalcNode, ClampNode, MinMaxNode, NumericValue } from "../nodes";

/** Generic infix calc, e.g. `calc('-', pct(100), px(16))`. Nest for mixed operators /
 *  precedence: `div(sub(pct(100), px(16)), unitless(2))`. */
export const calc = (
    op: CalcNode["op"],
    ...operands: NumericValue[]
): CalcNode => ({ type: "calc", op, operands });
export const add = (...operands: NumericValue[]) => calc("+", ...operands);
export const sub = (...operands: NumericValue[]) => calc("-", ...operands);
export const mul = (...operands: NumericValue[]) => calc("*", ...operands);
export const div = (...operands: NumericValue[]) => calc("/", ...operands);

/** CSS `min()`: the smallest resolved operand. */
export const min = (...args: NumericValue[]): MinMaxNode => ({
    type: "mathFn",
    fn: "min",
    args,
});
/** CSS `max()`: the largest resolved operand. */
export const max = (...args: NumericValue[]): MinMaxNode => ({
    type: "mathFn",
    fn: "max",
    args,
});
/** CSS `clamp(lower, preferred, upper)`: a fluid / bounded value. */
export const clamp = (
    lower: NumericValue,
    preferred: NumericValue,
    upper: NumericValue,
): ClampNode => ({
    type: "mathFn",
    fn: "clamp",
    args: [lower, preferred, upper],
});
```

```ts
// src/ast/helpers/utility.ts: custom-utility argument placeholder
import type { NumericValue, Unit, UtilityArgNode } from "../nodes";
import { numeric } from "./scalar";
import { mul } from "./math";

/** The call-site value inside a `DynamicUtilityDef` template (§4.2). `arg()` is the whole
 *  single arg; `arg("x")` / `arg(0)` is a named or positional member of an object- or array-
 *  valued `apply`. Composes in arithmetic: `mul(arg(), px(4))`. */
export const arg = (key?: string | number): UtilityArgNode => ({
    type: "utilityArg",
    ...(key !== undefined ? { key } : {}),
});

/** Stamp a unit onto a unitless numeric (e.g. a utility arg): `withUnit(arg(), "px")`.
 *  Lowers via `× 1<unit>`; the adapter constant-folds a literal (`unitless(2)` becomes `2px`)
 *  and keeps it symbolic for a ref/arg. Precondition (not TS-checkable through a ref): the
 *  input is unitless, so don't wrap an already-dimensioned value. */
export const withUnit = (n: NumericValue, unit: Unit): NumericValue =>
    mul(n, numeric(1, unit));
```

The node types above split into **leaf** values (concrete primitives) and **reference**
values (indirection that resolves elsewhere). `value-map.ts` makes that split explicit so
the style map can constrain each property to only the leaf kinds that make sense:

```ts
// src/ast/value-map.ts: value-kind registry and the per-kind value map
import type {
    AnimationNode,
    CalcNode,
    ColorMixNode,
    ColorNode,
    EasingNode,
    FilterNode,
    FontFamilyNode,
    GradientNode,
    KeywordNode,
    LiteralScalarNode,
    MathFnNode,
    NumericScalarNode,
    RefNode,
    ShadowNode,
    TransformNode,
    TransitionNode,
} from "./nodes";

/** Concrete (leaf) value nodes, keyed by their `type` discriminant. This is the single
 *  registry of value kinds: every new leaf node adds its key here and immediately becomes
 *  referenceable from `StyleMap` via `ValueNodeMap`. */
export interface LeafNodeMap {
    literal: LiteralScalarNode;
    keyword: KeywordNode;
    numeric: NumericScalarNode;
    calc: CalcNode;
    mathFn: MathFnNode;
    color: ColorNode;
    colorMix: ColorMixNode;
    gradient: GradientNode;
    shadow: ShadowNode;
    transform: TransformNode;
    filter: FilterNode;
    transition: TransitionNode;
    animation: AnimationNode;
    easing: EasingNode;
    fontFamily: FontFamilyNode;
}

export type ValueKind = keyof LeafNodeMap;

/** Reference / indirection nodes. Defined in `nodes.ts` (so composite-node fields can use
 *  it too, see the narrowest-acceptable guideline there) and re-exported here because
 *  `ValueNodeMap` folds it into every entry: a ref resolves to *some* value defined
 *  elsewhere, so it's valid wherever any concrete value is. Its resolved kind is checked at
 *  compile time, not by TS: the one deliberate hole in kind-safety. */
export type { RefNode };

/** The map `StyleMap` indexes into. `ValueNodeMap[K]` is the leaf node(s) for kind `K`
 *  plus any reference node. Indexing with a union of kinds distributes, so a property
 *  can advertise several leaf kinds at once:
 *
 *    color: ValueNodeMap["color" | "gradient"] // ColorNode | GradientNode | RefNode
 *
 *  `ValueNodeMap[ValueKind]` is exactly `ValueNode` (the full union in `nodes.ts`). */
export type ValueNodeMap = { [K in ValueKind]: LeafNodeMap[K] | RefNode };
```

```ts
// src/ast/style.ts: the supported style map (replaces Record<string, ValueNode>)
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
// `LeafNodeMap` (§4.1).
type Color =
    ValueNodeMap["color" | "colorMix" | "literal"] | KeywordNode<ColorKeyword>; // solid color (plus keyword)
type Background =
    | ValueNodeMap["color" | "colorMix" | "gradient" | "literal"]
    | KeywordNode<ColorKeyword>; // bg
type Dimension = ValueNodeMap["numeric" | "calc" | "mathFn" | "literal"]; // px/rem/%/calc/min/max/clamp
// A portable keyword from a per-property vocabulary (§4.1), plus a raw `literal` escape and a
// ref. `V` narrows the acceptable tokens so `display: keyword("center")` is a type error.
type Keyword<V extends string = string> =
    KeywordNode<V> | ValueNodeMap["literal"];
type Font = ValueNodeMap["fontFamily" | "literal"]; //  family stack or literal/alias
type Shadow = ValueNodeMap["shadow"] | KeywordNode<"none">; // composite box-shadow / elevation (or `none` reset)
type Gradient = ValueNodeMap["gradient" | "literal"];
type Transform = ValueNodeMap["transform" | "literal"];
type Filter = ValueNodeMap["filter" | "literal"];
type Transition = ValueNodeMap["transition" | "literal"];
type Animation = ValueNodeMap["animation" | "literal"];
type Easing = ValueNodeMap["easing" | "literal"];

// Note: length-vs-unitless isn't type-enforced (both are `numeric` nodes); the unit is
// encoded on the value itself (§4.4), so `Dimension` covers padding, fontWeight, etc.

/** Supported style map. Keys are a curated set of (csstype-derived) property names, the
 *  cross-platform common vocabulary (`paddingTop`, `backgroundColor`, …); each value is
 *  constrained to the node kinds valid for that property, so an unsupported value
 *  (`color: px(4)`) or an unknown property is a compile error. The exhaustive property
 *  list is generated by mapping csstype's property keys onto these categories; the excerpt
 *  shows the pattern. This is a closed, portable set, with deliberately no raw CSS
 *  custom-property (`--x`) escape: a runtime-override contract point is read as a `dynamic()`
 *  value (the adapter owns the `--`-var naming) and declared as a component `token` (§4.2),
 *  while anything genuinely target-specific goes through `rawRules` / `platform()`. */
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
    // sizing / spacing (PHYSICAL)
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
    // they auto-flip in RTL on every target (web `inline`/`block`, native start/end), so you
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
    textAlign?: Keyword<TextAlignKeyword>; // prefer logical "start"/"end" over "left"/"right"
    // numerics
    opacity?: Dimension;
    zIndex?: Dimension; // prefer alias('zIndices', <name>) over magic numbers (§4.2)
    fontWeight?: Dimension;
    lineHeight?: Dimension;
    // typography
    fontFamily?: Font;
    fontSize?: Dimension;
    letterSpacing?: Dimension;
    textStyle?: Keyword; // e.g. alias('textStyles', 'body'), a RefNode (§4.6)
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
    // … (generated for the full CSS property set)

    /** Invoke named utilities (defined in `CoreConfig.utilities`, §4.2): `utilityName` to
     *  arg. The adapter expands each to its `UtilityDef` styles (Panda emits the native
     *  utility usage; other targets inline the expansion), merged under this map's own
     *  properties, so explicit props and `states`/`when(...)` overrides win over a utility
     *  expansion. Stays portable: an expansion is itself a `StyleMap`. The arg shape depends
     *  on the target utility: a `static` utility takes a value key (string); a `dynamic`
     *  utility with a `scale` takes a scale key (string); a plain `dynamic` utility takes a
     *  `ValueNode` (`size: px(16)`); a multi-arg `dynamic` template takes an object
     *  (`{ x, y }`) or array (`[a, b]`) of `ValueNode`s matching its `arg("x")`/`arg(0)`
     *  placeholders. Vary by state / breakpoint by nesting `apply` under `states` (or a
     *  nested conditional). Names and keys resolve against the config at compile time (the
     *  same ref hole as `alias(...)`); `defineConfig` validates them (§5 #3). */
    apply?: Record<
        string,
        string | ValueNode | Record<string, ValueNode> | ValueNode[]
    >;

    /** Block-form self-state styles, the dual of the per-value `when(...)` conditional
     *  (§4.5). Keyed by the same closed, portable `PortableCondition` set
     *  (`hover`/`focus`/`dark`/`disabled`/…); the adapter lowers each to its target idiom
     *  (web: pseudo-class / media query / data-attr; native: press/disabled state). Carries
     *  no selectors, so it stays agnostic. Recursive (a state block is a full `StyleMap`).
     *  Prefer this for multi-property state changes; reach for `when(...)` when a single
     *  value varies (or the value itself is a token that differs per state). */
    states?: Partial<Record<PortableCondition, StyleMap>>;

    /** Escape hatch for nested rules with no portable form: arbitrary descendant selectors
     *  (`& svg`), pseudo-elements (`&::before`, `&::placeholder`), or platform widget parts.
     *  Target-keyed exactly like `rawCondition.by` (§4.5): core assigns no meaning to the
     *  inner keys (raw per-target selectors / at-rules), but their values stay portable
     *  `StyleMap`s. The web adapter reads `css` and emits `<key> { … }`; a target with no
     *  entry emits nothing, purely additive, so (unlike `platform()`) no portable default is
     *  needed. Prefer slots (§4.2 and §4.3) for parts the component itself renders; use this
     *  only for elements you can't model portably. */
    rawRules?: Record<string, Record<string, StyleMap>>; // targetId to (rawSelector to styles)
}
```

```ts
// src/ast/index.ts: barrel
export type * from "./nodes";
export type * from "./value-map";
export type * from "./style";
export * from "./helpers/scalar";
export * from "./helpers/unit";
export * from "./helpers/keyword";
export * from "./helpers/color";
export * from "./helpers/shadow";
export * from "./helpers/gradient";
export * from "./helpers/transform";
export * from "./helpers/filter";
export * from "./helpers/motion";
export * from "./helpers/math";
export * from "./helpers/ref";
export * from "./helpers/platform";
export * from "./helpers/condition";
export * from "./helpers/font";
export * from "./helpers/utility";
```

**Import styles.** Each helper group is namespace-importable, which keeps call sites
self-documenting about what kind of node they build:

```ts
import * as scalar from "@pureform/core/ast/helpers/scalar";
import * as unit from "@pureform/core/ast/helpers/unit";
import * as kw from "@pureform/core/ast/helpers/keyword";
import * as ref from "@pureform/core/ast/helpers/ref";

scalar.literal("100vh"); // raw escape; a baseline keyword uses kw.* instead
kw.center;
unit.px(4);
ref.alias("tokens", "colors", "violet600");
```

The `index.ts` barrel also re-exports everything flat, so `import { literal, px, alias }
from "@pureform/core/ast"` still works where a terser form reads better. The
single-export `platform` escape hatch is usually flat-imported
(`import { platform } from "@pureform/core/ast/helpers/platform"`) because
`platform.platform` would stutter.

### 4.2 Core schema types (`src/types.ts`)

```ts
import type {
    EasingNode,
    FontFamilyNode,
    NumericScalarNode,
    ScalarNode,
    StyleMap,
    ValueNode,
} from "./ast";

// `StyleMap` (the typed, per-property style map) now lives in ast/style.ts (§4.1)
// and constrains each CSS property to its valid node kinds via `ValueNodeMap`. The
// token maps below stay keyed by `ValueNode`: kind constraints are a PROPERTY-level
// concern (StyleMap), not a token-map one; a token may hold any kind of value.

/** Annotations about a token or component spec, independent of its value. Pure data,
 *  platform-agnostic. pureform core owns these names; DTCG is just one target, and the
 *  bidirectional DTCG codec (Layer 2, §9) maps `description`/`deprecated`/`extensions`
 *  to/from the spec's `$description`/`$deprecated`/`$extensions`. The AST node's own kind
 *  already encodes the token type, so there is deliberately no DTCG `$type` to carry. */
export interface Metadata {
    description?: string;
    /** `true`, or a human message / replacement hint; the adapter warns on it. */
    deprecated?: boolean | string;
    /** Foreign-tool passthrough, carried through verbatim (maps to DTCG `$extensions`), e.g.
     *  `{ "com.figma": { styleId } }`. pureform never interprets it. */
    extensions?: Record<string, unknown>;
    /** Per-target directives the adapter consumes when lowering (not portable, not
     *  interpreted by core). Keyed by adapter/target id; each adapter reads its own slice
     *  and ignores the rest, the spec-level analogue of the `platform()` value escape.
     *  e.g. `{ panda: { jsx: ["Button"], className: "btn" } }`. */
    platformHints?: Record<string, unknown>;
}

/** A value annotated with metadata. `$value` is the sentinel key that lets the resolver
 *  tell a wrapped entry apart from a bare node / a nested token group (real content keys
 *  never start with `$`), which is why it keeps the `$`; the annotations sit under `$meta`
 *  and use plain, pureform-owned names. */
export type WithMeta<T> = { $value: T; $meta?: Metadata };

/** A token entry: a bare value node (the un-annotated shorthand) OR a `WithMeta` envelope.
 *  Read it through `tokenValue(...)` (§4.2 define.ts) so consumers ignore which form it is;
 *  widening a map to `Token<T>` is backward-compatible since bare `T` still satisfies it. */
export type Token<T> = T | WithMeta<T>;

interface BaseComponentSpec {
    name: string;
    /** The component's token set, created here (not aliased from a central
     *  map). Entries are usually `dynamic(...)` so they compile to overridable
     *  `--components-<cmp>-*` vars; the recipe references them by path. Metadata-wrappable
     *  via `meta(...)` (`Token<ValueNode>`). */
    tokens?: Record<string, Token<ValueNode>>;
    /** Spec-level annotations (`description`/`deprecated`), plus the per-adapter emission
     *  escape via `platformHints`. The emitted class name and JSX binding are derived from
     *  `name` by default (the adapter owns casing: web/Panda produce a `className` and a
     *  `jsx` tag list; native ignores both); override only when the convention doesn't fit,
     *  e.g.
     *  `$meta: { platformHints: { panda: { jsx: ["Button", "IconButton"], className: "btn" } } }`.
     *  Keeping these in `platformHints` keeps Panda/web jargon out of core's typed style map. */
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
    style: Record<string, StyleMap>; // slot to styles
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
 *  mechanism for a component's structural parts (icon, label, indicator, a decorative
 *  layer): each slot is styled by its own `StyleMap` and the adapter targets it per platform
 *  (web: a class per slot; native: a style object per rendered element), with no selectors
 *  in core. Reach for `StyleMap.rawRules` (§4.1) only for elements the component doesn't
 *  render (arbitrary consumer children, pseudo-elements), which are irreducibly
 *  target-specific. */
export interface SlottedComponentSpec extends BaseComponentSpec {
    kind: "slotComponent";
    slots: string[];
    recipe: {
        base: Record<string, StyleMap>; // slot to styles
        // variant group to value to slot to styles
        variants?: Record<string, Record<string, Record<string, StyleMap>>>;
        compoundVariants?: SlottedCompoundVariant[];
        defaultVariants?: Record<string, string>;
    };
}

export type AnyComponentSpec = ComponentSpec | SlottedComponentSpec;

/** A named theme: a partial override of the token tiers, layered over the base config and
 *  emitted by the adapter under a `[data-theme="<name>"]` scope (base is `:root`). Themes
 *  rebind tokens; recipes (which consume tokens) need no theme-awareness. Orthogonal to
 *  the dark/light scheme axis; a theme may still carry `conditional` dark values. See
 *  §4.7 for the merge. */
export interface ThemeOverride {
    tokens?: Record<string, Record<string, Token<ScalarNode>>>;
    semanticTokens?: Record<string, Record<string, Token<ValueNode>>>;
    // per-component token rebinds, keyed by component name
    components?: Record<string, { tokens?: Record<string, Token<ValueNode>> }>;
}

/** A reusable property transform (lowering to Panda `utilities`), invoked from a `StyleMap`
 *  via `apply` (§4.1). A discriminated union of two flavors; build with `defineStaticUtility`
 *  / `defineDynamicUtility` (§4.2) so `kind` is injected. */
interface BaseUtilityDef {
    /** Doc/typing hint: the primary property this utility stands in for. For a multi-
     *  property template (e.g. `mx`) it's advisory only; lowers to Panda's shorthand seed. */
    property?: string;
}

/** Fixed named steps: each key maps to an arbitrary static `StyleMap`
 *  (e.g. `shadowElevation: { level0, level1, level2 }`). `apply` passes a value key. */
export interface StaticUtilityDef extends BaseUtilityDef {
    kind: "static";
    values: Record<string, StyleMap>;
}

/** Value-parameterized: the call-site value is substituted into `template` via `arg()`
 *  (§4.1). Optionally bound to a token `scale`, so a string arg is then a key into that tier
 *  (`m: "2"` resolves to `alias("tokens","spacing","2")`, i.e. `8px`, unit from the token; the
 *  accepted keys are the tier's keys, enum-like but auto-synced). Without a scale the arg is
 *  a `ValueNode` (`size: px(16)`); dimensionalize a unitless arg in the template via
 *  arithmetic (`mul(arg(), px(4))`) or `withUnit`. Multi-arg templates use `arg("x")` /
 *  `arg(0)` fed by an object / array `apply` value. Lowers to a Panda function utility
 *  `transform(value)` (with `values: "<scale>"` when scaled); within our own config it's
 *  expanded to a static `StyleMap` at build, and both lowerings must agree so consumer
 *  `css({ m: "2" })` matches our recipes. */
export interface DynamicUtilityDef extends BaseUtilityDef {
    kind: "dynamic";
    scale?: string[];
    template: StyleMap;
}

export type UtilityDef = StaticUtilityDef | DynamicUtilityDef;

export interface CoreConfig {
    // Primitive token values are ScalarNodes so their unit is encoded at the
    // source (e.g. spacing in px, fontWeight unitless, colors as literals). Any token
    // value is metadata-wrappable via `meta(...)`, hence `Token<...>` (bare values still
    // valid). Breakpoints stay bare: they're build-time query bounds, not emitted tokens.
    tokens: Record<string, Record<string, Token<ScalarNode>>>;
    // Named viewport breakpoints (sizes stay unit-encoded, px/rem). Referenced by name
    // from `viewportBreakpoint(...)` / `containerBreakpoint(...)` (both reuse this scale).
    // Build-time only: CSS forbids `var()` in @media/@container conditions, so the adapter
    // inlines the resolved size; breakpoints can't be runtime-overridable --vars.
    breakpoints?: Record<string, NumericScalarNode>;
    // Font-family tokens (structured, portable; see §4.6). Font *loading* is out of
    // core. Referenced via alias('fonts', <key>); valid as a CSS var.
    fonts?: Record<string, Token<FontFamilyNode>>;
    // System-level semantics only (brand, danger, …), keyed directly by group
    // (colors, …). Component-level tokens live on each component's own `tokens`
    // (see ComponentSpec), so there's no further nesting level here.
    semanticTokens: Record<string, Record<string, Token<ValueNode>>>;
    // Composite typescale roles (family+size+weight+lineHeight+tracking), lowering to Panda
    // `textStyles`. A recipe applies one via `textStyle: alias('textStyles', <name>)`.
    textStyles?: Record<string, StyleMap>;
    // Motion tokens: durations are ms/s numerics; easings are reusable timing functions.
    // Referenced via alias('durations'|'easings', <name>) from transition/animation nodes.
    durations?: Record<string, Token<NumericScalarNode>>;
    easings?: Record<string, Token<EasingNode>>;
    // Semantic stacking-order scale: name to unitless z-index (not CSS @layer / cascade
    // layers, which are a separate concern). Build it with `stack([...])` (§4.2) so authors
    // declare relative order, not magic numbers (prevents z-index wars); hand entries are
    // still allowed for one-offs. Referenced via alias('zIndices', <name>) from
    // `StyleMap.zIndex`. Metadata-wrappable; theme-overridable.
    zIndices?: Record<string, Token<NumericScalarNode>>;
    // Keyframe sets: name to (stop to styles), where `stop` is '0%'/'from'/'to'/…. Referenced
    // by `AnimationNode.name`, lowering to Panda `keyframes`.
    keyframes?: Record<string, Record<string, StyleMap>>;
    // Reusable property transforms, lowering to Panda `utilities` (e.g. `elevation`). See UtilityDef.
    utilities?: Record<string, UtilityDef>;
    // Portable base styles merged into every component this framework generates, at lowest
    // precedence (a component's own base / variants / states always win). Scoped to our own
    // output only, so it never reaches the host document. The adapter merges it into each
    // component's base (slot recipes: the root slot); web emits a shared base, native folds
    // it into each style object. For design intent shared by all components (base font,
    // box model, default transition). Document-level styling (`:root`/`body` resets, `*`,
    // `::selection`) is deliberately not here: it reaches outside our output into the host
    // page, so it's an adapter / app concern (the Panda adapter owns its own `globalCss`).
    componentBaseStyles?: StyleMap;
    // Named themes: partial token overrides layered over this (base) config. The base is
    // the default theme; each named theme emits under [data-theme=<name>]. See §4.7.
    themes?: Record<string, ThemeOverride>;
    components: Record<string, AnyComponentSpec>;
}
```

Component specs are the only AST construct you'd otherwise hand-write with a literal
`kind`. Builders inject it and return the typed discriminated spec. They're named for what
they build, a **component** (name + tokens + recipe) rather than just the `recipe`
sub-field, and the Panda adapter lowers them to `defineRecipe` / `defineSlotRecipe`. They
sit beside the config builders from §4.7:

```ts
// src/define.ts: spec / config builders (exported from the @pureform/core root)
import { deepMerge } from "@pureform/utils";
import { unitless } from "./ast";
import type { NumericScalarNode } from "./ast";
import type {
    ComponentSpec,
    CoreConfig,
    DynamicUtilityDef,
    Metadata,
    SlottedComponentSpec,
    StaticUtilityDef,
    Token,
    WithMeta,
} from "./types";

/** Single-slot component (name + tokens + recipe); the Panda adapter emits a
 *  `defineRecipe`. Injects `kind: "component"`. */
export const defineComponent = (
    spec: Omit<ComponentSpec, "kind">,
): ComponentSpec => ({ kind: "component", ...spec });

/** Multi-slot component; the Panda adapter emits a `defineSlotRecipe`. Injects
 *  `kind: "slotComponent"`. */
export const defineSlotComponent = (
    spec: Omit<SlottedComponentSpec, "kind">,
): SlottedComponentSpec => ({ kind: "slotComponent", ...spec });

/** Fixed named-step utility (lowering to a Panda enum `utilities`). Injects `kind: "static"`. */
export const defineStaticUtility = (
    def: Omit<StaticUtilityDef, "kind">,
): StaticUtilityDef => ({ kind: "static", ...def });

/** Value-parameterized utility (lowering to a Panda function `utilities`). Injects
 *  `kind: "dynamic"`. Reference the call-site value in `template` via `arg()` / `arg(key)`
 *  (§4.1). */
export const defineDynamicUtility = (
    def: Omit<DynamicUtilityDef, "kind">,
): DynamicUtilityDef => ({ kind: "dynamic", ...def });

/** Identity and validation entry point for a whole config. Runs a hard-error pass: every
 *  `alias`/`dynamic` path must resolve (else a path-not-found error naming the nearest
 *  ancestor) and the alias graph must be acyclic (else a cycle error listing the chain);
 *  see §5 #3. Fails fast at author time; returns the config unchanged when valid. See §4.7. */
export const defineConfig = (config: CoreConfig): CoreConfig => config;

/** Deep-merge a base config + overrides (later wins; maps merge; leaf nodes and arrays
 *  replace). Built on `@pureform/utils` `deepMerge`. See §4.7. */
export const mergeConfigs = (
    base: CoreConfig,
    ...overrides: Partial<CoreConfig>[]
): CoreConfig =>
    overrides.reduce<CoreConfig>((acc, o) => deepMerge(acc, o), base);

/** Annotate a token value with metadata, e.g.
 *  `meta(oklch(...), { description: 'Brand', deprecated: 'use brand' })`. Produces a
 *  `WithMeta` envelope (`{ $value, $meta }`); leaving a value bare is the un-annotated
 *  shorthand. */
export const meta = <T>(value: T, m: Metadata): WithMeta<T> => ({
    $value: value,
    $meta: m,
});

/** Read a token entry's value node, whether bare or metadata-wrapped. The adapter resolver
 *  / `getByPath` (§5) call this so metadata is transparent to value resolution. */
export const tokenValue = <T>(t: Token<T>): T =>
    t !== null && typeof t === "object" && "$value" in t
        ? (t as WithMeta<T>).$value
        : (t as T);

/** Build an ordered stacking scale for `CoreConfig.zIndices`: an array of layer names in
 *  ascending order becomes `{ name: unitless(z) }`, spaced by `step` (default 100) from
 *  `base` (default 0). Authors declare relative order, never magic numbers, which is what
 *  prevents z-index wars; spread/override individual entries afterward for one-offs.
 *  Referenced via `alias('zIndices', <name>)`. e.g.
 *  `stack(["base", "dropdown", "overlay", "modal", "popover", "toast", "tooltip"])`. */
export const stack = (
    names: string[],
    opts: { base?: number; step?: number } = {},
): Record<string, NumericScalarNode> => {
    const { base = 0, step = 100 } = opts;
    return Object.fromEntries(
        names.map((name, i) => [name, unitless(base + i * step)]),
    );
};
```

```ts
// usage: no hand-written `kind`, fully typed by the spec shape
components: {
    button: defineComponent({
        name: "button",
        tokens: {
            /* … */
        },
        recipe: { base: {} /* … */, variants: {} /* … */ },
    }),
}
```

### 4.3 Path namespaces (convention)

Node `path` arrays are rooted at well-known namespaces so adapters can dispatch:

- `['tokens', <group>, <key>]`. Primitives (referenced via `alias`).
- `['semanticTokens', <group>, <key>]`. System semantics (referenced via `alias`).
- `['fonts', <key>]`. Font-family tokens (referenced via `alias`; see §4.6).
- `['textStyles', <name>]`. Composite typescale role, applied via a `textStyle` property (§4.6).
- `['zIndices', <name>]`. Semantic stacking-order scale (referenced via `alias` from
  `StyleMap.zIndex`; built with `stack(...)`, §4.2).
- `['components', <cmp>, <key>]`. **Component tokens**, created on that component's own
  `tokens` map. As a `dynamic` var they lower to `--components-<cmp>-*`, and recipes `alias` them.
- `['ui', <cmp>, <key>]`. **Runtime instance contract** (the `--ui-*` vars users set), the
  first arg of a recipe leaf's `dynamic`.
- `['global', <group>, <key>]` inside a `dynamic` node. The `--global-*` var a system
  semantic token _binds to_ (see the adapter mapping in §5). The `ui` / `components` / `global`
  var tiers' public-vs-internal status and the adapter's prefix policy are the contract in §6.

**[DECIDED] Slots.** Components are a discriminated union (§4.2): `ComponentSpec`
(`kind: 'recipe'`, single-slot, flat style maps, lowering to Panda `defineRecipe`) and
`SlottedComponentSpec` (`kind: 'slotRecipe'`, `slots: string[]` + slot-keyed style maps,
lowering to Panda `defineSlotRecipe`). The two map 1:1 onto Panda's recipe/slot-recipe kinds
and onto their differing consumption APIs (className vs slot-keyed object), so the
distinction is preserved rather than forcing every component through slots. The real button
(`root`/`label`/`icon`/`touchTarget`) is a `SlottedComponentSpec` (Phase 2). Appendix A
shows the single-slot form.

### 4.4 Units and color spaces, encoded in config, never inferred **[DECIDED]**

Units and color spaces are part of the AST, not something adapters guess. This resolves
old open question #3.

- `ScalarNode` is discriminated by `type` (`'literal' | 'numeric' | 'color'`). A **literal**
  string is the raw off-baseline escape and carries no unit (`'100vh'`, a vendor value);
  baseline keywords (`'flex'`, `'center'`, `'transparent'`) are instead a typed
  `KeywordNode` (§4.1). A **numeric** MUST declare a `unit` (`'none'` for unitless props like `fontWeight`,
  `lineHeight`, `zIndex`, `opacity`). A **color** MUST declare its color `space`, the color
  analogue of a unit, so `ui-utils`' HCT/OKLCH values survive instead of flattening to hex.
- The `literal()` constructor only accepts strings. Numbers go through `numeric()`
  or the sugar `px()` / `rem()` / `pct()` / `unitless()`. This makes it a **type error**
  to author a number without a unit.
- **Primitive `tokens` values are `ScalarNode`s** (`CoreConfig.tokens`), so a spacing token
  is `px(4)`, a radius `px(9999)`, a color `hex('#7c3aed')` / `oklch(...)` / `hct(...)`
  (keyword colors like `transparent` are the typed `kw.transparent`, not a `literal`), and
  `fontWeight`/`lineHeight` are
  `unitless(...)`. Units and spaces live at the source, and adapters read them off the node.
- Adapters therefore have **no unit policy**. The web adapter renders agnostic units
  1:1 (`px`/`rem`/`em`/`%`/`ms`/`s` share their CSS spelling; `'none'` drops the suffix). A
  non-web adapter _translates_ agnostic units to its target (e.g. `px` becomes dp), and
  resolves `em` against the in-scope font-size (a static approximation, like `rem`'s base).
- **CSS-specific values use the `platform()` escape hatch** (§4.1 `PlatformNode`), not a
  bare literal. It carries a per-target value plus a required portable `default`, so
  other targets still resolve:

    ```ts
    height: platform({ css: literal("100vh") }, px(800));
    //         css target becomes 100vh; every other target becomes 800px
    ```

    A bare `literal('100vh')` is still legal but is **opaque + web-only** (no
    fallback, and non-CSS adapters must treat it as raw and may error). Prefer `platform()`
    whenever a portable fallback exists.
    - **Target ids are open [DECIDED].** `values` is keyed by free-form strings. Core never
      encodes a closed union of target ids. A new adapter defines its own id without
      touching core, and any adapter may read/translate another target's entry rather than
      only falling back to `default`.

**Residual sub-decision [RESOLVED].** The Panda adapter emits a `token(...)` ref whenever an
`alias` path maps to a Panda-managed token category, and only INLINES a computed value
(`${value}${unit}` / expanded node) when the target has no Panda token (or the adapter is
non-Panda). Panda then applies the unit from the token _definition_ (still fed from our
unit-carrying scalars), so dark-mode and conditions keep working (§8 #4, §5 #4). The split
is a fixed path-to-category table:

| core path                      | Panda category           |
| ------------------------------ | ------------------------ |
| `tokens.colors.*`              | `colors`                 |
| `tokens.spacing.*`             | `spacing`                |
| `tokens.radii.*`               | `radii`                  |
| `tokens.fontSize.*`            | `fontSizes`              |
| `zIndices.*`                   | `zIndex`                 |
| `durations.*` / `easings.*`    | `durations` / `easings`  |
| `fonts.*`                      | `fonts`                  |
| `semanticTokens.*`             | `semanticTokens`         |
| `components.<c>.*` (`dynamic`) | `--components-<c>-*` var |

**Color component ranges [DECIDED].** Each space uses one canonical range so `ui-utils`,
the helpers, and adapters agree. A build-time normalization pass validates and clamps, and
the adapter's `formatColor` is the single place that rescales for the target syntax. `alpha`
is always `0` to `1`.

| Space                 | Components  | Canonical ranges                                                            |
| --------------------- | ----------- | --------------------------------------------------------------------------- |
| `srgb` / `display-p3` | `[r, g, b]` | `0-255` (keeps `hex()` lossless; rescaled to `0-1` for `color()` as needed) |
| `hsl`                 | `[h, s, l]` | `h 0-360`, `s`/`l` `0-100`                                                  |
| `oklch` / `lch`       | `[L, C, H]` | `L 0-1` (oklch) / `0-100` (lch), `C 0-0.4` / `0-150`, `H 0-360`             |
| `oklab` / `lab`       | `[L, a, b]` | `L 0-1` (oklab) / `0-100` (lab), `a`/`b` signed                             |
| `hct`                 | `[H, C, T]` | `H 0-360`, `C 0-~150`, `T 0-100`                                            |

### 4.5 Conditions and states, first-class and platform-agnostic **[DECIDED]**

States (`hover`, `disabled`, …) and color scheme (`dark`) are modeled as a value-level
`ConditionalNode` (§4.1), **not** as magic `_`-prefixed keys mixed into style maps. A
conditional pairs a `base` value with ordered condition-to-value cases. For a single
condition, use the shorthand `when(condition, value, base)`. For several (or compound)
cases, use the fluent builder: `when()`, then `.on(condition, value)` per case, closed by
`.else(base)`, which supplies the fallback and returns the node:

```ts
import { when, alias, literal, unitless } from "@pureform/core/ast";
import * as kw from "@pureform/core/ast/helpers/keyword";

// single condition, shorthand `when(cond, value, base)`
cursor: when("disabled", kw.notAllowed, kw.pointer),
opacity: when("disabled", unitless(0.38), unitless(1)),

// several conditions, builder
backgroundColor: when()
    .on("hover", alias("components", "button", "bgHover"))
    .on("disabled", literal("#e5e7eb"))
    .else(alias("components", "button", "bg")),
```

**Why value-level (not condition-grouped maps).** Conditions appear in _two_ places:
recipe styles (states) and token values (a semantic token that differs in dark mode).
One value-level node covers both uniformly and keeps the `ValueNode` algebra intact (a
conditional composes anywhere a value is legal: token defs, `dynamic` defaults, `platform`
entries). It also honours the doc's "typed nodes, no magic strings" stance, since the state
is a typed `Condition`, not a stringly-keyed object. A dark-mode token is just:

```ts
// semanticTokens.colors.brand
brand: when("dark", literal("#a78bfa"), literal("#7c3aed")),
```

**Block form for multi-property states.** Value-level `when(...)` is ideal for a single
property or a token that differs per state, but repeating `on("hover", …)` across many
properties is noisy. `StyleMap.states` (§4.1) is its block-form dual: a whole `StyleMap`
per `PortableCondition`, so "on hover, change these five properties" reads as one block.
Both share the SAME portable `Condition` vocabulary and lower identically. Pick block form
for multi-property state changes and value form for a single varying value (for TOKEN
values, which have no style-map context, `when(...)` is the only option). It stays
agnostic: `states` carries conditions, never selectors.

**Platform-agnostic vocabulary and escape hatch.** `PortableCondition` is a closed union of
states the core guarantees across targets (mirroring `Unit`), and adapters own the lowering.
On web, `hover` becomes `&:hover`, `disabled` becomes `&:disabled, &[data-disabled]`, `dark`
becomes `[data-theme=dark]` or `@media (prefers-color-scheme: dark)`, and `rtl` becomes
`[dir=rtl]` or `:dir(rtl)`. Native uses the press/disabled state and `I18nManager.isRTL`.
Anything not portable uses `rawCondition({ css: "&[data-state=open]" })`, the condition-level
analogue of `platform()`. Combine conditions with an AND-list (`.on(["dark", "hover"], …)`),
and nest conditionals for richer logic.

**Direction (RTL).** Handle this logical-first, with the `dir` condition as the escape.
Direction awareness is primarily a `StyleMap` concern, not a condition. Use flow-relative
properties (`paddingInlineStart`, `marginInlineEnd`, `insetInlineStart`, `textAlign: 'start'`;
§4.1), which auto-flip in RTL on every target with no condition at all. The
`DirectionCondition` axis (`when("rtl", …)`) is only for what logical properties can't
express, like a visual mirror or a flipped asset
(`transform: when("rtl", transform(scaleX(-1)), transform(scaleX(1)))`). Core expresses
intent (start/end, rtl) and the adapter mirrors. Core never rewrites physical props itself.

**Conditions defer selection, not value resolution.** This is why a size _query_ can be
portable while a size _value_ (`vh`, §4.4) can't. A condition emits both branch styles
statically and hands only the choice of which branch applies to a per-target runtime
evaluator, which is true on every target, the browser evaluates `:hover`/`@media`/`@container`
at runtime too. The core still emits only static styling (Layer 2); where a target has no
built-in evaluator (native lacks CSS `@container`), a Layer-4 runtime binding selects the
branch, with `base` as the pre-measurement fallback. A value, by contrast, must resolve to a
concrete static result at build time, so a runtime-only value stays `platform()`.

**Environment queries (media / container).** Viewport and container predicates are
_parameterized_ (they carry sizes, and container queries a named scope), so they're
structured `Condition` nodes rather than bare strings:

- Non-size portable media features (`reducedMotion`, `print`, `portrait`, `touch`, …) are
  the `MediaCondition` axis of `PortableCondition`. Color scheme (`dark`/`light`) is its
  own axis and lowers to `prefers-color-scheme` (or `[data-theme]`, adapter's choice).
- `viewportBreakpoint(from | { from?, until? })` produces a viewport `@media` at breakpoint
  token(s). `from` is the lower bound (inclusive, min-width), `until` the upper bound
  (exclusive, half-open band). The string shorthand sets `from` (`viewportBreakpoint("md")`
  produces `@media (min-width: <md>)`).
- `viewportSize({ min?, max? })` produces a viewport `@media` at an ad-hoc, inclusive size.
- `containerBreakpoint(from | { from?, until? }, container?)` produces the same as a
  `@container` query (reusing `CoreConfig.breakpoints`). `container` targets a named one.
- `containerSize({ min?, max?, container? })` produces a `@container` query at an ad-hoc
  size. Sizes are `NumericScalarNode`s, so units stay encoded.
- Anything bespoke (`@supports`, a hand-written `@media`/`@container`) uses
  `rawCondition({ css: "@media (…)" })`, which is opaque and web-only.

They combine with everything else. `.on([viewportBreakpoint("md"), "hover"], …)` is hover at md and up:

```ts
import { when, viewportBreakpoint, containerSize, px } from "@pureform/core/ast";

padding: when()
    .on(viewportBreakpoint("md"), px(12))
    .on(containerSize({ min: px(400) }), px(16))
    .else(px(8)),
```

**[DECIDED]** Breakpoint tokens live in `CoreConfig.breakpoints` (name to unit-encoded
size), shared by `viewportBreakpoint` and `containerBreakpoint`. The adapter resolves the
`from`/`until` tokens against it (`until` is an exclusive upper bound, giving half-open
bands). **[DECIDED]** Container queries are portable end-to-end, so no target is limited to
`base`. The node stays a plain portable `Condition`, and adapters pick the best lowering in
order. (1) A target with native container queries (modern web CSS) lowers to `@container`
(zero runtime, preferred). (2) Everywhere else (native, or web without support, or
JS-driven), a runtime "container context" driven by a size-observer re-evaluates the
`containerSize`/`containerBreakpoint` nodes against the measured size (`ResizeObserver` on
web, `onLayout` on React Native), behind one portable contract so the same node resolves
identically either way. (3) Before first measurement, or with no observer wired (e.g. SSR
pre-hydration), it falls back to `base` per the universal rule. Named containers map
cleanly: CSS `container-name` on path (1), a keyed observer scope (nearest registered
ancestor) on path (2). The observer is a Layer-4 binding capability (`@pureform/solid` and
peers, implemented per-platform). Core's AST is unchanged and always carries a `base`.

**Adapter mapping.** For Panda, a `ConditionalNode` compiles 1:1 to a Panda _conditional
value object_ rather than a flat string: `when().on("hover", b).on("dark", c).else(a)`
becomes `{ base: <a>, _hover: <b>, _dark: <c> }`. So §5's single-string `compileNodeToCSS`
gains a sibling that emits this object (AND-lists nest the keys, and `rawCondition`
registers or inlines its per-target selector). This resolves open question #8.

**Slot conditions: one part styled by another's state.** **[DECIDED]** A slotted component's
parts often follow each other: a text field's label floats when the container holds focus or
a value, and its supporting text turns red when the field is invalid. `slot(name, state)` is
a condition on a state of one of the component's slots:

```ts
defineSlotComponent({
    name: "textField",
    slots: ["root", "container", "input", "label", "supportingText"],
    // How the slots nest: each slot maps to the slots directly inside it, in order.
    structure: {
        root: ["container", "supportingText"],
        container: ["input", "label"],
    },
    recipe: {
        base: {
            label: {
                color: when()
                    .on(slot("container", "focusWithin"), ref("focusColor"))
                    .on(slot("container", "invalid"), ref("errorColor"))
                    .else(ref("labelColor")),
            },
        },
    },
});
```

- **States.** `hover`, `focusWithin`, `focusVisibleWithin`, `pressed`, `filled`, `selected`,
  `checked`, `indeterminate`, `invalid`, `disabled`. Each describes the slot's element together
  with what it contains, so a container is `invalid` when an input inside it is, and a
  checkbox's root is `checked` when its native input is. `selected` (`aria-selected`,
  `aria-pressed`) is separate from `checked` (`:checked`, `aria-checked`).
- **Rules.** A slot can always read its own state. Reading another slot needs `structure`, and
  that slot must be an ancestor there; `validateConfig` rejects anything else, and a slot
  condition outside a slotted component. `defineSlotComponent` types `structure` against the
  declared slots.
- **Web.** The slot's own state lowers onto itself (`&:is(:focus-within, [data-focused])`),
  an ancestor's onto that slot's class (`.textField__container:is(...) &`). Each state also
  matches a data attribute (`data-hover`, `data-focused`, `data-focus-visible`, `data-filled`,
  `data-invalid`, `data-disabled`, and so on) for custom controls. The adapter ranks the
  states by repeating the selector, so wherever Panda places the rules, later ranks win:
  hover, filled, selected, and checked; then indeterminate and the focus states; then
  pressed; then invalid; then disabled.
- **AND.** An array of conditions in one case means all of them. The slot conditions in a case
  join into one selector: states of the same slot on one element, ancestors outermost first.
  Write "or" as separate cases with the same value. `compilePreset` takes `pandaPrefix` when the Panda config prefixes
  class names.
- **Native.** React Native has no selectors or cascade, so nothing is discovered from the
  markup. A binding owns the component's state (a `TextInput`'s focus and value, props for
  `invalid` and `disabled`) and passes it to every slot, the way it already supplies `hover`
  and `pressed`. `structure` tells it which slots exist and how they nest, and could let a
  renderer build the markup.
- **Not for loose parts.** A standalone part beside some other control, such as standalone
  supporting text, cannot know that control's state on every target, so it takes a variant
  (`tone: "error"`) that the app sets.

### 4.6 Typefaces and typography **[DECIDED]**

Three separate concerns, each with a different platform answer:

**Font families (`CoreConfig.fonts`).** A CSS stack string (`"Inter, system-ui, sans-serif"`)
is web-only, since the comma fallback chain and generic family are CSS concepts. So families
are a structured, portable `FontFamilyNode` (§4.1):

```ts
import { fontFamily } from "@pureform/core/ast";

// CoreConfig.fonts
sans: fontFamily(["Inter", "system-ui"], "sans-serif"),
mono: fontFamily(["JetBrains Mono"], "monospace"),
```

The web adapter joins `stack` + `generic` into the CSS value. A native adapter takes
`stack[0]` and drops the fallback tail. Unlike breakpoints, `font-family` **is** valid as a
CSS var (`font-family: var(--fonts-sans)`), so font tokens can be runtime-overridable
`--fonts-*` vars. Reference them with `alias("fonts", "sans")`.

**Font loading (`@font-face`) is NOT core's concern.** Loading is the least portable thing
in the system (web woff2 `@font-face` vs native bundled `.ttf` vs a `<link>`), so Layer 1
only _names_ families. Emitting `@font-face` / bundling fonts is an adapter / app / CLI
concern (the Layer-3 CLI can scaffold it). If an adapter wants a loading manifest it carries
its own `platform()`-keyed sources, and core stays agnostic.

**Text styles (`CoreConfig.textStyles`).** The typescale that `ui-utils` generates:
composite roles bundling family, size, weight, lineHeight, and tracking, mapping 1:1 to
Panda `textStyles`:

```ts
// CoreConfig.textStyles
body: {
    fontFamily: alias("fonts", "sans"),
    fontSize: px(16),
    lineHeight: unitless(1.5),
    fontWeight: unitless(400),
    letterSpacing: px(0),
},
```

A recipe applies a role via a `textStyle` property aliasing it:
`textStyle: alias("textStyles", "body")` becomes Panda's `textStyle: "body"` util (the
adapter expands it into the constituent declarations). Role values are `ValueNode`s, so a
role can carry responsive or conditional typography
(`fontSize: when(viewportBreakpoint("md"), px(18), px(16))`).

### 4.7 Config composition and theming **[DECIDED]**

This is the "**Multi-Config**" in the title: how configs layer, and how named themes work.

**`mergeConfigs` / `defineConfig`.** A config is a plain object, so a base preset + overrides
compose by deep-merge (built on `@pureform/utils` `deepMerge`):

- **Later wins.** `mergeConfigs(base, ...overrides)` folds left to right.
- **Maps deep-merge** by key (`tokens`, `semanticTokens`, `components`, `keyframes`, …).
- **Leaf nodes replace** wholesale. A `ValueNode` is atomic (swap `px(8)` for `px(12)`;
  don't merge their fields).
- **Arrays replace** (`compoundVariants`, gradient `stops`, transform `ops`, …): a later
  config supplies the whole list, with no positional merge.
- **`defineConfig(cfg)`** is the identity and validation entry point authors call. It runs a
  hard-error pass (fail fast at author time): every alias path must resolve and the alias
  graph must be acyclic (§5 #3), keeping overrides type-checked and the merged result sound.

```ts
export const config = defineConfig(
    mergeConfigs(basePreset, brandOverrides, tenantOverrides),
);
```

**Themes.** A `CoreConfig.themes[name]` is a `ThemeOverride` (partial token tiers) merged
over the base by the same rules, then emitted by the adapter under a `[data-theme="<name>"]`
selector (the base config = `:root`). Because themes only **rebind tokens** and recipes
**consume** tokens (via `alias`/`dynamic`), no recipe is theme-aware and no new condition
axis is needed. Theming is two orthogonal axes:

- **Named theme** (brand A/B, high-contrast, per-tenant): `themes` + `[data-theme]` scope.
- **Color scheme** (dark/light): the existing `ColorSchemeCondition` (§4.5), expressible
  _inside_ any theme's token values (`when("dark", darkVal, lightVal)`), lowering to
  `prefers-color-scheme` / `[data-theme]` as the adapter decides.

**[DECIDED] Themes rebind tokens, never recipes.** `ThemeOverride` stays token-only
(`tokens` / `semanticTokens` / per-component `tokens`), and a theme cannot patch a
component's `recipe` (base/variant _styles_). Two reasons: (1) it preserves the
token-vs-structure orthogonality above (recipes stay theme-agnostic); (2) it lowers cleanly,
because Panda recipes compile to static classes and Panda themes compile via tokens +
`[data-theme]` conditions, not by redefining a recipe per theme, so recipe-level overrides
would fight the adapter. Structural variation is still fully expressible: author the recipe
to read a token for the varying property and rebind that token per theme. For example,
`borderRadius: alias('tokens', 'radii', 'control')`, then an `ocean` theme rebinds
`radii.control` to `full` for pill buttons, or a high-contrast theme rebinds a
`controlBorderWidth` token from `0` to `px(1)`. When structure itself must differ and no
token indirection fits, compose a separate full config via `mergeConfigs` rather than a
`ThemeOverride`. Genuinely platform-specific theming remains available through the usual
escapes (`platform()`, `rawRules`).

### 4.8 Theme contracts and providers (`@pureform/theme`) **[DECIDED]**

Components read a fixed vocabulary from each foundation: `onSurface`, `labelLarge`, the
`radii.full` radius, the `stateHover` opacity, and so on. A **contract** names that vocabulary
and the kind of value each name holds, using Material's names. A **provider** is anything that
fills one contract. A theme is one provider per contract.

| Contract     | Requires                                                                        | Lowers to                                                                                                         |
| ------------ | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `color`      | 17 surface roles, plus `g`, `onG`, `gContainer`, `onGContainer` per group       | `semanticTokens.colors`, primitives in `tokens.colors`                                                            |
| `typography` | `brand` and `plain` font roles, the 15 Material text styles; both open          | `fonts`, `tokens.fontSize` / `lineHeight` / `letterSpacing` / `fontWeight` per style, `textStyles` that read them |
| `shape`      | `none` through `full` radii                                                     | `tokens.radii`                                                                                                    |
| `layout`     | spacing steps `0` through `16`, component sizes                                 | `tokens.spacing`, `tokens.sizes`                                                                                  |
| `state`      | hover, focus, pressed, and dragged opacities, the disabled opacities, the scrim | `tokens.opacity`                                                                                                  |
| `motion`     | Material's 16 durations and 7 easings                                           | `durations`, `easings`                                                                                            |
| `elevation`  | a `{ shadow, tint }` pair for `level0` through `level5`                         | `semanticTokens.shadows`, an `elevationTint<Level>` color, the `shadowElevation` utility                          |

Every contract also accepts names beyond the required ones, and they pass through as extra
tokens.

**Checked twice.** Each contract is a TypeScript type (`Record<Role, Kind>`), so a missing
name or a wrong kind of value fails to compile, with the error on the offending line.
`resolveTheme` repeats both checks at runtime for plain JavaScript and casts, naming the
provider, the slot, and what was wrong: `shape provider "brand" gives radius "small" a color
value, not a length`. `requireDark` adds a check that every color role has a dark value. `requireContrast: 4.5` adds a check that every content role reaches that WCAG
ratio against the role it sits on, in light and dark, for the base theme and every named
theme.

**Resolution order.** Domains resolve in a fixed order (color, typography, shape, layout,
state, motion, elevation), and each provider receives the contracts resolved before it. That
is how `tonalElevation` tints with the first color group.

**Composition.** `defineProvider` declares a provider. `extend(provider, change)` rewrites what
one generates and keeps its contract type. `colorFromTokens` and the other `*FromTokens`
helpers wrap a hand-authored contract. Shipped alternatives to Material: `oklchPalette`
(colors from hues), `modularScale` (type sizes from a ratio), `roundedShape`, `gridLayout`,
`tonalElevation`, and `flatElevation`.

**Everything is a CSS var.** Text style values and elevation levels lower to tokens, and every
elevation level always sets both `box-shadow` and `background-image`, so the static CSS has a
rule for every property any provider might use. A theme can therefore swap any provider at
runtime (§6) or per named theme without changing the recipes.

**Named themes from providers.** `pureform({ themes: { teal: { color, shape } } })` resolves
each named theme with some providers replaced and emits only what changes. A semantic token is
declared once on the root and resolves its references there, so a theme also re-declares every
semantic token that refers to a changed token. A theme cannot add color groups, because the
components only have compound variants for the base groups.

```ts
pureform({
    color: oklchPalette({
        groups: { primary: { hue: 265 }, error: { hue: 25 } },
    }),
    typography: modularScale({ ratio: 1.25 }),
    shape: roundedShape({ base: 6 }),
    elevation: tonalElevation(),
    state: materialState({ stateHover: 6 }),
    requireDark: true,
    themes: { compact: { layout: materialLayout({ grid: 3 }) } },
});
```

### 4.9 Preset components (`@pureform/preset`) **[DECIDED]**

`pureform()` ships Material's components as core specs: `button`, `iconButton`, `fab`, `chip`,
`textField`, `textArea`, `supportingText`, `checkbox`, `radio`, `switchControl`, `separator`,
`listItem`, `menu`, `tabs`, `dialog`, `card`, `scrim`, `ripple`, `icon`, `touchTarget`, and
`text`. A component's name is its
generated export, so it avoids reserved words (`switchControl`) and Panda's own patterns
(`separator`, not `divider`).

**Tokens.** Each component declares its own tokens through `componentTokens`, each an
overridable `--components-<name>-<token>` var whose default reads the theme. Its recipe reads
them through `ref(token)`, so an app restyles one component at runtime without a rebuild.

**Color variants.** A component that takes a color group is built by `createX(groups)`, and
`pureform()` passes the theme's groups, custom ones included. Two patterns:

- **Fills** (button, icon button, FAB): an empty `color` entry per group, and a compound
  variant per fill and group that sets the colors, since they depend on both.
- **States** (checkbox, radio, switch, text inputs, chip): the base draws the default group
  through the tokens, and its `color` entry stays empty; every other group rebuilds only the
  properties that depend on the group, each with its full condition list, so error and
  disabled still win. Where those properties sit in another variant (a text field's fill), a
  compound variant replaces them in the later layer.

Standalone `supportingText` and `icon` take a group through `tone` and `color`.

**Shared parts, and parts as components.** Parts that repeat across components live in
`components/shared.ts` and friends, and where a part is useful alone, it is also a component
that shares the same style:

| Part                    | Shared as                                     | Also a component |
| ----------------------- | --------------------------------------------- | ---------------- |
| Icon slot               | `iconBox(size)`                               | `icon`           |
| Touch target slot       | `touchTarget`                                 | `touchTarget`    |
| Supporting text         | `supportingTextStyle`                         | `supportingText` |
| Pressable root          | `pressableRoot`                               |                  |
| Focus indicator         | `focusRing(condition)`                        |                  |
| Selection control parts | `control.ts`: native input, state layer, root |                  |
| Text input parts        | `field.ts`: container, label, states, colors  |                  |
| List and menu rows      | `list.ts`: row, leading and trailing, text    |                  |
| Surface                 | `surface(container, content, level)`          |                  |

A new component looks for these first, and extracts anything it would otherwise repeat.

**Accessibility.** Every interactive component draws `focusRing()`: a 3px secondary outline,
offset 2px, on keyboard focus. Its touch target reaches the theme's `touchTarget` size.
Selection controls lay a native input over the control, so forms, the keyboard, and screen
readers work unchanged. `COMPONENT_CONTRAST` lists the color pairs each component draws, by
token or role (4.5:1 for text, 3:1 for the parts that identify a control), and
`requireComponentContrast` checks them and every color group in light and dark for each
theme. The preset's tests run the same check, plus the touch targets and the focus ring.

---

## 5. Adapter resolution logic (Panda / Web CSS)

Adapters compile `dynamic` path arrays into platform-native constructs. For Web CSS:

- `dynamic(['ui', 'button', 'bg'])` becomes `var(--ui-button-bg)`
- `dynamic(['components', 'button', 'bg'])` becomes `var(--components-button-bg)`

```ts
// This adapter's target id (see PlatformNode). Web CSS uses 'css'.
const TARGET = "css";

export function compileNodeToCSS(node: ValueNode, config: CoreConfig): string {
    switch (node.type) {
        case "literal":
            // Raw off-baseline escape: emitted verbatim (any unit already baked into the
            // string; see §4.4). Baseline keywords arrive as "keyword", not here.
            return node.value;
        case "keyword":
            // Portable baseline keyword (§4.1): map the canonical camelCase token to this
            // target's spelling via a per-property table. Web spells it out (`spaceBetween`
            // becomes `space-between`, align `start`/`end` become `flex-start`/`flex-end`,
            // `transparent` stays verbatim); a native adapter maps to its own flex / cursor
            // constants instead. Unknown token (off-baseline) is a config error.
            return KEYWORD_CSS[node.value] ?? node.value;
        case "numeric":
            // Numeric values append their encoded unit unless 'none' (§4.4).
            return node.unit === "none"
                ? String(node.value)
                : `${node.value}${node.unit}`;
        case "color":
            // Rendered to the target's color syntax (adapter decides: oklch()/color()/
            // hex), gamut-downgrading display-p3 to srgb where unsupported; alpha applied
            // if present. e.g. `oklch(0.6 0.2 290 / 0.5)`.
            return formatColor(node);
        case "alias": {
            // `getByPath` returns a token entry (bare node or `WithMeta` envelope);
            // `tokenValue` unwraps it so metadata is transparent to resolution (§4.2).
            const aliased = tokenValue(getByPath(config, node.path));
            return compileNodeToCSS(aliased, config);
        }
        case "dynamic": {
            const varName = `--${node.path.join("-")}`;
            return node.default
                ? `var(${varName}, ${compileNodeToCSS(node.default, config)})`
                : `var(${varName})`;
        }
        case "platform": {
            // Baseline resolution: this target's value, else the portable default.
            // (An adapter may instead translate a sibling entry, e.g. read
            // node.values.rn; target ids are open, never a closed union.)
            const chosen = node.values[TARGET] ?? node.default;
            return compileNodeToCSS(chosen, config);
        }
        case "utilityArg":
            // Unreachable in a valid config: a dynamic utility's `arg()` is substituted with
            // the `apply` value during utility expansion (before this compiler runs). Seeing
            // one here means an `arg()` escaped a utility template, a hard error the
            // `defineConfig` pass should have already caught (§5 #3).
            throw new Error("arg() used outside a dynamic-utility template");
        case "conditional":
            // Conditionals compile to a Panda condition OBJECT ({ base, _hover, … })
            // via the sibling compiler (§4.5), not a flat string. If one reaches a
            // string-only context, fall back to its base value.
            return compileNodeToCSS(node.base, config);
        case "colorMix":
            // CSS color-mix(): composites `with` over `base` by `amount` in `space`.
            // Works over dynamic vars that static alpha() can't (e.g. a hover scrim).
            return `color-mix(in ${node.space}, ${compileNodeToCSS(
                node.base,
                config,
            )}, ${compileNodeToCSS(node.with, config)} ${compileNodeToCSS(
                node.amount,
                config,
            )})`;
        case "shadow":
            // Join layers into one `box-shadow` (native adapters map to their own
            // elevation model instead; see §4.1 ShadowNode).
            return node.layers
                .map((l) =>
                    [
                        l.inset ? "inset" : null,
                        compileNodeToCSS(l.x, config),
                        compileNodeToCSS(l.y, config),
                        compileNodeToCSS(l.blur, config),
                        l.spread ? compileNodeToCSS(l.spread, config) : null,
                        compileNodeToCSS(l.color, config),
                    ]
                        .filter(Boolean)
                        .join(" "),
                )
                .join(", ");
        case "gradient": {
            // CSS `<kind>-gradient([<angle>,] stop…)`. Native targets use their gradient API.
            const stops = node.stops.map((s) =>
                s.position
                    ? `${compileNodeToCSS(s.color, config)} ${compileNodeToCSS(s.position, config)}`
                    : compileNodeToCSS(s.color, config),
            );
            const head =
                node.kind !== "radial" && node.angle
                    ? [compileNodeToCSS(node.angle, config)]
                    : [];
            return `${node.kind}-gradient(${[...head, ...stops].join(", ")})`;
        }
        case "transform":
            // Op fn names (translateX, scaleY, rotate, …) are already valid CSS.
            return node.ops
                .map(
                    (o) =>
                        `${o.fn}(${o.args.map((a) => compileNodeToCSS(a, config)).join(", ")})`,
                )
                .join(" ");
        case "filter":
            return node.fns
                .map(
                    (f) =>
                        `${f.fn}(${f.args.map((a) => compileNodeToCSS(a, config)).join(" ")})`,
                )
                .join(" ");
        case "transition":
            // `property duration [easing] [delay]`, comma-joined. hyphenate() kebab-cases
            // camelCase property names (backgroundColor becomes background-color).
            return node.parts
                .map((p) =>
                    [
                        hyphenate(p.property),
                        compileNodeToCSS(p.duration, config),
                        p.easing ? compileNodeToCSS(p.easing, config) : null,
                        p.delay ? compileNodeToCSS(p.delay, config) : null,
                    ]
                        .filter(Boolean)
                        .join(" "),
                )
                .join(", ");
        case "animation":
            return [
                compileNodeToCSS(node.duration, config),
                node.easing ? compileNodeToCSS(node.easing, config) : null,
                node.delay ? compileNodeToCSS(node.delay, config) : null,
                node.iterations != null ? String(node.iterations) : null,
                node.direction ?? null,
                node.fillMode ?? null,
                node.name, // keyframes name
            ]
                .filter(Boolean)
                .join(" ");
        case "easing":
            // keyword becomes hyphenated (easeInOut becomes ease-in-out); structured becomes
            // fn form. `node` narrows on `kind` (discriminated union), no non-null assertions.
            return node.kind === "cubicBezier"
                ? `cubic-bezier(${node.points.join(", ")})`
                : node.kind === "steps"
                  ? `steps(${node.steps.count}${node.steps.jump ? `, ${node.steps.jump}` : ""})`
                  : hyphenate(node.name);
        case "calc":
            // Fold operands with the operator; CSS keeps var()/% symbolic.
            return `calc(${node.operands
                .map((o) => compileNodeToCSS(o, config))
                .join(` ${node.op} `)})`;
        case "mathFn":
            // min()/max()/clamp(): comma-separated args (clamp: lower, preferred, upper).
            return `${node.fn}(${node.args
                .map((a) => compileNodeToCSS(a, config))
                .join(", ")})`;
        case "fontFamily":
            // Web: quote multi-word families, then join stack and generic. (Native
            // adapters use stack[0]; see §4.6.)
            return [...node.stack, node.generic]
                .filter(Boolean)
                .map((f) => (/\s/.test(f!) ? `"${f}"` : f))
                .join(", ");
    }
}
```

**Known issues to resolve before implementing the compiler:**

1. ~~**`fallback` + non-`var` primary is invalid CSS.**~~ **[RESOLVED]** `FallbackNode`
   was removed. Its only valid pattern (`fallback(dynamic(x), y)`) is exactly
   `dynamic(x, y)`, and multi-level fallback is expressed by nesting `dynamic` in
   `dynamic.default`, which lowers to natively-valid nested `var(--a, var(--b, …))`.
2. **~~Unit assumption~~ [RESOLVED].** Units are now encoded on `ScalarNode` (§4.4),
   so the compiler renders `${value}${unit}` and there is no px default. `'none'`
   handles unitless properties.
3. ~~**`getByPath` + cycle safety.**~~ **[RESOLVED]** Validation is a hard-error pass run by
   `defineConfig` (§4.7), so a bad config throws at author time rather than producing broken
   output. The adapter resolver reuses the same guarded traversal defensively.
    - `getByPath(config, path)` returns the token entry (possibly a `meta(...)` envelope, so
      callers unwrap with `tokenValue`, §4.2), or throws a path-not-found error naming the full
      path and nearest existing ancestor (`semanticTokens.colors.brandX not found, nearest:
semanticTokens.colors.brand`).
    - **Cycle detection** uses a resolution stack keyed by canonical path. Revisiting a path
      already on the stack throws with the chain (`alias cycle: a -> b -> a`). This is required
      even when emitting `token(...)` refs, since Panda would choke on cyclic refs too, so chain
      validation stays orthogonal to inline-vs-ref emission (we still walk the chain to
      validate even when we emit a ref).
4. ~~**Panda-native vs raw CSS.**~~ **[RESOLVED]** The Panda adapter emits a Panda `token(...)`
   ref wherever an alias path maps to a Panda token category and only inlines otherwise. The
   fixed path-to-category split is tabulated in §4.4 (so dark-mode and conditions keep working,
   matching today's `token(colors.*)` + `shadowElevation` usage).
5. **Utility expansion and `arg()` substitution.** `apply` is expanded before value
   compilation. For each entry the resolver looks up the `UtilityDef` (§4.2) and, for a
   `dynamic` one, deep-substitutes every `arg(key?)` in its `template` with the supplied
   value (`arg()` is the whole arg; `arg("x")`/`arg(0)` is an object/array member), then merges
   the result under the map's explicit props. The `defineConfig` pass (#3) also validates
   utilities as hard errors: the `apply` name resolves to a util; a string arg targets a
   `static` util (key in `values`) or a `dynamic`+`scale` util (key in the resolved scale map,
   else an error listing valid keys); a `ValueNode`/object/array arg targets a `dynamic` util
   and supplies exactly the `arg(...)` keys its template references; `scale` resolves to an
   existing token tier; and `arg()` appears only inside a dynamic template. **Accepted
   limitations** (documented, not blocking): no auto-generated negative scale values (unlike
   Panda, so add an explicit negative util or pass a `ValueNode`); `apply` arg typing is
   config-blind at author time (the ref hole, since real types materialize downstream in
   Panda's generated preset); `withUnit` assumes a unitless input; `scale` plus an arithmetic
   multiplier in the same template compounds (look-up then scale, usually one or the other);
   and the build-time-expanded and Panda-function lowerings of a dynamic util must stay in sync.

---

## 6. Runtime overriding and customization

Overrides cascade via CSS custom properties, highest priority last:

```
Instance style  →  CSS scope (e.g. .sidebar)  →  Component semantics  →  Global semantics  →  Primitives
```

| Override scope          | Mechanism                                                             | Web outcome                                        |
| ----------------------- | --------------------------------------------------------------------- | -------------------------------------------------- |
| Global theme            | Update AST `tokens` or `semanticTokens`                               | Rebuilds base values / refreshes `--global-*` vars |
| All component instances | Update the component's own `tokens` (e.g. `components.button.tokens`) | Rebinds `--components-button-bg`                   |
| Contextual scope        | CSS rule: `.sidebar { --ui-button-bg: green; }`                       | Overrides instances nested in the container        |
| Instance level          | Solid prop: `<Button style={{ '--ui-button-bg': 'red' }} />`          | Highest-priority inline override                   |

**[REPO]** Note the instance mechanism is Solid's `style` prop, not React's. The
`--ui-*` custom-property contract is framework-agnostic, so Layer 4 components just
need to forward `style`/`class`.

**[DECIDED] Var-naming contract.** Three namespaces, keyed by a `<tier>` second segment
that is also a **stability marker**:

- `ui`. The **public** contract (`--ui-<cmp>-<token>`, slots `--ui-<cmp>-<slot>-<token>`;
  kebab-case, `<cmp>` is the spec `name`). The only tier consumers are blessed to hardcode in
  scope rules or instance styles. Renaming one is a breaking change for the design system.
- `components` / `global`. **Internal** vars (`--components-<cmp>-<key>`,
  `--global-<group>-<key>`), machine-generated and never hand-authored. Consumers retheme
  these tiers through config (`mergeConfigs` / `ThemeOverride`), never by writing CSS against
  the vars, so the adapter stays free to restructure them.

Var emission is an **adapter concern** (not core, which only names paths, §4.3). **The
prefix applies only at lowering.** Config paths and `dynamic`/`alias` nodes always stay in
their canonical, prefix-free form (`['ui', <cmp>, <key>]`, `['components', …]`,
`['global', …]`). The adapter prepends the prefix when it emits the actual CSS var, so an
author never writes (or sees) the prefix in a `CoreConfig`. The Panda adapter takes an
optional, granular **prefix policy** so a design system can namespace its emitted vars to
avoid collisions when embedded alongside others:

```ts
// Panda-adapter option
type VarPrefix = string | { ui?: string; components?: string; global?: string };
// prefix: 'pf'  produces --pf-ui-*, --pf-components-*, --pf-global-*  (all tiers)
// prefix: { components: 'internal', global: 'internal' }
//               produces --internal-components-*, --internal-global-*, and --ui-* stays clean
// (omitted)     produces --ui-*, --components-*, --global-*  (default: no prefix)
```

A bare string prefixes every tier uniformly. An object sets per-tier prefixes, with omitted
tiers falling back to no prefix. The `<tier>` segment is always emitted. **Default is no
prefix** (so the bare forms above are the canonical names used throughout this doc).
Setting a prefix is recommended for collision safety, and costs nothing on the
machine-generated internal tiers. Var-name collisions _within_ a tier across scopes (e.g.
`--ui-button-bg` at both scope and instance level) are intentional cascade behavior.

**Runtime theming.** Recipes, text styles, and utilities are static CSS, but every value they
read is a token var. `themeVars(config, { scheme })` from `@pureform/panda-adapter` returns
those vars for any config, so an app can rebuild a config with other providers in the browser
and set the vars on a subtree to restyle it with no rebuild. Scheme-dependent tokens need
`scheme`, since Panda declares them on the root. Only recipe structure, such as a new color
group's compound variants, needs a rebuild.

---

## 7. Migration path (current preset to AST-driven) **[REPO]**

The existing `@pureform/pandacss-preset` is the pragmatic reference for what the Panda
adapter must be able to produce. Proposed phased approach:

1. **Phase 0 (now).** Finalize this doc. All §4/§5 `[OPEN]` items are now `[DECIDED]`, and
   the remaining work is the deferred-extension list (§9.1 group A).
2. **Phase 1.** Scaffold `@pureform/core` (via `ts-package` generator). Land `ast/`
   (node types in `nodes.ts` + grouped helpers under `helpers/`), `types.ts`,
   `getByPath`, and unit tests for the node model. No adapter yet.
3. **Phase 2.** Model **one** real component (`button`, incl. slots) as a `CoreConfig`
   and diff it against the hand-written `button.ts` to validate the schema covers reality
   (slots, variants: color/variant/size/leading/trailing/disabled, elevation utility,
   opacity mixing).
4. **Phase 3.** Build `@pureform/panda-adapter` that compiles the AST into the preset
   shape (`defineSlotRecipe`, `defineSemanticTokens`, utilities). Snapshot-test its
   output against the current preset until parity.
5. **Phase 4.** Flip `@pureform/pandacss-preset` to be _generated_ from core, or replace
   it. Keep `ui-utils` as the value generator feeding primitives.
6. **Phase 5+.** Layer 3 CLI (`@pureform/cli`) + Layer 4 `@pureform/solid`.

**Risk:** Panda `2.0` is newly stable (`2.0.1`), so early-stable APIs may still shift. Pin
versions and snapshot adapter output.

---

## 8. Open questions (to resolve while refining)

1. ~~**`fallback` node: keep or fold into `dynamic.default`?**~~ **[DECIDED]** Removed.
   Runtime fallback is `dynamic.default` (chainable by nesting), and build-time selection
   is `platform`. See §5 issue 1.
2. ~~**Slots in `ComponentSpec.recipe`**~~ **[DECIDED]** Discriminated union:
   `ComponentSpec` (single-slot) | `SlottedComponentSpec` (`slots` + slot-keyed maps),
   mapping to Panda `defineRecipe`/`defineSlotRecipe`. See §4.2 / §4.3.
3. ~~**Units policy** for numeric scalars.~~ **[DECIDED]** Units are encoded on the
   AST (`ScalarNode`, `CoreConfig.tokens`) via `numeric`/`px`/`unitless`, and adapters
   never infer them. See §4.4. (The token-namespace `token(...)` emission split is now also
   resolved, §4.4.)
4. ~~**Alias resolution strategy**~~ **[DECIDED]** Emit Panda `token(...)` refs rather than
   inlining values, to preserve dark-mode/conditions. (§5.4)
5. ~~**[DECIDED, value shape TBD]**~~ **[DECIDED]** `@pureform/core` **owns** the canonical
   token values and is the dependency root the other packages build on. `ui-utils` depends
   on core (feeding its generated palettes and elevation _into_ core's contract), not the
   reverse. **Value shape and hand-off resolved.** There is no bespoke interchange/value
   type: `CoreConfig` plus the node constructors are the contract. Token values stay
   `Token<ScalarNode>` with space-tagged `ColorNode`s in the §4.4 canonical ranges, and
   `ui-utils` hands core `Partial<CoreConfig>` **fragments** built with core's own helpers.
   It exposes generators (e.g. `palette(seed)` returns `{ tokens, semanticTokens }` via
   `hct()`/`oklch()`, and `elevation()` returns `{ utilities }` as a `shadowElevation`
   `UtilityDef`) that authors compose with `mergeConfigs(palette(seed), …overrides)`. A
   generated palette is thus indistinguishable from a hand-authored one, and the dependency
   still points from `ui-utils` to core.
6. ~~**Framework target for Layers 3 and 4**~~ **[DECIDED]** Solid-first, with the core kept
   framework-agnostic as far as practical, and per-framework concerns in thin
   adapters/bindings.
7. ~~**Package names**~~ **[DECIDED]** `@pureform/core`, `@pureform/panda-adapter`,
   `@pureform/solid`, `@pureform/cli`.
8. ~~**Conditions / states (`_hover`, `_dark`, `_disabled`)**~~ **[DECIDED]** Modeled as a
   value-level `ConditionalNode` (`base` + typed `Condition` cases), covering both recipe
   state styles and dark-mode token values. A portable `PortableCondition` union plus a
   `rawCondition` escape hatch keep it platform-agnostic. See §4.5.
9. ~~**Zag.js integration boundary**~~ **[DECIDED]** Nothing to adapt at the AST level.
   Behavior (state machines) lives entirely in Layer 3/4, orthogonal to the styling AST
   (Layer 1) and adapters (Layer 2). The AST never models or borrows it. Any Zag.js reuse
   is an implementation detail of the delivered components, out of scope for this design.
10. ~~**Tooling migration**~~ **[SKIP]** Out of scope for this design doc (process, tracked
    separately).

---

## 9. Open items and future work

The capability backlog that this section used to track is now modeled in §4 and §5:
shadows, color-mix, compound-variants, motion (transitions and keyframes), theming,
gradients, transforms, filters, `calc`, custom utilities, shared component base styles,
config composition, and per-space color ranges. (Document-level global/reset styling is
deliberately an adapter concern, not core.) What remains:

**Scattered `[OPEN]` markers:** all resolved. The token-value shape and `ui-utils` hand-off
(§8 #5), alias lowering split and `getByPath`/cycle safety (§4.4, §5 #3 and #4), theme scope
(§4.7), and container-query lowering (§4.5) are now `[DECIDED]`. Remaining future work is
the deferred list below.

### 9.1 Expressiveness gaps found reconciling against the real preset **[REPO]**

Found by diffing the AST against the hand-written `@pureform/pandacss-preset`
components (`button`, `state-container`, `ripple-layer`). Tiered by how hard they block
real (non-canonical-button) components.

**Tier 1, blocks real components:**

- ~~**[OPEN] Narrow numeric args on composite nodes.**~~ **[RESOLVED]** `TransformOp.args`,
  `FilterNode.fns[].args`, `ShadowLayer.x/y/blur/spread`, `GradientStop.position`,
  `GradientNode.angle`, and `ColorMixNode.amount` now take `NumericValue` (numeric / `calc` /
  math-fn / ref) instead of a bare `NumericScalarNode`, so they accept `alias`/`dynamic`/
  `calc` (§4.1). This landed as part of a doc-wide **narrowest-acceptable** pass: node and
  helper fields never type a value as the full `ValueNode`, only the narrowest semantic
  union valid for the slot (`NumericValue` / `ColorValue` / `EasingValue`, or a bare
  `NumericScalarNode` where even refs are invalid, e.g. media-query bounds). See the
  guideline on `RefNode`/`NumericValue` in §4.1 `nodes.ts`. The one accepted cost is the
  usual ref hole: a ref's _resolved_ kind is checked at compile time, not by TS.
- ~~**[OPEN] No nested-selector / descendant / pseudo-element style _block_.**~~ **[RESOLVED]**
  Resolved without leaking CSS selectors into the agnostic core. Three-part answer (§4.1
  `StyleMap`, §4.2 `SlottedComponentSpec`): (1) **slots** are the portable mechanism for a
  component's own structural parts (icon / label / indicator / decorative layer), where each
  slot is a `StyleMap` the adapter targets per platform with no selectors; (2) a block-form
  `states?: Partial<Record<PortableCondition, StyleMap>>` covers multi-property self-state
  styling agnostically (the dual of per-value `when(...)`); (3) a target-keyed
  `rawRules?: Record<targetId, Record<rawSelector, StyleMap>>` escape hatch, modelled on
  `rawCondition`/`platform`, handles the irreducibly non-portable remainder (arbitrary
  consumer-rendered descendants, pseudo-elements, platform widget parts). Core assigns no
  meaning to the keys, values stay portable `StyleMap`s, and a target with no entry emits
  nothing. The earlier CSS-shaped `selectors`/`pseudoElements` idea was rejected as too
  web-coupled for Layer 1.

**Tier 2, needed for a full design system:**

- ~~**[OPEN] Applying a custom `utility` inside a `StyleMap`.**~~ **[RESOLVED]** `StyleMap`
  carries `apply?` (§4.1): a block-level invocation the adapter expands to the utility's
  styles (Panda emits the native utility; other targets inline it), merged under the map's
  explicit properties. `UtilityDef` is a discriminated union (§4.2, built via
  `defineStaticUtility` / `defineDynamicUtility`). A **`static`** utility is a fixed set of
  named value-to-`StyleMap` steps (covers `button.ts`'s `[shadowElevation]: 'level1'|'level0'`,
  composing with `states`). A **`dynamic`** utility is value-parameterized: the call-site
  value is substituted into a `template` via `arg()` (§4.1), optionally bound to a token
  `scale` so a string arg is a scale key (`m: '2'` becomes `token(spacing.2)`), with
  `arg("x")`/`arg(0)` + object/array `apply` for multi-arg. `apply` names/keys share the
  `alias(...)` compile-time ref hole (validated by `defineConfig`, §5 #3). See §5 #5 for
  expansion semantics and the accepted limitations (no auto-negative scale values, etc.).
- ~~**[OPEN] Alpha over a token / var color.**~~ **[RESOLVED]** `alpha()` is now overloaded
  (§4.1 `color.ts`): over a concrete `ColorNode` it sets the `alpha` channel as before; over
  a ref / keyword / existing mix (no build-time channels) it lowers to
  `color-mix(in srgb, transparent, <c> <a*100>%)`, so `alpha(alias('tokens','colors','x'),
0.3)` just works (covers `ripple-layer.ts`'s `token(colors.x)/30`). `a` is the resulting
  opacity (0 to 1) in both forms, and the overload returns `ColorNode` or `ColorMixNode`
  accordingly.
- ~~**[OPEN] Token metadata.**~~ **[RESOLVED]** Any token value is now metadata-wrappable via
  `meta(value, { description?, deprecated?, extensions?, platformHints? })`, producing a
  `WithMeta` envelope `{ $value, $meta }` (`$value` holds the node and is the sentinel that
  marks a wrapped entry; `$meta` carries the `Metadata`). Token maps are typed
  `Token<T> = T | WithMeta<T>` (bare values still valid, so it's non-breaking), and the
  resolver reads through them with `tokenValue` (§4.2, §5). pureform core owns the annotation
  names (plain `description`/`deprecated`/`extensions`, not DTCG `$`-keys), and the DTCG codec
  maps them (below). The node's own kind encodes the token type, so there's deliberately no
  `$type`. Component specs carry the same `$meta` (§4.2).
- ~~**[OPEN] DTCG (W3C Design Tokens) import/export.**~~ **[RESOLVED as a Layer-2 codec].**
  DTCG is treated like any other target. A bidirectional `@pureform/dtcg` codec (a
  `@pureform/cli` concern) lowers a `CoreConfig` to DTCG JSON and lifts it back, so core is
  not shaped after DTCG. The codec owns all mapping: pack/unpack `$value`; map node-kind to
  and from `$type`; `$meta.description` to and from `$description`; `$meta.deprecated` to and
  from `$deprecated`; `$meta.extensions` to and from `$extensions` (verbatim); and
  `$meta.platformHints` to and from a reserved `$extensions["sh.pureform.hints"]` namespace,
  so our per-target directives round-trip losslessly without leaking to foreign tools (which
  read only their own namespace). Still open: the codec implementation itself, and which
  tools to target first (Figma, Tokens Studio, Style Dictionary).
- ~~**[OPEN] Z-index / stacking-order tier.**~~ **[RESOLVED]** Added a dedicated
  `CoreConfig.zIndices` tier (`Record<string, Token<NumericScalarNode>>`, §4.2), a semantic
  stacking scale (modal / popover / tooltip / overlay), distinct from CSS `@layer` / cascade
  layers. Authored with the `stack([...names])` helper (§4.2) that spaces unitless values by
  `step` (default 100) in declared order, so authors never hand-pick numbers (what actually
  prevents z-index wars); hand entries are still allowed. Consumed via `alias('zIndices',
<name>)` from `StyleMap.zIndex` (which stays `Dimension`, so raw numbers remain a legal
  escape). Theme-overridable and metadata-wrappable like any token tier, and the adapter
  lowers it to Panda's `zIndex` token category.
- ~~**[OPEN] RTL / direction.**~~ **[RESOLVED]** Two-part and logical-first. (1) `StyleMap`
  gained the flow-relative property set (`paddingInlineStart`/`End`, `padding/marginBlock*`,
  `insetInline*`, `border{Start,End}{Start,End}Radius`, `textAlign: 'start'/'end'`; §4.1),
  which auto-flips in RTL on every target with no condition; this is the primary mechanism.
  (2) A `DirectionCondition` (`ltr`/`rtl`) axis on `PortableCondition` (§4.1), used via
  `when("rtl", …)`, is the escape for visual mirrors or flipped assets logical props can't
  express (the adapter lowers `rtl` to `[dir=rtl]`/`:dir(rtl)` on web, `I18nManager.isRTL` on
  native). Core expresses intent and never rewrites physical props itself. Guidance (prefer
  logical) is in §4.5.
- ~~**Component-to-JSX / `className` binding contract.**~~ **[RESOLVED]** `className`/`jsx`
  are web+Panda-only (native has no `className`; `jsx` is Panda's static-extraction hint),
  so they stay out of core's typed style map. Two-part contract: (1) by default, the adapter
  derives both from `ComponentSpec.name` (web/Panda: `className` from the name in the
  adapter's own casing + `jsx: [Pascal(name)]`; native ignores both); (2) the rare custom
  binding goes in the per-target `$meta.platformHints.panda` bag (`{ jsx, className }`),
  opaque to core (§4.2). This reuses the `platformHints` escape rather than adding
  first-class fields, keeping Panda jargon out of the public API.
- ~~**[OPEN] Layout and interaction properties missing from `StyleMap`.**~~ **[RESOLVED]**
  Porting `pf-card`, `pf-icon-button` and `pf-scrim` to core specs needed properties the
  curated map lacked, though most of their keyword vocabularies already existed: physical
  offsets (`top`/`right`/`bottom`/`left`) and the block-axis logical pair
  (`insetBlockStart`/`End`), `overflow`, `flexDirection`, `pointerEvents` (a new portable
  `auto`/`none` vocabulary), `aspectRatio`, `outlineWidth`/`Style`/`Color`/`Offset`, and
  `minWidth`/`minHeight`/`maxWidth`/`maxHeight`. All exist on web and React Native, so they
  join the portable map; the adapter needed no change because it lowers every key the same
  way.

**Deferred and out-of-scope.** Two distinct kinds, split so they aren't conflated:

**A. On-demand extensions** (genuine future work; add when a real component first needs it.
Each is additive / non-breaking, though not all are pure union widenings):

- **Rarer CSS math functions** beyond `min`/`max`/`clamp` (§4.1 `MathFnNode`): `round`,
  `mod`, `rem`, trig (`sin`/`cos`/`tan`), `pow`/`sqrt`/`hypot`, `abs`/`sign`. Widen the
  `fn` union and add a helper. Pure union widening.
- **Viewport-relative sizing** (`vh`/`vw`/`vmin`/`vmax`). Not a static `Unit` (§4.1): a
  viewport value has no fixed size until runtime, and the core only emits static styling, so
  there's nothing for a Layer-2 adapter to resolve on native. The portable way, if a real
  component needs it, mirrors container queries (§4.5): a Layer-4 runtime binding
  (`useWindowDimensions`/`onLayout`) fulfills a portable contract, available only to Layer-4
  consumers, not from style output alone. Until then use `platform()` (web real `vh`, native
  static fallback). (`ch`/`ex` stay out: async, font-dependent glyph measurement. `fr` stays
  out: needs a grid engine RN lacks.)
- **`currentColor`** as a portable value. On web it's a live link to the computed `color`
  property (updates on hover/theme/var changes), so it can't be a static keyword (§4.1): a
  build-time freeze to the in-scope color is unfaithful the moment `color` varies, and that
  live tracking is the whole point of using it. The portable form is a REFERENCE to the
  `color` source rather than a resolved value: web emits `currentColor`; non-web binds the
  slot to the same source `color` is bound to (static when `color` is static, and riding the
  §6 runtime-override mechanism when `color` is a contract point). The gap is cross-element
  inheritance (`currentColor` with no local `color`); require `color` in-scope and validate.
  Until modeled, use `literal("currentColor")` web-side or `platform()`.
- **Gradient interpolation hints** (e.g. `in oklch`, midpoint color hints). An additive
  optional field on `GradientNode` / `GradientStop`.
- **A richer easing keyword set.** Widen `KeywordEasingNode.name` (§4.1). (Keyframe
  _definition_ is not a gap: it's already modeled as `CoreConfig.keyframes`, referenced by
  `AnimationNode.name`.)
- **`drop-shadow` filter.** A small _shape change_, not a union widening. `FilterNode.fns`
  is currently `{ fn; args: NumericValue[] }[]`, but `drop-shadow(x y blur color)` needs
  offsets and a `ColorValue`, so adding it means discriminating `fns` by `fn` (the
  drop-shadow variant carrying `x`/`y`/`blur` + color, like `ShadowLayer`). Additive and
  non-breaking, but it touches the node shape.
- **Scroll- or view-driven animation timelines.** A genuine _structural_ addition (extra
  fields on `AnimationNode` or a new node, plus a portability story), not vocabulary.
  Deferred until a real component needs motion tied to scroll/visibility rather than time.
- ~~**Ripple.**~~ **[RESOLVED]** The split follows the runtime boundary. `@pureform/preset`
  ships a `ripple` slot component with the static styles: a layer that clips to its surface,
  and a ripple circle in `currentColor` at the pressed state-layer opacity, with a soft
  radial-gradient edge. `ripple()` from `@pureform/js-effects` handles the press with
  Material's timing: it grows the ripple from the press point toward the center, holds it
  while pressed, and fades it on release. The only core change was a `radialGradient` extent.

**B. Not a core gap** (reclassified; these need no Layer-1 node):

- **Explicit `@layer` ordering.** An **adapter concern**: a web-only cascade feature with no
  native analogue, so the adapter owns emission and core never models it.
- **Reusable style fragments / mixins** (the preset spreads a `touchTarget` snippet).
  **Already works**: a `StyleMap` is a plain JS object, so shared snippets compose via object
  spread (beyond the first-class `textStyles` + `utilities`), and no node is needed.
- **Typed variant selections to generated component prop types.** Correctly scoped to
  **Layer 4** (component codegen / delivery), not a Layer-1 expressiveness gap.
- **A state container component.** `pf-state-container` drew a state layer in its own slot,
  switched on by hovered/pressed props that JavaScript set. `stateLayer()` in
  `@pureform/preset` replaces it: each component tints its own container through portable
  `hover`/`focusVisible`/`pressed` conditions, so no extra element or JavaScript is needed.

**Phase 2 coverage check (full slotted button).** The real multi-slot button (slots `root`,
`label`, `leadingIcon`, `trailingIcon`; `color` / `variant` / `size` / `leading` / `trailing`
variant groups; compound and default variants; per-state styles; a `when(...)` opacity; a
`colorMix` overlay; logical spacing; component tokens as runtime dynamics; a static elevation
utility applied by name) was modeled as a `CoreConfig` and passes `defineConfig` with no
errors. It is the fixture the adapter compiles. The modeling surfaced one minor ergonomic
observation, not a blocker: a boolean variant group (`leading`, `trailing`) is keyed by the
strings `"true"` / `"false"`, since `variants` is `Record<string, ...>` and has no dedicated
boolean form. This matches Panda's own boolean-variant spelling, so it lowers cleanly; a typed
boolean-variant sugar is a possible future nicety, deferred. The pre-existing `AlignKeyword`
`space*` observation (valid type-wise on `alignItems` though only meaningful on the justify
axes) still stands as the one un-split slot noted above.

---

## 10. Glossary

- **Primitive token:** a `ScalarNode` value carrying its unit/space (`tokens.spacing.2 = px(8)`, `tokens.colors.violet600 = hex('#7c3aed')`).
- **Color:** a `ColorNode` scalar carrying its color `space` (`srgb`/`oklch`/`hct`/…) + channels + optional `alpha`. The color analogue of a unit (§4.4). The `transparent` keyword is the typed `kw.transparent`; `currentColor` is a live link to the `color` property (dynamic even on web), so it's not a static keyword (§9).
- **Keyword:** a `KeywordNode` drawn from a closed, per-property vocabulary (`kw.flex`, `kw.center`, `kw.solid`), carrying a canonical camelCase token the adapter maps per target. The vocabulary is trimmed to portable tokens; web-only keywords use `literal`/`platform()`. Grouped into `helpers/keyword/` submodules (§4.1).
- **Semantic token:** system-level meaning-bound reference (`brand` resolves to `violet600`), overridable.
- **Metadata (`meta` / `WithMeta` / `$meta`):** pureform-owned annotations on a token or
  component spec: `description`, `deprecated`, `extensions` (foreign-tool passthrough), and
  `platformHints` (per-target adapter directives). Attached via `meta(value, {...})`, which
  wraps the value as `{ $value, $meta }`. Token maps accept `Token<T> = T | WithMeta<T>`
  (bare or wrapped), and `tokenValue(...)` unwraps for resolution. Pure data,
  platform-agnostic. The DTCG codec (§9) maps it to/from DTCG `$`-keys. See §4.2.
- **Component token:** a component-scoped token created on `ComponentSpec.tokens`
  (`--components-<cmp>-*`), overridable, resolving to system semantics / primitives. An
  internal var tier: retheme via config, not by hardcoding the var (§6).
- **Dynamic contract point (`--ui-*`):** the public CSS-var a consumer sets at runtime, the
  one var tier blessed for hardcoding. All tiers are optionally prefixable via the adapter's
  granular prefix policy (§6).
- **Platform node (escape hatch):** target-keyed value with a required portable
  `default`, for values that can't be expressed agnostically (e.g. CSS `100vh`).
- **Target id:** an adapter's identifier used to select `PlatformNode` values (`'css'`, `'rn'`, …).
- **Recipe:** component style definition (base + variants + defaults). May be slotted.
- **Adapter:** compiler from AST to a build-tool's native config (Panda first).
- **Slot recipe:** a Panda concept, a recipe spanning multiple named element slots. The
  portable way to style a component's structural parts (the adapter targets each slot per
  platform, no selectors).
- **Font family:** a structured `FontFamilyNode` (`stack` + CSS `generic`). Portable (web
  joins the stack, native uses the primary). Loading (`@font-face`) is out of core (§4.6).
- **Text style:** a composite typescale role (family/size/weight/lineHeight/tracking) in
  `CoreConfig.textStyles`, applied via a `textStyle` ref, lowering to Panda `textStyles` (§4.6).
- **Stacking scale (`zIndices` / `stack`):** a semantic z-order tier on `CoreConfig.zIndices`
  (modal / popover / tooltip / …), authored with `stack([...names])` so declared order (not
  magic numbers) drives spaced unitless values. Distinct from CSS `@layer` / cascade layers.
  Consumed via `alias('zIndices', <name>)` from `StyleMap.zIndex`. See §4.2.
- **Condition / state:** a `ConditionalNode` value that varies by a typed `Condition`:
  states (`hover`, `dark`, `disabled`, `rtl`, …) and environment queries
  (`viewportBreakpoint`/`viewportSize`/`containerBreakpoint`/`containerSize`, media
  features), with a `rawCondition` escape hatch. See §4.5. Its block-form dual is
  `StyleMap.states` (a whole `StyleMap` per `PortableCondition`), for multi-property
  state changes. See §4.1.
- **Direction (RTL):** handled logical-first. Flow-relative `StyleMap` properties
  (`paddingInlineStart`, `textAlign: 'start'`, …) auto-flip with no condition. The
  `DirectionCondition` axis (`when("rtl", …)`) is the escape for visual mirrors or flipped
  assets. Core expresses intent, and adapters mirror. See §4.1, §4.5.
- **Nested rules (`rawRules`):** `StyleMap`'s target-keyed escape hatch for styling
  elements with no portable form (arbitrary descendant selectors, pseudo-elements, platform
  widget parts). `targetId to (rawSelector to StyleMap)`. Core assigns no meaning to the
  keys, values stay portable, and absent targets emit nothing. Prefer slots for a component's
  own parts. See §4.1 and §4.2.
- **Component base (`componentBaseStyles`):** a portable `StyleMap` merged into every component
  the framework generates, at lowest precedence (own base / variants / states win). Scoped
  to our output only, so it never touches the host document. The adapter merges it into each
  component's base (slot recipes: root slot). Document-level styling (`:root`/`body` resets,
  `*`, `::selection`) is not core; it's an adapter / app concern. See §4.2.
- **Value kind / `ValueNodeMap`:** `LeafNodeMap` registers the concrete leaf kinds
  (`literal`/`numeric`/`calc`/`color`/`colorMix`/`gradient`/`shadow`/`transform`/`filter`/
  `transition`/`animation`/`easing`/`fontFamily`) by their `type`. `ValueNodeMap[K]` yields
  the leaf(s) for `K` **plus** any reference node (`alias`/`dynamic`/`platform`/
  `conditional`/`utilityArg`). See §4.1.
- **Narrowest-acceptable (value typing guideline):** a value-bearing field is typed with
  the narrowest union valid for its slot, never the full `ValueNode`. In `StyleMap` that's
  a `ValueNodeMap`-derived category (`Color`/`Dimension`/…); on composite nodes it's a
  node-level semantic union: **`NumericValue`** (numeric/`calc`/math-fn/ref),
  **`ColorValue`** (color/`colorMix`/keyword/ref), **`EasingValue`** (easing/ref). Only the
  genuinely kind-agnostic indirection slots (`dynamic.default`, `platform.values`/`default`,
  `conditional.base`, token maps) stay `ValueNode`. Media/container query bounds stay the
  even-narrower `NumericScalarNode` (no refs). See §4.1 `nodes.ts`.
- **Style map:** the typed per-property style map (`ast/style.ts`) whose CSS-property keys
  each constrain their value to the kinds valid there (`color: ValueNodeMap["color" |
"literal"]`), replacing the old `Record<string, ValueNode>`. See §4.1 and §4.2.
- **Shadow / elevation:** a composite `ShadowNode`, an ordered stack of box-shadow
  layers (Material elevation). Web joins them into one `box-shadow`, and native maps to its
  elevation model. See §4.1.
- **Color-mix:** a `ColorMixNode` compositing an overlay over a (possibly dynamic) base
  color, lowering to CSS `color-mix()`. The generic primitive for opacity/scrims over values
  not known at build time. `alpha()` over a non-concrete color (ref / keyword) is sugar that
  lowers to it (fade toward `transparent`), while `alpha()` over a concrete color just sets
  its channel. Material's _state layer_ is sugar over this, built in the Material layer (§3),
  not core. See §4.1.
- **Compound variant:** recipe styles applied only when several variant selections
  combine (lowering to Panda `compoundVariants`). See §4.2.
- **Gradient:** a `GradientNode` (`linear`/`radial`/`conic`) whose stops reuse `ColorNode`
  / refs. A background value (`background`/`backgroundImage`). See §4.1.
- **Transform / filter:** composite `TransformNode` (ordered ops) / `FilterNode` (ordered
  functions), lowering to CSS `transform` / `filter`. See §4.1.
- **Motion:** `TransitionNode` (legs of property+duration+easing), `AnimationNode` (a
  keyframes instance), `EasingNode` (keyword / `cubic-bezier` / `steps`). Durations,
  easings, and `keyframes` are config-level tokens. See §4.1 and §4.2.
- **Calc / math:** a `CalcNode`, portable infix arithmetic over numerics/refs lowering to CSS
  `calc()` (nest for mixed-operator precedence), plus a `MathFnNode` for the function
  family CSS `calc()` can't express: `min()` / `max()` / `clamp()`. Both are dimensions.
  See §4.1.
- **Utility (`static` / `dynamic`):** a `UtilityDef` on `CoreConfig.utilities` (lowering to
  Panda `utilities`), invoked from a `StyleMap` via `apply`. A `static` utility is fixed
  named value-to-`StyleMap` steps (e.g. `shadowElevation`). A `dynamic` utility is
  value-parameterized via an `arg()` placeholder in a `template`, optionally bound to a token
  `scale` (`m: '2'` becomes `token(spacing.2)`). Built with `defineStaticUtility` /
  `defineDynamicUtility`. See §4.1 and §4.2, §5 #5.
- **Theme:** a `ThemeOverride` on `CoreConfig.themes`, a partial token rebind emitted
  under `[data-theme]`. Orthogonal to the dark/light scheme axis. See §4.7.
- **Config composition:** `mergeConfigs` / `defineConfig`, deep-merge of a base preset +
  overrides (later wins; maps merge; leaf nodes and arrays replace). See §4.7.

---

## Appendix A: canonical button (abstract spec, single-slot)

> Kept from the originating spec as the **abstract** reference. Note this is the
> simplified single-slot form. The real repo button is a **`SlottedComponentSpec`**
> with more slots/variants (see §4.3 and Phase 2). Treat this as illustrative of node usage,
> not as the target output.
>
> It exercises the later-added features end-to-end: space-encoded `oklch` colors (§4.4),
> first-class state conditionals via `when()` (hover / disabled / focus-visible, §4.5), a
> composite `transition()` over `easings` motion tokens (§4.2), a shared `textStyle` role
> (§4.6), a responsive `viewportBreakpoint` padding bump (§4.5), both a `static`
> `shadowElevation` **utility** (invoked with `apply` and swapped per state through the
> block-form `states` map) and a `dynamic`, spacing-`scale`-bound `m` utility built with
> `defineStaticUtility` / `defineDynamicUtility` (§4.1 and §4.2), RTL-safe **logical** padding
> (`paddingInline/BlockStart`, §4.1), token **metadata** via `meta(...)`
> (`description`/`deprecated`/`extensions`, §4.2), a web-only `className`/`jsx` override
> through `$meta.platformHints.panda` (§4.2, §9.1), and a system-level semantic stacking
> scale built with `stack([...])` (`zIndices`, §4.2).

```ts
// button.config.ts
import {
    alias,
    alpha,
    arg,
    colorMix,
    cubicBezier,
    dynamic,
    hex,
    numeric,
    oklch,
    pct,
    px,
    shadow,
    transition,
    tween,
    unitless,
    viewportBreakpoint,
    when,
} from "@pureform/core/ast";
import * as kw from "@pureform/core/ast/helpers/keyword";
import {
    defineComponent,
    defineDynamicUtility,
    defineStaticUtility,
    meta,
    stack,
} from "@pureform/core";
import type { CoreConfig } from "@pureform/core/types";

export const buttonSystemConfig: CoreConfig = {
    // 1. PRIMITIVES (unit encoded per §4.4)
    tokens: {
        colors: {
            // colors keep their generation space (§4.4) instead of flattening to hex:
            // `ui-utils` emits oklch / HCT and the adapter renders (or gamut-downgrades) it.
            // violet600 carries metadata (§4.2): a doc string and a foreign-tool
            // `extensions` bag. `meta(...)` wraps the value as `{ $value, $meta }`;
            // resolution unwraps it.
            violet600: meta(oklch(0.53, 0.25, 293), {
                description: "Primary brand violet (resting).",
                extensions: { "com.figma": { styleId: "S:brand-600" } },
            }),
            violet700: oklch(0.47, 0.24, 293),
            red600: oklch(0.58, 0.22, 27),
            // `deprecated` flows through to an adapter warning; the value still resolves.
            red700: meta(oklch(0.5, 0.21, 27), {
                deprecated: "unused; prefer semanticTokens.colors.danger",
            }),
            white: hex("#ffffff"),
            transparent: kw.transparent, // portable color keyword (§4.1)
        },
        spacing: { 1: px(4), 2: px(8), 3: px(12), 4: px(16), 6: px(24) },
        radii: { sm: px(4), md: px(8), lg: px(12), full: px(9999) },
        fontSize: { sm: px(14), md: px(16), lg: px(18) },
    },

    // Named breakpoints, shared by viewport + container queries (§4.5). Referenced by
    // `viewportBreakpoint("md")` in the size variant below.
    breakpoints: { sm: px(640), md: px(768), lg: px(1024) },

    // Semantic stacking scale (§4.2): declared in ascending order, spaced automatically
    // (base/dropdown/overlay/… become 0/100/200/…). Reference via alias('zIndices', <name>),
    // so there are no magic numbers at call sites.
    zIndices: stack([
        "base",
        "dropdown",
        "overlay",
        "modal",
        "popover",
        "toast",
        "tooltip",
    ]),

    // Reusable motion tokens (§4.2), referenced by the transition node via alias
    // (durations/delays and easings are now both alias-able; see TransitionPart).
    durations: { fast: numeric(150, "ms") },
    easings: { standard: cubicBezier([0.2, 0, 0, 1]) },

    // Composite typescale role (§4.6) applied in the recipe via a single `textStyle`
    // ref instead of repeating weight / lineHeight / tracking per size.
    textStyles: {
        buttonLabel: {
            fontWeight: unitless(600),
            lineHeight: unitless(1),
            letterSpacing: px(0),
        },
    },

    // Reusable transforms (§4.2). `shadowElevation` is a static utility: a discrete level
    // maps to the box-shadow it expands to; the recipe invokes it via `apply: { shadowElevation:
    // <level> }` (§4.1) and swaps the level per state through `states`. `m` is a dynamic
    // utility bound to the spacing SCALE: `apply: { m: "2" }` resolves the arg to
    // token(spacing.2) (= 8px) via arg(); a ValueNode arg bypasses the scale.
    utilities: {
        shadowElevation: defineStaticUtility({
            property: "boxShadow",
            values: {
                level0: { boxShadow: kw.none },
                level1: {
                    boxShadow: shadow(
                        {
                            x: px(0),
                            y: px(1),
                            blur: px(3),
                            color: alpha(hex("#000000"), 0.2),
                        },
                        {
                            x: px(0),
                            y: px(2),
                            blur: px(2),
                            color: alpha(hex("#000000"), 0.12),
                        },
                    ),
                },
                level2: {
                    boxShadow: shadow(
                        {
                            x: px(0),
                            y: px(2),
                            blur: px(6),
                            color: alpha(hex("#000000"), 0.24),
                        },
                        {
                            x: px(0),
                            y: px(3),
                            blur: px(4),
                            color: alpha(hex("#000000"), 0.14),
                        },
                    ),
                },
            },
        }),
        m: defineDynamicUtility({
            property: "margin",
            scale: ["tokens", "spacing"],
            template: { margin: arg() },
        }),
    },

    // 2. SYSTEM SEMANTIC TOKENS (keyed directly by group, no extra nesting)
    semanticTokens: {
        colors: {
            brand: dynamic(
                ["global", "colors", "brand"],
                alias("tokens", "colors", "violet600"),
            ),
            brandHover: dynamic(
                ["global", "colors", "brandHover"],
                alias("tokens", "colors", "violet700"),
            ),
            danger: dynamic(
                ["global", "colors", "danger"],
                alias("tokens", "colors", "red600"),
            ),
        },
    },

    // 3. COMPONENT SPECIFICATION
    components: {
        button: defineComponent({
            name: "button",
            // className/jsx are DERIVED from `name` by default; this spec overrides them
            // for the web/Panda target only via the opaque `platformHints` escape (§4.2).
            // Native ignores it. `description` doubles as DTCG docs.
            $meta: {
                description: "Primary action button.",
                platformHints: {
                    panda: { jsx: ["Button", "IconButton"], className: "btn" },
                },
            },
            // Component tokens are CREATED here (overridable --components-button-*
            // vars) and resolve to system semantics / primitives. The recipe
            // aliases them by their ['components','button',<key>] path.
            tokens: {
                bg: dynamic(
                    ["components", "button", "bg"],
                    alias("semanticTokens", "colors", "brand"),
                ),
                bgHover: dynamic(
                    ["components", "button", "bgHover"],
                    alias("semanticTokens", "colors", "brandHover"),
                ),
                color: dynamic(
                    ["components", "button", "color"],
                    alias("tokens", "colors", "white"),
                ),
                radius: dynamic(
                    ["components", "button", "radius"],
                    alias("tokens", "radii", "md"),
                ),
            },
            recipe: {
                base: {
                    // inline-flex lowers to flex on native (no inline flow); §4.1 keyword.
                    display: kw.inlineFlex,
                    alignItems: kw.center,
                    justifyContent: kw.center,
                    gap: alias("tokens", "spacing", "2"),
                    // typography via a shared role (§4.6) rather than ad-hoc props
                    textStyle: alias("textStyles", "buttonLabel"),

                    // STATES are first-class conditionals (§4.5), not magic `_` keys:
                    // disabled dims + blocks the pointer; focus-visible paints a ring.
                    cursor: when("disabled", kw.notAllowed, kw.pointer),
                    opacity: when("disabled", unitless(0.38), unitless(1)),
                    outlineStyle: kw.solid,
                    outlineOffset: px(2),
                    outlineWidth: when("focusVisible", px(2), px(0)),
                    outlineColor: when(
                        "focusVisible",
                        alias("components", "button", "bg"),
                        kw.transparent,
                    ),

                    // composite transition over a motion token (§4.2) instead of an opaque
                    // `literal("all 0.2s ease")`; each leg names its property and easing.
                    transition: transition(
                        tween(
                            "backgroundColor",
                            alias("durations", "fast"),
                            alias("easings", "standard"),
                        ),
                        tween(
                            "boxShadow",
                            alias("durations", "fast"),
                            alias("easings", "standard"),
                        ),
                    ),
                    // resting elevation via the `shadowElevation` utility (§4.2), invoked
                    // with `apply` (§4.1) rather than hand-rolling a ShadowNode here. The
                    // level changes per state through the block-form `states` map (§4.1),
                    // the dual of the per-property `when()` used above: disabled flattens the
                    // elevation, hover raises it.
                    apply: { shadowElevation: "level1" },
                    states: {
                        disabled: { apply: { shadowElevation: "level0" } },
                        hover: { apply: { shadowElevation: "level2" } },
                    },
                    // runtime var, else the component token (itself a dynamic, so
                    // the chain unfolds to nested var() fallbacks)
                    backgroundColor: dynamic(
                        ["ui", "button", "bg"],
                        alias("components", "button", "bg"),
                    ),
                    color: dynamic(
                        ["ui", "button", "color"],
                        alias("components", "button", "color"),
                    ),
                    borderRadius: dynamic(
                        ["ui", "button", "radius"],
                        alias("components", "button", "radius"),
                    ),
                },
                variants: {
                    variant: {
                        // solid: hover now actually consumes the `bgHover` token via a
                        // conditional (§4.5); the resting value stays an overridable var.
                        solid: {
                            backgroundColor: when()
                                .on(
                                    "hover",
                                    alias("components", "button", "bgHover"),
                                )
                                .else(
                                    dynamic(
                                        ["ui", "button", "bg"],
                                        alias("components", "button", "bg"),
                                    ),
                                ),
                            color: dynamic(
                                ["ui", "button", "color"],
                                alias("components", "button", "color"),
                            ),
                        },
                        // outline: transparent at rest, a faint brand fill on hover
                        // (color-mix over the dynamic bg var, §4.1).
                        outline: {
                            backgroundColor: when(
                                "hover",
                                colorMix(
                                    alias("components", "button", "bg"),
                                    alias("tokens", "colors", "white"),
                                    pct(8),
                                ),
                                kw.transparent,
                            ),
                            borderColor: dynamic(
                                ["ui", "button", "bg"],
                                alias("components", "button", "bg"),
                            ),
                            color: dynamic(
                                ["ui", "button", "bg"],
                                alias("components", "button", "bg"),
                            ),
                            borderWidth: px(1),
                            borderStyle: kw.solid,
                        },
                    },
                    size: {
                        // LOGICAL padding (§4.1) so the button is RTL-safe with no `dir`
                        // condition: `block` = top/bottom, `inline` = start/end (flips in RTL).
                        sm: {
                            paddingBlockStart: alias("tokens", "spacing", "1"),
                            paddingBlockEnd: alias("tokens", "spacing", "1"),
                            paddingInlineStart: alias("tokens", "spacing", "2"),
                            paddingInlineEnd: alias("tokens", "spacing", "2"),
                            fontSize: alias("tokens", "fontSize", "sm"),
                        },
                        md: {
                            paddingBlockStart: alias("tokens", "spacing", "2"),
                            paddingBlockEnd: alias("tokens", "spacing", "2"),
                            // responsive: roomier inline padding at >=md (§4.5)
                            paddingInlineStart: when(
                                viewportBreakpoint("md"),
                                alias("tokens", "spacing", "6"),
                                alias("tokens", "spacing", "4"),
                            ),
                            paddingInlineEnd: when(
                                viewportBreakpoint("md"),
                                alias("tokens", "spacing", "6"),
                                alias("tokens", "spacing", "4"),
                            ),
                            fontSize: alias("tokens", "fontSize", "md"),
                        },
                    },
                },
                // combined selections (lowering to Panda compoundVariants, §4.2): compact
                // outline buttons get a faint fill via a color-mix overlay.
                compoundVariants: [
                    {
                        match: { variant: "outline", size: "sm" },
                        style: {
                            backgroundColor: colorMix(
                                alias("components", "button", "bg"),
                                alias("tokens", "colors", "white"),
                                pct(8),
                            ),
                        },
                    },
                ],
                defaultVariants: { variant: "solid", size: "md" },
            },
        }),
    },
};
```
