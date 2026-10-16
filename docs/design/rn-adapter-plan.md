# React Native adapter plan

Status: implemented as a proof of concept, rendered in the browser through React Native Web.
"As built" below records where the implementation differs from the plan.

An adapter that compiles a pureform `CoreConfig` to React Native style objects, with a small
runtime that picks a component's styles for its variants, its state, and the active theme. It
tests how target-agnostic the core really is: everything here lowers from the AST, not from
the CSS the web adapters produce.

## Goals

- **Styles from the AST.** Components lower from their specs to React Native styles, without
  going through CSS.
- **Both theme modes.** Precomputed style sets per scheme and theme, or templates resolved
  against a theme object at runtime. Both share one resolver.
- **States without selectors.** A component's state (pressed, hovered, focused, disabled,
  checked, selected) picks its styles, from `Pressable` and props.
- **Rendered in a browser.** A React Native Web demo, and browser tests comparing key
  properties against the CSS adapter.

## Non-goals

- **Native tooling.** No Metro, simulator, or device. The adapter is plain TypeScript, and
  React Native Web stands in for rendering. Type checks against React Native's style types
  keep the output valid for native.
- **Motion.** Transitions and animations belong to the components (Reanimated), not the
  styles. They're dropped.
- **Shapes.** `clipPath` shapes need `react-native-svg`. Components take their rounded
  fallback, which they already have for browsers without `clip-path: shape()`.
- **Every component.** The POC covers button, card, chip, checkbox, switch, text, and avatar:
  fills, color groups, density, states, slots, and the shape fallback.

## What the core set uses

Measured over the seven components' specs:

| Kind                                   | Found                                                                                   | React Native handling                                                                               |
| -------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Numeric and alias nodes                | 4181, 1572                                                                              | Units to numbers (px as is, rem times the base size), `%` stays a string, aliases resolve to tokens |
| `colorMix`                             | 448                                                                                     | Mixed when resolving, in the node's color space, to an `rgb()` string                               |
| Root slot states                       | checked, disabled, hover, pressed, focusVisibleWithin, invalid, indeterminate, selected | Component state: every slot sees the component's state                                              |
| Element states                         | hover, pressed, dragged, focusVisible, disabled, selected                               | Component state as well                                                                             |
| `clipShape` feature                    | 35                                                                                      | Never supported: the fallback branch                                                                |
| `reducedMotion`                        | 8                                                                                       | Dropped with motion                                                                                 |
| `calc`                                 | 48                                                                                      | Evaluated when every operand is a number; otherwise a build error naming the property               |
| Text styles, `shadowElevation` utility |                                                                                         | Written out in place, as the CSS adapter does                                                       |

## Packages

`@pureform/rn-adapter`, depending on `@pureform/core` and a color library (`chroma-js`, already
in the catalog, for oklch and mixing).

- `lowerRn(config, options)`: every component as style templates.
- `resolveTheme(config, { scheme, theme })`: the token values for one scheme and named theme.
- `resolve(templates, theme)`: plain style objects. Precomputing is running this ahead of time.
- `@pureform/rn-adapter/react`: `PureformProvider` (scheme, theme, mode), `useComponentStyles(name,
variants, state)`, and a `pressableState` helper mapping `Pressable`'s callback state.
  React and React Native are peer dependencies of this entry only.

`inlineStyles` (text styles and utilities written out in place) moves from the CSS adapter to
the core, since both adapters need it and it's target-neutral.

## Lowering

### Templates

A template is a React Native style object whose theme-dependent values are left as nodes to
resolve later:

```ts
{ backgroundColor: { ref: "colors.primary" }, borderRadius: 20, paddingStart: 24 }
{ backgroundColor: { mix: "srgb", base: { ref: "colors.onSurface" }, with: ..., amount: 0.12 } }
```

Each component lowers to, per slot:

- **base**, and each **variant value** and **compound variant**, as templates.
- **state layers**: for each state the styles mention, the template that applies when it
  holds. A conditional value splits into a base value and a case per condition, the same
  inside-out turn the CSS serializer does, landing in that condition's layer. A case on
  several conditions (`when()` arrays) lands in a layer keyed by all of them.

### Properties

