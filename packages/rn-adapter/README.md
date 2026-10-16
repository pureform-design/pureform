# @pureform/rn-adapter

Compiles a pureform config to React Native styles, and the React bindings that pick a
component's styles for its variants and state and animate between them. The web adapters
lower to CSS; this one lowers the same AST to style templates that React Native can take.

## Where it sits

```
@pureform/core ──► @pureform/rn-adapter ──► apps/rn-web-demo (and @pureform/react-native, planned)
@pureform/preset (tests and demos)
```

It depends on `@pureform/core` only; `react`, `react-native`, `react-native-svg`, and
`react-native-reanimated` are optional peers, each needed by one entry.

## Architecture

```
config ──► lower.ts ──► templates ──► build.ts / resolve.ts ──► styles per theme
                                                              │
State + variants ──► select.ts (rules by specificity) ◄───────┘
                         │
                         ▼
     react.ts (provider, hooks) ──► animate/ (Animated) or reanimated.ts (CSS motion)
```

| Module                           | What it does                                                                                 |
| -------------------------------- | -------------------------------------------------------------------------------------------- |
| `lower.ts`                       | Components to style templates: each rule with the states it holds under and its specificity. |
| `values.ts`                      | Template values (tokens, mixes, math) and their evaluation; the `Transition` shape.          |
| `build.ts`, `resolve.ts`         | `precompute` and `runtimeStyles`: templates resolved per theme, and runtime overrides.       |
| `theme.ts`                       | A theme's token values for one color scheme.                                                 |
| `select.ts`                      | Picks a component's styles, transitions, and animations for its variants and state.          |
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

## Reduced motion

The provider's `reducedMotion` prop (default `false`) selects the styles' `reducedMotion`
cases, so selection drops the transitions that move (a switch handle's `left`, a progress
indicator's `width`) and keeps the color, opacity, and elevation fades, as the web does. A
token's own tween carries its `valueType` from the lowering; under reduced motion,
`tokenTransitions` (in `motion.ts`) skips lengths, percentages, angles, and numbers and keeps
colors. Ripples don't start under reduced motion. The `motion="system" | "reduce" | "full"`
setting and reading `AccessibilityInfo` are planned for `@pureform/react-native` (roadmap p8).

## Build and test

Through the omni MCP (or `omni run`):

- `build`: Vite library build into `dist/`, one bundle per entry.
- `test:unit`: Vitest over `src/**/*.spec.ts`, with type checks.
- `test:integration`: the Metro transformer, under `test/`.

`tests/browser-e2e-tests` renders it through React Native Web: `rn-parity` compares it with the
CSS adapter, and `rn-motion` checks transitions and reduced motion.

## Worth knowing

- React Native has no cascade: selection orders rules by layer, then specificity, then order,
  as selectors would, and passes inherited properties (`color`, fonts) down by hand.
- Percent and pixel lengths can't animate into each other in Animated; `sameUnits` resolves
  them against the parent's size where it's known.
