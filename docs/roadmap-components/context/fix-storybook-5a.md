# fix-storybook-5a: web components

Storybook findings, section 5a of [fix-storybook-5](../phases/fix-storybook-5.md), on branch
`fix-storybook-5a` from main `c89ab31b` (r9 merged). Each item was first reproduced on main with
`storybook dev -p 6457` and Playwright (screenshots, clicks, CDP touch events) in Solid and React.
None of them was fixed by r9 or an earlier batch.

## Items

### Paginator: the buttons' icons missing

- **Already fixed?** No: the four triggers drew an empty `icon` part (Solid and React).
- **Cause:** the ready-made paginator renders each trigger `as={IconButton}` and passed its glyph
  as `children`; the ready-made icon button draws its `icon` prop and ignores children.
- **Layer:** component (React and Solid `paginator.tsx`).
- **Fix:** a trigger rendered `as={IconButton}` passes the glyph (or the user's children) as
  `icon`; any other `as` still gets children. Composing `<Paginator.NextTrigger as={IconButton} />`
  gets the icon too. With the icons drawn, their colour is the standard icon button's.
- **Tests:** both bindings' `paginator.spec.tsx` (ready-made and composed) check an `svg` inside
  the icon part. Visual suite's `paginators` section unchanged.

### SideSheet: swiping only works on the header

- **Already fixed?** No (r9c made coplanar sheets drag; the body still didn't).
- **Cause:** the content says `touch-action: pan-y`, but the body is a scroll container
  (`overflow: auto`), and touch-action isn't inherited past one: the body's `auto` let the browser
  take a sideways touch on it (pointercancel), so only the header dragged.
- **Layer:** component (binding-core `sideSheetBodyLayout`, used by React's and Solid's `Body`).
- **Fix:** the body says `touch-action: pan-y` too (rendered, so SSR/hydration are unchanged).
  Up and down still scroll natively; a horizontally scrolling area inside the body is its own
  scroll container and keeps its own touch-action.
- **Tests:** `side-sheet.e2e.test.ts` "leaves sideways touches on its scrolling body to the
  drag". Checked in Storybook with CDP touch drags on the body: the sheet follows (250px).

### Tooltip: long-press on touch doesn't show it

- **Already fixed?** No. Zag's tooltip ignores touch pointers (hover and focus only).
- **Layer:** component. New `tooltipLongPress` in `binding-core/src/tooltip-long-press.ts`
  (exported from `@pureform/binding-core/dom`), hooked on the trigger by `useTooltipLongPress`
  in `react/src/tooltip/long-press.ts` and `solid/src/tooltip/long-press.ts`, for `Tooltip` and
  `RichTooltip`.
- **Fix:** as React Native's overlay: a touch held 500 ms (`TOOLTIP_LONG_PRESS_MS`, RN's
  `delayLongPress`) without moving past 10px shows it; once released a plain tooltip goes after
  1.5 s (`TOOLTIP_LONG_PRESS_STAY_MS`, RN's `LONG_PRESS_TOOLTIP_MS`), a rich (interactive) one
  stays. The touch's own leave (`pointerleave`, and `pointerout`, which React reads as a leave)
  is stopped at the document in capture so Zag doesn't close it; the browser's long-press menu
  and the press's click are swallowed. A disabled trigger shows none.
- **Tests:** `tooltip-long-press.spec.ts` (4 cases). Checked in Storybook with CDP touch events:
  `tooltip--plain` open while held, open 0.5 s after, closed at 2 s; `richtooltip--subhead`
  stays open.

### Ripple scene: pressing draws no ripple; React Native text

- **Already fixed?** No.
- **Cause (Solid):** a harness bug. Storybook puts the story's element in the document only
  after the story and its decorators return it; the Solid adapter rendered into the detached
  element, so the ripple machine's effect found no layer by id (`getById`) and attached nothing.
  React renders later, so it worked there (faint: Material's 10% pressed opacity over the
  stage's 6% tint).
- **Layer:** harness (`src/solid/adapter.ts`): it draws once the element is connected (a
  microtask after the story returns), and `update`/`unmount` before that are safe. This applies
  to every Solid story whose machine finds parts by id in an effect.
- **React Native text:** `multiRender` reads `parameters.pureform.absent[renderer]` for a
  renderer without the component; Ripple's says React Native's pressable components draw their
  own ripple (they do: `engines/svg.ts`, card, checkbox…) instead of "isn't implemented".
- **Tests:** the ripple stage's play presses the frame and expects a `[data-ripple]` in the
  layer (failed in Solid before the adapter fix).

### CopyButton: no check icon after a click

- **Already fixed?** No.
- **Cause:** a harness bug. The generated stories' `onClick` (for keyboard click plays) called
  `preventDefault()` on every click, to keep a link's `href="#…"` from navigating; the copy
  button skips its copy on a prevented click (by design, so an app can cancel it).
- **Layer:** harness (`src/renderers/compose.ts`): only a click inside `a[href]` is prevented.
- **Tests:** `src/checks/copy-button.ts` (new hook): clicks, expects `data-copied` and
  `writeText("pureform")` (the clipboard stubbed). List/ListItem/Button/Card/Chip/NavigationBar/
  Menu story tests still pass.

### FabMenu: items not tabbable one by one

- **Already fixed?** No: Tab stayed on the list (Zag keeps Tab in a menu's content when it holds
  no tabbable element).
- **Layer:** component. binding-core `fabMenuItemFocusProps` (`tabIndex` 0 unless disabled, and
  highlight on focus so Enter/Space press the focused item) and `fabMenuListProps` (Tab from the
  last tabbable item, or from a list without one, goes to the FAB; Zag would trap it), used by
  React and Solid (Solid through `normalizeProps.element`).
- **Behaviour:** list → Message → Call → (Video is disabled) → FAB; Shift+Tab from the FAB goes
  back to the last item. Arrow keys still move the highlight (Zag focuses the list then).
- **Tests:** `overlays.e2e.test.ts` "takes Tab through its enabled items one by one, then to the
  FAB" (solid/css, react/panda); the FabMenu indication, keyboard, accessibility and
  controllable cases still pass.

### Toast: swiping doesn't dismiss; a button that adds toasts

- **Already fixed?** No: no swipe existed on any renderer.
- **Layer:** component (web): `toastSwipeToDismiss` in `binding-core/src/toast-swipe.ts`
  (exported from `/dom`), on each React and Solid `Toast.Root`. Harness: the scenes.
- **Fix:** a drag mostly sideways (touch, pen or mouse) moves the toast and fades it; let go past
  half its width or on a flick (0.5 px/ms outward) it slides out and `dismiss()`es, else it
  settles back (200 ms, none under reduced motion). The timer pauses while held. Presses on its
  buttons aren't drags; a `closable: false` toast doesn't move. The root renders
  `touch-action: pan-y`.
- **Scene:** each renderer's toast scene draws a button "Add a toast" before the toaster
  (`ADD_TOAST_LABEL`, `addedToast` in `src/renderers/scenes.ts`): info, success, warning, error in
  turn, on the default timer. React Native's uses its `Button` with `onPress`.
- **Tests:** `toast-swipe.spec.ts` (5 cases); the toast stage's base-story play adds a toast with
  the button and swipes it away (mouse pointer events).

### TouchTarget: draws nothing visible

- **Already fixed?** No.
- **Layer:** story/harness (the component is invisible by design).
- **Fix:** `src/stages/touch-target.ts` puts it in an 18px dot and outlines the target's area
  (dashed, tinted), with a caption. Its play checks the target is larger than the dot, centred on
  it, and outlined. React Native has no TouchTarget (its components size their own).

## Checks

- `omni run build test -p @pureform/binding-core -p @pureform/react -p @pureform/solid`: passes.
  A first run failed Solid's `date-input.spec.tsx` "takes a range's end typed before its start"
  (typing under load, untouched code); `-f failed` passed.
- `bunx tsc --noEmit -p tsconfig.json`: clean in binding-core, react, solid, component-suites,
  storybook-web.
- `omni run build -p @pureform/storybook-web`: passes. App unit tests: 16 passed.
- Story tests (Solid and React): Toast, CopyButton, Ripple, TouchTarget, Paginator, FabMenu,
  Tooltip, RichTooltip, SideSheet, List, ListItem, Button, Card, Chip, NavigationBar, Menu and
  the Solid adapter's: 397/398; React's `RichTooltip > Key Escape` failed once under load and
  passed twice alone.
- e2e (after `omni run generate prepare -p @pureform/panda-fixture`), `solid/css` and
  `react/panda`: overlays and side-sheet (`-t "FabMenu|SideSheet, dragged"`): 20 passed;
  indication, keyboard, accessibility, controllable (`-t` the touched components): 464 passed.
- Visual suite, `-t paginator`: passes (screenshots unchanged).

## Refactoring hints

- **Helpers that look generic:** `toastSwipeToDismiss` is a sideways swipe-to-dismiss with
  fade, slop, flick and settle (WAAPI); a dismissible chip or a snackbar could take it.
  `tooltipLongPress` is a touch long-press detector with slop and click/contextmenu swallowing;
  any "long press shows X" on the web could share its core.
- **Code that looks like a sibling's:** `toast-swipe.ts` repeats `side-sheet-drag.ts`'s pointer
  skeleton (slop, axis lock, capture, velocity, `swallowNextClick`), as r9 noted for the sheets.
  That's a third user: the shared sheet pointer skeleton r9 suggested now has three users.
- **Suggested home:** `binding-core/src/drag.ts` (a sideways drag skeleton with hooks for
  start, move and release).
- **What must not change:** `toast-swipe.spec.ts`, `side-sheet-drag.spec.ts`,
  `side-sheet.e2e.test.ts`.

## Open questions

- **React Native toast swipe:** not done (5a is the web; React Native's `Toaster` has no gesture).
  The scenes' added toasts say nothing about swiping, so the text holds on every renderer.
- **FabMenu focus model:** items are both tab stops and Zag's arrow-key highlight; an arrow key
  moves focus back to the list (Zag's `focusMenu`). An item that focuses itself as it's
  highlighted would make it one model; left as is.
- **Toast swipe direction:** both ways, at any placement (Android's notifications). Sonner swipes
  a bottom-placed toast down instead; say if that's wanted.
- **Solid adapter:** drawing a microtask later changes every Solid story's first frame; story
  tests pass, but a play reading the canvas synchronously right after render would now see it
  empty (none does).