| CSS property                                    | React Native                                                                |
| ----------------------------------------------- | --------------------------------------------------------------------------- |
| `paddingInlineStart/End`, `marginInline*`       | `paddingStart/End`, `marginStart/End`                                       |
| `paddingBlockStart/End`, `borderBlockEndWidth`  | `paddingTop/Bottom`, `borderBottomWidth`                                    |
| `borderInlineEndWidth`                          | `borderEndWidth`                                                            |
| `display: inline-flex`, `flex`                  | `display: "flex"`; `inline` drops                                           |
| `transform` nodes                               | The array form: `[{ translateX: 4 }]`                                       |
| `boxShadow` (from `shadowElevation`)            | `boxShadow` strings, supported by the New Architecture and React Native Web |
| `outline*`, `cursor`, `pointerEvents`, `zIndex` | As is (React Native 0.77 and later, and Web)                                |
| `objectFit`                                     | `objectFit`, and `resizeMode` on images                                     |
| `transition`, `clipPath`                        | Dropped                                                                     |

Anything else outside React Native's style types is reported in `lowerRn`'s diagnostics and
dropped, so gaps surface rather than vanish. The core set has none.

### Inheritance

CSS passes `color` and font properties down to descendants. React Native passes them only
between nested `Text` elements. The lowering follows each component's `structure` and copies
inherited properties (`color`, `fontFamily`, `fontSize`, `fontWeight`, `lineHeight`,
`letterSpacing`, `textAlign`) from a slot to its descendants where they don't set their own.
`currentColor` resolves to the slot's own color after inheritance.

### Density

Density's `inherit` value is the theme's `densityOffset` size token inside `calc`, so it
resolves from the theme like any token, with no provider setting.

### Fonts

A font family takes its stack's first entry, which the app is expected to load.

## Resolving and theme modes

`resolveTheme` walks the token tiers once for a scheme and named theme, applying the theme's
overrides and component tokens, and resolves conditional token values on the scheme. Colors
convert to `rgb()`, since React Native has no `oklch()`.

- **Precomputed** (default): `precompute(config, { themes, schemes })` resolves every
  component's templates for each combination into plain `StyleSheet`-ready objects, and can
  be written to a module ahead of time, so the app ships no lowering code. Every `color-mix`
  is computed here, since its inputs are known tokens.
- **Runtime:** the app ships templates and a theme object. The provider resolves on theme
  change, cached per theme. Runtime overrides (the native stand-in for `dynamic()` and
  component tokens) are entries in that theme object.

### Overrides on precomputed styles

Overriding a token at runtime makes every precomputed value built on it stale. A plain
reference is replaced directly, but a mix has to be computed again. So precomputed output
keeps, next to each resolved value, what it came from:

- **References:** which token a value is, so an override replaces it.
- **Mixes:** a small template (base, overlay, amount, color space) with its inputs as token
  references, so an override recomputes only the mixes that read the changed token.

Applying overrides walks only the values that depend on the overridden tokens, through an
index built when precomputing, and the result is cached per set of overrides. The app ships a
small mixing function, but no lowering code or token tiers. Mixes in `oklch` need its
conversion too, so the mixer stays as small as the color spaces the config uses.

## Runtime

`useComponentStyles("button", { variant: "tonal" }, state)` returns styles per slot:

1. Start from the slot's base, then the selected variant values, then matching compound
   variants, as the CSS layers order them.
2. Merge each state layer whose states all hold, in a fixed order (hover, focus, pressed,
   dragged, then selected, checked, invalid, then disabled), matching the CSS selectors'
   precedence.
3. Return one style object per slot, memoized on variants and state.

State comes from `Pressable` (`pressed`, `hovered`, `focused`) and from props (`disabled`,
`checked`, `selected`). `focusVisible` maps to keyboard focus on Web and to `focused` on
native.

## Demo

`apps/rn-web-demo`: React 19, React Native Web, and Vite. It renders the core set in every fill
and color, with light and dark and the teal theme, through the React entry. A toggle switches
between precomputed and runtime modes to show they render the same, and a color picker
overrides the primary color in either mode.

## Verification

- **Unit tests:** lowering per node kind and property, inheritance, state layers, both modes
  resolving to the same styles with and without overrides, an override recomputing only the
  values that depend on it, and type checks of the output against React Native's
  `ViewStyle` and `TextStyle`.
- **Browser parity:** in `tests/browser-e2e-tests`, each component renders through React
  Native Web next to the CSS adapter's markup, in each state, scheme, and the teal theme, and
  key properties must match: background, text, and border colors, width, height, radii,
  padding, border widths, font size, weight, and line height. Layout quirks of React Native
  Web (its flex defaults, box sizing) are out of the comparison. React components there use
  `createElement`, since the project's JSX is Solid's.

## Open questions

- **Hover is for pointers, not only Web.** Touch-only phones never hover, but iPads with a
  trackpad or mouse, Android with a mouse (Chromebooks, DeX), stylus hover, React Native for
  Windows and macOS, and visionOS all report it through `Pressable`. The hover layer applies
  whenever `hovered` is reported and costs nothing where it never is.
