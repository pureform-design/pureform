# c9c: Popover (output context)

Branch `c9c`, from main `e1011942`. Commits: `git log e1011942..c9c`. Not pushed; main untouched.

## Done

- **Preset** `popover` (`packages/preset/src/components/popover.ts`): slots `root, caret, title, body,
actions`. Registered in `index.ts`, `pureform.ts`, the contrast pairs, and the preset specs (snapshot,
  overlay stacking/motion, validity). Gap analysis: 68 components, 24 wrapped Zag machines, matrix row,
  §4.2, the Zag table split (`hover-card` → rich tooltip, `popover` → popover).
- **Anatomy** `popoverOverlayAnatomy` (`composites.ts`) with `compositeTestIds.popover`: unstyled `root`,
  `trigger`, `positioner`, `closeTrigger`; styled `content` (slot `root`), `caret`, `title`, `body`,
  `actions`. The generated `popoverAnatomy` came from `omni run generate -p @pureform/anatomy`.
- **Machine:** `@pureform/machines/popover` re-exports `@zag-js/popover` unchanged (new catalog entry,
  machines dependency, export and vite entry). Bindings render in place, so `portalled: false`.
- **binding-core** `components/popover.ts`: `PopoverRootOwnProps`, `POPOVER_ROOT_PROPS`,
  `POPOVER_CONTENT_PROPS`, `popoverSelection`, `popoverMachineProps`; usage entry (`popover`, `button`,
  `ripple`).
- **React, Solid** `src/popover/`: `Popover` ready-made plus `Root, Trigger, Positioner, Content, Title,
Body, Actions, CloseTrigger, Caret`; specs; exports, vite entries, registry fixtures, READMEs.
- **React Native** `src/popover/`: `Popover` with `trigger` (label or function), `heading`, `body`,
  `actions` (a function gets `close`), `open`/`defaultOpen`/`onOpenChange`, `closeOnInteractOutside`,
  `positioning`; built on `useAnchoredOverlay` and `Anchored` (as the menu), placed in the portal's
  `menu` layer. Specs in `overlays.spec.tsx`.
- **Suites:** `component-cases/src/cases/popover.ts` (picked up by Storybook through the case list and
  `scene.ts`), both component-suites scenes, the Panda fixture page, the browser suite's RN component
  list. No `@control` tags were needed: the nodes, functions and objects get none, `modal`, `autoFocus`,
  `closeOnInteractOutside`, `closeOnEscape`, `restoreFocus` and `open` are booleans.
- No deprecated option had an equivalent here (the popover is new); nothing removed.

## Where the design is pureform's own

M3 has no popover. Surface and popup motion are the rich tooltip's (surface container, level 2, `medium`
radius, `POPUP_MOTION` from the anchor); the stacking layer is the menu's (`zIndex("menu")`) rather than
the tooltip's, since a popover opens on a press and holds controls. Title is `titleMedium`, body
`bodyMedium`; padding 16/16/16/12; width 200 to 360. Positioning is Zag's, `bottom` by default, as the
rich tooltip's (the menu's `bottom-start` would suit a filter button too: see the open questions).

## Decisions

- **`heading`, not `title`, on the ready-made.** `title` is the DOM attribute (a string) and clashes with
  a node-typed prop in `Omit<PartProps, …>`. The part, the id (`ids.title`) and the test id stay `title`.
- **No `onClose` question** (the m3d `OverlayCloseProps`): it belongs to dialogs and sheets that
  interrupt; the popover closes on a press outside, which an app already controls through `open` or
  `closeOnInteractOutside`.
- **`aria-label` isn't a Root prop** (the dialog's is): the popover is named by its `Title`
  (`aria-labelledby`), and an app can pass `aria-label` to `Content` directly.
- **Modal mode is Zag's** (`modal`): focus trapped, the page `aria-hidden`, scrolling blocked. No scrim is
  drawn behind it; add one with the scrim if the design wants it. React Native has no `modal`: a press
  outside only closes the popover, and the page stays reachable by the app's own means.
- **React Native has no caret** (as the tooltips): Zag places it on the web.

## Tests

- `omni run build test -p anatomy preset machines binding-core component-cases react solid react-native`
  (no `-f`, then `-f failed`): all pass but React Native timing specs that fail under load and pass alone:
  the FAB stagger with Reanimated, and the c8c splitter drags (`components.spec.tsx -t "c8c: splitter"`
  50 passed on its own).
- e2e, from `tests/component-suites` (after `omni run generate prepare -p @pureform/panda-fixture`), on
  `solid/panda`, `react/css`, `react/tailwind`, `-t Popover`: `overlays` 9, `keyboard` 33,
  `accessibility` 30, `direction` 15, `controllable` 18, `server-rendering` 39, `themes` 27 passed;
  `indication` has none for it (it has no indication).
- `bunx tsc --noEmit -p tsconfig.json` is clean in anatomy, preset, machines, binding-core,
  component-cases, react, solid, react-native. component-suites reports only the generated
  `.pureform/css` and `/tailwind` modules, which its Vitest run writes. `omni run build -p
@pureform/storybook-web` passes (the first full `omni run build` had failed it on a race with the Solid
  build; it passed once the bindings were built).
- The browser (screenshot) suite wasn't run; the RN component list gained `popover` and the Panda page
  a popover block, so its screenshot sections will pick them up at the gate.

## Refactoring hints

- **Helpers that look generic:** none new. The popover's binding parts are the rich tooltip's with
  Zag's popover connect (`getTriggerProps`, `getTitleProps`, `getDescriptionProps`,
  `getCloseTriggerProps`).
- **Code that looks like a sibling's:** `react/src/popover/popover.tsx` and `solid/src/popover/popover.tsx`
  are the rich tooltip's files with the interactive bookkeeping removed, plus a title/body/close trigger as
  the dialog's. `react-native/src/popover/popover.tsx` is `menu.tsx`'s `MenuOverlay` over a surface like the
  tooltip's. `binding-core/components/popover.ts` and `rich-tooltip.ts`/`tooltip.ts` share the machine-props
  shape (`ids`, `positioning: { placement: "bottom", … }`).
- **Suggested home:** a binding-core `overlayRootProps` for the repeated `positioning` default and `ids`
  mapping; a `plainParts`-style factory for the repeated Trigger/Positioner/Content/Caret (r9; the dialog
  already has `dialogParts`).
- **What must not change:** `popover.spec.tsx` in React and Solid, RN `overlays.spec.tsx` "the popover",
  `overlays.e2e.test.ts -t Popover`, the preset snapshot for `popover`.

## Open questions

- Placement: `bottom` (the rich tooltip's) or `bottom-start` (the menu's) as the default for a filter
  popover?
- Should the modal popover draw a scrim? Zag's modal blocks the page but draws nothing.
- Layer: popover at the menu's `zIndex`; a popover opened from inside a dialog sits below the dialog's
  layer unless it's rendered inside it (the dialog's layer is above the menu's). Portalling isn't done in
  any binding yet.
- `heading` as the ready-made prop name; `title` would need the DOM attribute dropped from `PartProps`.
- The popover has no `onClose` question (see decisions); say if it should.
