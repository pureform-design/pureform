# c8a: Bottom sheet partly-open state (output context)

Branch `c8a-bottom-sheet-partial`, from main `62e8ed69`. Commits: `git log 62e8ed69..c8a-bottom-sheet-partial`.
Not pushed; main untouched.

## Done

- **Choice: snap points on the current sheet, not Zag's `drawer`.** Root stays on Zag's `dialog`
  (focus trap, presence, `onClose` through `closeAsker`, the shared `dialogParts`); `drawer`
  would replace that machine for one extra snap point. The snapping is a pure function,
  binding-core `sheetRelease`, shared by the web and React Native.
- **core** (`spring.ts`): `SampleOptions.velocity` (a share of the distance per second) and
  `settleTime(…, velocity)`, so a spring samples from a starting speed; `springFromCurve(points,
duration)` fits a spring (mass 1, damping ratio 0.25–1.75 grid, stiffness from the settle time)
  back from a sampled `linear()` curve, since the web only has the duration and curve.
- **binding-core**
    - `components/sheet.ts`: `SheetRest` (`"expanded" | "partial"`), `SHEET_DISMISS_SHARE` and
      `SHEET_FLICK_SPEED` (moved here; `/dom` re-exports them), `SHEET_PARTIAL_SHARE = 0.5`,
      `sheetPartialOffset(height, screen)` (top at half the screen, Compose's anchor),
      `sheetRelease({ offset, velocity, height, partial })`, `sheetDragHandleLabel(rest,
movable)`, `BottomSheetRestProps` (`partiallyExpandable`, `onExpandedChange`) on Root's
      own props, `BOTTOM_SHEET_REST_PROPS`.
    - `settle.ts` (`/dom`): `settleTransition(element, property, distance, velocity)` reads the
      element's computed transition for the property; if it's a `linear()` (spring) curve, refits
      the spring (cached per curve), resamples it from the release's speed, and sets it inline
      for that settle (dropped on `transitionend`/`transitioncancel`). Reduced motion (no
      transition) changes nothing.
    - `sheet-drag.ts`: `dragToDismiss(…, options?: { partial?, onRest? })`. It watches the
      surface's `data-state` and places an opening sheet where it rests (partly when it can,
      before the enter starts, so it rises to there); drags move from the rest offset; release
      goes through `sheetRelease`; settles use `settleTransition`; a press on the handle of a
      sheet that can rest partly toggles partly/fully open and stops the click there (so the
      binding's close trigger doesn't hear it). `onRest(rest, movable)` on each open and change.
      The old signature still works (options are optional).
- **React, Solid** `DragHandle`: passes `partial`/`onRest`, fires `onExpandedChange` on a change
  of rest only, and names the handle for what a press does when no `aria-label` is given ("Close
  sheet" / "Expand sheet" / "Collapse sheet"); the ready-made passes `dragHandleLabel` only when
  given.
- **React Native**: same props; the drag's `Animated.Value` rests at the partial offset
  (`useWindowDimensions().height`), placed on the first layout after opening; release through
  `sheetRelease`, settle with `settle(…, to)` carrying `vy`; the handle's press toggles.
  The content keeps its native `ScrollView`; nothing drives scrolling (native scrolling rule):
  only the handle drags.
- **Cases**: `bottomSheet.opened["partly open"]` (long body, `partiallyExpandable`, body with
  `tabIndex: 0` through `slotProps`, see open questions).
- **Docs**: React, Solid, React Native and binding-core READMEs; gap analysis rows (§1 matrix,
  Zag table, §703 row).

## Tests

- Unit: core `spring.spec.ts` (velocity sampling, fit), binding-core `sheet-drag.spec.ts`
  (partial rest, flicks, toggle press, short sheet, `sheetRelease`, `settleTransition`), React
  and Solid `bottom-sheet.spec.tsx`, RN `overlays.spec.tsx` (partial rest and toggle).
- `omni run build test -p core -p binding-core -p react -p solid -p react-native -p
component-cases`: two unrelated Reanimated flakes (snackbar queue timeout, FAB stagger) on the
  first run, passed with `-f failed`.
- e2e (`tests/component-suites`, after `generate prepare -p @pureform/panda-fixture`): new
  `bottom-sheet.e2e.test.ts` (rest, toggle, flick sets an inline `linear()` settle) on solid/panda,
  react/css, react/tailwind: 2/2 each. `overlays`, `accessibility`, `direction` with `-t
BottomSheet|Sheet` on the same three: 34 passed after the a11y fix below (17 with
  `-t BottomSheet` on the rerun).
- `tsc --noEmit` clean in core, binding-core, react, solid, react-native, component-cases,
  component-suites. No conflict markers.

## Refactoring hints

- **Helpers that look generic:** `settleTransition` (binding-core `settle.ts`) is meant for any
  drag released onto a spring transition. The list item swipe (`packages/react/src/list-item/
swipe.ts`, binding-core `components/list-item-swipe.ts`, and Solid's) should call it on release
  (m2's open question); not done here, those files aren't c8a's. `springFromCurve` + `sampleSpring
({ velocity })` is the core of it.
- **Code that looks like a sibling's:** React's and Solid's `DragHandle` wiring of `onRest` →
  `onExpandedChange` + label state is the same 15 lines; RN restates the rest bookkeeping
  (`restAt`, `latestPlace`) that `dragToDismiss` holds on the web.
- **Suggested home:** a small binding-core `sheetRestTracker(onExpandedChange)` returning
  `onRest` and the last value would remove the duplicated "fire only on change".
- **What must not change:** `sheet-drag.spec.ts`, `bottom-sheet.e2e.test.ts`, the bottom sheet's
  overlay/accessibility/direction e2e cases.

## Open questions

- **Opt-in, unlike Compose.** Compose defaults to `skipPartiallyExpanded = false`; ours is
  `partiallyExpandable` (default false) so existing sheets don't change. Flip if wanted.
- **No controlled `expanded`.** Only `onExpandedChange`; a controlled/`defaultExpanded` prop (and
  an imperative expand) could follow.
- **Thresholds:** our own, not Compose's (positional threshold 56dp, velocity 125dp/s): nearest
  rest, closes a quarter below the lowest rest, flick at 0.5 px/ms moves to the next anchor.
- **Partial offset** is measured at open (and at each release/press); a content or window resize
  while resting partly isn't followed until the next interaction.
- **Scrolling body focus:** axe flags a long text-only body (`scrollable-region-focusable`); the
  case gives the body `tabIndex: 0`. The component could add it only when the body overflows.
- **Handle label** now defaults by action even in the composed `DragHandle` (before it had none
  unless given).
- **The fit** of a spring from a `linear()` curve is approximate (damping to ~0.01, stiffness
  within a few %); passing role values as CSS vars would make it exact.
