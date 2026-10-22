# m2b: Overlays on springs (output context)

Branch `m2b-overlays`, from main `79f27b1e`. Commits are listed by
`git log 79f27b1e..m2b-overlays`; this file is in the last one.

## What was built

- **Core** (`@pureform/core`): `AnimationNode.alongside` and `animations(first, ...rest)`, several
  keyframe animations in one `animation` value, each on its own timing. css-lowering prints them
  as CSS's comma list (`spring.spec.ts` covers it). React Native's keyframe engine runs only the
  first (nothing on React Native uses it: the overlay rules are `rawRules.css`).
- **Machines** (`presence.ts`): the exit ends when the last of its animations has ended, not
  the first (a spec covers a two-animation exit).
- **Preset**:
    - `overlay.ts`: `OverlayMotionStep.fade?: MotionTiming`. With it, the keyframes only move and
      the overlay fade runs alongside on the fade's timing; under reduced motion the fade runs
      alone. `overlayGrowIn` and `dialogSlideIn`/`Out` now set only `transform`.
    - `POPUP_MOTION`: enter grows on `spatialFast`, fades `short3`/emphasized decelerate; exit
      unchanged (fade `short2`).
    - `DIALOG_MOTION`: enter slides on `spatialDefault`, fades `long2`; exit slides on
      `effectsFast`, fades `short3`. Reaches the dialog, fullscreen dialog, date picker, and the
      search view's surface (not its icons' keyframes, which stay parked).
    - `SCRIM_MOTION`: unchanged (fades only).
    - `sheet.ts`: `SHEET_KEYFRAMES` set only `transform`; `BOTTOM_SHEET_MOTION` and
      `SIDE_SHEET_MOTION` slide in on `spatialDefault` and out on `effectsFast`, with fades
      `long2` / `medium1`. `SHEET_SETTLE`: a `translate` transition on `spatialDefault`, which
      the bottom sheet's root carries, so the web's drag (`binding-core/sheet-drag.ts`, which
      sets `translate` inline and removes it on release) settles back on a spring. On a dismiss,
      the settle and the exit's slide add up, so the sheet leaves from where the drag left it.
    - `toast.ts`: `transform` and `height` on `spatialFast`, `opacity` on `short3`/standard
      (was all three on the `tweens` default).
- **rn-adapter**: `PresenceTiming`; `PresenceStep.fade?`. `animatedPresence` drives the opacity
  from a second progress on the fade's timing (`Animated.parallel`); `reanimatedPresence` gives
  a step with a fade two CSS animations (array `animationName`/`Duration`/`TimingFunction`) and
  reports the step's end after both `onCSSAnimationEnd`s. `settle(offset, velocity, spring, to?)`
  (`animate/settle.ts`, exported from `/animated` with the `Spring` type): `Animated.spring` from
  a drag's release velocity (px/ms, converted to Animated's px/s), instant without a spring.
