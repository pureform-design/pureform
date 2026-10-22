# m3d: `onClose` on the other sheets (output context)

Branch `m3d`, from main `a94bbe0b`. Commits (`git log a94bbe0b..m3d`):

| Commit     | What                                                                                           |
| ---------- | ---------------------------------------------------------------------------------------------- |
| `c067f6c5` | feat(binding-core): `DialogCloseProps`, `SideSheetCloseProps`; `onClose` in the root-prop keys |
| `5bdcbffb` | feat(react,solid): `onClose` on the three; `dialogParts` gains `closeTrigger`                  |
| `757ca435` | feat(react-native): `onClose` on the three                                                     |
| `4f47d530` | test: each way of closing, refused and allowed                                                 |
| (docs)     | docs: the binding READMEs and binding-core's                                                   |

This file is the last commit. The README tick is left to the merge.

## Done

- **binding-core:** `DialogCloseProps` (`dialog.ts`) for the dialog and the full-screen dialog,
  `SideSheetCloseProps` (`sheet.ts`) for the side sheet, each `onClose?: CloseQuestion`, the same
  doc as the bottom sheet's. `onClose` joins `DIALOG_ROOT_PROPS`, `FULLSCREEN_DIALOG_ROOT_PROPS`
  and `SIDE_SHEET_ROOT_PROPS` (kept off the element). Exported from the root entry.
- **Web (React, Solid):** `dialogParts` already asked `onClose` for Escape and a press outside
  (f2); each component now passes `onClose: (props) => props.onClose`. New `chrome.closeTrigger(key,
display)` builds a close trigger that, with an `onClose`, replaces Zag's close click with
  `requestClose` (the bottom sheet's handle does the same); the dialog's, full-screen dialog's and
  side sheet's `CloseTrigger` use it. `BackButton` and `ConfirmAction` don't close by themselves,
  so they don't ask.
- **React Native:** `useModalOverlay` already took `onClose`; the three props now accept it
  (`DialogCloseProps`/`SideSheetCloseProps`) and keep it off the surface. Its `close` (scrim,
  Escape, back button, the close icon button, the `close` that `actions`/`confirmAction` get) asks
  through the shared `closeAsker`. As a surface alone (no trigger/`onOpenChange`) `onClose` is
  ignored: nothing closes by itself there.
- **Controlled `open` doesn't ask**, by design, tested and documented.
- **Deprecated options:** these three components have none, so nothing was removed.
- **Docs:** React, Solid, React Native and binding-core READMEs.

## Tests

- React and Solid (`dialog`, `fullscreen-dialog`, `side-sheet` specs): Escape, the scrim (not the
  full-screen dialog, which has none) and the close trigger are each refused (`onOpenChange` not
  called, still open), then the close trigger allowed; a controlled `open` closing doesn't ask.
- React Native `overlays.spec.tsx`: the same refused-then-allowed run for the three, on Escape, the
  scrim and the close control.
- Promise answers and the stale-answer rules stay covered by binding-core's `closeAsker` specs and
  the bottom sheet's tests.

## Verification

- Fresh worktree: `bun install`, `omni run build`.
- `omni run build -p` binding-core, react, solid, react-native; `omni run test -p`
  `@pureform/binding-core`, `@pureform/react`, `@pureform/solid`, `@pureform/react-native`: all
  passed except react-native's snackbar "holds while the pointer is over it, and closes by its
  action" with reanimated, the known load flake (not touched by this change; not rerun).
- E2E: `omni run generate prepare -p @pureform/panda-fixture`, then from `tests/component-suites`
  `bunx vitest run -c vitest.config.e2e.ts src/overlays.e2e.test.ts --project solid/css --project
react/css -t "Dialog|Sheet"`: 24 passed, 72 skipped.
- `bunx tsc --noEmit -p tsconfig.json` clean in binding-core, react, solid, react-native.
- No conflict markers.

## Refactoring hints

- **Helpers that look generic:** `chrome.closeTrigger` (React `dialog-parts.tsx`, Solid
  `dialog-parts.tsx`) and the bottom sheet's `DragHandle` both write "replace Zag's close click
  with `requestClose` when there's an `onClose`". Suggested home: one binding-core helper
  `closeProps(close, onClose, requestClose)` next to `askingDismissProps` in `components/sheet.ts`.
- **Code that looks like a sibling's:** `DialogCloseProps`, `SideSheetCloseProps` and
  `BottomSheetCloseProps` carry the same member and nearly the same doc; one `OverlayCloseProps`
  (with a `Controlled open` note) would serve all three and `CloseQuestion` could move to
  `dialog.ts` to avoid `dialog.ts` importing a type from `sheet.ts`.
- **What must not change:** the bottom sheet's specs, `closeAsker`/`askingDismissProps` specs,
  the overlays e2e.

## Open questions

- A close trigger with `onClose` skips Zag's own close click handler (so Zag's `onOpenChange`
  runs only after the answer); an app `onClick` passed to it still runs first, as on the
  bottom sheet's handle.
- In React Native, a surface alone ignores `onClose` (nothing closes by itself); say if it
  should still be accepted silently, as now, or rejected by the types.
- The `Dialog` ready-made has no close trigger of its own (only `actions`), so on the web an
  app's own `Cancel` button must be a `Dialog.CloseTrigger` to ask `onClose`.
