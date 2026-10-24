# slot-d: React Native

Branch `slot-d`, from `main` at 12a8051d. Fourth of five batches (a-e). React Native only; no
shared (binding-core, react, solid) code changed.

## What was done

1. **Helper** (`packages/react-native/src/slot-props.ts`, exported from the index):
   `nativeSlots(props, keyOf?)` returns `PartSlots`: `props(part)` (the user's part props, to
   spread first), `style(part, own)` (own, or own with the user's flattened over it), `on(part,
name, own)` (the user's handler composed after the component's; `onLayout` excluded),
   `with(part, ownSpread)` (the same for spread handler objects such as `indication.handlers`,
   `presence.props`). Not a hook, so sub-renders and rows can call it. Everything is cached on
   identity (WeakMaps keyed by the user's `style`/`slotProps`, the own style, the handlers); with
   neither prop it returns one shared no-op object. Types: `NativeHost`, `PartHosts`,
   `NativeSlotProps<H>` (keyed `style`: `ViewStyle`/`TextStyle`/`ImageStyle` by host; keyed
   `slotProps`: the host's props minus `style`/`testID`/`children`), `InnerPropsOf<P>`.
   `withUnselectable(style)` replaces the per-render `{ ...s.x, ...unselectable }` (cached per
   style).
2. **Every ready-made** declares `<X>Hosts` (part -> host) and extends `NativeSlotProps<XHosts>`;
   every part element spreads `slot.props(part)` first, its `style` goes through `slot.style`,
   its handlers through `slot.on`/`slot.with`. Done with a TypeScript codemod over the
   `testID={id(part)}` sites, then by hand for sub-renders (rows get `slot` as a prop or from
   context: card, grid list, carousel, stepper, table, menu, tabs, navigation, accordion, fab
   menu, slider, time picker/input, calendar, fade through, horizontal shared axis).
   `RootStyleProps`/`withUserStyle` are gone (root-only `style` -> `style={{ root }}`).
3. **`inputProps` decision:** folded into `slotProps.input` (the input part's host is
   `TextInput`, so its slot props are `TextInputProps`). Removed from TextField/TextArea (`FieldProps`),
   SearchBar, NumberField, CodeField, TagsInput; `FieldOptions.inputProps` stays internal (the
   component's own input props, which win). Sketch §6 updated.
4. **`<component>Props`** (spread first on the drawn component, so its wiring wins; containers
   keep `overDefaults`): `listItemProps`, `radioProps`, `buttonProps`/`iconButtonProps`
   (ButtonGroup, Toolbar), `chipProps` (ChipSet, TagsInput, now with style/slotProps),
   `menuProps` (Select, Autocomplete, SplitButton, Toolbar), SearchView `searchBarProps`/
   `backButtonProps`/`clearButtonProps`, DatePicker/DateInput `cancelButtonProps`/
   `confirmButtonProps`, Paginator `selectProps`, Table `checkboxProps`, FileUpload
   `buttonProps`/`listItemProps`/`iconButtonProps`/`linearProgressProps`, ColorPicker
   `textFieldProps`/`iconButtonProps`. AppBar `searchBarProps` was there.
5. **Overlays use the web's part names** (`overlayKeys(xOverlayAnatomy)`, from each overlay
   part's `slot`): Dialog, FullscreenDialog, BottomSheet, SideSheet, Popover, RichTooltip,
   Tooltip, Menu, SearchView, DatePicker. Surface = `content` (default ids `pf-dialog-content`,
   were `-root`), sheets' content slot = `body`, search view's surface = `surface`. `testId`,
   `style`, `slotProps` take these keys. **Backdrop:** `backdropKeys` + `Scrim`'s internal
   `slot` prop route `style.backdrop`/`slotProps.backdrop` to the scrim of Dialog, BottomSheet,
   SideSheet and DatePicker (which also gets `testId.backdrop` now); DatePicker's trigger id
   follows `testId.trigger` (default unchanged).
6. Docs: RN README (per-part props bullet), CHANGELOG (breaking + features),
   `component-architecture.md` (overlay keys, `slotProps.input`), sketch §6.

## Tests

- New `slot-props.spec.tsx` (helper caching, compose order, override rule, Button parts, dialog
  `content`/`backdrop`, list `listItemProps`, `slotProps.input`); `rows.spec.tsx` gains "keyed
  style and slotProps the app keeps don't render rows again" (Menu rows: zero renders on a parent
  render). Specs and `apps/rn-web-demo/src/demo.e2e.test.tsx` updated for the new overlay ids.
- `omni run build test -p @pureform/react-native`: pass. Storybook native: Button, List, Dialog,
  Select, DatePicker, ChipSet stories 77/77. rn-web-demo e2e 12/12. `tsc` clean in
  react-native and rn-web-demo; oxlint clean. preset `doc-counts.spec` passes after the doc edits.

## Perf

- No new listeners or per-frame work. Without `style`/`slotProps` the cost is one shared object
  and identity returns. With stable user objects the merges are cached (WeakMap pairs), so
  memoized rows (menu items, tabs, destinations, radios) still skip renders (rows spec).
- An inline user `style={{ … }}` is a new object each render, so rows given it render again, as
  any changed prop would.
- Removed per-render allocs: `withUserStyle` copies, `{ ...s.x, ...unselectable }` on every
  pressable. Existing inline own styles (`{ ...s.root, ...presence.style }`) stay; they're merged
  again only when the user styles that part.

## Not done / notes

- Single-part plain primitives `Input`/`Textarea` keep their flat `TextInputProps` (their `style`
  is the input's), as the web's plain single-part components take element props.
- Repeated parts take one value for every copy (per-instance functions are batch e).
- Triggers drawn as `Button` (dialog, menu, date picker) aren't reachable by a part key on React
  Native (no `trigger` host); the menu's `contextTrigger` area neither.
- ColorPicker's hex field: `textFieldProps.slotProps.input` merges with the picker's own input
  props shallowly, the picker's winning (a user `onBlur` there is replaced).
- The calendar cell (`calendarCell`) is not customizable (batch e).
- TagsInput chips' test ids stay derived from the field's `testId`; `chipProps.testId` isn't read.

## Refactoring hints

- **Helpers that look generic:** `nativeSlots`/`overlayKeys`/`backdropKeys`/`withUnselectable`
  (`react-native/src/slot-props.ts`). `overlayKeys` derives web keys from overlay anatomies'
  `slot`; the web bindings could use the same mapping (binding-core) instead of per-binding
  overlay part lists.
- **Code that looks like a sibling's:** the "row gets `slot: PartSlots` from its owner" pattern
  repeats (menu `Item`, tabs `Tab`, navigation `Destination`, accordion `Item`, carousel, stepper,
  table rows, fab menu items, slider thumbs/markers, time picker dial labels); context-carried in
  card and grid list. `iconParts(slots, id, slot)` in `icon-style.tsx` is the shared icon case.
- **Suggested home:** keep the helper in `react-native/src/slot-props.ts`; the hosts maps stay
  per component (hand-declared, as the standard says). A binding-core `overlayKey(anatomy, slot)`
  could serve all three bindings.
- **What must not change:** `slot-props.spec.tsx`, `rows.spec.tsx`, `overlays.spec.tsx`,
  `presence.spec.tsx`, `components.spec.tsx`, the rn-web-demo e2e, and the native story files
  above.

## Open questions

- Default overlay test ids changed (`pf-dialog-root` -> `pf-dialog-content`, etc.) to match the
  web; anything outside this repo keyed on the old ids breaks (listed as breaking).
- Should `Input`/`Textarea` also move to keyed `style={{ root }}` for uniformity?
