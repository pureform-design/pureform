# React Native adapter plan

Status: planned. A proof of concept, rendered in the browser through React Native Web.

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
- `@pureform/rn-adapter/react`: `PureformProvider` (scheme, theme, mode), `useRecipe(name,
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

Anything else outside React Native's style types is a build error, so gaps surface rather
than vanish.

### Inheritance

CSS passes `color` and font properties down to descendants. React Native passes them only
between nested `Text` elements. The lowering follows each component's `structure` and copies
inherited properties (`color`, `fontFamily`, `fontSize`, `fontWeight`, `lineHeight`,
`letterSpacing`, `textAlign`) from a slot to its descendants where they don't set their own.
`currentColor` resolves to the slot's own color after inheritance.

### Density

Density's `inherit` value reads the density of an enclosing component through the cascade on
web. Here it reads a `density` from the provider, which a surrounding component can set.

### Fonts

A font family takes its stack's first entry, which the app is expected to load.

## Resolving and theme modes

`resolveTheme` walks the token tiers once for a scheme and named theme, applying the theme's
overrides and component tokens, and resolves conditional token values on the scheme. Colors
convert to `rgb()`, since React Native has no `oklch()`.

- **Precomputed** (default): `precompute(config, { themes, schemes })` resolves every
  component's templates for each combination into plain `StyleSheet`-ready objects, and can
  be written to a module ahead of time, so the app ships no lowering or color code.
- **Runtime:** the app ships templates and a theme object. The provider resolves on theme
  change, cached per theme. Runtime overrides (the native stand-in for `dynamic()` and
  component tokens) are entries in that theme object.

## Runtime

`useRecipe("button", { variant: "tonal" }, state)` returns styles per slot:

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
between precomputed and runtime modes to show they render the same.

## Verification

- **Unit tests:** lowering per node kind and property, inheritance, state layers, both modes
  resolving to the same styles, and type checks of the output against React Native's
  `ViewStyle` and `TextStyle`.
- **Browser parity:** in `tests/browser-e2e-tests`, each component renders through React
  Native Web next to the CSS adapter's markup, in each state, scheme, and the teal theme, and
  key properties must match: background, text, and border colors, width, height, radii,
  padding, border widths, font size, weight, and line height. Layout quirks of React Native
  Web (its flex defaults, box sizing) are out of the comparison. React components there use
  `createElement`, since the project's JSX is Solid's.

## Open questions

- **`color-mix` over runtime overrides.** A mix whose base is overridden at runtime must mix
  again in the resolver. Fine for the runtime mode; precomputed sets can't see overrides.
- **Hover on native.** There's no pointer hover on phones, so hover layers only apply on Web and
  with a pointer.
- **Focus rings.** The outline properties render on Web; on native, keyboard focus is rare, so
  the POC leaves them as is.

## Steps

1. Move `inlineStyles` to the core.
2. Lowering: nodes, properties, conditions into state layers, inheritance.
3. `resolveTheme`, `resolve`, color conversion and mixing, both modes.
4. The React entry: provider, `useRecipe`, `pressableState`.
5. The React Native Web demo.
6. Browser parity tests.
7. Docs: the design doc's adapter section.
