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
- **Sheet expanded events:** `onExpandedChange` fires only for a user's drag or press, not when
  an uncontrolled sheet reopens at a different rest.
- **Splitter transitions:** document that the snap's spring overrides a pane's own inline
  `transition` while it runs.
- **Overlays inside dialogs:** a popover (or menu) opened inside a dialog layers beneath it,
  since the bindings render overlays in place; portal them, or give nested overlays a layer
  above their host (c9).
- **List item trailing controls:** the list item's `trailing` part is `aria-hidden`; fix it in
  the list item for a trailing control, and drop the file upload's `slotProps` override (c9b).
- **Machines root export:** find why exporting the color picker from `@pureform/machines`'s root
  breaks React Native's splitter drag spec, then export it there (c9d).
- **c9's declined refactors:** the secure field's visibility toggle against `roundIconButton`, a
  `holdRepeat` once a second user exists, the code field's per-cell field styles (`context/c9.md`).
- **Forms suite and files:** the forms suite learns file entries, and FileUpload gets a form case.
- **Server-rendered number fields:** the READMEs say to pass `locale` when server rendering, so
  number fields don't reformat on load.
- **Wavy progress like Compose:** the linear wave travels along the track; the circular arc grows
  and shrinks.
- **Side sheet drag everywhere:** the coplanar side sheet and React Native's non-modal side sheet
  drag too.
- **NativeSelect follow-ups:** its own `aria-describedby` joins the Field's ids instead of
  replacing them; React and React Native type the value by `multiple`, as Solid does.

## Done when

As for r1, with `context/r9.md` for the next phase's authors.
