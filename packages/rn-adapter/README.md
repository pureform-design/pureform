# @pureform/rn-adapter

## Shared motion channels

The `animated` entry exports `useMotionTimeline`, `TimelineClock` and `MotionTimeline`. Named
clocks share normalized Animated values; `value({ offset, terms })` derives a scalar from one or
more clocks using native interpolation/addition nodes. Use the returned `View` for transforms
and opacity only. Devices use Animated's native driver; Native Web uses its JS fallback.
Reanimated engines reuse this faster compatible path rather than route it through JS or require
new worklets. Driver selection is unit-tested; actual device frame rates still require profiling.

`useAnimatedComponentStyles` and `useReanimatedComponentStyles` accept a final
`{ keyframes: false }` option when a binding coordinates the selected animations externally.
Transitions still run, and the plain selection retains its animation timings for the shared
timeline. Do not run both a slot clock and an external clock for the same motion.

Clock timing changes restart only that clock; geometry changes do not restart it. Disable a
clock to reset it to its first frame, and unmount/removal stops it. Memoize derived graph nodes
by their geometry rather than subscribe to values in React state. The engine contract and scalar
channel model are exposed through `animate-react-native`; `animate-core` stays platform-free.

Compiles a pureform config to React Native styles, and the React bindings that pick a
component's styles for its variants and state and animate between them. The web adapters
lower to CSS; this one lowers the same AST to style templates that React Native can take.

## Where it sits

```
@pureform/core ──► @pureform/rn-adapter ──► @pureform/react-native ──► apps/rn-web-demo
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

| Module                           | What it does                                                                                                       |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `lower.ts`                       | Components to style templates: each rule with the states it holds under and its specificity.                       |
| `values.ts`                      | Template values (tokens, mixes, math) and their evaluation; the `Transition` shape.                                |
| `build.ts`, `resolve.ts`         | `precompute` and `runtimeStyles`: templates resolved per theme, and runtime overrides.                             |
| `theme.ts`                       | A theme's token values for one color scheme.                                                                       |
| `select.ts`                      | Picks a component's styles, transitions, and animations for its variants and state.                                |
| `factory.ts`                     | `nativeFactory`: a component's `StyleFactory`, selecting once per selection and environment.                       |
| `codegen.ts`                     | The `native` target's codegen for `@pureform/generate`: a factory module per component.                            |
| `motion.ts`                      | Pure motion helpers: easing curves, interpolation, token tweens, overlay presence types, and an indicator's slide. |
| `react.ts`                       | `StylesProvider`, `PureformProvider`, `useComponentState`, `useComponentStyles`, …                                 |
| `animate/`, `animated.ts`        | The Animated entry: state transitions, keyframe animations, ripples, overlay presence, and slides.                 |
| `reanimated.ts`, `css-motion.ts` | The Reanimated 4 entry: transitions, keyframes, overlay presence, and slides as CSS animations.                    |
| `svg.ts`, `reanimated-svg.ts`    | Shapes, gradients, and ripples drawn with `react-native-svg`.                                                      |
| `metro.ts`                       | Precomputing a config while Metro bundles.                                                                         |

## Public API

| Entry                                         | Exports                                                                                                                                                          |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@pureform/rn-adapter`                        | `precompute`, `runtimeStyles`, `lowerRn`, `select`, `selectWithTransitions`, …                                                                                   |
| `@pureform/rn-adapter/react`                  | `StylesProvider`, `PureformProvider`, `useComponentStyles`, `useComponentState`, `useTokens`, `useStyleEnvironment`, `useReducedMotion`, `pressableState`        |
| `@pureform/rn-adapter/animated`               | `useAnimatedComponentStyles`, `useRipple`, `animatedPresence`, `useAnimatedSlide`, `settle`, `slowSpring`, and `springProgress`, through React Native's Animated |
| `@pureform/rn-adapter/reanimated`             | `useReanimatedComponentStyles`, `cssMotion`, `reanimatedPresence`, and `useReanimatedSlide`, through Reanimated 4                                                |
| `@pureform/rn-adapter/svg`, `/reanimated-svg` | `SvgDrawing`, `ReanimatedSvgDrawing`, and their ripples                                                                                                          |
| `@pureform/rn-adapter/metro`                  | `withPureform` for `metro.config.js`                                                                                                                             |
| `@pureform/rn-adapter/factory`                | `nativeFactory`, `componentFactory`, `selectionOrder`, `movingSlots`, `overridesFor`, and the `NativeFactory` types; no React, no lowering                       |
| `@pureform/rn-adapter/codegen`                | `codegen` (the `native` target), `instanceTokenKeys`, `factoryModule`, `themesModule`, `THEMES_FILE`                                                             |

