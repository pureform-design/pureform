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

## Done when
Each candidate is extracted or declined with its failed check in context/r10.md; full gate
green.
