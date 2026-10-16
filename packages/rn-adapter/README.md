# @pureform/rn-adapter

Compiles a pureform config to React Native styles, and the React bindings that pick a
component's styles for its variants and state and animate between them. The web adapters
lower to CSS; this one lowers the same AST to style templates that React Native can take.

## Where it sits

```
@pureform/core ──► @pureform/rn-adapter ──► apps/rn-web-demo (and @pureform/react-native, planned)
@pureform/preset (tests and demos)
```

It depends on `@pureform/core`, `@pureform/styling` (the `StyleFactory` types and the
per-selection cache), and `@pureform/generate` (for the `/codegen` subpath); `react`,
`react-native`, `react-native-svg`, and `react-native-reanimated` are optional peers, each
needed by one entry.

## Architecture

```
config ──► lower.ts ──► templates ──► build.ts / resolve.ts ──► styles per theme
                                                              │
State + variants ──► select.ts (rules by specificity) ◄───────┘
                         │
                         ▼
     factory.ts (one cached, frozen selection per key and environment)
                         │
                         ▼
     react.ts (provider, hooks) ──► animate/ (Animated) or reanimated.ts (CSS motion)

config ──► codegen.ts ──► .pureform/native/<name>.ts (a factory over its precomputed styles)
```

| Module                           | What it does                                                                                 |
| -------------------------------- | -------------------------------------------------------------------------------------------- |
| `lower.ts`                       | Components to style templates: each rule with the states it holds under and its specificity. |
| `values.ts`                      | Template values (tokens, mixes, math) and their evaluation; the `Transition` shape.          |
| `build.ts`, `resolve.ts`         | `precompute` and `runtimeStyles`: templates resolved per theme, and runtime overrides.       |
| `theme.ts`                       | A theme's token values for one color scheme.                                                 |
| `select.ts`                      | Picks a component's styles, transitions, and animations for its variants and state.          |
| `factory.ts`                     | `nativeFactory`: a component's `StyleFactory`, selecting once per selection and environment. |
| `codegen.ts`                     | The `native` target's codegen for `@pureform/generate`: a factory module per component.      |
| `motion.ts`                      | Pure motion helpers: easing curves, interpolation, and which token tweens run.               |
| `react.ts`                       | `PureformProvider`, `useComponentState`, `useComponentStyles`, `useReducedMotion`, …         |
| `animate/`, `animated.ts`        | The Animated entry: state transitions, keyframe animations, and press ripples.               |
| `reanimated.ts`, `css-motion.ts` | The Reanimated 4 entry: transitions and keyframes as CSS animation properties.               |
| `svg.ts`, `reanimated-svg.ts`    | Shapes, gradients, and ripples drawn with `react-native-svg`.                                |
| `metro.ts`                       | Precomputing a config while Metro bundles.                                                   |

## Public API

| Entry                                         | Exports                                                                                                          |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `@pureform/rn-adapter`                        | `precompute`, `runtimeStyles`, `lowerRn`, `select`, `selectWithTransitions`, …                                   |
| `@pureform/rn-adapter/react`                  | `PureformProvider`, `useComponentStyles`, `useComponentState`, `useTokens`, `useReducedMotion`, `pressableState` |
| `@pureform/rn-adapter/animated`               | `useAnimatedComponentStyles` and `useRipple`, through React Native's Animated                                    |
| `@pureform/rn-adapter/reanimated`             | `useReanimatedComponentStyles` and `cssMotion`, through Reanimated 4                                             |
| `@pureform/rn-adapter/svg`, `/reanimated-svg` | `SvgDrawing`, `ReanimatedSvgDrawing`, and their ripples                                                          |
| `@pureform/rn-adapter/metro`                  | `withPureform` for `metro.config.js`                                                                             |
| `@pureform/rn-adapter/factory`                | `nativeFactory`, `componentFactory`, `selectionOrder`, and the `NativeFactory` types; no React, no lowering      |
| `@pureform/rn-adapter/codegen`                | `codegen` (the `native` target), `instanceTokenKeys`, `factoryModule`, `themesModule`, `THEMES_FILE`             |

```tsx
import { precompute } from "@pureform/rn-adapter";
import { useAnimatedComponentStyles } from "@pureform/rn-adapter/animated";
import { PureformProvider } from "@pureform/rn-adapter/react";

const styles = precompute(config, { components: ["button"] });

<PureformProvider styles={styles} scheme="light" reducedMotion={false}>
    <Button />
</PureformProvider>;

const slots = useAnimatedComponentStyles(
    "button",
    { variant: "filled" },
    { hover },
);
```

## Factories and codegen