- **react-native**: `OVERLAY_KEYFRAMES`/`OVERLAY_MOTIONS` mirror the preset's (the spec that
  compares them passes); `overlayMotion` resolves the fade's timing; `themeSpring(role, tokens,
  timeScale)` exported from `presence.ts`. The bottom sheet now follows a drag on its handle (a
  plain `Animated.View` around the surface carries the offset, so it works under every engine)
  and, when not closed, settles back with `settle` on `spatialDefault` carrying `gesture.vy`;
  under reduced motion it's back at once. A drag that closes it leaves the offset in place for
  the exit; the offset resets when it opens again.

## Decisions

- **Roles, from Compose Material 3** (`androidx-main`, read 2026-10-22):
    - `Menu.kt` (`DropdownMenuContent`): scale `FastSpatial`, alpha `FastEffects`.
    - `Tooltip.kt`: scale `FastSpatial`, alpha `FastEffects`.
    - `SnackbarHost.kt` (`FadeInFadeOutWithScale`): scale `FastSpatial`, opacity `FastEffects`.
    - `BottomSheet.kt`: `showMotionSpec = defaultSpatialSpec`, `hideMotionSpec =
      fastEffectsSpec`, `anchoredDraggableMotionSpec = defaultSpatialSpec` (settle after drag);
      `ModalBottomSheet.kt`: scrim alpha `DefaultEffects`.
    - `NavigationDrawer.kt` (the side sheet's nearest): open `DefaultSpatial`, close
      `FastEffects`, drag `DefaultSpatial`.
    - `AlertDialog.kt`: no motion of its own (the platform window's); the dialog takes the
      sheets' pair.

    https://github.com/androidx/androidx/tree/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3

- **Fades stay on their tweens**, as the brief asks, though Compose fades these on
  `FastEffects`/`DefaultEffects` springs (see open questions).
- **Exits that move use `effectsFast`** (sheets, dialog), Compose's hide spec: a critically
  damped spring on a movement. It is still movement, so reduced motion drops it.
- **The popup's exit stays a fade**, unchanged; Compose also scales its menu back to 80%.
- **Web drag velocity**: CSS transitions can't take a starting velocity, so the web settle starts
  from rest; only React Native carries the velocity.

## Output changes

- Every overlay's `&[data-state=open]` (and the dialog's and sheets' `closed`) `animation` is now
  two comma-separated animations; the moving keyframes lose their `opacity`. Snapshots updated:
  preset `date-pickers`, `new-components`, `search-view`, `sheets`, `split-button`.
- Bottom sheet root gains `transition: translate <spatialDefault>` (none under reduced motion).
- Toast root `transition` changes as above.
- `tests/component-suites/src/overlays.e2e.test.ts` now expects two running animations on enter
  (`["transform"]`, `["opacity"]`) and an opacity among the exit's.
- No screenshots changed: the overlays' end frames are the same.

## Checks

- `bun install`; `omni run generate`.
- `omni run build test -p @pureform/core -p @pureform/css-lowering -p @pureform/machines` (ran
  the preset too): pass after the snapshot update.
- `bunx vitest run` in preset (all 663 pass; one Material seed test timed out once under load,
  passed on rerun).
- `omni run build test -p @pureform/rn-adapter -p @pureform/react-native`: react-native passes;
  rn-adapter's `factory.spec.ts` "every variant value ... with and without SVG" hits its 60s
  timeout under omni's parallel load (61–66s), passes alone (46s); not from this branch's code.
- `tsc --noEmit` clean in preset, rn-adapter, react-native.
- Component suites and browser e2e: see the summary in the final commit message / below.

## Refactoring hints

- **Helpers that look generic:**
    - `animations(...)` (core `ast/helpers/motion.ts`): any component wanting a movement and a
      fade on different timings in one keyframe step (the parked app bar headline and search view
      icons, when they move to springs).
    - `settle` (rn-adapter `animate/settle.ts`): the list item's swipe snap-back on React Native
      (`list-item`, m2a's extra) wants exactly this.
    - `themeSpring(role, tokens, timeScale)` (react-native `presence.ts`): reading a spring role's
      physics from the theme; `rn-adapter/src/react.ts` (`slowed`) reads springs similarly.
- **Code that looks like a sibling's:** the spring-from-theme read now in `themeSpring` was
  inline in `overlayMotion`; m2a may read springs in its React Native code the same way.
- **Suggested home:** `themeSpring` next to `slowSpring` in rn-adapter `motion.ts` (taking
  `ThemeValues`), exported from `/animated`.
- **What must not change:** preset snapshots above, `overlay.spec.ts`, `sheets.spec.ts`,
  `toast.spec.ts`, react-native `presence.spec.tsx`, machines `presence.spec.ts`, and the
  component suites' overlay tests.

## Open questions

- **Fades on effects springs?** Compose fades its menu, tooltip and snackbar on `FastEffects`
  and the sheet's scrim on `DefaultEffects`; here they stay on their tweens (the brief's
  "the fade doesn't"). Switching is a one-line change per motion (`fade: { spring: ... }`).
- **Popup exit**: Compose scales the menu and snackbar back to 80% as they fade; pureform only
  fades. Adding it means a `overlayShrinkOut` keyframe on `spatialFast`.
- **Dialog roles** are borrowed from the sheets (Compose's dialog doesn't animate).
- **React Native sheets** still run the `dialog` motion (slide down 48px), not the web's slide
  from the edge; `OverlayFrame` has no percentage translation. A follow-up could add sheet
  motions to `OVERLAY_MOTIONS`.
- **React Native drag on a sheet whose close is refused** (`onOpenChange` given but the app
  keeps it open): the sheet stays where the drag left it until it next opens. A sheet with no
  `onOpenChange` settles back.
- **React Native drag wrapper**: the bottom sheet's surface is now inside a plain
  `Animated.View` (`alignSelf: stretch`, `maxHeight: 100%`), which a standalone surface placed in
  an app's own layout now sits in.
- **Web drag dismiss**: the drag's `translate` settles back while the exit slides out, so the
  sheet leaves from where it was let go; Compose animates the offset itself to hidden.
