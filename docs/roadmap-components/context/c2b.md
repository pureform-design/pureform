# c2b: Dialog and full-screen dialog (output context)

Commits: see `git log 8dc8065..c2b-fullscreen-dialog` (preset, anatomy, binding-core, bindings,
tests, docs).

## Built

- **Preset** (`packages/preset/src/components/fullscreen-dialog.ts`, registered in `index.ts`
  and `pureform.ts`): `fullscreenDialog`, slots `root, header, closeTrigger, headline,
confirmAction, body`, structure `root: [header, body]`, `header: [closeTrigger, headline,
confirmAction]`. Tokens `container` (surface), `headlineColor`, `bodyColor`, `headerHeight`
  (56), `headerPadding`, `headerGap`, `bodyPadding`. It has no variants (0 compounds; the preset
  total is unchanged), no radius (square), no icon, no actions row. `root` is a column that fills
  its container (`flexGrow 1`, width 100%), at the `dialog` layer with `DIALOG_MOTION`; `header` is
  a row; `headline` takes the free width; `body` grows and scrolls (`overflow: auto`, which
  React Native drops). `closeTrigger` and `confirmAction` are styled only with `flexShrink: 0`.
  Specs: `new-components.spec.ts` (slots, structure, square, no variants, snapshot), the
  `pureform.spec.ts` component lists, `contrast.ts` (headline and body against the container).
- **Dialog** (`dialog.ts`): unchanged. Nothing was shared enough to move into it (see hints), and
  it has no deprecated options.
- **Anatomy**: generated `fullscreenDialogAnatomy` (scope `fullscreen-dialog`, test ids
  `pf-fullscreen-dialog-*`); hand-written `fullscreenDialogOverlayAnatomy` and
  `compositeTestIds.fullscreenDialog` in `composites.ts` (unstyled `root`, `trigger`,
  `positioner`; the surface as `content` with slot `root`; `header`, `closeTrigger`, `headline`,
  `confirmAction`, `body`, all styled). It is in the drift test in `composites.spec.ts`. No
  backdrop part.
- **Machine**: none new. Zag's dialog through `@pureform/machines/dialog` (the existing wrapper:
  it skips the layer mirror on the positioner).