A component's `NativeFactory` (`@pureform/styling`'s `StyleFactory`, with more per slot) takes
a selection of variants, states, and instance tokens, and returns its styles by slot. Each
slot has its `style`, its SVG `drawing`, its `transitions` (a token's own under
`$token:<key>`, which token tweening reads), its `animation`, and its `parent`; a component
without slots has `root`. The first lookup of a key selects and freezes; later ones are a
`Map.get` (`@pureform/styling`'s `selectionCache`). The key is each group's value and a bit per
state the component's rules read (`selectionOrder`).

The environment, what a provider holds, picks the table: `factory.for({ theme, scheme,
overrides, svg, width, containers })`. Calling the factory itself is the base theme's light
scheme. Widths only count through the component's width and container conditions, so every
width meeting the same ones shares a table. `selected(selection)` gives the same lookup in the
`Selected` shape the hooks read (`""` for a component without slots).

```ts
import { nativeFactory } from "@pureform/rn-adapter/factory";

const button = nativeFactory("button", precompute(config));
button.for({ scheme: "dark", svg: true })({ variant: "filled", pressed: true })
    .root.style;
const progress = nativeFactory("linearProgress", styles, {
    value: "components.linearProgress.value",
});
progress({ tokens: { value: 40 } }).indicator.style; // resolved with the token, cached per value
```

The hooks select through the same factories: `useComponentState` looks up
`componentFactory(styles, name)` (one per provider styles and component) in the provider's
environment, so every instance of a component shares one table, and a state change is a
`Map.get`. Token tweening passes each frame's tokens as the selection's `tokens`.

`pureform generate` with the `native` target (`@pureform/rn-adapter/codegen`) writes one module
per allow-listed component, `.pureform/native/<name>.ts`, exporting a `NativeFactory<"name">`
over that component's own precomputed templates and values (`splitPrecomputed`), parsed from a
JSON string, and `.pureform/native/theme-values.ts`, the themes' token values and formulas they
share. Its options are `precompute`'s (`remBase`, `fontStack`, `themes`, `schemes`, `target`).
Each module's declared `states` are the ones its key reads.

## Reduced motion

The provider's `reducedMotion` prop (default `false`) selects the styles' `reducedMotion`
cases, so selection drops the transitions that move (a switch handle's `start`, a progress
indicator's `width`) and keeps the color, opacity, and elevation fades, as the web does. A
token's own tween carries its `valueType` from the lowering; under reduced motion,
`tokenTransitions` (in `motion.ts`) skips lengths, percentages, angles, and numbers and keeps
colors. Ripples don't start under reduced motion. The `motion="system" | "reduce" | "full"`
setting and reading `AccessibilityInfo` are planned for `@pureform/react-native` (roadmap p8).

## Direction

Logical properties lower to React Native's (`insetInlineStart` to `start`), which flip with
`I18nManager.isRTL`. Styles with no logical form use the `ltr` and `rtl` conditions, which
selection matches from the `rtl` state: pass `{ rtl: true }` and the switch's handle centers
from the other side, and the indeterminate linear progress runs `linearProgressSlideRtl`
(`src/direction.spec.ts`). Nothing sets `rtl` for you yet: the provider's `dir`, defaulting to
`I18nManager.isRTL`, is planned for `@pureform/react-native` (roadmap p8).

An icon that points flips under `rtl` when it's marked: pass `{ rtl: true, mirrored: true }`
and the icon slot gets `transform: [{ scaleX: -1 }]` (after its own transform, such as a field
icon's centering). The state is the component's, so a component with two icons resolves the
marked one separately; the icon part doing that is planned for p8.

## Icon fonts

React Native has no variable font axes: `fontVariationSettings` (Material Symbols' `FILL`,
which the web reads) drops without a diagnostic. An app that swaps a filled icon in needs the
fill another way; `useIconStyle()` returning `filled` is planned for p8.

## Build and test

Through the omni MCP (or `omni run`):

- `build`: Vite library build into `dist/`, one bundle per entry.
- `test:unit`: Vitest over `src/**/*.spec.ts`, with type checks. `factory.spec.ts` checks the
  factory against selection for every preset component; `codegen.spec.ts` generates the preset's
  glue into a temp app, compares every combination of every group's values, and type-checks it.
- `test:integration`: the Metro transformer, under `test/`.

`tests/browser-e2e-tests` renders it through React Native Web: `rn-parity` compares it with the
CSS adapter, and `rn-motion` checks transitions and reduced motion.

## Worth knowing

- A factory's selection merges variants and states, so a state named like one of the
  component's groups (the progress indicators' `indeterminate`, the icon's `filled`) is left out
  of its key; the group wins. A missing `rtl` is left to right: the key holds `rtl` as on or off.
- The generated modules hold the component's styles for every theme and scheme, so they're
  large (the preset's are 2.7 MB in all, the icon button alone 0.4 MB); an app should leave
  `.pureform/` uncommitted. `generate` loads the codegen from `dist`, so build first.

- React Native has no cascade: selection orders rules by layer, then specificity, then order,
  as selectors would, and passes inherited properties (`color`, fonts) down by hand.
- Percent and pixel lengths can't animate into each other in Animated; `sameUnits` resolves
  them against the parent's size where it's known.