`SvgDrawing` and its ripples keep React out of each frame. On the web the browser runs them: a
shape morphs through CSS's `d` (SMIL's `<animate>` where `d` doesn't animate), a fill cross-fades
two stacked paths, and a ripple drawn at its end size grows with its group's transform and
opacity. On a device ripples run on the native driver, but a morph or a cross-fade still writes
the paths' props from the JavaScript thread: for components whose shapes morph, such as icon
buttons and toggles, use `ReanimatedSvgDrawing` from `/reanimated-svg` (the `reanimatedSvg`
engine), which runs them on the UI thread, keyframed shapes and `alternate` directions included.
A device's SVG ripples clip to the surface's rounded corners, not to a drawn shape: the native
driver moves views, a view can't sit inside the SVG's clip path, and clipping a view to a path
needs a mask view, which React Native doesn't ship (nor pureform depend on). `ReanimatedSvgDrawing`'s
ripples are drawn inside the clip path and grow on the UI thread, so they keep the exact shape. A
fill cross-fade over a translucent fill fades the old fill out as the new one fades in, so
together they cover as much as the color between them.

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

The generated native data is written as `JSON.parse("…")`, not an object literal: engines parse
it faster, and TypeScript doesn't infer a type for a 0.4 MB literal.

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

The hooks select through the same factories, from whatever source the provider holds:
`StylesProvider` takes a `StyleSource` (`factory(name)` and `themeValues()`, both called while
rendering, so they may suspend), which `@pureform/react-native`'s provider fills from the
generated registry; `PureformProvider` is `StylesProvider` over `stylesSource(styles)`, whose
factories are `componentFactory(styles, name)` (one per styles and component). Either way every
instance of a component shares one table in the provider's environment, and a state change is a
`Map.get`. Token tweening passes each frame's tokens as the selection's `tokens`. A factory's
`tokens` names the theme key each instance token sets; a spring instance token
(`spring({ ... })`) sets the spring's five keys (`<key>.duration`, `.easing`, `.stiffness`,
`.damping`, `.mass`), as a theme's override does; on a spring token, a spring role's name
(`"spatialSlow"`) sets the five keys to that role's values in the environment's theme. Which
tokens are springs is `nativeFactory`'s fourth argument, the shape's `springs`, which the codegen
writes; any other string, or a role's name on another token, stays a string. `useStyleEnvironment()` gives the
environment the caller renders in, for calling a factory directly.

`pureform generate` with the `native` target (`@pureform/rn-adapter/codegen`) writes one module
per allow-listed component, `.pureform/native/<name>.ts`, exporting a `NativeFactory<"name">`
over that component's own precomputed templates and values (`splitPrecomputed`), parsed from a
JSON string, and `.pureform/native/theme-values.ts`, the themes' token values and formulas they
share. Its options are `precompute`'s (`remBase`, `fontStack`, `themes`, `schemes`, `target`).
Each module's declared `states` are the ones its key reads. A pruned build (the bundler's
`prune`, design doc §7) precomputes `narrowConfig(config, components, variants)`: only the
variant values the app uses (and their compound variants), so each module carries less; the
values it keeps select exactly as before.

## Reduced motion

