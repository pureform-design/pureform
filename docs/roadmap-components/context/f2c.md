# f2c: Overlays (output context)

Branch `f2c-overlays`, from main `fdbae596`. Commits are listed by
`git log fdbae596..f2c-overlays`; this file is in the last one.

| Commit     | What                                                                                    |
| ---------- | --------------------------------------------------------------------------------------- |
| `4eae67e3` | feat(menu): the machine marks a menu's first and last groups (`data-first`/`data-last`) |
| `f74e748a` | feat(toast): exits with `overlayShrinkOut`, which now animates the `scale` property     |
| `cbf3f53e` | test(react-native): the bottom sheet drag flake (one move per task, after layout)       |
| `b8d2e2b0` | feat(bottom-sheet): `onClose`, which may answer with a promise (web and React Native)   |
| `590407cc` | feat(react-native): sheets slide by their own measured size                             |

## What changed

- **Flaky test** (React Native `overlays.spec.tsx` "settles a dragged bottom sheet back when the
  app keeps it open"). It failed with `asked = []`: the release was never read as a dismissing
  drag. Two timings caused this:
    - React Native Web's `PanResponder` takes a move's distance over the time since the last
      move. The test sent all four `mousemove`s in one tick, and moves that share a timestamp
      are dropped, so the drag's distance depended on how the clock ticked. (A new test that
      sent the moves from a fixed origin failed every time.)
    - The sheet decides "past a quarter of its height" from `onLayout`, which React Native Web
      reports through a `ResizeObserver` (next frame) and then `UIManager.measure`
      (`setTimeout`). The test dragged right after mounting, so under load the height could
      still be 0.

    Fix: a `dragDown(handle, moves)` helper sends each move as its own task from a fixed origin,
    and a new `laidOut(element)` in `testing/render.tsx` waits for React Native Web's layout
    report. The component no longer uses `requestAnimationFrame` to decide that a close was
    refused (that could stall in a hidden tab). It sets state after asking to close, and an
    effect settles the sheet back if it is still `shown` after that render commits. React batches
    the app's `onOpenChange` update into the same render.

- **React Native sheets slide by their own measured size** (`react-native/src/presence.ts`):
    - `useOverlayPresence` measures the moving view for the motions that move by a share
      (`SIZED`: `bottomSheet`, `sideSheet`). `presence.props` now includes an `onLayout`, and the
      bottom sheet's own `onLayout` calls it.
    - The enter waits for the first measurement. Until then the view is unseen (`opacity: 0`), so
      no engine shows a frame based on the window's size.
    - Each step keeps the size it started with (`held`), so a sheet that grows mid-motion doesn't
      restart its step.
    - `OverlayMove`'s `share` is now a share of the overlay's own size.
- **Toast exit** (`preset/src/components/toast.ts`, `overlay.ts`):
    - `overlayGrowIn` and `overlayShrinkOut` now animate the CSS `scale` property instead of
      `transform: scale()`. `scale` composes with an overlay's own transform, here the transform
      Zag stacks a toast with.
    - The toast's `&[data-state=closed]` runs `overlayShrinkOut` on `POPUP_MOTION.exit`'s spring
      (`forwards`; `none` under reduced motion).
    - Its own CSS `scale: 0.8` rule and the `scale` tween are removed.
    - All three targets emit `@keyframes overlayShrinkOut{0%{scale:1}to{scale:.8}}`; I checked
      the react, tailwind and css demo builds.
    - React Native was already on `overlayShrinkOut` (`usePresence(open, "popup")`).
- **Grouped menus** (`machines/src/menu.ts`, preset `menu.ts`, React and Solid `menu.tsx`):
    - The machine's `connect` overrides `getItemGroupProps({ id, first?, last? })` and adds
      `data-first`/`data-last`. The menu's `Api` type is re-exported with that signature.
    - The ready-made menus pass `first`/`last` from the group's index. The composed `ItemGroup`
      takes `first`/`last` props.
    - The preset matches `&[data-first]`/`&[data-last]` instead of `:first-child`/`:last-child`,
      so loose items before the groups no longer break the corners.
