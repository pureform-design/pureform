# c2c: Input chip and tags input (output context)

Commits: see `git log 8dc8065..c2c-input-chip-tags`.

## Built

- **Style AST** (`packages/core/src/ast`): `flexWrap` (`nowrap`, `wrap`, `wrapReverse`), with
  the CSS spelling (`wrap-reverse`, `css-lowering/src/css.ts`) and React Native's
  (`rn-adapter/src/props.ts`, which already listed the property). The tags input's row needs it.
- **Preset `inputChip`** (`packages/preset/src/components/input-chip.ts`): parts `root, avatar,
icon, label, remove, touchTarget` (the gap analysis' draft). Outlined only; selected
  (`aria-selected`) fills with the secondary container. Morph from `cornerMorphTokens("square", …)`
  and `cornerMorphVariants("square")` (r1), plus `color` and `density`. The root pads 12 per side
  and the avatar, icon and remove button reach Material's 4, 8 and 8 insets with negative margins
  (`sub(inset, padding)`), so no presence variant exists. Two indication entries: `root` and
  `remove` (centered). 0 compounds.
- **Preset `tagsInput`** (`tags-input.ts`): `FIELD_SLOTS`/`FIELD_STRUCTURE` over `fieldParts`
  (`iconRoom: "container"`), the container a wrapping row (`chipGap`), the input flexing from
  `inputMinWidth` at a chip's height, block padding per fill with density's half offsets
  (filled 24/8, outlined 12/12), label resting on the first line's center. Own `leadingIcon`/
  `trailingIcon` variants (the room goes to the container's inline padding). 1 compound (the
  field's outlined label beside a leading icon).
- Registered in `index.ts` and `pureform.ts`; specs `input-chip.spec.ts`, `tags-input.spec.ts`,
  and entries in `pureform.spec.ts`, `density.spec.ts`, `color-variants.spec.ts`, `a11y.spec.ts`,
  `icons.spec.ts`, and `anatomy/src/anatomy.spec.ts` (icon parts, indication). `generated.ts`
  regenerated.
- **Machine** (`packages/machines/src/tags-input/`, subpath `@pureform/machines/tags-input`):
  Zag's `tags-input` (new dependency `@zag-js/tags-input` 1.46.0, catalog + `bun.lock` by hand,
  since `bun install` failed to re-resolve the workspace with the change), `editable: false` by
  default, and per-chip interaction emitters keyed by Zag's item id; the highlighted chip hovers.
  `connect` adds `getContainerProps`, `getChipProps` (item preview), `getChipItemProps` (Zag's
  item, `display: contents`, so focus inside a chip doesn't blur the field), `getChipLabelProps`,
  `getChipRemoveProps`, `getChipDecorationProps`. `anatomy` (tagsInput) and `chipAnatomy`
  (inputChip) join the drift test.
- **binding-core:** `components/input-chip.ts` (`InputChipVariantProps`, `inputChipSelection`),
  `components/tags-input.ts` (root props, content props, `tagsInputMachineProps`,
  `tagsInputFilled`, `tagsInputChipTestId`); usage entry `tags-input` (tagsInput groups, inputChip
  and ripple kept whole).
- **Bindings:** `@pureform/{solid,react,react-native}/tags-input` exporting `TagsInput` (ready-made
  plus parts in Solid/React: `Root, Container, LeadingIcon, Input, Label, TrailingIcon,
SupportingText, Chip, ChipTouchTarget, ChipAvatar, ChipIcon, ChipLabel, ChipRemove`). The chips'
  variants come in one `chip` prop. The input chip has no subpath of its own: it is only used in
  the field. React Native implements the behaviour itself (Enter or the delimiter adds, Backspace
  on an empty input removes the last, each remove button removes).
- **Tests:** binding specs (Solid, React: 6 cases each; React Native: 4 in `components.spec.tsx`),
  machine spec, component-suites case `tags-input.ts` (every suite, every binding and target), the
  `input-chips` screenshot (Panda fixture page section), indication fixtures (web and native,
  additions only), `RN_COMPONENTS` gains `inputChip` and `tagsInput`.
- Docs: gap analysis (§1.1 and §1.5 rows, §1.8 totals, §2.1 rows, §7 rows and the removed note),
  READMEs (preset, solid, react, react-native, binding-core, machines, anatomy, component-suites).

## Deviations from the design

- Deprecated options: none to remove. The chip never had an input variant; the chip's header
  comment now points input chips at `inputChip`.
- Zag's highlighted chip shows as hovered (as the select's highlighted option), not as selected:
  `selected` needs `aria-selected`, which a non-option element shouldn't carry.
- The hidden input submits Zag's `valueAsString` (`"red, blue"`), rendered as a controlled value
  in both bindings, since Zag sets it once.
- Zag only reads a disabled fieldset for its own state, so both bindings pass
  `disabled: props.disabled || useFieldsetDisabled(hiddenInput)` to the machine.
- In-place tag editing is off (`editable: false`): the input chip has no editing part.

## Stubs and gaps

- No form reset handling in the web bindings (the suite's case doesn't claim `resets`).
- React Native: no highlight-then-delete on Backspace (one Backspace removes), no arrow-key
  navigation, no `required`/`name`/`form`/`addOnPaste`/`blurBehavior`; the default remove icon
  is a "✕" glyph. No React Native indication case for the tags input in `rn-indication`.
- The indication suite reaches the remove button by script: Zag gives it `tabIndex=-1`.
- The input chip's avatar part has no container color: it's for an image.

## How to verify

- `omni run build test -b 8dc8065 -w -f all -o continue` (component-suites and browser-e2e
  included).
- `bunx vitest run -c vitest.config.unit.ts src/tags-input` in `packages/solid`, `packages/react`,
  `packages/machines`; `bunx vitest run` in `packages/preset`.
- `cd tests/component-suites && bunx vitest run -c vitest.config.e2e.ts -t TagsInput`.

## Notes for the next phases

- `flexWrap` now exists in the style AST; the snackbar's comment saying it doesn't is stale (c1f's
  file, left alone).
- A Zag composite whose items need focus inside them must keep Zag's `item` element around the
  styled part, or focus inside counts as outside.

## Refactoring hints

- **Helpers that look generic:**
    - The "pull a part to its inset with a negative margin" trick (`pullOut` in
      `input-chip.ts`): list items or the chip could use it instead of presence variants.
    - `tagsInputFilled` / the container's `filled` state for content that isn't text: the select
      does the same with `data-pf-filled`.
- **Code that looks like a sibling's:**
    - The tags input's icons, label and supporting text repeat `text-input.tsx` (Solid, React)
      and the select's field parts: an r-phase "field parts" helper in each binding (r1 already
      flagged the affix and counter parts).
    - `ChipRemove` copies the snackbar's button (`useOwnInteractionSource` +
      `useInteractionHandlers`); a `ownSurfaceButton(part)` helper in each binding would serve both
      and c2b's full-screen dialog close and confirm actions.
    - The remove icon SVG duplicates the snackbar's close icon (Solid, React).
    - The tags input's block padding by fill and density (`sized` in `tags-input.ts`) repeats
      `text-area.ts`'s pattern.
    - The highlight-to-hover `track` in `machines/src/tags-input/index.ts` repeats
      `trackHighlight` (keyed by `highlightedTagId` and without `open`): generalize
      `trackHighlight` to take the key reader.
- **Suggested home:** `packages/preset/src/components/field.ts` for a `wrappingField` builder;
  `packages/machines/src/interaction/highlight.ts` for the generalized track; each binding's
  `parts`/`interaction` module for the own-surface button.
- **What must not change:** `__snapshots__/{input-chip,tags-input}.spec.ts.snap`, the indication
  fixtures, the `input-chips` screenshot, `anatomy-drift.spec.ts`, the component suites'
  `TagsInput` cases.

## Open questions

- Insets and sizes are from the M3 input chip spec as I recall it (avatar 24, icons 18, insets
  4/8/12); unconfirmed against m3.material.io.
- The filled tags input is 64px tall with one row of chips (24 above for the floated label, 8
  below), taller than a 56px text field. Should the chips shrink, or the field grow?
- Should the highlighted chip read as selected (secondary container) instead of hovered? That
  needs a `data-pf-selected` state attribute.
- Should the input chip get a subpath of its own for apps that place chips outside a field
  (Material Web has `md-input-chip` alone)?