The provider's `reducedMotion` prop (default `false`) selects the styles' `reducedMotion`
cases, so selection drops the transitions that move (a switch handle's `start`, a progress
indicator's `width`) and keeps the color, opacity, and elevation fades, as the web does. A
token's own tween carries its `valueType` from the lowering; under reduced motion,
`tokenTransitions` (in `motion.ts`) skips lengths, percentages, angles, and numbers and keeps
colors. Ripples don't start under reduced motion. `@pureform/react-native`'s provider takes
`motion="system" | "reduce" | "full"` and reads `AccessibilityInfo` for `"system"`, and passes the
result here as `reducedMotion`.

## Overlay presence

An overlay's enter and exit is a `PresenceMotion` (`motion.ts`): two steps, each from one frame
(opacity, scale, a move down) to another over a duration and curve. A `PresenceDriver` runs them
for one overlay on an engine, and calls `done(phase)` only for a step that ran to its end, which
is when a binding unmounts a closed overlay:

- `animatedPresence()` drives a progress value per step with `Animated.timing` (the native driver
  on a device) and reports `start`'s `finished`.
- `reanimatedPresence()` gives each step a CSS keyframe animation (the exit `forwards`, so it holds
  its last frame) and reports Reanimated's `onCSSAnimationEnd`, a prop for its view.

`presenceFrames(step)` gives a step's two ends as styles. `@pureform/react-native`'s
`usePresence` takes the frames and timings from the theme and the preset's overlay keyframes.

## An indicator's slide

The tabs' active indicator slides from the tab selected before into its own place (design doc
§9.10). A `SlideMotion` (`motion.ts`) is where it starts against its place (`translateX`, and
`scaleX` about its center) and the timing; `slideOffset(from, to)` gives the start from two boxes
along the row, `slideAt(offset, progress)` where a slide has got to, and `offsetSpan(span, offset)`
the box it covers there, so a binding can start the next slide from a running one. Each engine
draws one as a style for the view, for each new motion object:

- `useAnimatedSlide(motion)` interpolates a progress from 0 to 1, started once the render commits
  (the native driver on a device);
- `useReanimatedSlide(motion)` is a CSS keyframe animation, the same object while the motion is.

## Direction

Logical properties lower to React Native's (`insetInlineStart` to `start`), which flip with
`I18nManager.isRTL`. Styles with no logical form use the `ltr` and `rtl` conditions, which
selection matches from the `rtl` state: pass `{ rtl: true }` and the switch's handle centers
from the other side, and the indeterminate linear progress runs `linearProgressSlideRtl`
(`src/direction.spec.ts`). `StylesProvider`'s `rtl` adds the state to every selection (only when
it holds); `@pureform/react-native`'s provider sets it from its `dir`, which defaults to
`I18nManager.isRTL`.

An icon that points flips under `rtl` when it's marked: pass `{ rtl: true, mirrored: true }`
and the icon slot gets `transform: [{ scaleX: -1 }]` (after its own transform, such as a field
icon's centering). The state is the component's, so a component with two icons flips both when
either is marked (`@pureform/react-native` sets it from the component's `mirrorIcon` props).

## Icon fonts

React Native has no variable font axes, so `fontVariationSettings` never reaches a style: its
`FILL` axis (Material Symbols' fill, which the web reads) lowers to a private key that selection
moves out beside the style, as `Selected.iconFills[slot]` and `NativeSlot.iconFill` (0 or 1;
`src/icon-fill.spec.ts`). Other axes drop. `@pureform/react-native`'s `useIconStyle()` returns it
as `filled`, for apps that swap a filled icon in.

Provided tokens (`providedTokens` on a slot, component-architecture.md §5.5) lower to private
keys that selection moves out per slot, as `Selected.providedTokens[slot]` (by theme key,
resolved with the container's tokens). `OverridesLayer` (from `./react`) lays values over the
provider's overrides for a subtree, which is how `@pureform/react-native`'s `ProvidedTokens`
hands them to nested components under their own variant and instance tokens.

## Build and test

Through the omni MCP (or `omni run`):

- `build`: Vite library build into `dist/`, one bundle per entry.
- `test:unit`: Vitest over `src/**/*.spec.ts`, with type checks. `factory.spec.ts` checks the
  factory against selection for every preset component; `codegen.spec.ts` generates the preset's
  registry into a temp app, compares every combination of every group's values, and type-checks it.
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
- **Which slots move:** a factory's `moving` (`movingSlots(template)`) names the slots any rule
  of which transitions a style property (not a token, not a clip shape) or runs a keyframe
  animation, across every variant, state, and condition, so a binding can draw the rest with
  plain views, decided once per component.
- **Transitions start plain:** Animated's transitions make a value's animated value on its first
  change, so a component that mounts and never changes has none, and mounts for less.
- Percent and pixel lengths can't animate into each other in Animated; `sameUnits` resolves
  them against the parent's size where it's known.