- **Async close** (`binding-core` `BottomSheetCloseProps.onClose`, in `BottomSheetRootOwnProps`
  and `BOTTOM_SHEET_ROOT_PROPS`; React Native's `BottomSheetProps`):
    - `onClose` is asked when a drag on the handle would close the sheet. It returns
      `boolean | Promise<boolean>`: `true` closes, and `false` (or a rejection) springs the
      sheet back.
    - For a promise, the sheet holds where it was let go until the promise settles.
    - An answer that arrives after another drag starts, or after the sheet unmounts, is ignored
      (an `asking` counter).
    - Web: `dragToDismiss(handle, sheet, dismiss, onClose?)`. React reads Root's latest props
      through a ref, and Solid reads its props proxy.
    - React Native: `latestDismiss` in `bottom-sheet.tsx`.
    - After `true`, the existing "the app kept it open" check still applies.
- Docs: READMEs for preset (overlay paragraph, menu), react-native (sheets, presence), react,
  solid, binding-core and machines; `component-architecture.md` (keyframes); gap analysis
  (menu row, bottom sheet row).

## Checks

- Fresh setup: `bun install`, `omni run build` (passed). Then
  `omni run generate prepare -p @pureform/panda-fixture`, which the e2e config needs (the
  fixture's `build` is disabled).
- `omni run build test -p @pureform/machines -p @pureform/preset -p @pureform/binding-core -p
@pureform/react -p @pureform/solid -p @pureform/react-native`: pass, after the last commit.
- `bunx tsc --noEmit -p tsconfig.json`: clean in machines, preset, binding-core, react, solid,
  react-native and component-suites.
- component-suites `overlays.e2e.test.ts -t "Toast|submenu whole"` on `react/css`,
  `solid/panda` and `react/tailwind`: 9 passed.
- browser-e2e-tests `rn-indication`, `rn-parity` and `reduced-motion`, filtered to
  sheet/toast/menu/overlay: 17 passed.
- React Native `overlays.spec.tsx` "the sheets" 3 times in a row, and the whole file: pass.
- New tests:
    - binding-core `sheet-drag.spec.ts`: `onClose` false, a held promise, and a stale answer.
    - react-native `overlays.spec.tsx` "holds a dragged bottom sheet until onClose answers…".
    - react-native `presence.spec.tsx` "slides a bottom sheet by its own height" (both engines).
      On the old `presence.ts` it fails: the bottom sheet moved about 730px, against a sheet
      height of 92px.
- During one `-p` run, react-native `tab-indicator.spec.tsx` "slides when a controlled value
  changes…" (animated) failed once. It passes alone (27/27). It times a slide and is unrelated
  to f2c.
- Snapshots changed: `new-components.spec.ts.snap` (the menu's `grouped` selectors, the toast
  root's closed rule and transition). No anatomy change.

## Refactoring hints

- **Helpers that look generic:**
    - `laidOut(element)` (react-native `testing/render.tsx`): any React Native spec that reads
      what a view measured should use it instead of waiting a fixed time.
    - `dragDown` in `overlays.spec.tsx`: a swipe or slider spec on React Native Web wants the
      same "one move per task" driver. Move it to `testing/render.tsx` when it gets a second
      user.
- **Code that looks like a sibling's:**
    - The `onClose` answer handling (`asking` counter, boolean or promise) is written twice:
      `binding-core/sheet-drag.ts` `leave` and react-native `bottom-sheet.tsx`
      `latestDismiss`. A small `askToClose(answer, yes, no)` in binding-core could serve both.
      React Native would need it from the root entry, not `/dom`.
    - The web still decides "refused" one `requestAnimationFrame` after asking. React Native now
      uses a post-commit effect.
- **Suggested home:** `askToClose` in `binding-core/src/components/sheet.ts`.
- **What must not change:** the snapshots above; `sheet-drag.spec.ts`; `presence.spec.tsx`
  ("the overlay motions", own height); the overlays specs; the component-suites Toast/Menu
  e2e.

## Open questions

- **`onClose` scope:** it is only asked for a drag on the handle. A press on the handle, the
  scrim, or Escape go through Zag (web) or `close` (React Native) as before. Gating every close
  would mean intercepting Zag's `onEscapeKeyDown`/`onInteractOutside`, or a controlled `open`.
  Worth deciding whether `onClose` should cover them.
- **Popup keyframes on `scale`:** every popup (menu, select, tooltip, snackbar) now grows and
  shrinks with the `scale` property. It looks the same unless the element has its own transform,
  in which case the two now compose. Screenshots of popups at rest are unaffected. I didn't run
  the visual suite.
- **Composed menus:** `first`/`last` on `ItemGroup` is the app's job when composing. Without
  them, a composed grouped menu keeps inner radii at the ends. The machine can't see group order
  from `connect`.
- **React Native sized enter:** a sheet stays unseen until its first `onLayout`, one frame plus
  a task on React Native Web. Reopening uses the last measured size.
- The web's refusal check is still one frame after asking (`requestAnimationFrame`), as in f1c.
  React Native's is now post-commit.
