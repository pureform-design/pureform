# r10 Refactor after r9 and fix-storybook-5

Depends on: r9, fix-storybook-5 (and the renderer-neutral case readers, if done by then).

A duplication and cleanup pass over what r9 and fix-storybook-5 added, under the refactor rule
(same concept, obvious duplication, shared code can take future changes; record the failed check
otherwise).

## Look for
- Duplication groups r9 left open or declined (context/r9.md, r9d.md).
- The menu's cascade and drill submenus against other nested popups and back-navigation.
- React Native height animations (expanders) against the sheets' and other measured sizes.
- React Native DateInput segments against the web's segmented fields and the code field.
- Touch long-press (tooltip) and swipe-to-dismiss (toast, side sheet, list item) against the
  existing drag and press helpers.
- Remaining known flakes and timing-only tests.

## Decided work
- **React Native toast swipe:** sideways swipe-to-dismiss like the web (past half the width or a
  flick; settles back otherwise; timer pauses while held; non-closable toasts don't move), built
  on a shared drag skeleton with the side sheet, list item swipe and the web toast if the refactor
  rule passes.
- **FabMenu focus follows the highlight:** one model; arrow keys and Tab move the same focus.
- **Toast swipe direction:** stays sideways at every placement (Material's snackbars); no change.
- **Solid stories render after Storybook returns the story:** no change; note it in
  docs/roadmap-storybook/context.md for future plays.
- **Menu `submenu="auto"`:** decide by the space the menu actually has (measured beside the
  item against its container/viewport), not the window width; cascade when the submenu fits.
- **React Native Web cascaded submenu:** reachable with the arrow keys (Right/Left open and close,
  focus moves in and back), as on the web.
- **React Native DateInput:** follows a controlled `value` changed later (segments update without
  losing focus mid-typing).

## Done when
Each candidate is extracted or declined with its failed check in context/r10.md; full gate
green.
