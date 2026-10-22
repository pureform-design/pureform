# f1c: Overlays (output context)

Branch `f1c-overlays`, from main `aee1db3c`. Commits are listed by
`git log aee1db3c..f1c-overlays`; this file is in the last one.

## What changed

- **React Native sheets slide from their edge** (`rn-adapter`, `react-native`):
    - `PresenceFrame.translateX`; `presenceFrames` adds a `translateX` step only when a frame
      moves across, so the existing motions' transforms are unchanged.
    - `presence.ts`: `OverlayMove` (pixels, a token times a factor, or `{ share }`);
      `OVERLAY_KEYFRAMES` gains the preset's `SHEET_KEYFRAMES` (`bottomSheetIn/Out`,
      `sideSheetIn/Out`, `sideSheetIn/OutRtl`); `OVERLAY_MOTIONS` gains `bottomSheet` and
      `sideSheet`, equal to `BOTTOM_SHEET_MOTION`/`SIDE_SHEET_MOTION` (the parity spec now
      compares them, `rtl` keyframes included). `OverlayMotionStep.rtl`.
    - `overlayMotion(name, tokens, reducedMotion, timeScale, size, rtl)`; `useOverlayPresence`
      passes `useWindowDimensions()` and `useDirection()`.
    - `useModalOverlay(component, options, motion = "dialog")`; the bottom and side sheets pass
      `"bottomSheet"`/`"sideSheet"`, both modal and as surfaces with `open`.
- **React Native refused close after a drag** (`bottom-sheet.tsx`): after a dismissing drag the
  sheet calls close, then a frame later settles back (`settle` on `spatialDefault`, with the
  release velocity) if it's still open: the modal's state (new internal `shown` prop from
  `ModalBottomSheet`) or the surface's `open`. A sheet that can't close settles back the same way.
- **React Native drag view layout**: it did change a standalone sheet: the surface's `zIndex`
  (the `raised` layer for `modal={false}`) sat on the inner view, so it no longer ordered the sheet
  among its parent's children. Now `placement()` moves the surface's placing style (position and
  insets, `zIndex`, `alignSelf`, flex, sizes and min/max, margins) to the drag view and the
  surface fills it (`flexGrow`/`flexShrink: 1`, `minHeight: 0`). A spec lays a standalone sheet out
  in a column, a centered column and a row parent and checks width, position and layer.
- **Web drag dismiss** (`binding-core/sheet-drag.ts`): a dismissing release keeps the drag's inline
  `translate` (and `transition: none`), so the exit keyframes slide out from where it was let go
  rather than the settle pulling it back meanwhile. A frame later, if the surface's `data-state`
  isn't `closed` (the app refused), it settles back as before; otherwise a `MutationObserver`
  clears the `translate` at once (no settle) when it next opens. React and Solid get it through
  `dragToDismiss`.
- **Toast shrinks on exit** (scope addition): `&[data-state=closed]` sets `scale: 0.8` (1 under
  reduced motion) and the root transitions `scale` on `spatialFast` beside the transform. It's the
  CSS `scale` property, not `overlayShrinkOut`'s keyframes: Zag's stacking transform is inline, and
  a keyframe on `transform` would override it (the toast would jump to its unstacked place).
  Core's `StyleMap` gained `scale` (typed only, as `transformOrigin` was; web only). React Native's
  toast already ran `usePresence(open, "popup")`, whose exit is `overlayShrinkOut`, so nothing
  changed there.
- **Submenus in grouped menus**: on the web the grouped root is `overflow: visible`
  (`platform({ css: visible }, hidden)`) and the first and last `itemGroup` round the run's outside
  corners (`rawRules.css` `&:first-child`/`&:last-child`). React Native keeps the clip (its
  submenus drill in). This also stops the clip cutting an item's outer focus ring (c1c's open
  question). In practice the submenu's positioner is absolute and its containing block is the
  parent's positioner, so it was clipped only while the parent menu had a transform (its grow-in);
  the e2e test checks nothing between the submenu and the parent's positioner clips, and the hit
  test.
- Docs: preset README (overlay paragraph, menu), react-native README (presence, sheets), gap
  analysis menu row.

## Checks

- `omni run build test -p @pureform/core -p @pureform/preset -p @pureform/binding-core
-p @pureform/rn-adapter -p @pureform/react-native -p @pureform/panda-fixture`: pass.
- `bunx tsc --noEmit -p tsconfig.json` clean in core, preset, binding-core, rn-adapter,
  react-native, component-suites.
- component-suites `overlays.e2e.test.ts -t "Toast|shows a submenu whole"` on `react/css`,
  `solid/panda`, `react/tailwind`: 9 passed.
- browser-e2e-tests `rn-indication.e2e.test.ts -t "Sheet|Toast|Menu"`: 17 passed.
- New specs checked against the old code: the React Native refused-close and layer specs fail
  there; the submenu e2e's overflow check fails with the old preset.
- Snapshots changed: `new-components.spec.ts.snap` (menu `grouped`, toast root). No anatomy
  change, so `generated.ts` is untouched.

## Refactoring hints

- **Helpers that look generic:** `placement()` in `react-native/src/bottom-sheet/bottom-sheet.tsx`
  (splits a style into what places a view in its parent and what it draws); any wrapper view
  around a themed surface (a future draggable side sheet, a swipe wrapper) would want it.
- **Code that looks like a sibling's:** the frame-later "still open? settle back" check exists on
  the web (`sheet-drag.ts` `leave`) and React Native (`bottom-sheet.tsx`); different mechanisms
  (DOM `data-state` vs React state), not worth sharing.
- **Suggested home:** `placement()` in `react-native/src/parts.tsx` if a second user appears.
- **What must not change:** `presence.spec.tsx` "the overlay motions", the new overlays specs,
  `sheet-drag.spec.ts`, `toast.spec.ts`, the snapshots above, and the new component-suites tests.

## Open questions

- **React Native slide distance:** a sheet slides the window's height (width for the side sheet),
  not its own size as on the web, so a short sheet moves faster than on the web over the same
  spring. Using its own size needs its layout before the enter starts (a hidden first frame, or
  restarting the step once measured).
- **Toast exit:** CSS `scale` rather than `overlayShrinkOut`'s keyframes, for the reason above;
  the snackbar keeps the keyframes.
- **Grouped menu corners** use raw `:first-child`/`:last-child` rules, since core has no portable
  first/last condition; a group that isn't the first or last child (another element first) would
  keep its inner radius.
- **Refused close timing:** both platforms decide "refused" one frame after asking to close; an
  app that closes later than that (after an async confirm) sees the sheet settle back, then exit
  from rest.
- **Setup:** the fresh worktree's `omni run build`, and the `-f failed` rerun after the second
  install, also ran the two e2e suites' `test:e2e` tasks (they're in the build graph). They failed
  on that rerun (`browser-e2e-tests`, `component-suites`) before any f1c change; I didn't look
  into them or rerun them, since whole suites are the orchestrator's gate. Worth checking whether
  setup should pass `-p` or exclude e2e.
