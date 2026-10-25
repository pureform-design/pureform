# r9: Refactor after m3, c8, c9 and c10

**Depends on:** c10. **Single agent.** Follow the
[refactor procedure](../conventions.md#refactor-phases).

One pass over everything since r8: m3 (Material transitions), c8 (Material gaps from Zag), c9
(components beyond M3) and c10 (plain form primitives). Read `/tmp/opencode/m3*.md`, `c8*.md`,
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
  `holdRepeat` once a second user exists, the code field's per-cell field styles (`/tmp/opencode/c9.md`).
- **Forms suite and files:** the forms suite learns file entries, and FileUpload gets a form case.
- **Server-rendered number fields:** the READMEs say to pass `locale` when server rendering, so
  number fields don't reformat on load.
- **Wavy progress like Compose:** the linear wave travels along the track; the circular arc grows
  and shrinks.
- **Side sheet drag everywhere:** the coplanar side sheet and React Native's non-modal side sheet
  drag too.
- **NativeSelect follow-ups:** its own `aria-describedby` joins the Field's ids instead of
  replacing them; React and React Native type the value by `multiple`, as Solid does.

- **Own size on React Native:** `OWN_SIZE` is `width: "fit-content"` (Yoga's fit-content, React
  Native 0.88), not `alignSelf: "flex-start"`, so a parent's `alignItems` still places the
  component. Radio joins Button, IconButton, FAB, chips, Checkbox, Switch and Badge. Users
  control it through `style` (`alignSelf`, `width: "100%"`); the README notes that
  `alignSelf: "stretch"` alone doesn't stretch. Tests: default column, centred column, centred
  row, user width; React Native and its web build.
- **Pill radius token:** each corner-morphing component (button, icon button, chip, input chip,
  FAB menu toggle, split button) gets a `pillRadius` token whose default is `height × 0.5`;
  `radius` is `min(radius("full"), pillRadius)`. A theme sets it to choose how round "fully
  round" is. Tests at every size and density, React Native against the web.
- **React Native token resolution:** replace `withSetTokens`' up-to-4-pass loop
  (`rn-adapter/src/resolve.ts`) with select-then-evaluate: merge the selected variants', states'
  and props' unevaluated token expressions in cascade order, then evaluate lazily, memoised,
  with cycle detection (`evaluate` in `values.ts` reads through a `read(key)` lookup). Tests: a
  chain longer than 4, a cycle errors in development, corners at every size and density match
  the web, existing parity and geometry specs unchanged.
- **React Native Media `source`:** typed as `ImageSourcePropType`: `require()` (ratio from
  `Image.resolveAssetSource`), `{ uri, headers }` (`Image.getSizeWithHeaders`), arrays of
  resolutions, `cache` passed through. `source` wins over `src`, with a development warning
  when both are set; the clipped `Drawing` path takes the whole source.
- **TimePicker hand:** on React Native the hand animates the short way on tap, release and keys;
  on the web the handle at the tip moves with the hand instead of jumping.
- **SVG engine off the JS thread** (`rn-adapter/src/svg.ts`): the ripple is drawn at its final size
  and grown with transform and opacity on a wrapper (native driver on devices, `element.animate`
  on the web); the fill blend becomes an opacity cross-fade of two stacked paths; the shape morph
  runs in the browser on the web (CSS `d: path()` where supported, SMIL `<animate>` otherwise,
  springs sampled into keyframes) and on devices writes `d` straight to the native path without
  React state (`useTween`'s per-frame `setState` goes); the README recommends `reanimated-svg`
  for morphing shapes. Tests: no React commit per frame; on the web, running browser
  animations and no attribute writes from JavaScript; end states unchanged.
- **Slider `thumbSize`:** follows later prop changes, as the pin input's `count` now does.
- **React Native accessibility in stories:** the BottomSheet "Opened Plain" and "Opened Partly
  Open" stories pass `aria-modal`; the disabled TextField's label is the input's label, and its
  story's a11y check goes back on.
- **Known flakes:** look at each one in conventions' list (and the context files'): fix the test,
  fix the bug, or record why it's timing only. Solid fade-through "drops the old page at once" and
  React Native's splitter tests failing when their whole file runs come first.
- **`tsc` noise:** `apps/storybook-web` and the component suites type-check against Solid's
  source or declarations, not `packages/solid/dist`'s `.jsx`, so `tsc` is clean.

## Subphases

Four in parallel, then a merge:

- **r9a React Native adapter and layout:** token resolution, pill radius token, own size, Media
  `source`.
- **r9b Motion:** wavy progress, shared axis clipping, list item swipe settling, exact springs on
  the web, splitter transitions doc, TimePicker hand, SVG engine.
- **r9c Components and forms:** NativeSelect follow-ups, forms suite and files, server-rendered
  number fields, side sheet drag everywhere, overlays inside dialogs, sheet expanded events, list
  item trailing controls, Slider `thumbSize`, React Native accessibility in stories.
- **r9d Duplication and tests:** the expected duplication list, c9's declined refactors, machines
  root export, known flakes, `tsc` noise.

## Done when

As for r1, with `/tmp/opencode/r9.md` for the next phase's authors.
