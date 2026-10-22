# m2c: Spring components, containers (output context)

Branch `m2c-containers`, from main `79f27b1e`. Commits: `git log 79f27b1e..m2c-containers`; this
file is in the last one.

## What was built

- **`packages/preset/src/components/spring-motion.ts`** (new): `springTweens(role, moving,
fades)`, a transition moving `moving` on a spring role and fading `fades` over `short3` on the
  standard curve (`tweens`' timing), through `motionTransition`, so reduced motion drops the
  moving parts and keeps the fades; `chevronTransition`, `transform` on `spatialFast` and `color`
  on its tween.
- **Chevrons:** `expandIndicator` (`list.ts`, the list item's, accordion's and tree's expand
  indicator) and the select's arrow (`select.ts`) use `chevronTransition`, so all four turn the
  same way.
- **Field label** (`field.ts`, every text field, text area, select, date input, autocomplete, tags
  input): `top`, inset, paddings, margin, `transform`, font size, line height and letter spacing
  float on `spatialFast`; `backgroundColor` (the outlined notch) and `color` stay on their tween.
- **Swipe snap-back** (`list-item.ts`): `swipeOffset` still follows the drag at once while
  pressed, and settles on `spatialFast` after release (was `short3`/standard).
- **React Native velocity:** `animate()` (rn-adapter `animate/curve.ts`) takes a start velocity
  for `Animated.spring`; `startVelocity` (`motion.ts`) turns a token's velocity into progress per
  second over the distance it moves; `useComponentState`, `useAnimatedComponentStyles`,
  `useReanimatedComponentStyles`, `MotionEngine.useStyles` and react-native's `useComponentSlots`
  take an optional `velocities` (token units per second, by token name; `useComponentSlots` keys
  them like the tokens). The list item records the pan's release `vx` (×1000, signed toward the
  inline start) for the render after release and passes it as `swipeOffset`'s velocity. Both
  engines' token tweens run through Animated, so both carry it.
- §5.8 of `component-architecture.md` gains a "Containers (m2c)" bullet.

## Decisions

- **Spring roles, from Compose:**
    - Field label: `FastSpatial` for the label's progress, `FastEffects` for its colors
      (`TextFieldImpl.kt`, `labelProgress`, `colorTransitionSpec`):
      https://github.com/androidx/androidx/blob/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/internal/TextFieldImpl.kt
      Colours stay on their `short3` tween (the brief's rule), not `effectsFast`.
    - Chevrons: Compose doesn't animate its dropdown arrow
      (`ExposedDropdownMenuDefaults.TrailingIcon` is `Modifier.rotate(if (expanded) 180f else
0f)`, `ExposedDropdownMenu.kt`), and has no accordion or tree. A chevron is a small part, so
      `spatialFast`, the role Compose gives small components' movement (switch thumb, label).
    - Swipe: `SwipeToDismissBox` settles with foundation's
      `AnchoredDraggableDefaults.SnapAnimationSpec` (a default `SpringSpec`, stiffness 1500,
      ζ 1), not the motion scheme
      (https://github.com/androidx/androidx/blob/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/SwipeToDismissBox.kt).
      `spatialFast` (1400, ζ 0.9 standard) is the closest role and follows the scheme.
- **Table sort arrow: left on its opacity tween.** It doesn't turn today: the bindings swap the
  glyph (↑/↓) by direction and the preset has no state for "descending" (the `SlotState`
  vocabulary in core has nothing for a sort direction). Turning it needs a new state in core's
  vocabulary, its web selector (`aria-sort` on the header cell, or `data-direction` the machine
  already sets on the indicator) and React Native's state, all outside this subphase. See open
  questions.
- **Accordion content and tree group** don't animate their height today, so nothing to spring
  there; only their chevrons move.
- **Reduced motion:** unchanged mechanism; the snapshot shows `_motionReduce` keeping only
  `color` (chevrons) and `none` (swipe). The field label keeps its colour fades.
- **Velocity units:** PanResponder's `vx` is px/ms; Animated's spring velocity is per second
  (react-native-web's `SpringAnimation` steps in seconds), so ×1000, then divided by the
  distance the token moves to get progress per second.

## Output changes

- Web: the chevrons' and label's `transform`/position/size transitions read
  `--springs-spatialFast-duration`/`-easing` instead of `short3`/standard; the swipe offset's
  transition likewise. Panda snapshots updated: `autocomplete`, `date-pickers` (docked,
  input), `new-components` (listItem, select), `tags-input`, `text-area`, `text-field`.
- React Native: the same transitions carry `spring` (Animated runs `Animated.spring`).
- Screenshots: none re-recorded; these are transitions, and the screenshots are at rest.

## Checks

- `bun install`, `omni run generate`.
- `omni run build test` (no `-f`) for preset, panda-adapter, css-adapter, tailwind-adapter,
  rn-adapter, react-native: pass. Reruns with `-f failed` after load timeouts (load average ~30
  on 6 cores with the sibling subphases running): rn-adapter `factory.spec.ts`/`codegen.spec.ts`,
  tailwind `generates utilities`, react-native's reanimated snackbar tests; each passed alone and
  on the `-f failed -c 1` rerun.
- New `packages/preset/src/components/spring-motion.spec.ts` (chevrons of accordion, tree, list
  item, select; the label; the swipe; reduced motion keeping the fade) and
  `rn-adapter/src/motion.spec.ts` (`startVelocity`).
- tsc (`tsconfig.json`) clean in preset, rn-adapter, react-native.
- Not run: `tests/component-suites`, `tests/browser-e2e-tests` (no anatomy, markup or rest-state
  change); React and Solid bindings unchanged (their swipe rides the CSS transition).

## Refactoring hints

- **Helpers that look generic:** `springTweens` and `chevronTransition`
  (`preset/src/components/spring-motion.ts`). m2a (shape morphs, switch, slider) and m2b
  (overlays) likely wrote a similar "moving on a spring, fades on a tween" builder; the
  split-button chevron (m2 extras) should use `chevronTransition`.
- **Code that looks like a sibling's:** `tweens(timing, ...)` in `shared.ts` already takes one
  timing; `springTweens` is two timings in one transition. The sheet drag release (m2b) also
  carries a release velocity on React Native; if it went through tokens, it should use
  `useComponentSlots`' `velocities`; if through its own `Animated.Value`, `animate()`'s new
  `velocity` argument.
- **Suggested home:** `springTweens`/`chevronTransition` in `shared.ts` beside `tweens` (or
  fold into `tweens` as a per-property timing map).
- **What must not change:** the Panda snapshots listed above, `spring-motion.spec.ts`, and the
  `_motionReduce` branches.

## Open questions

- **Table sort arrow turn:** needs a sort-direction state in core (see Decisions). Angular
  Material's sort header rotates its arrow; with a state, the arrow would always be ↑ and turn on
  `chevronTransition`.
- **Chevron role:** `spatialFast` is a choice (Compose doesn't animate the dropdown arrow). Under
  the expressive scheme, `spatialFast` (ζ 0.6) overshoots the 180° turn visibly.
- **Label sizes on a spatial spring:** font size, line height and letter spacing ride the spring
  too (Compose interpolates the label's text style by the same `labelProgress`); under
  expressive they overshoot slightly.
- **Web swipe velocity:** CSS transitions can't start at a velocity, so the web settles from
  rest. A Web Animations driver could carry it; left out.
- **Reanimated** runs the snap-back's token tween through Animated (as every token tween), so it
  carries velocity there too; its CSS transitions don't take one.
