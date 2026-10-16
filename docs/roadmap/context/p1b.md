# p1b: Reduced motion stops movement only (output context)

Commits: b290324..3a2d899, plus the `docs(roadmap)` commit that adds this file.

## Built

- **`@pureform/core`** (`src/motion.ts`, exported from the root):

    ```ts
    export type MotionSetting = "system" | "reduce" | "full";
    export const MOTION_ATTRIBUTE = "data-pf-motion";
    /** Lengths, percentages, lengthPercentage, angles, numbers: true. Color, time, undefined: false. */
    export const valueTypeMoves: (valueType: ValueType | undefined) => boolean;
    /** Strings: false for `color`, `fill`, `stroke`, `opacity`, `boxShadow`, `textShadow`,
     *  `filter`, and anything ending in `Color`; true otherwise (`"all"` included).
     *  Dynamic values: valueTypeMoves(valueType). */
    export const transitionMoves: (property: string | DynamicNode) => boolean;
    ```

- **`@pureform/preset`** (`src/components/shared.ts`):
    - `STATE_TWEENS` unchanged (background, color, border, outline colors over `short3`,
      `boxShadow` over `medium1`). `stateTransition` is now plain
      `transition(...STATE_TWEENS)`, no gate: it runs under reduced motion.
    - New `motionTransition(...parts: TransitionPart[]): NonNullable<StyleMap["transition"]>`:
      all parts normally; under `reducedMotion` only the parts `transitionMoves` says don't
      move, or `none` if none are left. Returns a plain transition when nothing moves.
    - `tweens(...properties)` (property names or dynamic values, `short3`, standard curve) is
      `motionTransition` over them.
    - Shape morphs (`shaped.ts`, `morphTransition`): `motionTransition(...STATE_TWEENS,
clipPath)`, so only `clip-path` drops. Navigation's active indicator (`growTransition`):
      the insets drop; opacity and background keep.
    - Result under reduced motion: switch handle and state layer keep `backgroundColor`;
      radio dot keeps `backgroundColor`; text field, text area, select labels keep
      `backgroundColor, color`; select's arrow keeps `color`; slider keeps `backgroundColor`;
      linear progress `width` and circular progress value token become `none`. Indeterminate
      progress animations were never gated and still run. The ripple's own CSS transition
      isn't gated (ripples are stopped in JS).
- **`@pureform/css-lowering`** (`src/motion.ts`): `REDUCED_MOTION_RULES` and
  `ROOT_REDUCED_MOTION_RULES`, paths of at-rules and selectors:

    | Path                                                                             | Holds when                                |
    | -------------------------------------------------------------------------------- | ----------------------------------------- |
    | `@media (prefers-reduced-motion: reduce)` → `&:not([data-pf-motion=full] *)`     | the system asks, and no `full` ancestor   |
    | `[data-pf-motion=reduce] &:not([data-pf-motion=reduce] [data-pf-motion=full] *)` | a `reduce` ancestor with no `full` inside |

    Root form: `&:not([data-pf-motion=full])` under the media query, and `&[data-pf-motion=reduce]`.
    The default `conditionKey("reducedMotion")` without an adapter hook is still the bare
    media query.

- **`@pureform/css-adapter`**: `reducedMotion` lowers to the placeholder key `@motion reduce`
  (`REDUCED_MOTION` in `options.ts`), expanded by the serializer into the rules above
  (`ELEMENT_SCHEMES`/`ROOT_SCHEMES` in `serialize.ts`), as dark and light are.
- **`@pureform/panda-adapter`**: the preset's `conditions.extend.motionReduce` replaces
  Panda's built-in with the same rules (`MOTION_CONDITIONS` in `preset.ts`); recipes keep
  using `_motionReduce`.
- **`@pureform/tailwind-adapter`**: a `motion-reduce` custom variant with the same paths
  replaces Tailwind's built-in (`MOTION_VARIANT` in `tailwind.ts`).
- **`@pureform/rn-adapter`**:
    - `Transition` (in `values.ts`) gains `valueType?: ValueType`, set by the lowering for a
      tween of a dynamic value (`--components.x.y`).
    - `tokenTransitions(transitions: Record<string, readonly Transition[]>, reducedMotion:
boolean): Map<string, Transition>` moved from `react.ts` to `motion.ts` and exported
      from there (not from the package root): under reduced motion it skips token tweens
      whose `valueType` moves and keeps color ones. `useComponentState` passes
      `useReducedMotion()`.
    - Selection needs no change: the preset's `reducedMotion` cases drop the same
      properties as the web (`src/reduced-motion.spec.ts`).
