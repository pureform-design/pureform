# fix-layout: Storybook layout fixes (output context)

Branch `fix-layout`, from main `40365fe1`. Commits: `git log 40365fe1..fix-layout`. Not pushed;
main untouched.

## Per issue

### 1. Bottom sheet looks broken without its drag handle

- **Cause (component, all targets):** the preset's `content` slot had inline and bottom padding
  only; its top room came from the 48px drag handle. With `dragHandle={false}` the body sat
  against the rounded top edge. The case's "without a drag handle" example was a *closed*
  example, so Storybook only showed it after a click. On React Native the stories showed no body
  at all, with or without the handle: the case passes `body`, and React Native's sheets and
  dialogs take `children` (story/renderer cause).
- **Fix:** a `dragHandle` variant group on `bottomSheet` (`true`/`false`, 0 compounds); `false`
  gives `content` `paddingBlockStart` from a new token `contentPaddingStart` (`spacing.6`, 24px,
  matching the bottom padding). `dragHandle` moved from `BottomSheetContentProps` to
  `BottomSheetVariantProps` (so to `BOTTOM_SHEET_ROOT_PROPS`), and `bottomSheetSelection` gives
  it; React's and Solid's ready-made pass it to Root (a composed sheet without `DragHandle` sets
  it on Root). React Native's ready-made already had it in its props. The case now has an opened
  `"without a drag handle"` rendering. `@pureform/react-native/storybook`'s `args` give `body` as
  `children` when no children are given.
- **Spec:** Compose `ModalBottomSheet(dragHandle: (@Composable () -> Unit)? =
  { BottomSheetDefaults.DragHandle() })` (androidx `material3/ModalBottomSheet.kt`): the handle is
  optional and the sheet adds no padding of its own; pureform's ready-made body has its own
  padding, so it takes the top padding too.
