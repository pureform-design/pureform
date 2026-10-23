# r9d: Duplication and tests

Branch `r9d`. Items from [r9's subphases](../phases/r9-refactor.md#subphases): the expected
duplication list, c9's declined refactors, the machines root export, known flakes, `tsc` noise.

## Done

- **Machines root export** (`334f5ecf`): `@pureform/machines` exports the color picker from its
  root again; `index.spec.ts` checks the root and the subpath give the same machine and anatomy.
  React Native's splitter drags failing with it weren't caused by the export: the splitter takes
  its room from `onLayout`, which under load (the whole `components.spec.tsx` file) lands later
  than the two frames the spec waited. The specs now wait through a `measured()` helper before
  each drag. Tests: machines and react-native unit runs.
- **Known flakes:**
    - Solid fade through "drops the old page at once" (`f8a7e693`): a page settles a frame after
      its state's styles apply; the spec waits that frame before `settle()`. Test bug, not a
      component bug.
    - React Native splitter specs: above.
    - Seen during this batch's runs, all timing only (each passed on `-f failed` or failed only by
      exceeding its limit under the parallel agents' load): preset `carousel.spec.ts` "draws from a
      named theme's colors and a runtime seed's" (5 s timeout), machines `presence.spec.ts` "stays
      until the last of an exit's animations ends", react-native `presence.spec.tsx` FAB menu stagger,
      and rn-adapter `codegen.spec.ts`'s native sampling (124 s against a 120 s limit). Left as is:
      none failed an assertion about output on rerun.
- **`tsc` noise** (`aeee669d`): Solid's build writes declarations beside each entry's `.jsx`, so
  `apps/storybook-web` and the component suites (which have `allowJs`) type-check the
  declarations instead of the JSX. `component-cases`' `selectOptions` takes a mutable array, the
  remaining error. Tests: `bunx tsc --noEmit` clean in the touched packages; storybook-web builds.
- **Expected duplication, fields** (`7801e22b`, `3a39c281`): file upload and rating declare their
  group tokens through `colorTokenVariants` (preset `shared.ts`) instead of writing their own;
  `renderErrorSupportingText` renders the supporting text / error of the Zag fields (number field,
  code field, tags input, file upload) in React and Solid.
- **c9's declined refactor, visibility toggle** (`31e1c773`): `bareRoundButton` in the preset is the
  chrome-less round button `roundIconButton` builds on and the secure field's toggle uses.
- **Color picker's `hexOf`** (`8c4a8b24`): identical in React, Solid and React Native; now
  `colorPickerHexOf` in `binding-core/src/components/color-picker.ts`, typed structurally
  (`ColorPickerColorLike`) so binding-core needs no Zag dependency. Unit test added.

## Declined (with the check that failed)

- **`holdRepeat`:** still one user (`react-native/src/number-field`, the only `setInterval`
  repeat). Nothing to share.
- **Code field's per-cell field styles:** a `fieldParts` option changes `field.ts` for every field;
  no computed-style equivalence run in this batch to prove it output-neutral. Flexibility check fails.
- **React Native `useBoxDrag`:** one user (the color picker); the splitter and slider drag one axis
  with their own settle. Not obviously the same thing.
- **Transitions** (fade through vs shared axis vs FAB menu stagger), **closing** (`onClose` vs
  `closeAsker`, partly open sheet vs drag settle), **triggers and popups** (context menu, popover
  vs menu/tooltip positioning), **pointer drags** (splitter, color picker areas, slider thumbs):
  these overlap with r9b's and r9c's items (shared axis clipping, settling, overlays inside
  dialogs, sheet expanded events) and the files they edit; refactoring them here would conflict
  with sibling batches. Left for the merge or r10.
- **NativeSelect vs Select:** native `<select>` against a Zag listbox; they share only the field
  parts, which `renderErrorSupportingText` and the field builders already cover.

## Tests

- `omni run build test -p @pureform/binding-core -p @pureform/react -p @pureform/solid -p
  @pureform/react-native`, then `-f failed`: all pass except rn-adapter's codegen sampling timeout
  above (untouched by this batch).
- `bunx tsc --noEmit -p tsconfig.json` clean in binding-core, react, solid, react-native.
- `omni run build -p @pureform/storybook-web` passes.
- e2e: `themes` and `direction` suites, `solid/panda` and `react/css`, `-t ColorPicker`: 30 passed.

## Refactoring hints

- **Reuse:** `colorPickerHexOf`, `colorTokenVariants`, `renderErrorSupportingText`,
  `bareRoundButton`.
- **What must not change:** preset snapshots, color picker specs in each binding, the machines root
  export spec.

## Open questions

- The timing-only flakes above may want longer limits rather than more waits; not changed here.
- The duplication groups left for overlap with r9b/r9c should be looked at once those merge.
