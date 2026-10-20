# c3c: Search view and autocomplete (output context)

Commits: see `git log c57cab9..c3c-search-autocomplete`.

## Built

- **Preset** (`packages/preset/src/components/`):
    - `search-view.ts`: `searchView`, with the parts `root, header, leading, input, trailing,
divider, content` (the gap analysis' draft) and `variant` `fullScreen` (the default),
      `docked` or `contained`. It has no compounds.
        - The root fills its positioner, which the binding places. Full-screen covers the
          viewport with a 72px header. Docked and contained drop over the search bar's place,
          with `radius("extraLarge")`, level 3, a 56px header and min/max sizes.
        - Contained sets the root to `surfaceContainer` and draws the header as a
          `surfaceContainerHigh` pill (`headerInset`, `headerRadius` full). It hides the
          divider. Its leading and trailing icons travel outward through
          `SEARCH_VIEW_KEYFRAMES` (`searchViewFromEnd`/`searchViewFromStart`, swapped under
          `rtl`, none under reduced motion), which `pureform()` adds to the keyframes.
        - `leading` and `trailing` are icon slots that grow to hold icon buttons (iconBox
          without its fixed width and height).
    - `autocomplete.ts`: `autocomplete`, the select's field built with `affixField` and
      `AFFIX_FIELD_SLOTS`, the same variants, and 1 compound, the field's. The input has no
      pointer cursor, and the arrow turns while the list is `expanded`.
    - `search-bar.ts`: a new `scrolled` variant, which sets the `container` token to
      `scrolledContainer` (`surfaceContainerHighest`). c4b's app bar is meant to use it.
    - Registered in `index.ts` and `pureform.ts`. Specs: `search-view.spec.ts` and
      `autocomplete.spec.ts`, with snapshots. Entries were added to `pureform.spec.ts`,
      `density.spec.ts`, `color-variants.spec.ts`, `icons.spec.ts` and `contrast.ts`
      (searchView pairs; autocomplete uses `FIELD_PAIRS`).
- **Anatomy:** `generated.ts` was regenerated. New composites in `composites.ts`, with test ids
  in `compositeTestIds`:
    - `autocompleteMenuAnatomy`: the select's menu under the autocomplete's scope.
    - `searchViewOverlayAnatomy`: `root`, `trigger` and `positioner` are unstyled. `surface`
      is the preset's `root` slot, followed by the view's slots.
    - `searchViewMenuAnatomy`: the menu's item slots under the search view's scope.
- **Machine** (`packages/machines/src/combobox/`, subpath `@pureform/machines/combobox`): wraps
  Zag's `combobox`, a new dependency (`@zag-js/combobox` 1.46.0 in the root catalog).
    - The highlighted suggestion hovers (`trackHighlight`), the pointer presses an item, and
      Enter presses the highlighted one. Space types a space.
    - `scrollContentToTop` is skipped while the list is hidden. Zag runs it on mount, and
      setting `scrollTop` there forced a layout before a runtime theme's styles arrived, so the
      theme's colors eased in.
    - Under `selectionBehavior: "preserve"`, `syncSelectedItems` still writes the label of a
      value the combobox takes. A controlled choice the owner turns down leaves the text alone.
    - Exports `anatomy` (the autocomplete's parts) and `searchViewAnatomy`. Both are in the
      anatomy drift spec. `index.spec.ts` lists the combobox.
- **binding-core:**
    - `components/autocomplete.ts`: root props, selections, `autocompleteMachineProps`,
      `autocompleteMatches` and `containsFilter` (the default filter: the label contains the
      text, ignoring case), `autocompleteFilterText` (the list filters only by typed text),
      `autocompleteInitialText` (the text starts as the chosen value's label),
      `autocompleteTriggerProps` (role button on the arrow `span`) and the supporting text id.
    - `components/search-view.ts`:
        - root and content props; `searchViewSelection` and `searchViewMenuSelection`
        - `searchViewDialogProps`: modal, restores focus, and the initial focus goes to the
          view's input
        - `searchViewComboboxProps`: open while the view is open, `disableLayer`
        - `searchViewPositionerLayout` (fixed, or absolute within Root) and
          `SEARCH_VIEW_ROOT_STYLE` (`position: relative`)
        - `opensSearchView`, the keys that open the view from the bar
        - the item collection and the matches
    - `search-bar.ts` passes `scrolled` through.
    - Usage entries: `autocomplete` (autocomplete, menu, ripple) and `search-view` (searchView,
      searchBar, menu, iconButton, ripple).
- **Bindings:**
    - Solid and React `autocomplete/`:
        - Root runs Zag's combobox. The parts are the select's, without HiddenSelect:
          `TrailingIcon` is Zag's trigger, and the `Item`/`ItemGroup` parts are the menu's.
        - The input submits its text. Form reset and the fieldset rule are handled.
        - `error` sets the input's custom validity.
    - Solid and React `search-view/`:
        - Root is a positioned div, around `Trigger` and `Positioner > Surface`.
        - `Trigger` wraps the search bar and marks `data-state`. A press, Enter, ArrowDown or a
          typed key opens the view, and the typed character carries into the query.
        - `Surface` is Zag's dialog content (modal: it traps focus and restores it to the bar).
          It holds `Header > Leading, Input (the combobox input, type search), Trailing`, then
          `Divider` and `Content` (the listbox), with
          `Item/ItemLeading/ItemContent/ItemLabel/ItemSupportingText/ItemTrailing` as menu items.
        - The ready-made adds a back `IconButton`, a clear `IconButton` (`CloseIcon`) while
          there's a query, and a default trigger: a read-only `SearchBar` showing the query.
        - `onSelect` and `onSubmit` close the view unless `closeOnSelect={false}`.
    - React Native: `Autocomplete` uses `Field` with a `Menu` in `Portal` + `Anchored`.
      `SearchView` uses a `Modal` with the preset's slots; docked and contained views are placed
      at the trigger's measured spot.
    - Exports, `vite.config.ts` entries, registry fixtures and the READMEs are updated in each
      binding.
- **Tests:**
    - Binding specs: Solid 6+7, React 7+7 (including reset after a choice), and React Native 3
      in `components.spec.tsx`.
    - Machine spec: `combobox.spec.ts`.
    - Component suites `autocomplete.ts` and `search-view.ts` (every suite, binding and target).
    - The browser screenshot `search-and-autocomplete`: the scrolled bar, the docked and
      contained views, and the filled and outlined autocomplete, open.
    - Indication fixtures (web and native): additions only. Autocomplete per variant, and
      `searchBar[scrolled=true]`.
    - `RN_COMPONENTS` gains `searchView` and `autocomplete`.
- **Theme conformance:**
    - Radii come from roles, so `radii.spec` passes with no exception.
    - Colours come from tokens. Static themes (teal, sharp, dense) and the runtime seed theme
      pass `themes.e2e.test.ts` for both components on Panda, Tailwind and CSS in Solid and
      React.
    - Logical properties only. The direction suite passes.
    - Motion: the contained travel uses keyframes and stops under reduced motion. The surface
      uses the dialog's motion.
    - Density: autocomplete has it (the field's). The search view has no density.

## Deviations from the design

- The `searchView` surface is the composite's `surface` part, not `content`, because the preset
  already has a `content` slot (the suggestions).
- **Focus:**
    - The search bar is the view's trigger, but Root doesn't render it: the app puts it inside
      `Trigger`, or the ready-made does.
    - Focus returns to the element focused before the view opened, through Zag's
      `restoreFocus`. That is normally the bar's input.
    - The view's combobox runs with `disableLayer`, so the dialog alone handles Escape and
      outside presses.
- The autocomplete has no hidden input: the combobox input submits the typed text under
  `name`. `value` is the chosen suggestion's, as on the select.
- Indication: neither new preset component declares any. Their suggestions use the menu's
  `item` entry through the composites. The component suites skip the shared-source press test
  for the search view through a new `IndicationCase.modal` flag, because the modal keeps the
  pointer off other components.
- Deprecated options: none. The search bar had no deprecated option; both components are new.

## Stubs and gaps

- **React Native:**
    - Autocomplete: no arrow-key navigation, no groups, no `allowCustomValue`/`openOnClick`, no
      `aria-autocomplete`. The list uses the menu's test ids. Tapping the input while the list
      is open closes the list.
    - SearchView: no keyboard highlight; typing in the bar doesn't open it. The suggestions
      draw as a `Menu` surface inside the content. The test ids come from `searchViewAnatomy`,
      so there are no `trigger`, `positioner` or `surface` ids. Docked and contained placement
      isn't re-measured on scroll or rotation.
    - The contained icons' travel isn't drawn (keyframes are web only).
- No scrim behind the docked or contained view. The app can render `Scrim`.
- The full-screen view isn't in the screenshot section, since it covers the viewport.
- React autocomplete form reset: Zag sets a value a microtask later, past the reset's reason.
  React therefore reports the reset's value change itself and drops Zag's report of it
  (`resetTo`).
- `controllable.e2e` "a prop change moves it without calling back" for the React autocomplete
  failed once in about five runs under machine load (the text still showed the old label). It
  passed three times in a row alone and in the full component run. It is probably Zag's
  microtask `syncSelectedItems` racing React's commit.

## How to verify

- `omni run build test -b c57cab9 -w -o continue`: 100 succeeded and 1 failed. The failure was
  `rn-web-demo`'s config, which couldn't resolve `@pureform/rn-adapter` while another build
  rewrote its dist. `-f failed` then gave 101 succeeded.
- tsc is clean in preset, anatomy, machines, binding-core, solid, react, react-native,
  `tests/component-suites`, `tests/panda-fixture` and `tests/browser-e2e-tests`.
- `cd tests/component-suites && bunx vitest run -c vitest.config.e2e.ts -t "Autocomplete|SearchView"`
  gave 1199 passed and 1 failed (the flake above).
- `tests/browser-e2e-tests`: `indication.e2e.test.ts` and `visual.e2e.test.tsx` pass after
  recording the new fixture lines and the screenshot.

## Notes for the next phases

- `bun install` still fails ("Workspace dependency @pureform/machines not found", as noted in
  r2). `@zag-js/combobox` is in the root catalog and `packages/machines/package.json`, and it
  resolves locally, but `bun.lock` wasn't regenerated. The merge needs a `chore(deps)`
  lockfile commit.
- For c4b: the app bar with search should set the search bar's `scrolled` and use
  `SearchView` with `Trigger` around the bar.

## Refactoring hints

- **Helpers that look generic:**
    - `autocompleteMatches`/`containsFilter` (binding-core): any filtered list, such as c5's
      time input suggestions.
    - `opensSearchView`: any trigger that opens on typing.
    - The `scrollContentToTop` guard (`machines/src/combobox`): Zag's select and menu may have
      the same mount-time layout. Check whether they run it on mount.
    - `SEARCH_VIEW_KEYFRAMES`, an inline-axis travel with an `rtl` swap: c4's toolbar or
      carousel motion could share a "travel along the inline axis" keyframe pair.
- **Code that looks like a sibling's:**
    - `autocomplete.ts` (preset) copies `select.ts` except for the input's `cursor`. A
      `createSelectField({ editable })` in `select.ts` or `field.ts` would serve both.
    - The Solid and React `autocomplete.tsx` repeat the select bindings' field parts (affixes,
      label, supporting text, positioner/content, items and groups). This adds a third copy to
      r1/r2's "field parts" hint.
    - The `DropDownArrow` SVG is copied once more. It belongs in `glyphs.tsx`, with a new
      `BackIcon` (search view).
    - The search view's Root/Positioner/Surface follow `fullscreen-dialog.tsx` (dialog machine,
      presence, `stackPositioner`). c3b's sheets do too. This is the r3 "dialog chrome" item.
    - Search view items repeat the menu's item parts (`Menu.Items` and `Menu.ItemEntry` are
      tied to the menu's context, so they couldn't be reused). An items renderer that takes a
      scope and a machine `getItemProps` would serve the menu, select, autocomplete and search
      view.
    - React Native: the autocomplete's anchored list copies the select's and the menu overlay's
      placement.
- **Suggested home:** `field.ts` for the select-like builder; each binding's `glyphs.tsx`; a
  binding `overlay`/`dialog-parts` module for the dialog chrome; and a binding `menu-items`
  helper taking the scope and the item props.
- **What must not change:**
    - the snapshots `search-view.spec.ts.snap`, `autocomplete.spec.ts.snap`, and the searchBar
      entry in `new-components.spec.ts.snap`
    - the indication fixtures and the `search-and-autocomplete` screenshot
    - the component suites' `Autocomplete`/`SearchView` cases and `anatomy-drift.spec.ts`

## Open questions

- These values are unconfirmed (m3.material.io can't be read without a browser):
    - Spec values from the MDC docs and recalled from Compose: the full-screen 72dp and docked
      56dp headers, docked min 240/min-width 360, max height 560px (M3 says ⅔ of the screen),
      the container `surfaceContainerHigh`, the divider `outline`, and the header
      padding 8 and gap 4.
    - The contained view's colors (root `surfaceContainer`, pill `surfaceContainerHigh`) and
      the 16px icon travel over `medium2` with emphasized decelerate.
    - The scrolled search bar's container role (`surfaceContainerHighest`).
- Should the docked view show a scrim, and should it trap focus (it does now, like the
  full-screen view)?
- Should the autocomplete clear `value` when the text no longer matches its label? Today
  editing the text keeps the value until another choice.
- Should the autocomplete's list filter by the current text when opened from the arrow? Today
  it shows everything until the user types.