- **Tests:** preset `sheets.spec.ts` (variant, defaults, snapshot), binding-core
  `components/sheets.spec.ts`, React/Solid `bottom-sheet.spec.tsx` (class and the `false`
  variant), component-suites `bottom-sheet.e2e.test.ts` (body padding 24px, flush with the
  surface's top), React Native `storybook/storybook.spec.ts`.

### 2. FabMenu shows its menu outside the viewable area (React, Solid)

- **Cause (story):** the list sits above the FAB (`insetBlockEnd: 100%`), as Compose's
  `FloatingActionButtonMenu` stacks its items over the button for a FAB at the screen's bottom
  end. The suites place it there (`overlay.place` in the case); the stories drew it at the
  canvas's top-left, so the list opened above the frame.
- **Fix:** `apps/storybook-web`: `parameters.pureform.place: "bottom-end"` (FabMenu in
  `stories.config.ts`) makes `withHeight` (`src/hooks.ts`) lay the canvas frame out as a column
  ending at the bottom end; `compose.ts` now merges `pureform.height` into a component's own
  `pureform` parameters instead of replacing them. `src/fab-menu.hooks.ts` gives the opened
  stories a play that checks the list is inside the canvas.
- **Spec:** androidx `material3/FloatingActionButtonMenu.kt` (items above the button, meant for
  the `Scaffold`'s FAB slot at the bottom end).
- **Tests:** the story tests for `FabMenu.stories.ts` (44 pass with `BottomSheet.stories.ts`).

### 3. React Native: a Menu with `defaultOpen` isn't anchored to its button

- **Cause (component):** `useAnchor` measured only a view the trigger's interaction source had
  seen (press, hover, focus). Open from the start, nothing had interacted, so the anchor was
  `undefined` and the menu drew unanchored. Same for the FAB menu, popover and tooltip.
- **Fix:** `NativeInteraction.handlers` gains `onLayout`, which records the surface's view for its
  source (`locatedView`, `subscribeLocated` in `interaction.ts`). `useAnchor` falls back to it.
  `useMeasuredAnchor` (`overlay.tsx`, used by `useAnchoredOverlay` and the tooltip) measures
  again once the trigger is laid out if the first measure found nothing.
- **Tests:** React Native `overlays.spec.tsx` "opens against its trigger with defaultOpen, before
  any interaction" (fails without the fix).

### 4. Side sheet: is it really not draggable?

- **Answer:** it should drag. MDC-Android `docs/components/SideSheet.md`: "Modal side sheets can
  be dragged horizontally and dismissed by sliding them off of the screen"; `SideSheetBehavior`'s
  `behavior_draggable` defaults to `true`. Compose Material 3 has no side sheet (its
  `ModalNavigationDrawer` drags to close too).
- **Fix:** binding-core `sideSheetRelease({ offset, velocity, width })` and
  `SIDE_SHEET_VELOCITY_THRESHOLD` (`components/sheet.ts`), after `SideSheetBehavior.
  calculateTargetStateOnViewReleased`: moving back in stays open; moving out closes once faster
  than `SIGNIFICANT_VEL_THRESHOLD` (500px/s) or at least halfway out (`isReleasedCloseToInnerEdge`),
  else settles back; still, the nearer. `/dom`'s `sideSheetDragToDismiss(sheet, rtl, dismiss,
  onClose?, asker?, draggable?)` (`side-sheet-drag.ts`) uses `createDragVelocity`,
  `swallowNextClick` and `settleTransition`, like `dragToDismiss`. Touch and pen only, mostly
  sideways past 8px; `touch-action: pan-y` keeps vertical scrolling native; each open resets the
  offset; `onClose` is asked through the overlay's asker. The preset's side sheet root gets
  `transition: SHEET_SETTLE`. React and Solid wrap `Content` to attach it (a coplanar sheet
  doesn't drag). React Native: the modal sheet's surface is wrapped in an `Animated.View`
  (`SideSheetDrag`) with a `PanResponder` that captures only mostly-sideways moves, and settles
  with `settle()` on `spatialDefault`.
- **Tests:** binding-core `side-sheet-drag.spec.ts`, component-suites `side-sheet.e2e.test.ts`,
  React Native `overlays.spec.tsx` "drags a modal side sheet toward its edge …".

### 5. React and Solid ListItem doesn't take its size

- **Cause (component):** an interactive list item is a `<button>`, which sizes to its content
  even with `display: flex`; inside a `List` the `li` (a flex column) stretched it, standing
  alone it didn't.
- **Fix:** `listItem` root `width: 100%` (the reset's `border-box` keeps the padding inside).
- **Spec:** androidx `material3/ListItem.kt` `calculateWidth`: with a bounded width the item takes
  `constraints.maxWidth`.
- **Tests:** preset snapshot; component-suites accessibility/direction for ListItem; visual
  `lists`, `nested-rows`, `row-colors`, `expandables`, `density` unchanged.

### 6. TimeInput and TimePicker stretch across the whole area (all targets)

- **Cause (component):** the shared `timeSlots` root was `display: flex` (block-level), and on
  React Native a view stretches across its column.
- **Fix:** preset root `display: inline-flex`; React Native roots through `inFlowInline`
  (`styles.ts`): `alignSelf: "flex-start"` unless the style sets one, and `display: inline-flex`
  on React Native Web.
- **Spec:** Compose `TimePicker`/`TimeInput` (androidx `material3/TimePicker.kt`) take
  `modifier: Modifier = Modifier`, sized by their content; MDC's time picker is `wrap_content`.
- **Tests:** preset snapshot, React Native `time-picker.spec.tsx` "keeps its own width…"; visual
  `time-pickers` unchanged.

### 7. React Native Badge stretches

- **Cause (component, React Native):** `inline-flex` lowers to `flex`; a view stretches across a
  column (and in Storybook's block canvas, React Native Web's `flex` div fills the line).
- **Fix:** the badge in flow goes through `inFlowInline`; anchored, it's absolute and untouched.
- **Tests:** React Native `components.spec.tsx` "badge … keeps its own size" (fails without it).

## Built

- binding-core: `sideSheetRelease`, `SIDE_SHEET_VELOCITY_THRESHOLD`, `/dom`
  `sideSheetDragToDismiss`; `BottomSheetVariantProps.dragHandle`.
- preset: `bottomSheet` `dragHandle` variant and `contentPaddingStart` token; `sideSheet` root
  settle transition; `timeSlots` root `inline-flex`; `listItem` root `width: 100%`.
- react-native: `PressableHandlers.onLayout`, `locatedView`/`subscribeLocated`
  (`interaction.ts`), `useMeasuredAnchor` (`overlay.tsx`), `inFlowInline` (`styles.ts`),
  `SideSheetDrag`, storybook `args` body → children.
- storybook-web: `parameters.pureform.place`, `src/fab-menu.hooks.ts`.

## Deviations from the design

- `dragHandle` is now a Root (variant) prop of the bottom sheet, not only the ready-made's.
- The side sheet drags with touch and pen only on the web; MDC is touch-only, and a mouse drag
  would take text selection away.

## Stubs and gaps

- A coplanar side sheet doesn't drag (MDC's coplanar sheet squeezes its sibling as it drags;
  pureform's would need the sibling's layout to follow the translate).
- React Native's standard (non-modal) side sheet surface doesn't drag; only the modal one does.

## How to verify

- `omni run build test -p @pureform/binding-core -p @pureform/preset -p @pureform/react
  -p @pureform/solid -p @pureform/react-native -p @pureform/component-cases -p @pureform/anatomy`
- From `tests/component-suites` (after `omni run generate prepare -p @pureform/panda-fixture`):
  `bunx vitest run -c vitest.config.e2e.ts src/side-sheet.e2e.test.ts
  src/bottom-sheet.e2e.test.ts --project "solid/panda" --project "react/css"`, and
  `src/accessibility.e2e.test.ts src/direction.e2e.test.ts src/overlays.e2e.test.ts` with
  `-t "BottomSheet|SideSheet|ListItem|TimePicker|TimeInput|FabMenu"` on `solid/panda`,
  `react/css`, `react/tailwind` (447 pass).
- From `tests/browser-e2e-tests`: `bunx vitest run -c vitest.config.e2e.ts
  src/visual.e2e.test.tsx -t "(lists|time-pickers|sheets|badges|split-buttons-and-fab-menus|nested-rows|row-colors|expandables|density) looks"`
  (no screenshot changed; none re-recorded).
- `omni run build -p @pureform/storybook-web`; story tests:
  `bunx vitest --config ./vitest.config.storybook.ts run src/stories/generated/FabMenu.stories.ts
  src/stories/generated/BottomSheet.stories.ts`.

## Notes for the next phases

- `@pureform/react-native` `components.spec.tsx`'s splitter tests ("rests where it's let go
  without anchors…", and under load "grows its pill while dragged…") fail when the whole file
  runs, on main too (checked by running main's `src`); they pass alone. Not touched here.
- `bunx tsc --noEmit` in `apps/storybook-web` and `tests/component-suites` reports errors only in
  `packages/solid/dist/*.jsx` (checked JS of the built output), not in their sources; the touched
  packages' own type checks are clean.
- Running `bunx oxfmt` over whole `src` directories reformats a few files main leaves
  unformatted (`preset/src/pureform.ts`, the select field parts, the date pickers, the suites'
  scenes); format only the files you touch.

## Refactoring hints

- **Helpers that look generic:** `inFlowInline` (`react-native/src/styles.ts`) is what every
  React Native root the web draws `inline-flex` would want (buttons, chips, icon buttons, the
  FAB still stretch in a React Native column). Doing it in rn-adapter's lowering of
  `display: inlineFlex` would cover them all, at the cost of every native style fixture.
- **Code that looks like a sibling's:** `sideSheetDragToDismiss` repeats `dragToDismiss`'s
  release/ask/settle shape on the other axis without partial rests; React Native's
  `SideSheetDrag` repeats the bottom sheet's `latestDismiss`/`left` pattern. r3 already noted
  "`dragToDismiss` with an axis" waiting for a second user: this is it.
- **Suggested home:** an axis option on `binding-core/src/sheet-drag.ts`, and a shared React
  Native hook in `react-native/src/bottom-sheet` → `react-native/src/sheet-drag.ts`.
- **What must not change:** `sheets.spec.ts` snapshots, `bottom-sheet.e2e.test.ts`,
  `side-sheet.e2e.test.ts`, `side-sheet-drag.spec.ts`, the `sheets` screenshot.

## Open questions

- The drag-handle-less body padding is 24px (the bottom padding's value); M3 gives no number for
  a sheet without a handle.
- Should the side sheet also drag with a mouse on the web? Left off for text selection.
- React Native components besides the badge and time pickers still stretch in a column (see the
  hint above); widen `inFlowInline` to every inline root, or leave buttons stretching as React
  Native's own do?
- `PressableHandlers` gained `onLayout`; a component that spreads the handlers and sets its own
  `onLayout` after keeps its own (the tabs do), so its source isn't located.
