# r9: Refactor after m3, c8, c9 and c10

**Depends on:** c10. **Single agent.** Follow the
[refactor procedure](../conventions.md#refactor-phases).

One pass over everything since r8: m3 (Material transitions), c8 (Material gaps from Zag), c9
(components beyond M3) and c10 (plain form primitives). Read `context/m3*.md`, `c8*.md`,
`c9*.md` and `c10*.md`: their refactoring hints, declined refactors and open questions.

## Expected duplication to look for

- **Transitions:** m3a's `FadeThrough` and m3b's shared axis wrappers (keyed content, enter and
  exit, reduced motion), and m3c's staggered FAB menu items against the popups' presence.
- **Closing:** m3d's `onClose` on the dialog, full-screen dialog and side sheet against the
  bottom sheet's `closeAsker` path, and c8a's partly open bottom sheet against m2's drag settle.
- **Triggers and popups:** c8b's context menu trigger and c9c's Popover against the menu's and
  tooltip's positioning and dismiss handling.
- **Fields:** c9a's NumberField and CodeField, c9b's FileUpload and c10's plain Field, Label,
  Input and ErrorText against the Material text field's parts (label, supporting text, error,
  `aria-describedby` wiring); c10b's NativeSelect against Select.
- **Pointer drags:** c8c's resizable panes, c9d's ColorPicker areas and the slider's thumbs.

## Decided work

- **Shared axis clipping:** its root clips only while a page moves, like the fade through since
  m3's merge, so focus rings and shadows at its edges aren't cut at rest.
- **Settling:** the list item's swipe settles through c8a's `settleTransition`.
- **Exact springs on the web:** springs written out as CSS vars (stiffness, damping), so a
  settle from a release speed reads them instead of fitting the `linear()` curve.

## Done when

As for r1, with `context/r9.md` for the next phase's authors.
