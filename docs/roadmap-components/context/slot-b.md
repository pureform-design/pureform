# slot-b: containers and tokens

Branch `slot-b`, from `main` at 4795d408, `main` merged in at cdaad42b (r12, r11-followup).
Second of five batches (a-e).

## What was done

1. **binding-core** (`parts.ts`): `InnerProps<C>` (each binding supplies `C`, its customize props)
   and `overDefaults(defaults, own)`: own wins; `className`/`class` join (per part when keyed);
   `style`/`slotProps` merge per part, `tokens` per token; returns either input as-is when the
   other is empty. Unit tests in `parts.spec.ts`. React and Solid add `CustomizeProps<A>`
   (`SlotKeyedProps` + `tokens`) and `InnerPropsOf<A>` in `parts.tsx`, exported.
2. **List, SelectionList** (React, Solid): `class(Name)`/`style`/`slotProps` keyed by the list's own
   parts (`root`, `item` = each `<li>`, now reachable); `listItemProps`; items take their own
   customize props, which win. `tokens` are the list recipe's; `listTokens` and the
   listItem-keyed `slotProps`/`unstyled` are gone. `List.Root` takes `unstyled`, and no longer
   passes tokens to items (`ListVariantProps` dropped `tokens`).
3. **RadioGroup**: `radioProps`; group `tokens` and radio-keyed `slotProps`/`unstyled` removed
   (`RadioGroupVariantProps` = color, density). Own keyed props (no `unstyled`: the group is
   unstyled). **ButtonGroup**: `tokens` (was `groupTokens`), `unstyled`, keyed own props,
   `buttonProps` + `iconButtonProps` (it draws both), `indication` forwarded to buttons.
   **ChipSet**: `tokens` (was `setTokens`), `unstyled`, keyed own props, `chipProps`, `indication`
   forwarded (Solid's `SetChip` used to override a chip's own tokens with the set's; fixed).
   **Toolbar**: keyed own props, `buttonProps` + `iconButtonProps` (merged with `overDefaults`
   over the hidden-element style). **TagsInput**: `chip` lost `tokens`; `chipProps` (tokens,
   testId, unstyled, and the chips' parts in the ready-made).
4. Variants stay flat; containers' variants are children's defaults, children's own win.
5. **React Native** (tokens only, batch d does the rest): List/SelectionList `tokens` own +
   `listItemProps` (`tokens`, `testId`); RadioGroup `radioProps` (stable tokens via
   `useStableSelection`, so memoized radios still skip renders); ButtonGroup `buttonProps` /
   `iconButtonProps`; ChipSet `chipProps`; TagsInput `chipProps.tokens`; `indication` forwarded.
6. READMEs (react, solid, binding-core), the solid demo (`container: "transparent"` moved to item
   tokens, same output), changelogs (new `CHANGELOG.md` in react, solid, binding-core,
   react-native, `#### Breaking changes`). Stories are generated: nothing to edit.

## Tests

- Specs: list-item (List), radio-group, chip-set, button-group, toolbar, tags-input in React and
  Solid; RN `rows.spec`. The React fake registry's `list`/`listItem` now write a token var
  (`tokened` helper) so tokens are assertable.
- `omni run build test -p` binding-core, react, solid, react-native: pass, except load flakes that
  pass alone (RN `table.spec` sort arrow, Solid `carousel.spec` reduced motion).
- Storybook, generated stories ButtonGroup, ChipSet, List, RadioGroup, SelectionList, TagsInput,
  Toolbar on solid, react, native: 84/84 each.
- e2e: no component-suites file covers list, radio or chips (only the indication benchmark
  mentions them), so none ran.
- `tsc` clean in binding-core, react, solid, react-native, solid-demo.

## Notes

- The commit-msg hook's `cog check` fails on old history; commits were checked with
  `cog verify` and made with `--no-verify`. `cog install-hook` can't run in a linked worktree
  (`.git` is a file); it was installed from the main checkout (shared hooks dir).

## Refactoring hints

- **Helpers that look generic:** `overDefaults` (binding-core) for every container in batches
  c-e. Solid's "getter object over `props.xProps` then `createSlotProps`" appears in RadioGroup
  and TagsInput; a `createInnerSlotProps(() => props.radioProps)` helper in `solid/src/parts.tsx`
  would remove it. React's `useSlotProps(radioProps ?? EMPTY)` is the equivalent.
- **Code that looks like a sibling's:** the ready-made pattern "destructure keyed props, spread
  `slot("root")` on Root" is now in List, SelectionList, RadioGroup, ButtonGroup, ChipSet,
  Toolbar in both bindings. `item.testId ?? xProps.testId` repeats (testId is the only per-item
  own prop on button/chip/radio items).
- **Suggested home:** binding-core `parts.ts` for platform-neutral helpers; per-binding
  `parts.tsx` for the Solid getter helper.
- **What must not change:** the specs above, the storybook story files above, `parts.spec.ts`.

## Open questions

- ButtonGroup and Toolbar take both `buttonProps` and `iconButtonProps` (they draw both
  components); the brief named only `buttonProps`.
- Items of ButtonGroup/ChipSet/Toolbar/RadioGroup have only `testId` of their own; per-item
  `className`/`tokens` there would need the item data types to take `InnerPropsOf` (List and
  SelectionList items do).
- Compound `List.Root`/`RadioGroup.Root` no longer give tokens to children; set them per item.
- Toolbar's overflow `Menu` isn't reachable (`menuProps` left for a later batch).
- `overDefaults` merges `unstyled` by own-wins, not per part.
