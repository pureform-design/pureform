# c3b: Bottom sheet and side sheet (output context)

Commits: see `git log c57cab9..c3b-sheets` (preset, anatomy, binding-core, bindings, tests, docs).

## Built

- **Preset** (registered in `index.ts` and `pureform.ts`, 0 compounds each, so the preset's
  total is unchanged):
    - `bottomSheet` (`bottom-sheet.ts`): slots `root, dragHandle, content`. It sits on
      `surfaceContainerLow` at level 1. Its top corners take `radius("extraLarge")` through
      `runCorners`. It is at most 640 wide and centered with auto margins. `content` scrolls.
      `dragHandle` only centers what the bindings draw there. The `modal` group (`true`, the
      default, or `false`) sets the layer: `dialog` or `raised`.
    - `sideSheet` (`side-sheet.ts`): slots `root, header, backButton, headline, closeTrigger,
content, actions`, with structure `root: [header, content, actions]` and `header: [backButton,
headline, closeTrigger]`.
        - A standard sheet is square, on `surface` at level 0, at the `raised` layer.
        - `modal: true` (the default) sets `container` to `surfaceContainerLow`, level 1, the
          `dialog` layer, and `radius("large")` on the start corners (`runCorners(…, "inline")`).
        - `coplanar: true` sets the `base` layer. It is meant for a standard sheet; binding-core
          never selects both.
        - `actions` has a divider on its top edge (`borderBlockStart`, `outlineVariant`).
    - `dragHandle` (`drag-handle.ts`): slots `root` (a touch-sized transparent button with the
      focus ring only) and `handle` (a 32×4 `onSurfaceVariant` pill, `radius("full")`). The
      `orientation` group is horizontal or vertical (4×48, Compose's `VerticalDragHandle`).
    - `sheet.ts`: `SHEET_KEYFRAMES` (added to `pureform()`'s keyframes) and `sheetMotion(edge)`.
      The sheet slides in from its edge and fades. The side sheet has `…Rtl` keyframes picked with
      `when("rtl")`, and reduced motion fades. The timing is `long2` in and `medium1` out.
    - Specs: `sheets.spec.ts` (with snapshots), the `pureform.spec.ts` lists and the `contrast.ts`
      pairs.
- **Anatomy**: the generated `bottomSheetAnatomy`, `sideSheetAnatomy` and `dragHandleAnatomy`.
  `composites.ts` adds `bottomSheetOverlayAnatomy`, `sideSheetOverlayAnatomy`,
  `bottomSheetBackdropAnatomy`, `sideSheetBackdropAnatomy` and `compositeTestIds.{bottomSheet,
bottomSheetBackdrop, sideSheet, sideSheetBackdrop}`. The surface part is `content` (slot
  `root`), and **the preset's `content` slot is the `body` part** (`slot: "content"`).
- **Machine**: none new. Both sheets use zag `dialog` through `@pureform/machines/dialog`.
- **binding-core**:
    - `components/sheet.ts` holds:
        - `SheetBehaviorProps`, the dialog's behaviour props without `modal` and `role`.
        - The part, variant, root-own and content prop types for both sheets.
        - `BOTTOM_SHEET_*_PROPS` and `SIDE_SHEET_*_PROPS`.
        - `sheetModal`, `bottomSheetSelection` and `sideSheetSelection`.
        - `sheetMachineProps`: modal by default, and a click outside closes only a modal sheet.
        - `bottomSheetPositionerLayout` and `sideSheetPositionerLayout`.
        - `sheetContentLayout` and `sheetDragHandleLayout` (`touch-action: none`).
    - `components/drag-handle.ts` holds the drag handle's types, `DRAG_HANDLE_ROOT_PROPS` and
      `dragHandleSelection`.
    - `sheet-drag.ts` holds `dragToDismiss(handle, sheet, dismiss)`, exported from `/dom`. A drag
      past 25% of the height or a flick faster than 0.5 px/ms closes the sheet, and the click
      that ends a drag is swallowed.
    - `usage.ts` has entries for `bottom-sheet`, `side-sheet` and `drag-handle`.
- **Solid and React** (`src/bottom-sheet`, `src/side-sheet`, `src/drag-handle`, with exports,
  vite entries and registry fixtures):
    - `BottomSheet`: parts `Root, Trigger, Backdrop, Positioner, Content, DragHandle, Body`. The
      ready-made takes `trigger`, `dragHandle` (default on), `dragHandleLabel` ("Close sheet") and
      `body`.
    - `SideSheet`: parts `Root, Trigger, Backdrop, Positioner, Content, Header, BackButton,
Headline, CloseTrigger, Body, Actions`. The ready-made draws a back icon button only when
      given `onBack`, always a close icon button, and the actions row only when `actions` is
      given.
    - `DragHandle`.
    - New `BackIcon` in both bindings' `glyphs.tsx`.
    - Specs cover focus trap and restore, drag to dismiss, standard sheets, coplanar sheets and the
      back button.
- **React Native** (`src/bottom-sheet`, `src/side-sheet`, `src/drag-handle`):
    - A sheet with a trigger, `onOpenChange` or `defaultOpen` opens in a `Modal` over the `Scrim`,
      with its own `PortalHost`.
    - Otherwise the surface renders alone and shows with `open`.
    - The bottom sheet's handle closes it on a press, and on a release after dragging it down
      past a quarter of its height (PanResponder).
    - Specs are in `overlays.spec.tsx` and `components.spec.tsx`.
- **Suites**:
    - `tests/component-suites/src/components/{bottom-sheet,side-sheet,drag-handle}.ts`, plus the
      scene registrations.
    - A browser `sheets` screenshot (new and reviewed) from a new `panda-fixture` section.
    - Drag handle rows in the indication fixtures (`web.txt`, `native.txt`).
    - The three components in `rn-components.ts`.
- **Docs**:
    - The gap analysis: the §1.3 rows, §0.1 #8, §2.7, §3 (drawer), the §4.0 variant rows, and §7
      (three rows, plus "nothing removed").
    - READMEs: preset, anatomy, binding-core, solid, react, react-native and the component suites.

## Deviations from the design

- **zag `dialog`, not `drawer` (beta).** Adding `@zag-js/drawer` would mean a new catalog entry
  and lockfile churn alongside c3a and c3c. The dialog already does the modal behaviour
  (trap, restore, hide the page, scroll lock). The drag gesture is our own (`dragToDismiss`).
  There are no snap points or partial expansion.
- **`dragHandle` is a standalone component.** The bottom sheet's `dragHandle` slot only does
  layout, and the bindings render the `DragHandle` component there, as the full-screen dialog
  does with its icon-button close trigger.
- **The side sheet adds slots beyond the phase's list.** It has `headline`, `closeTrigger` and
  `content`, from the Android anatomy. Its divider is the `actions` row's top border, and
  `backButton`, `headline` and the actions are optional.
- **The sheets fade as they slide.** The overlays suite requires every overlay's enter to move
  and fade.
- **Bindings' `body` part.** The overlay names the preset's `content` slot `body` (see Built).
- **Solid always renders the backdrop.** A standard sheet's backdrop is kept hidden rather than
  left out, so server rendering stays stable. React leaves it out.
- **`modal` is not "given" in usage.** It defaults to on, so pruning keeps both of its values.

## Stubs and gaps

- React Native: the drag isn't followed while it happens (the sheet only closes on release, and
  no test covers it). Both sheets use the dialog's RN enter and exit, not a slide from their
  edge.
- No snap points, half-expanded state or predictive back. The side sheet's own drag to dismiss
  isn't built.
- The values are unconfirmed (m3.material.io can't be read):
    - bottom sheet: 640 max width and 72 px top room for a modal sheet;
    - side sheet: 360 width, 72 header, 24 padding, 12 button inset;
    - the handle's pressed or dragged growth isn't built.
- No demo screen uses the sheets.

## How to verify

What I ran, all targeted:

- `bunx tsc --noEmit -p tsconfig.json` in preset, anatomy, binding-core, solid, react,
  react-native and component-suites: clean.
- Unit tests: preset (734), anatomy (163), binding-core (479), solid (526), react (468),
  react-native (288), css-adapter (82), tailwind-adapter (50), panda-adapter (142) and
  rn-adapter (354) all pass.
- In `tests/component-suites`: `bunx vitest run --config vitest.config.e2e.ts -t
"BottomSheet|SideSheet|DragHandle"` gave 888 passed (every binding, target and suite,
  including direction, keyboard, overlays, server rendering, and static and runtime-seed
  themes).
- In `tests/browser-e2e-tests`, one file at a time: visual (35, the new `sheets` screenshot),
  direction, indication (fixtures updated on purpose, adding only the drag handle's rows),
  panda-factories, parity, reduced-motion, state-matching, icons, rn-parity, rn-indication and
  rn-motion all pass.
- `omni run build` at c57cab9 already failed on load-flaky e2e tasks (an RN `rows.spec`
  timing test and the indication suite under load). They weren't touched here.

## Notes for the next phases

- **Merge:**
    - Shared files: `preset/index.ts`, `pureform.ts` (an import, three components and
      `SHEET_KEYFRAMES` in `keyframes`), `pureform.spec.ts` and `contrast.ts`.
    - `anatomy/src/generated.ts`: rerun `generate`.
    - `composites.ts` (my block sits before the tabs') and `composites.spec.ts`.
    - `binding-core/index.ts`, `usage.ts` and `dom.ts`.
    - Each binding's `package.json`, `vite.config.ts`, registry fixtures and `glyphs.tsx`
      (`BackIcon` appended).
    - The component-suites lists, `panda-fixture/src/page.tsx` (a `sheets` section before
      `media`), the browser `visual` list and `rn-components.ts`.
    - The indication fixtures, and the gap analysis rows.
    - The §1.8 totals are left for the merge. After c3b: preset components +3 (bottomSheet,
      sideSheet, dragHandle), missing M3 components −2, and zag-covered −2.
- **Trap:** never spread Solid props into a helper (`{ ...props }`). It runs the `children`
  getter outside Root's context, and server rendering then throws "must be inside Root".
  `sheetMachineProps` reads them field by field.
- **Trap:** props set from a ref callback (inline styles) break the hydration suite. Render
  them as machine props instead (`sheetDragHandleLayout`).
- **Trap:** scene props that are functions (`onBack`) don't reach the server render. Keep them
  to the `opened` (client-only) examples.

## Refactoring hints

- **Helpers that look generic:**
    - `dragToDismiss` (binding-core `sheet-drag.ts`): any pane or c3c's search view could reuse
      it for drag to close. It's vertical only, so generalise it with an axis for side sheets.
    - `sheetMotion` / `SHEET_KEYFRAMES` (`preset/components/sheet.ts`): an edge slide with an
      rtl variant. It reimplements `overlay.ts`'s private `step` (reduced-motion fade). Fold it
      into `overlayMotion` by letting a motion take an `rtl` keyframe name.
    - `dragHandle` is ready for c4's panes and the search view.
- **Code that looks like a sibling's (for r3):**
    - Solid and React `bottom-sheet.tsx` and `side-sheet.tsx` repeat `dialog.tsx` part for part:
      `Root` (useControllable, useMachine on the dialog, presence, `stackPositioner`), `Trigger`,
      `Backdrop` (with the same `backdropTestId`/`backdropUnstyled` helpers, copied a third and
      fourth time), `Positioner`, `Content`, `Headline`, `Body`, `CloseTrigger` and `Actions`.
      The full-screen dialog is a fifth copy.
    - React Native `bottom-sheet.tsx` and `side-sheet.tsx` repeat `ModalDialog` and
      `ModalFullscreenDialog`: Modal, PortalHost, `useDismiss`, presence and the scrim.
    - binding-core `SHEET_BEHAVIOR_PROPS` repeats the tail of `DIALOG_ROOT_PROPS`.
    - `backdropTestId`/`backdropUnstyled` (a part-key-to-`root` remap) could be one helper in
      binding-core `parts.ts`.
- **Suggested home:**
    - A dialog-parts factory in each binding (`src/dialog-parts.tsx` at the top of `src/`, since
      `usage.spec` counts sibling-subpath imports), taking the overlay anatomy, backdrop anatomy,
      selection, root-prop keys and positioner layout.
    - The RN modal chrome as a `useModalOverlay` in `overlay.tsx`.
    - `DIALOG_BEHAVIOR_PROPS` in binding-core's `dialog.ts`, shared with the sheets.
- **What must not change:**
    - `__snapshots__/sheets.spec.ts.snap` and the `sheets` screenshot.
    - The indication fixtures' `dragHandle` rows.
    - The component suites' `BottomSheet`/`SideSheet`/`DragHandle` cases, and the Solid and React
      sheet specs (focus trap and restore).

## Open questions

- Is zag `dialog` enough, or should the bottom sheet move to zag `drawer` for snap points and a
  half-expanded state once drawer is out of beta?
- Should `modal` default to on? I picked modal because it's the common web use. Compose's
  default bottom sheet is modal too, but the side sheet's Android default is standard.
- Is two booleans (`modal`, `coplanar`) right for the side sheet, as the gap analysis lists, or
  should it be one `variant: standard | modal | coplanar` group, which can't be contradictory?
- The sheet sizes and paddings above are unconfirmed, and so is the side sheet's
  `onSurfaceVariant` headline.
- Should the bottom sheet's drag handle close the sheet, or toggle between partial and full
  heights as Compose's does, once there's a partial state?