- **Focus rings.** The outline properties render on Web; on native, keyboard focus is rare, so
  the POC leaves them as is.

## As built

- **Precomputed output** shares the components' structure, with theme-reading values kept as
  templates, and ships each theme's resolved values as an array in walk order. Overrides patch
  that array. For the core set the structure is about 146 kB of JSON, plus about 45 kB per
  scheme and theme (resolved values and the token values overrides and `useTokens` read).
- **Build and runtime split:** `precompute` and `runtimeStyles` are in the main entry with the
  lowering and `chroma-js`. The React entry loads only `select`, the resolver, and an sRGB
  mixer of about 6 kB.
- **Overrides** replace the values components read. A token derived from an overridden one in
  the config isn't recomputed, and override colors are `rgb()`/`rgba()` or hex, which the
  runtime parses without a color library.
- **One-color background images,** Material's elevation tints, become a tint composited over
  the background color when a component's styles are picked. Other linear and radial
  gradients draw with SVG; conic ones are reported.
- **Unitless line heights** multiply the slot's font size once it's known.
- **`fontStack: "all"`** keeps a font family's whole stack for React Native Web, which passes
  it to CSS. Native takes the first family.
- **`useTokens`** gives the theme's token values, for app styles such as a page background.
  Without CSS inheritance from the page, text outside a component takes its color from there.
- **Covered components:** button, card, chip, checkbox, switch, text, avatar, icon, icon
  button, FAB, separator, list item, linear and circular progress, radio, scrim, supporting
  text, and media. On the full preset, the only diagnostic left is the ripple's gradient.
- **CSS's defaults:** a slot asking for flex runs in a row unless it names a direction; a flex
  box's slots shrink to fit; and a slot drawing an outline lifts over its neighbors, as CSS
  paints outlines last.
- **Drop shadow filters** become box shadows where shapes fall back to rounded boxes, and stay
  `drop-shadow()` filters with SVG, so they follow the shapes. React Native draws filters on
  Android and the web, so on iOS a shaped component has no shadow.
- **Raw rules** for other targets add nothing; ones for React Native are reported.
- **Color mixes** run in srgb, hsl, oklab, oklch, lab, lch, and display-p3, in plain math that
  matches Chromium's `color-mix()`; HCT is reported. Override colors may use any of CSS's color
  functions, written as `rgba()` as they come in.
- **Units in calc:** sums and comparisons keep one unit, a product at most one, so a value
  times 1% is a percentage and an angle sum stays in degrees. Percentages can't meet pixels.
- **Per-instance tokens:** `useComponentStyles` and `useAnimatedComponentStyles` take token values for one
  instance, such as a progress indicator's value.
- **Animated colors** blend premultiplied, through eight stops, so fades don't dip through gray.
- **Parity:** the browser tests compare every slot of the covered components across every
  variant value at rest, and per state, scheme, and theme scenario. All match except the radii
  and outline rings of shape variants, which clip on the web and fall back to rounded corners
  and borders here.
- **Keyframe animations** lower with their frames inside them, so themes resolve the frames,
  and `useAnimatedComponentStyles` loops them with `Animated`; indeterminate progress slides and spins.
- **Focus rings** show for keyboard focus only on the web, following the latest input as
  browsers decide `:focus-visible`; native focus is always visible.
- **Derived tokens:** building keeps the formula of each token that reads others, and an
  override recomputes those that read it, directly or through others.
- **Viewport conditions** hold by the window's width, which the provider takes from
  `useWindowDimensions`. Container queries are still reported.
- **Every component but the ripple** passes parity, and the demo shows them all. A sum of a
  percentage and pixels, as the slider positions its handle, puts the pixels on the inset's
  margin. Percentages are reported where React Native takes none.
- **Ripples:** `useRipple` grows and fades press ripples as the web's `ripple()` does, timed by
  the ripple component's transition, as solid discs. `useSvgRipple` draws them with their soft
  edge and clips them to the surface's shape.
- **SVG:** `@pureform/rn-adapter/svg`, with `react-native-svg` as an optional peer. The
  provider's `svg` turns on the `clipShape` feature's cases as an `svg` state, and selection
  returns each slot's `drawings`: its shape with its fill, moved off the view, and its
  gradient. `SvgDrawing` measures its slot and draws them under the content; it can also draw a
  picture clipped to the shape, for media. Shapes and gradient stops keep their mix of pixels
  and percentages until the box is known, and `geometry.ts` places them as CSS does. A shape
  morph jumps between its shapes; animating it waits for the Reanimated binding.
