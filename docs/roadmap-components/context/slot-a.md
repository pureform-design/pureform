# slot-a: slot-props standard, Button parts, backdrop

Branch `slot-a`, from `main` (b39bba33). First of five batches (a-e).

## What was done

1. **Docs.** The standard is in `docs/design/component-architecture.md` (§9.3, "Per-part props of
   ready-made components", and a tokens note at the end of §5.5), in
   `docs/roadmap-components/conventions.md` ("Slot props"), and the batches a-e are in
   `docs/roadmap-components/README.md`.
2. **Button/IconButton parts.** Confirmed with a test that `className={{ trigger: "x" }}` on a
   Dialog never reached the trigger's `<button>`. Cause: the part's plain `className`/`style` were
   passed to the nested Button, which reads them keyed by its own parts and skips plain values.
   A first fix (wrapping them as `{ root: … }`) was undone by `combinePartProps`, which joins a
   part's `className` with the registry's before the Button sees it, so `asRoot` (in
   `react/src/parts.tsx`, `solid/src/parts.tsx`) moves them into `slotProps.root` instead, which
   the Button keys itself. Applied at every `as={Button}` / `as={IconButton}` site in both
   bindings (triggers; dialog, sheet and fullscreen close, back and confirm; date picker, docked
   picker and date input mode toggle, prev, next; paginator triggers).
3. **Backdrop.** `SlotKeyedProps<A, Extra>` takes extra part keys; Dialog, BottomSheet, SideSheet
   and DatePicker use `"backdrop"`, so `className`/`class`, `style` and `slotProps` take a
   `backdrop` key, spread onto `<Backdrop>`. No anatomy change: the scrim stays the scrim
   anatomy's `root` (`partAsRoot` for `testId`/`unstyled`, as before). React Native: `testId`
   takes `backdrop` on Dialog, BottomSheet and SideSheet (`ModalScrimLayer`'s `scrimTestId`).

## Tests

- React/Solid `dialog.spec.tsx`: trigger and backdrop `className`/`class`, `style`, `slotProps`.
- React/Solid `date-picker.spec.tsx`: prev/next IconButton and backdrop.
- React Native `overlays.spec.tsx`: dialog `testId.backdrop`.
- Ran: `omni run build test -p` react, solid, react-native (two unrelated timing flakes,
  FAB menu stagger and indeterminate progress, passed on rerun); storybook story files Dialog,
  DatePicker, Button (and their siblings) on solid, react, native; `overlays.e2e.test.ts -t
Dialog` on `solid/css` and `react/css`; `tsc` clean in the three packages.

## Not done / for later batches

- **DatePicker Cancel/Confirm** (and DateInput's) are not anatomy parts, so no part key can reach
  them; they need `cancelButtonProps` / `confirmButtonProps` (batch c).
- Backdrop `tokens`/variants: the scrim's selection is still `{}`. React Native's DatePicker has
  no `testId` prop, so no backdrop id there. React Native has no `style`/`slotProps` yet (batch d).
- No e2e run for BottomSheet/SideSheet; they share the code path of the Dialog.

## Refactoring hints

- **Helpers that look generic:** `asRoot` (both `parts.tsx`) and the `Extra` generic on
  `SlotKeyedProps`/`useSlotProps`/`createSlotProps`. Batch c's `<component>Props` for drawn
  Buttons should replace `asRoot` where it can.
- **Code that looks like a sibling's:** `asRoot` is written twice (React, Solid), as the two
  bindings' `parts.tsx` are; the Solid version uses getters over `merge`/`omit`.
- **Suggested home:** `asRoot` stays per binding; the platform-neutral types go to binding-core
  `parts.ts` (`InnerProps`, `overDefaults`) in batch b.
- **What must not change:** `dialog.spec`, `date-picker.spec` in react/solid, `overlays.e2e`
  Dialog tests, and the story files above.

## Open questions

- Is `slotProps.root` the right route for the Button's root, or should Button/IconButton accept
  plain `className` strings itself? Kept: it needs no Button change.
- `style` merging order: the part's `style` and the Button's own `style.root` both apply, the
  Button's own last.
