# c1a: Text field, text area, select (output context)

Commits: 35afd10..(this docs commit), on `c1a-text-field` from 38e43e0.

## Built

- **Preset** (`packages/preset/src/components/field.ts`):
    - `AFFIX_FIELD_SLOTS`/`AFFIX_FIELD_STRUCTURE` (the field slots plus `prefixText` before and
      `suffixText` after the input), `COUNTER_SLOTS` (`supportingRow`, `counter`).
    - `AFFIX_TOKENS`: `affixColor` (`onSurfaceVariant`), `affixGap` (2px), and the 0/1 flags
      `prefixed`/`suffixed`.
    - `affixParts(ref, variant)`: the affix styles (body large, shown once the label floats via
      `floated`, block padding equal to the input's per fill), the `prefixText`/`suffixText`
      variants (set the flags on root), and replacement `leadingIcon`/`trailingIcon` variants:
      the input's inline padding is `blend(padding, 0, flag)`, and an icon's room moves to the
      affix on its side. The container becomes a flex row (input `flexShrink: 1`, `minWidth: 0`).
      No new compounds (text field still 1).
    - `counterParts(ref)`: `supportingRow` (flex row), `counter` (supporting text style, colour
      follows root `invalid`/`disabled`, `marginInlineStart: auto`), and `flexShrink: 1` on the
      supporting text.
- `textField`: slots `root, container, leadingIcon, prefixText, input, suffixText, label,
trailingIcon, supportingRow, supportingText, counter`; new variants `prefixText`,
  `suffixText`, `secure` (trailing icon drawn as a chrome-less button with
  `focusRing(themeIndication)` and `radius("full")`).
- `textArea`: adds `supportingRow`, `counter` (no affixes, no secure).
- `select`: adds `prefixText`, `suffixText` and their variants (no counter). Option groups:
  comment hook in `select.ts` and on `SelectItem` (binding-core) for c1c.
- **Machine** (`packages/machines/src/text-field`): anatomy gains the four parts (drift spec now
  also pairs `textArea`). Props `counterMax`, `secure`, `revealLabel` (default "Show password");
  computed `overflow` (value longer than `counterMax`, which also makes `invalid`); context
  `revealed`; event `REVEALED.SET`. API: `counterId`, `counterText` (`"3 / 20"`), `overflow`,
  `revealed`, `setRevealed`, `getSupportingRowProps`, `getCounterProps` (`data-overflow`),
  `getPrefixTextProps`, `getSuffixTextProps`, `getVisibilityTriggerProps` (button,
  `aria-pressed`, `aria-controls`). A secure input's `type` is `password`/`text`.
- **binding-core**: `TextFieldVariantProps` `prefixText`, `suffixText`, `secure`;
  `TextFieldBehaviorProps` `counterMax`, `revealLabel`; `ids.counter`; `TextFieldAffixProps<Node>`
  and `TEXT_FIELD_AFFIX_PROPS` (exported); `TEXT_AREA_ROOT_PROPS` listed explicitly (no affix or
  secure keys). Select: `prefixText`/`suffixText` variant and content props. Usage: textField
  passes `secure` as given.
- **Bindings**: Solid and React `createTextInput` get `PrefixText`, `SuffixText`,
  `SupportingRow`, `Counter` parts (text area drops the affix parts); the ready-made renders
  affixes when given (text field only, `affixes: true` config), the row only when a counter
  shows (so markup without `counterMax` is unchanged), and under `secure` a `<button>` trailing
  icon with a default visibility SVG. Select (Solid, React) gets `PrefixText`/`SuffixText`.
  React Native `Field`: affixes, counter (invalid past the limit), `secure` via
  `secureTextEntry` and a `Pressable` trailing icon (text glyph fallback).
- **Tests**: preset specs (affix flags, floated opacity, counter row, secure), machine specs,
  Solid/React/RN binding specs, component-suite examples (text field: affixes, outlined affixes
  with icons, counter, counter over the limit, secure; text area: counter; select: affixes),
  browser screenshot section `affixes-and-counter` (new png) in `tests/panda-fixture/src/page.tsx`,
  indication fixtures (+6 lines each: the secure trailing icon's focus ring).

## Deviations from the design

- `supportingRow` is a layout part not in M3's anatomy: core's `StyleMap` has no `flexWrap`, so
  the counter can't share the supporting text's row inside the column root otherwise. Material
  Web and Angular have the same wrapper. It's optional: supporting text directly in root works.
- The counter is soft (`counterMax`): overflow marks the field invalid rather than turning only
  the counter red; M3 shows the error state with the counter. Native `maxLength` still hard-limits.
- `secure` is a preset variant (button look of the trailing icon) plus machine behaviour.
- Deprecated options: none touched; nothing removed.

## Stubs and gaps

- No state layer on the secure toggle (only a focus ring); no 48dp touch target.
- `revealed` is not controllable (no `revealed`/`onRevealedChange`).
- Affix text is not added to the input's `aria-describedby`; the counter has no live region.
- React Native's default secure icon is a text glyph (◉/◡), like the select's "▾".
- Select option groups: c1c.

## How to verify

- `omni run build test -p @pureform/preset -p @pureform/anatomy -p @pureform/machines -p
@pureform/binding-core -p @pureform/solid -p @pureform/react -p @pureform/react-native -p
@pureform/css-adapter`: 63 succeeded, 0 failed.
- `bunx tsc --noEmit -p tsconfig.json` clean in preset, machines, binding-core, solid, react,
  react-native, tests/component-suites, tests/panda-fixture, tests/browser-e2e-tests.
- `tests/component-suites`: `bunx vitest run -c vitest.config.e2e.ts -t "TextField|TextArea|Select"`
  (2412 passed). `tests/browser-e2e-tests`: whole e2e config, 614 tests pass after recording the
  new screenshot and indication fixture lines.

## Notes for the next phases

- The full workspace run timed out three codegen "every combination" specs (css, tailwind,
  rn-adapter) while sibling worktrees loaded the machine; rn-adapter's passes alone (~2 min).
  The text field's variant space grew ×8 (prefix × suffix × secure) and select's ×4; if timeouts
  persist, lower those specs' sample limit rather than raising the timeout.
- `omni run generate` in a fresh worktree needs `packages/cli/dist/pureform.mjs`; a killed build
  leaves it missing and the fixture's `.pureform/` then fails to resolve.

## Refactoring hints

- **Helpers that look generic:** `affixParts` and `counterParts` in `field.ts` (c3c's
  autocomplete/search view and c5's date/time inputs will want both). The 0/1 flag padding
  (`blend(padding, 0, flag)`) is the same trick as the button's `square`.
- **Code that looks like a sibling's:** Solid's and React's `affix`/`SupportingRow`/`Counter`
  parts are duplicated in `text-input.tsx` and again (affixes) in each `select/select.tsx`; the
  `VisibilityIcon` SVG mirrors select's `DropDownArrow`. The secure toggle's button reset
  (`visibilityToggle` in `text-field.ts`) is what c1d's/c2's icon-button-like parts do.
- **Suggested home:** `field.ts` should own the whole field anatomy as a builder
  (`fieldAnatomy({ affixes, counter })` returning slots, structure, tokens and merged recipe),
  so `text-field.ts`, `text-area.ts`, `select.ts` stop merging `base`/`variant`/`icons` by hand.
  In the bindings, a shared `fieldParts(context)` (affixes, row, counter) in each binding used
  by `text-input.tsx` and `select/select.tsx`; binding-core could own the counter text.
- **What must not change:** the snapshots `text-field.spec.ts.snap`, `text-area.spec.ts.snap`,
  `new-components.spec.ts.snap` (select), the `text-fields`, `icon-fields-and-areas`,
  `select` and `affixes-and-counter` screenshots, and the indication fixtures.

## Open questions

- Should overflow mark the field invalid (current) or only colour the counter?
- Affix spacing (2px gap) and their vertical alignment come from Material Web's look, not
  confirmed M3 token values (m3.material.io unreadable without a browser).
- The secure toggle's label default is English ("Show password"); i18n via `revealLabel`.
- Merge notes for the orchestrator: `docs/design/component-gap-analysis.md` §1.5 and §2.5 table
  were reformatted by oxfmt (column widths), so expect a textual conflict with any sibling editing
  those tables; take both rows' content and reformat. `select.ts` is also touched by c1c (group
  part): c1a owns the affix lines. Shared files touched (additive): binding-core `index.ts`,
  `usage.ts`, the Solid/React registry fixtures' `FIELD_SLOTS`, `packages/machines/src/anatomy-drift.spec.ts`
  (one `textArea` pair), `tests/panda-fixture/src/page.tsx` (a new section), the browser suite's
  `SECTIONS` list and indication fixtures, and `packages/anatomy/src/generated.ts` (regenerate).