- **React Native Web and react-native-svg in Vite:** resolve `.web.*` files first, shim the
  native modules it imports behind Android checks, and alias React Native's asset registry to
  React Native Web's.
- **Reanimated:** `@pureform/rn-adapter/reanimated`, with `react-native-reanimated` 4 as an
  optional peer. `useReanimatedComponentStyles` returns each slot's style with its
  transitions and keyframe animation as CSS's animation properties (`cssMotion`), which
  Reanimated runs on the UI thread, interpolating colors, transforms, and percentages against
  pixels itself. On the web, where it runs real CSS transitions, logical properties are named
  as React Native Web writes them (`start` is `left`, left to right). It runs on the web
  without the Worklets Babel plugin, given React Native's `__DEV__`. Ripples stay on Animated.
- **Not yet:** shape morphs, container queries, and running on a device.

## State transitions

Status: implemented. The proof of concept drops `transition`, so state changes snap. The preset's
transitions already say what should move: every core component's colors (`backgroundColor`,
`color`, `borderColor`, `outlineColor`) over `short3` on the standard curve, `boxShadow` over
`medium1`, and the switch handle's `left`, `width`, and `height`. All of it is off under
reduced motion.

### Lowering

- A `transition` lowers to transition data under an internal style key, as tints do: per
  property, its React Native name, a duration in milliseconds, an easing, and a delay. It
  goes through the same rules as any value, so the reduced motion case becomes a state, and a
  state can change what moves.
- Durations lower to numbers of milliseconds (`ms` as is, `s` times 1000), including duration
  tokens, which today resolve to `"150ms"` strings.
- Easings lower to cubic Bézier points: `cubicBezier` as is, and the keywords to CSS's
  definitions (`ease` is `0.25, 0.1, 0.25, 1`, and so on). `steps` has no equivalent in
  `Animated` and is linear.
- Selection keeps the transitions out of the style and returns them beside it, per slot.

### Animating

A new entry, `@pureform/rn-adapter/animated`, so the React entry stays free of React Native:

- `useAnimatedComponentStyles(name, variants, state)` returns per slot a style in which each property
  with a transition is an animated value, to pass to `Animated.View` and `Animated.Text`.
- Each such property has an `Animated.Value` for progress, driven by `Animated.timing` with
  `Easing.bezier` and the transition's duration, from the value it's showing to the new one.
  Colors interpolate through `rgba()` strings, which `Animated` supports, and numbers directly.
- An interrupted change (pressing during a hover fade) starts from the value on screen: the
  hook tracks progress and blends the old pair to find it, with the adapter's mixer for colors.
- What can't interpolate (a shadow with a different number of layers, a keyword) changes at
  once, as CSS does for discrete properties by default.
- A live animated value never changes during render, since the views bound to it would update
  mid-render: a change gets a new progress value, bound in render and started once it commits.
- Reduced motion: the provider takes a `reducedMotion` flag (an app reads it from
  `AccessibilityInfo`), which selects the reduced case, so nothing animates.
- `Animated` works on React Native Web too. A Reanimated binding can come later behind the same
  transition data, for animations on the UI thread.

### Demo and verification

- The demo's components switch to `Animated.View` and `Animated.Text` through the new hook, and
  a toggle turns reduced motion on.
- Unit tests: transition lowering, durations, easings, and the reduced case; the hook's
  interpolation and interruption with a fake clock.
- Browser tests: mid-transition, a hovered button's background lies between its rest and hover
  colors, and at the end equals the hover color; under reduced motion it changes at once. The
  parity tests keep comparing end states.

### Running on React Native Web

- Parts of React Native Web's `Animated` refer to Node's `global`, so Vite defines it as
  `globalThis`.
- Under `NODE_ENV=test` React Native Web swaps `Animated` for a mock that ends every
  animation at once, so the browser tests build in development mode.

### Steps

1. Lower transitions, durations, and easings; return them from selection.
2. The `animated` entry: `useAnimatedComponentStyles`, interpolation, interruption, reduced motion.
3. The demo on animated components.
4. Unit and browser tests.

## Steps

1. Move `inlineStyles` to the core.
2. Lowering: nodes, properties, conditions into state layers, inheritance.
3. `resolveTheme`, `resolve`, color conversion and mixing, both modes.
4. Overrides on precomputed styles: the dependency index and the mixer.
5. The React entry: provider, `useComponentStyles`, `pressableState`, and an `overrides` prop.
6. The React Native Web demo, with a brand color override in both modes.
7. Browser parity tests.
8. Docs: the design doc's adapter section.