- **binding-core** (`components/fullscreen-dialog.ts`, exported from `index.ts`):
  `FullscreenDialogPart`, `FullscreenDialogVariantProps` (`tokens`), `FullscreenDialogRootOwnProps`
  (the dialog's `DialogBehaviorProps` plus `testId`, `unstyled`, `tokens`),
  `FULLSCREEN_DIALOG_ROOT_PROPS`, `FullscreenDialogContentProps`/`FULLSCREEN_DIALOG_CONTENT_PROPS`
  (`trigger`, `closeLabel`, `closeIcon`, `headline`, `confirmAction`, `body`),
  `fullscreenDialogSelection`, `fullscreenDialogPositionerLayout(present)` (fixed, `inset: 0`,
  flex, `align-items: stretch`, no padding). The machine props are the dialog's
  `dialogMachineProps`. `usage.ts` gains `fullscreen-dialog` (entries `fullscreenDialog`,
  `button`, `iconButton`, `ripple`).
- **Solid and React** (`src/fullscreen-dialog/`, subpath `@pureform/<binding>/fullscreen-dialog`,
  `package.json` exports, `vite.config.ts`, registry fixtures): `FullscreenDialog` with parts
  `Root`, `Trigger`, `Positioner`, `Content`, `Header`, `CloseTrigger`, `Headline`,
  `ConfirmAction`, `Body`. The ready-made draws the trigger as a `Button`, the close trigger as an
  `IconButton` (name `closeLabel`, default "Close"; `closeIcon` or a cross), the confirm action as
  a text `Button`. Specs per binding.
- **React Native** (`src/fullscreen-dialog/`, export, vite entry): `FullscreenDialog`. Given a
  trigger, `onOpenChange` or `defaultOpen` it's a `Modal` filling the screen with its own
  portal host and no scrim; otherwise its surface, which enters and leaves with `open`.
  `confirmAction` takes a node or `({ close }) => node`; a string body is a `Text`, other content
  scrolls in a `ScrollView`. Escape and back close it through `useDismiss`. Specs in
  `overlays.spec.tsx` (fills the viewport, close button, Escape, confirm) and `components.spec.tsx`.
- **Suites**: `tests/component-suites/src/components/fullscreen-dialog.ts` (every binding and
  target: a11y, direction, keyboard, overlays, server rendering, themes), scene registrations,
  the browser suite's `fullscreen-dialog` screenshot (new, reviewed) from a new
  `panda-fixture` section, and `rn-components.ts`.
- **Docs**: gap analysis rows (§1.3, §2.3, §4.0, §7), READMEs of preset, anatomy, binding-core,
  solid, react, react-native and the component suites.

## Deviations from the design

- **The full-screen dialog has a styled `closeTrigger` and `confirmAction`** (they are slots, as
  the phase lists them), while the basic dialog's `closeTrigger` stays an unstyled element. They
  only take layout (`flexShrink: 0`); the look is the icon button's and the text button's.
- **No scrim or backdrop part**: nothing is dimmed behind a full-screen surface.
- **No deprecated options** on the dialog, so nothing was removed (the gap analysis row says so).
- **Totals not edited**: the matrix totals in §1.8 (preset components 32, missing components 22
  and 16 zag-covered, which count the full-screen dialog) are shared with the other c2
  subphases, so they're left for the merge. After c2b: preset components +1, missing −1, zag
  covered −1.

## Stubs and gaps

- Motion is the basic dialog's slide down and fade; M3 Expressive's full-screen dialog may slide
  up from the bottom or scale from the trigger. Not confirmed.
- The ready-made's `confirmAction` doesn't close the dialog by itself: web users close from
  their handler, native users use `({ close })`.
- No demo screen uses it (solid-demo, rn-web-demo).
- React Native's body scrolls through a `ScrollView` inside the slot's padding, so the padding
  doesn't scroll with the content.

## How to verify

Ran, all targeted:

- `bunx tsc --noEmit -p tsconfig.json` in preset, anatomy, binding-core, solid, react,
  react-native and rn-adapter: clean.
- `bunx vitest run --config vitest.config.unit.ts` in preset (615), anatomy (139), binding-core
  (449), solid (460), react (402), react-native (262), css-adapter (82), tailwind-adapter (50),
  panda-adapter (142), bundler (76), rn-adapter (352): all pass.
- `omni run test:e2e -p @pureform/component-suites -f failed -- -t "FullscreenDialog"`: all pass
  on the six projects (solid and react on panda, css, tailwind).
- `tests/browser-e2e-tests`, one file at a time: visual (29, with the new screenshot), direction,
  indication, panda-factories, parity, reduced-motion, icons, state-matching, rn-indication,
  rn-parity, rn-motion: all pass. (state-matching and icons timed out once when run in one batch
  under load, and passed alone.)

## Notes for the next phases

- Merge: shared files are `preset/index.ts`, `pureform.ts`, `anatomy/src/generated.ts`
  (rerun `generate`), `composites.ts` (my block sits before the tabs'), `binding-core/index.ts`
  and `usage.ts`, each binding's `package.json` and `vite.config.ts`, the Solid/React
  `overlaysRegistry` fixtures (I added `fullscreenDialog` and `iconButton`), the component-suites
  and browser suite lists, `panda-fixture/src/page.tsx` (a new section before `media`), the
  preset snapshot, and the gap analysis rows.
- `bun install` after the first build is needed for the `pureform` CLI link, and the suites need
  `omni run generate` after the preset changes.
- Running `bunx oxfmt src` over a whole package reformatted unrelated slider files here; format
  only the files you touched.

## Refactoring hints

- **Helpers that look generic:** `fullscreenDialogPositionerLayout` (binding-core) is the
  dialog's positioner without the padding and centering; a sheet or the search view's full-screen
  form (c3b, c3c) will want the same fixed, stretching positioner. The ready-made's cross
  (`CloseIcon`) is the snackbar's: both Solid and React copy the same `<svg>` path.
- **Code that looks like a sibling's:** the `fullscreen-dialog` bindings are the `dialog`
  bindings with the backdrop and icon removed and a header added (Solid and React `dialog.tsx`
  against `fullscreen-dialog.tsx`: `Root`, `Trigger`, `Positioner`, `Content`, `Headline`,
  `Body`, `CloseTrigger` are the same with different anatomy and context names). Likewise
  `FullscreenDialogRootOwnProps` against `DialogRootOwnProps`, and `FULLSCREEN_DIALOG_ROOT_PROPS`
  against `DIALOG_ROOT_PROPS`. The React Native `ModalFullscreenDialog` is `ModalDialog` without
  the scrim and positioner. Snackbar's `CloseIcon` and these are the same glyph.
- **Suggested home:** a dialog-parts factory in each binding's `parts` (or `dialog/shared.tsx`)
  that takes the anatomy and context and renders `Root`, `Trigger`, `Positioner`, `Content`,
  `Headline`, `Body`, `CloseTrigger`, used by `dialog`, `fullscreen-dialog` and the sheets
  (c3b); one `CloseIcon` in `parts.tsx`; the modal chrome of React Native (`Modal`, `PortalHost`,
  `useDismiss`) in a hook shared with the sheets. Merge the dialog's and the full-screen
  dialog's behavior props if c3b's sheets use them too.
- **What must not change:** `new-components.spec.ts.snap` (both dialogs), the `dialog` entries of
  the component-suites and the overlays, direction and keyboard suites, the `lists` screenshot (it
  holds the basic dialog) and the new `fullscreen-dialog` screenshot.

## Open questions

- M3's full-screen dialog values (56 dp header, 16 dp header padding, 24 dp body padding, `surface`
  container, `titleLarge` headline, `onSurfaceVariant` body) come from the documented anatomy as
  remembered, not re-read from m3.material.io: unconfirmed.
- Should the full-screen dialog take the basic dialog's slide, or slide up from the bottom (the
  Compose behaviour on phones)? It reuses `DIALOG_MOTION` for now.
- Should `confirmAction` close the dialog by default in the ready-made, as most uses want?
