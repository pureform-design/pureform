# f1f: Spring component tokens (output context)

Branch `f1f-spring-tokens`, from main `4d92f8aa`. Commits: `git log 4d92f8aa..f1f-spring-tokens`;
this file is in the last one.

## What was built

[f1f](../phases/f1-fixes.md#f1f-spring-component-tokens): a component token can hold a spring, a
literal `SpringNode` or an alias to a `springs` role, and a timing reads it with `ref(token)`
(`{ spring: ref("indicatorSpring") }`). No core change was needed: `SpringValue` already takes any
`RefNode`, and a component token is a `dynamic` node whose default is the spring.

- **Web lowering (`@pureform/css-lowering`, shared by css, panda and tailwind):**
    - `compileSpring` gains a `dynamic` case. A component-token alias resolves to its `dynamic`
      node, which reads two vars, `<token>-duration` and `<token>-easing`, each falling back to
      the default's: the role's vars for an alias
      (`var(--components-tabs-indicatorSpring-duration, var(--springs-spatial-default-duration))`;
      Panda spells the fallback `token(springs.spatialDefault.duration)`), or a literal's sampled
      duration and `linear()`.
    - `componentTokenVars` (theme overrides, all three adapters) and a style's `tokens` /
      `providedTokens` (`style-map.ts`) write a spring value as the two vars, through
      `springTokenVars`; an alias writes the role's vars, so a theme's change of the role still
      reaches the token.
    - New exports: `isSpringValue`, `springTokenVars`, `springVarNames` (`spring.ts`).
- **React Native (`@pureform/rn-adapter`):** `springNodes` gains a `dynamic` case: each of the
  five values (duration, easing, stiffness, damping, mass) is a `$dyn` key
  `components.<c>.<token>.<field>` falling back to the role's `$ref` (or a literal's value), so
  the timing keeps its `spring` physics and the engine runs a real spring. `resolveTheme` splits
  a theme's spring override (literal or role alias) into those five keys. `SPRING_FIELDS` is now
  exported from `lower.ts`.
- **Preset:** tabs `indicatorSpring` and time picker `handSpring`, both
  `spring("spatialDefault")`, back as component tokens; the indicator's and the dial track's
  `transform` transitions read them.
- `packages/anatomy/src/generated.ts`: `generate` rerun, no change (it doesn't list token names).
- Docs: `component-architecture.md` springs section (new "Component tokens" bullet) and §9.10
  tabs timing; preset README (tabs, time picker); css-lowering README.

## Output changes

- Preset snapshots: `new-components.spec.ts.snap` (tabs indicator) and `time-picker.spec.ts.snap`
  (dial track) now read the token vars with the role's as fallback. `tabs.spec.ts` updated.
- Resolved timing is unchanged with no override (fallback is the same role), so the tabs-motion
  e2e and reduced-motion fixtures pass unchanged.

## Tests added

- `css-lowering/src/spring.spec.ts`: alias and literal defaults through `compileSpring` and a
  transition, theme override vars (alias and literal), a style's `tokens`.
- `css-adapter/src/stylesheet.spec.ts`, `tailwind-adapter/src/tailwind.spec.ts`: `pureform()`
  with a theme overriding tabs `indicatorSpring` to `spatialSlow`: the transition reads the
  token, the theme's rule sets both vars to the role's.
- `panda-adapter/src/preset.spec.ts`: same on a small config (the package doesn't depend on the
  preset): recipe transition and the theme's `globalCss` vars.
- `rn-adapter/src/lower.spec.ts`: the lowered timing's `$dyn` keys with role fallbacks, and
  evaluated against `resolveTheme` it's the role's real spring, and the override's (alias and
  literal) under a theme.

## Checks

- `omni run build test -p` css-lowering, rn-adapter, preset, css-adapter, panda-adapter,
  tailwind-adapter, then `-f failed`: all pass except timeouts under load (load average ~35 from
  parallel agents): preset `carousel`/`expandable` theme specs (5 s) passed on rerun; rn-adapter
  `factory.spec.ts` "gives what selection gives" (60 s limit, took 61.9 s) passes run alone with
  a longer timeout. Not caused by this change.
- `bunx tsc --noEmit -p tsconfig.json`: clean in all six packages.
- e2e, after `generate`/`prepare` of the panda fixture: `tabs-motion.e2e.test.ts` on `solid/css`,
  `react/panda`, `react/tailwind` (18/18 each); browser-e2e `reduced-motion.e2e.test.ts` (54/54,
  includes the time picker's dial track on all three web targets). react-native unit tests pass.
- Setup note: the first `omni run build` fails at the fixtures' `generate` until the second
  `bun install` links `pureform`; `omni run generate prepare -p @pureform/panda-fixture` still
  failed afterwards (it resolved `pureform@latest` from the registry), while
  `bun x pureform generate` run in `tests/panda-fixture` worked, and `prepare` then ran.

## Refactoring hints

- **Helpers that look generic:** `springTokenVars` / `isSpringValue` (`css-lowering/src/spring.ts`)
  are how any spring-valued token gets set on the web; `springNodes`' `dynamic` case and the
  theme split in `rn-adapter/src/theme.ts` mirror each other (literal vs `springs` alias), as
  `springTokenEntries` and the base `springs` loop already did. A shared "spring value's fields"
  helper in rn-adapter could serve both `theme.ts` loops.
- **Code that looks like a sibling's:** f1e (React Native tabs on `settle()`) reads the tabs'
  timing; it now arrives with `$dyn` fields that resolve to the same role, so its `spring` is
  still there.
- **Suggested home:** keep the web helpers in `css-lowering/src/spring.ts`.
- **What must not change:** the two preset snapshots above, the new specs, tabs-motion and
  reduced-motion e2e.

## Open questions

- `instanceTokenVars` / `instanceTokenKeys` (a factory's `selection.tokens`) still set a single
  var or key; an instance can't pass a spring for these tokens. Nothing needs it yet.
- A theme override that aliases another component's spring token (not a `springs` role) isn't
  recognized as a spring and is written as one var; only literals and role aliases are.
- Spring tokens have no `valueType`, so they aren't registered with `@property` (they don't need
  to transition themselves).