- **Tests**:
    - `tests/browser-e2e-tests/src/reduced-motion.e2e.test.ts` (18 tests): Panda, CSS, and
      Tailwind; six scenarios (no preference, system reduce, `reduce` provider, `full`
      provider over system reduce, `full` nested in `reduce`, `reduce` nested in `full`);
      checks computed `transition-property` and duration of button root, switch handle,
      radio dot, text field label, linear progress indicator.
    - `rn-motion.e2e.test.ts`: button color fades with and without reduced motion; a
      circular progress value moves, and jumps under reduced motion.
    - New browser command `emulateReducedMotion("reduce" | "no-preference")` in
      `src/commands.ts` (Playwright's `page.emulateMedia`).
    - `forcePseudoClasses` now finishes the CSS transitions it starts.
- READMEs: created for `rn-adapter` and `tailwind-adapter`; updated for `core`,
  `css-lowering`, `css-adapter`, `panda-adapter`, `preset`, `tests/browser-e2e-tests`.

## Deviations from the design

- None in behavior. Decisions §5.8 left open, now recorded there: the helper names
  (`motionTransition`, `transitionMoves`, `valueTypeMoves`), nesting resolves to the nearer
  provider for two levels, and Panda's `motionReduce` and Tailwind's `motion-reduce` are
  replaced (as `dark`/`light` are), so an app's own reduced-motion styles follow the provider.
- `filter` and `textShadow` count as fades (elevation drop shadows use `filter`).
- A dynamic value with no `valueType` counts as not moving (the phase said "skip only
  lengths, angles, numbers, and percentages"); it can't transition on the web anyway.

## Stubs and gaps

- **The provider setting itself is binding work**: `PureformProvider`'s
  `motion="system" | "reduce" | "full"` and writing `data-pf-motion`, in p2a (Solid) and p2b
  (React); `AccessibilityInfo` and the `motion` prop on React Native in p8. The CSS side is
  done; no stub code exists in the bindings.
- **`useReducedMotion()` for web bindings** (combining the provider with `matchMedia`) is
  p2a/p2b. `@pureform/js-effects`'s ripple still checks `matchMedia` on its own; it should
  read the hook once it exists.
- Three-level nesting (`reduce` in `full` in `reduce`) isn't resolved: the innermost
  `reduce` loses. Fixing it needs longer selectors; nobody asked.
- Panda's `_motionSafe` and Tailwind's `motion-safe` still read only the system.
- Pre-existing, unchanged: `rn-parity` "every variant value at rest" fails (same 102 diff
  lines before and after this phase, verified by stashing and rebuilding).

## How to verify

- `task_run` `build` and `test:unit` over the workspace: all pass.
- `task_run` `test:e2e` on `@pureform/browser-e2e-tests` (needs `.env.local`): 193 of 194
  pass; the failure is the pre-existing rn-parity "at rest" case.
- Single files: `cd tests/browser-e2e-tests && bun x vitest --config vitest.config.e2e.ts run
src/reduced-motion src/rn-motion` (after `set -a; source .env.local; set +a`; run the
  site's `prepare` first so Panda's `styled-system` is current).
- Unit: `packages/core/src/motion.spec.ts`, `packages/rn-adapter/src/reduced-motion.spec.ts`,
  `packages/css-adapter/src/stylesheet.spec.ts`, `packages/panda-adapter/src/preset.spec.ts`,
  `packages/tailwind-adapter/src/tailwind.spec.ts`, `packages/preset/src/components/icon-button.spec.ts`.

## Notes for the next phases

- **p2a, p2b (web bindings):** the provider writes `MOTION_ATTRIBUTE` (import it from
  `@pureform/core`) with `"reduce"` or `"full"` on its own element, and writes nothing for
  `"system"`. The CSS matches it on an **ancestor** (`[data-pf-motion=reduce] &`), not on the
  styled element itself, so put it on a wrapper around the children. `useReducedMotion()`
  should resolve nearest provider first: `"reduce"` → true, `"full"` → false, `"system"` →
  `matchMedia("(prefers-reduced-motion: reduce)")`, starting from `false` on the server.
- **p8:** map the existing `reducedMotion` prop to `motion`; `"system"` reads
  `AccessibilityInfo.isReduceMotionEnabled()` and its `reduceMotionChanged` event. The
  selection side already follows `State.reducedMotion`, and token tweens follow
  `tokenTransitions`.
- **p1c:** `tweens("left")` and friends now return either a plain transition or a
  `when("reducedMotion", fades, all)`; a moving property alone gives
  `when("reducedMotion", none, …)`. Use `motionTransition` for custom durations.
- **Any new transition** in the preset: build it with `tweens` or `motionTransition`, not
  `when("reducedMotion", none, …)` over the whole thing.
- **Browser tests:** the suite's context emulates reduced motion, but color fades now run
  under it. A test that changes a state after rendering must finish or wait for transitions
  before reading computed colors (`forcePseudoClasses` does it already).
- Preset snapshots changed (9 snapshot files); later phases regenerate after rebasing.
