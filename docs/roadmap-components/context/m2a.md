# m2a: Spatial springs (output context)

Branch `m2a-spatial`, from main `79f27b1e`. Commits: `git log 79f27b1e..m2a-spatial`; this file
is in the last one.

## What was built

Group A of [m2](../phases/m2-spring-components.md): the components' spatial motion moves from
the emphasized/standard tweens to m1's spring roles. Colors stay on their `short3` standard
tweens (`STATE_TWEENS`); reduced motion is unchanged (`motionTransition` drops every moving part,
spring or not, and fades keep running).

| Component / part                                                                      | Was                                                              | Now                                 | Compose source (`MotionSchemeKeyTokens`)                                                                   |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Button, icon button, split button corners (`cornerTransition`, `shared.ts`)           | `medium1` emphasized                                             | `effectsDefault`                    | `Button.kt`, `IconButton.kt`, `SplitButton.kt`: `DefaultEffects`, "intentional here to prevent any bounce" |
| Pressed shape morph (`morphTransition`, `shaped.ts`: FAB, icon button, avatar, media) | `medium2` emphasized                                             | `effectsDefault`                    | as above (`shapeByInteraction`)                                                                            |
| Chip corners, FAB menu toggle (`spatialCornerTransition`, `shaped.ts`)                | `medium1` emphasized                                             | `spatialFast`                       | `Chip.kt` (`FastSpatial`), `FloatingActionButtonMenu.kt` `ToggleFloatingActionButton` (`FastSpatial`)      |
| Button group corners, padding, width (`GROUP_TRANSITION`)                             | `medium1` emphasized                                             | `spatialFast`                       | `ButtonGroup.kt`: `FastSpatial`                                                                            |
| Navigation bar/rail indicator growth / fade                                           | `medium2` emphasized                                             | `spatialDefault` / `effectsDefault` | `NavigationItem.kt` `animateIndicatorProgressAsState`: `DefaultSpatial`; colors `DefaultEffects`           |
| Tabs indicator slide                                                                  | `indicatorDuration` (`medium1`) / `indicatorEasing` (emphasized) | `spatialDefault`                    | `TabRow.kt` `tabIndicatorAnimationSpec`: `DefaultSpatial`                                                  |
| Switch handle and state layer (inset, size)                                           | `short3` standard                                                | `spatialFast`                       | `Switch.kt` `ThumbElement`: `FastSpatial`                                                                  |
| Slider handle/track insets, handle size (keyboard steps)                              | `short3` standard                                                | `spatialFast`                       | none: Compose's slider doesn't animate (see open questions)                                                |
| Time picker hand (`dialTrack` transform)                                              | `handDuration` (`medium2`) / `handEasing` (emphasized)           | `spatialDefault`                    | `TimePicker.kt` `ClockDialModifier`: `DefaultSpatial`                                                      |
| Split button chevron turn                                                             | `short3` standard                                                | `spatialFast`                       | none in the component; the samples turn it with a default spring                                           |

Sources: https://github.com/androidx/androidx/tree/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3
(read 2026-10-22).

- **Helpers:** `spatialTweens(role, ...properties)` in `shaped.ts` (moving properties on the
  spring, the rest on the `short3` standard tween, through `motionTransition`);
  `spatialCornerTransition` in `shaped.ts`.
- **Removed component tokens:** tabs' `indicatorDuration`/`indicatorEasing` and time picker's
  `handDuration`/`handEasing`. A spring timing must be a `springs` alias or a `SpringNode`
  (`SpringTiming.spring`), so a component token can't carry one; themes retime through the
  `springs` roles instead.
- **Bindings and adapters:** no code change needed. Web (React, Solid; CSS, Panda, Tailwind)
  read the transition, now `token(springs.<role>.duration) token(springs.<role>.easing)`. React
  Native's Animated engine runs these transitions with `Animated.spring` (m1); the tabs' slide
  (`SlideMotion`) runs the sampled duration and curve.
- Docs: `component-architecture.md` §5.8.1 (components bullet) and §9.10, preset README
  (morphing, tabs), react-native README (tabs).

## Output changes

- Preset snapshots: button, chip, input chip, icon button, controls (switch), new-components
  (tabs, navigation bar/rail, slider), split button (and FAB menu), time picker.
- `icon-button.spec.ts` and `tabs.spec.ts` expect the spring vars; new
  `spatial-springs.spec.ts` checks each component's role, no emphasized tween left, and no
  spatial spring under reduced motion.
- `tests/component-suites/src/tabs-motion.e2e.test.ts` expects the `spatialDefault` spring's
  sampled duration and `linear()` (via `sampleSpring` and `MATERIAL_SPRINGS`; adds
  `@pureform/core` as a devDependency of the suites).
- Screenshots: none re-recorded; they capture settled states (browser-e2e-tests passed).
- `packages/react-native/src/tab-indicator.spec.tsx` waits the spring's settle time.

## Checks

- `omni run build -p @pureform/preset` with the updated snapshots (`vitest -u` on the changed
  ones only, diffs read), `bunx tsc --noEmit` in `packages/preset`.
- `omni run build test -b 79f27b1e -w -o continue` (changed projects and dependents, no `-f`):
  97 passed, 4 failed. Reruns with `-f failed`:
    - react-native `tab-indicator.spec.tsx` (Animated and Reanimated): the spec waited 250ms × 8
      for the slide, shorter than the spring's ~317ms; it now waits the sampled `spatialDefault`
      settle time (adds `@pureform/core` as a devDependency). Fixed.
    - component-suites: Autocomplete controllable (react) and indication timeouts, then the
      known "Failed to fetch dynamically imported module" on Solid; browser-e2e-tests' parity
      timeouts. Not from this branch's code; passed on rerun.
    - Final `-f failed` rerun: all 101 tasks succeed.
- `bunx tsc --noEmit -p tsconfig.json` clean in `packages/preset` and `packages/react-native`.

## Refactoring hints

- **Helpers that look generic:** `spatialTweens` (`shaped.ts`) is `tweens` with the moving
  parts on a spring; groups B and C will want the same split (springing the movement, fading on
  the tween). `spatialCornerTransition` beside `cornerTransition` differ only in the role.
- **Code that looks like a sibling's:** m2c's chevrons (accordion, tree, list, select, table)
  likely spring a `transform` turn the way the split button's chevron does here
  (`spatialTweens("spatialFast", "transform")`); m2b splits overlay steps similarly.
- **Suggested home:** `tweens` in `shared.ts` taking a role for moving parts (e.g.
  `tweens({ moving: spring(role) }, ...)`), with `cornerTransition(role)` as a function.
- **What must not change:** the preset snapshots above and `spatial-springs.spec.ts`.

## Open questions

- Compose deliberately uses `DefaultEffects` (no bounce) for button, icon button and split
  button shape morphs, so those take an effects spring though shape is spatial; chips take
  `FastSpatial` (marked "TODO: Replace with correct animation tokens" in `Chip.kt`).
- The slider: Compose doesn't animate the thumb; pureform eases keyboard steps and the pressed
  size, now on `spatialFast` (bounces a little in the expressive scheme).
- The split button chevron's turn has no Compose token; `spatialFast` chosen.
- The tabs' slide on React Native still runs the sampled curve, not `Animated.spring` (m1's open
  question on `SlideMotion`).
- Removed `indicatorDuration`/`indicatorEasing`/`handDuration`/`handEasing` tokens outright
  rather than deprecating them; a component token holding a spring ref would need core support.
