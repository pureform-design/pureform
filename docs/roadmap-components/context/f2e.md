# f2e: Springs (output context)

Branch `f2e-springs`, from main `fdbae596`. Commits: `git log fdbae596..f2e-springs`; this file
is in the last one.

## What was built

[f2e](../phases/f2-fixes.md#f2e-springs), f1's answers for f1e and f1f:

- **React Native delayed spring slide** (`rn-adapter/src/animate/slide.ts`): `useAnimatedSlide`
  runs both branches through `animate()`, so a spring slide is `springTo` with Animated's
  `delay` (no `setTimeout`) and rests within 0.001 of a 0..1 progress, like `animate()`'s
  other callers. Before it ran `settle()` (rest 0.5, a pixel threshold): r7's open question,
  resolved. Velocity is unchanged (per second either way).
- **Theme alias to another component's spring token** (`alias("components", "tabs",
"indicatorSpring")` in a theme override):
    - Web (`css-lowering/src/spring.ts`): `isSpringValue` follows aliases through the config
      and takes a `dynamic` token whose default is a spring, so `componentTokenVars` writes
      both vars, each reading the other token's var with its role fallback. A missing path
      answers false (compiling it still reports it).
    - React Native (`rn-adapter/src/lower.ts`): `springFieldNodes(value, ctx?)` takes the
      config and target and, with them, also resolves a component spring token or an alias to
      one (each field a `dynamic` key falling back to the default's field). `theme.ts` passes
      them; `springNodes` is now `springFieldNodes` or `Unsupported` (plus a default-less
      `dynamic`, which only a known spring position can take).
- **Instance spring tokens:** `InstanceTokens` values are `InstanceTokenValue` (`TokenValue |
SpringNode`, styling `types.ts`). The web's `tokenStyle` writes a spring as
  `<var>-duration` / `<var>-easing` (core's `sampleSpring`, as the themes); React Native's
  factory (`factory.ts` `tokenKeys`) expands it to the five `<key>.<field>` values, damping as
  the coefficient. No codegen change: instance var/key names already match.
- **`@property`:** spring tokens stay unregistered; a spec now says so.
- No option was replaced, so none removed. Docs: component-architecture springs bullet,
  styling and rn-adapter READMEs.

## Tests added

- `react-native/src/slide.spec.tsx`: a delayed spring slide calls `Animated.spring` with the
  delay, its velocity and rest 0.001.
- `rn-adapter/src/lower.spec.ts`: a theme aliasing another component's spring token resolves to
  that token's spring, and follows that token's own override.
- `css-lowering/src/spring.spec.ts`: the alias writes both vars reading the other token's; no
  `@property` for spring tokens.
- `styling/src/tokens.spec.ts`: a spring instance token as two vars; `types.spec.ts` updated.
- `rn-adapter/src/factory.spec.ts`: a spring instance token on tabs reaches the indicator's
  transition as that spring.

## Checks

- `omni run build test -p @pureform/styling -p @pureform/css-lowering -p @pureform/rn-adapter
-p @pureform/react-native`: failed once on react-native `overlays.spec.tsx` (the known bottom
  sheet flake, f2c's, and a snackbar 31 s timeout under load); `-f failed` passed.
- `tsc --noEmit` clean in styling, css-lowering, rn-adapter, binding-core, react, solid,
  react-native.
- e2e: `tabs-motion.e2e.test.ts --project solid/css`, 18/18 (after
  `omni run generate prepare -p @pureform/panda-fixture`, which Vitest needs to load configs).

## Refactoring hints

- **Helpers that look generic:** `springValues` (rn-adapter `factory.ts`) gives a spring's five
  concrete values; `springTokenValues` (`lower.ts`) gives the same as nodes. One could derive
  from the other if a third caller appears.
- **Code that looks like a sibling's:** `isSpringValue` (web) and `springFieldNodes(value, ctx)`
  (RN) walk the same cases (literal, `springs` alias, other alias, `dynamic`, platform); and
  `tokenAt` in css-lowering `spring.ts` vs the try/catch in `springFieldNodes`. A core
  "resolve an alias or undefined" helper would serve both.
- **Suggested home:** a `tryGetByPath` in core `path.ts`.
- **What must not change:** preset snapshots (no output change here), `tab-indicator.spec.tsx`,
  the new specs above, tabs-motion and reduced-motion e2e.

## Open questions

- An instance spring token is typed for every token (`InstanceTokenValue`), not only
  spring-valued ones; the registry shape doesn't say which tokens are springs. Passing a spring
  to a non-spring token writes vars nothing reads.
- An instance can't pass a role by name (`"spatialSlow"`); only a literal spring. Easy to add
  if wanted (web: the role's vars; RN: `$ref`s).
- `useAnimatedSlide`'s spring now rests at 0.001 instead of 0.5: a slightly longer, exact
  settle on React Native (no visual jump either way).
