# m3c: FAB menu items (output context)

Branch `m3c`, from main `a94bbe0b`. Commits: `git log a94bbe0b..m3c`.

## Done

- **Preset** (`packages/preset/src/components/fab-menu.ts`, `overlay.ts`). An overlay step takes a
  `delay` (`OverlayMotionStep.delay`, a numeric; `timedAnimation(…, fillMode, delay)`), which its
  fade waits too; under reduced motion the fade runs at once, so the stagger drops. The FAB menu's
  `list` no longer runs the popup's motion: each item grows and fades in as a popup does
  (`FAB_MENU_ITEM_MOTION` = `POPUP_MOTION`), the item nearest the FAB (the last child) first
  (`:nth-last-child(k)` waits `(k-1) × short1`) and leaving in reverse (`:nth-child(k)`, the first
  item goes first). The rules sit on the list's `rawRules.css` (`&[data-state=open] > :nth-last-child(k)`),
  since an item has no `data-state` of its own. Eight steps (`FAB_MENU_STAGGERED`); the items past
  them share the last wait (`:nth-last-child(n+8)`). The list only holds on exit
  (`FAB_MENU_LIST_MOTION`, keyframes `overlayHold`: opacity 1 to 1), delayed by seven steps, so
  Zag's presence keeps it mounted until the last item has left. It has no enter animation: the
  presence machine hides at once an exit whose animation name equals the open state's (found the
  hard way, see Open questions).
- **React and Solid:** no code change; they render the items as the list's children, so the
  preset's rules apply. Their registries/fixtures are unchanged.
- **React Native** (`presence.ts`, `overlay.tsx`, `fab-menu/fab-menu.tsx`; `rn-adapter`
  `motion.ts`, `reanimated.ts`, `animate/curve.ts`). `PresenceTiming.delay` (Animated already
  took one in `animate`; Reanimated's CSS animations get `animationDelay`). `overlayMotion(…, delay)`
  and `usePresence(open, motion, delay)`/`useOverlayPresence` take `{ enter?, exit? }` in ms
  (times `timeScale`, not under reduced motion's fade). New motions `fabMenuList` (the hold) and
  `fabMenuItem` (the popup's), checked against the preset's constants by the existing "are the
  preset's" test (`testing/commands.ts`). Each item has its own presence in an `engine.View`
  around its pressable; the list holds with `useAnchoredOverlay(component, props, motion, delay)`
  for exactly `(count-1)` steps (the web's is fixed at seven).
- **Tests.** Preset `fab-menu.spec.ts` (new) and the FAB menu snapshot in
  `split-button.spec.ts.snap`; RN `presence.spec.tsx` (delay in `overlayMotion`; items stagger in
  and out on `animated` and `reanimated`); component-suites `overlays.e2e.test.ts` (the generic
  motion checks read `OverlayCase.moving`, a new optional field in component-cases' `types.ts`,
  which the FAB menu sets to its items; plus a "FabMenu" suite reading the items' animation delays
  and the list's hold, full and reduced motion).
- **Deprecated options:** none on the FAB menu (it already excludes the small FAB), so none
  removed.

## Checks

- `omni run build test -p` preset, rn-adapter, react-native, react, solid, component-cases: pass
  (the whole-run's timeouts in rn-adapter and one carousel/presence timing flake passed on
  `-f failed`; both load-related).
- `bunx tsc --noEmit -p tsconfig.json` clean in those six packages and `tests/component-suites`.
- e2e: `overlays.e2e.test.ts -t FabMenu` on `react/css`, `solid/css`, `react/panda` (15 passed);
  `browser-e2e-tests` `visual.e2e.test.tsx -t split-buttons-and-fab-menus` (unchanged screenshot).
  Not run: tailwind target, keyboard/indication suites (nothing they read changed).

## Refactoring hints

- **Helpers that look generic:** `OverlayMotionStep.delay` and `timedAnimation`'s `delay`
  (`preset/src/components/overlay.ts`) for any staggered surface; RN's `OverlayDelay` and the
  per-item `useOverlayPresence` in `react-native/src/fab-menu/fab-menu.tsx` (a stagger of
  children, e.g. m3a/m3b's page motion could reuse the delay); `staggered()` in `fab-menu.ts`
  (a per-index rule generator on `nth-child`) for a list's staggered rows.
- **Code that looks like a sibling's:** `STAGGERED = 8` in RN's `fab-menu.tsx` mirrors the preset's
  `FAB_MENU_STAGGERED`, and `useStagger()` mirrors `FAB_MENU_STAGGER` (`durations.short1`); a
  generated mirror like `OVERLAY_MOTIONS` would remove the copy.
- **Suggested home:** a shared stagger constant exported from the preset and read by the RN
  tests' command (as the motions are); `moving` in `OverlayCase` is the hook for any overlay
  whose surface isn't what animates.
- **What must not change:** the `fabMenu` snapshot in `split-button.spec.ts.snap`, the
  "are the preset's" RN test, `overlays.e2e.test.ts -t FabMenu`.

## Open questions

- **Item origin:** items scale from their own centre, not from the FAB (Compose scales from the
  button); a `transform-origin` at the inline end would be nearer. Left alone to keep the popup
  motion's keyframes.
- **Fixed hold on the web:** the list waits seven steps (about 350ms) even for a menu of three
  items, because CSS can't know the count; the extra time is invisible but pointer events on the
  faded items stay until the list hides. RN holds for exactly the count. A count var set by the
  bindings would make both exact.
- **Step size and cap:** `short1` (50ms) and eight steps are my reading of Compose's stagger
  (not confirmed against `FloatingActionButtonMenu.kt`).
- **Zag presence rule:** an exit with the same animation name as the open state hides at once; the
  list's hold therefore has no enter animation. A change in `@pureform/machines`' presence would
  make that restriction unnecessary.
