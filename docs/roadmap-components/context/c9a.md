# c9a: NumberField and CodeField (output context)

Branch `c9a-number-code-field`, from main `e1011942`. Commits: `git log e1011942..c9a-number-code-field`.
Not pushed; main untouched. Neither component is in M3. Both are **pureform's own designs**, built
from the text field's parts and tokens (as c6 recorded its own designs).

## Done

**Preset** (`packages/preset/src/components/number-field.ts`, `code-field.ts`, with specs and
snapshots; registered in `index.ts`, `pureform.ts`, `contrast.ts` (`FIELD_PAIRS`), the color and
density specs, `icons.spec.ts`; gap analysis §1.8 count 69, architecture §5.5 compounds 29).

- `numberField`: `affixField` (filled or outlined, `leadingIcon`, `prefixText`, `suffixText`,
  `color`, `density`) without the trailing icon. In its place a `control` (absolute, `controlInset`
  4px from the end, centred) holds `decrementTrigger` and `incrementTrigger`: round,
  `triggerSize` 40px (a small icon button), the field's `iconSize` glyph, a state layer of
  `iconColor`, a focus ring, the disabled colour and no pointer while disabled. The input (or the
  suffix) ends past the control (`controlInset + 2 × triggerSize + 4`). Indication entries for
  both triggers (centred). 1 compound (the affix field's outlined leading icon).
- `codeField`: `root` (column, `labelGap`), `label` (bodySmall, focus/error/disabled colours from
  the root), `control` (row, `cellGap` 8), `input` cells (`cellWidth` 48, `height` 56 plus the
  density offset, centred `headlineSmall` text), `supportingText`. Each cell draws the text field's
  filled indicator or outlined stroke from its **own** states (hover, focus, `aria-invalid`,
  disabled), not a container's. `variant`, `color`, `density`; 0 compounds. Radii from
  `extraSmall` and `full` roles (no exception).

**Machines**: `@pureform/machines/number-input` and `/pin-input` (Zag 1.46; `numberInput`,
`pinInput` at the root; catalog and machines deps added). Anatomies extend Zag's with the preset's
parts (drift test). Fixes over Zag, all in the wrappers:

- Number input `connect`: a trigger at a limit is `aria-disabled="true"` rather than `disabled`
  (the field's container reads `:has(:disabled)` as the whole field disabled, which greyed the
  label: axe failed at the maximum and read-only); a press also ends on the document's
  `pointerup`/`pointercancel` (Solid's delegated events skip a disabled element, so the press never
  ended and the field kept spinning, deaf to keys).
- Number input `trackFormControl`: fieldsets by the browser's rule (`../form`), keeping Zag's
  reset to the initial value.
- Pin input: Backspace in an empty cell clears the cell before the focus first, then moves.
  Zag's order (move, then clear at the focus) read a write Solid's adapter hadn't flushed, so it
  cleared the empty cell again.

**binding-core** (`components/number-field.ts`, `code-field.ts`, specs, `usage.ts` entries
`number-field` and `code-field`, glyphs `remove`/`add`):

- Contracts in Zag's shape: `value` is text (`NumberFieldValueDetails { value, valueAsNumber }`)
  and a list of characters (`CodeFieldValueDetails { value, valueAsString }`).
- `numberFieldMachineProps` always gives Zag `locale` (`NUMBER_FIELD_LOCALE` `"en-US"`) and
  `formatOptions` (`NUMBER_FIELD_FORMAT` `{ maximumFractionDigits: 20 }`): Zag only formats and
  parses in the locale when it has format options. So `value` and `defaultValue` are text in the
  locale (`"1.234,5"` under `de-DE`), and en-US shows grouping (`1,234`).
- React Native arithmetic: `numberFieldParse`/`Format`/`Step`/`Clamp`/`CanStep`/`OutOfRange`,
  `NUMBER_FIELD_SPIN_DELAY` 300 and `_INTERVAL` 50 (Zag's), `codeFieldEnter` (a pasted code fills
  from its cell, or from the first when it's whole), `codeFieldBackspace` (Zag's splice), cells
  and labels (`pin code 1 of 4`, Zag's).

**Bindings**: `NumberField` and `CodeField` in React and Solid (ready-made and parts: `Root`,
`Container`, `LeadingIcon`, `PrefixText`, `Input`, `SuffixText`, `Label`, `Control`,
`DecrementTrigger`, `IncrementTrigger`, `SupportingText`; `Root`, `Label`, `Control`,
`Input` by `index`, `SupportingText`, hidden input), exports, vite entries, Zag in
`optimizeDeps`, registry fixtures, READMEs. The code field follows a disabled fieldset with
`useFieldsetDisabled` on its hidden input (Zag's pin input doesn't). React Native: both
components without Zag (binding-core's arithmetic), the triggers with their own indication and
press-and-hold timers, each code cell with its own states, `autoComplete="one-time-code"` /
`textContentType="oneTimeCode"` for `otp`, `secureTextEntry` for `mask`.

**Cases and suites**: `component-cases` `number-field.ts`, `code-field.ts` (examples, `state`,
`form`, `keyboard` with arrows: Up/Down step, Left/Right move the caret; the code field's
tabbable cell follows focus); both bindings' scenes; Storybook generates `NumberField` and
`CodeField` stories (controls checked: `formatOptions` is `@control none`). Browser suite: a
`number-and-code-fields` screenshot section (fixture page), RN components list, indication
fixtures (additions only).

## Tests

- `omni run build test -p` preset, anatomy, machines, binding-core, react, solid, react-native,
  component-cases: passed after one `-f failed` rerun (the first run's failures: the number
  field snapshot, then updated; and three unrelated ones that passed on rerun: rn-adapter
  `factory.spec.ts` "gives what selection gives…" timed out at 60s, Solid
  `fade-through.spec.tsx` "drops the old page at once…", React Native `components.spec.tsx`
  "c8c: splitter … snaps the divider").
- Component suites (after `omni run generate prepare -p @pureform/panda-fixture -p
  @pureform/component-suites`), `-t "NumberField|CodeField"` on solid/panda, react/css,
  react/tailwind: controllable, forms, keyboard, accessibility, direction, server-rendering,
  themes: 678 passed. Indication: no case (see open questions).
- Browser suite: visual `-t number-and-code-fields` (new screenshot, reviewed), indication
  fixtures `-u` (only added lines), rn-parity `-t "numberField|codeField"`, panda-factories and
  icons files: passed.
- `omni run build -p @pureform/storybook-web` passed.
- `bunx tsc --noEmit -p tsconfig.json` clean in preset, anatomy, machines, binding-core, react,
  solid, react-native, component-cases, component-suites, browser-e2e-tests, panda-fixture. No
  conflict markers. No deprecated options touched (new components).

## Refactoring hints

- **Helpers that look generic:** the cell's own-state field styling in `code-field.ts`
  (`byState` over `slot("input", …)`, `indicator`, the filled/outlined maps) restates
  `field.ts`'s `fieldParts` for a slot that is its own container. A `fieldParts` option for the
  state slot (`container` or the input itself) would share it. The number field's round
  `trigger` style is the input chip's `remove` at another size; a `roundIconButtonPart(ref,
  size)` in `shared.ts` could serve both (and the secure field's visibility toggle).
- **Code that looks like a sibling's:** the React and Solid number fields copy the text input's
  icon and affix parts (`text-input.tsx`'s `icon`/`affix`), and the tags input's Root shape;
  React Native's number field restates the field's container/label/affix rendering from
  `text-input.tsx`. The press-and-hold timer in RN's trigger is generic (c9e's rating or any
  stepper button could use it).
- **Suggested home:** a `holdRepeat(step, { delay, interval })` in binding-core; the field
  part builders in each binding's `text-input.tsx` exported for reuse; the trigger style in
  `packages/preset/src/components/shared.ts`.
- **Zag wrapper patterns:** the number input's `aria-disabled`-at-limit and document-release
  fixes, and the pin input's action reorder, are Solid-adapter workarounds (writes visible only
  at the next flush, delegation skipping disabled elements). If r9 makes the Solid adapter's
  actions read the latest writes (`readingLatest` around transitions), the pin input fix can go.
- **What must not change:** `number-field.spec.ts.snap`, `code-field.spec.ts.snap`, the
  `number-and-code-fields` screenshot, the numberField/codeField lines of the indication fixtures,
  the bindings' number/code field specs, and the component suites `-t "NumberField|CodeField"`.

## Open questions

- **Layout of the steppers:** minus and plus side by side at the end (40px each, touch-friendly,
  RN-friendly), rather than stacked chevrons. Say if stacked up/down chevrons are wanted.
- **Locale formatting by default:** the number field always formats (grouping included) since
  Zag otherwise ignores `locale`; the default locale is `"en-US"` (Zag's, and stable for server
  rendering), not the browser's.
- **Trigger indication isn't in the indication suite:** Zag keeps the triggers out of the tab
  order (`tabIndex -1`), so keyboard focus never reaches them, and `IndicationCase.focus` can't
  target one entry of two. The preset and fixtures cover their state layer; say if the suite
  should learn per-entry focus.
- **Code field label:** a static label above the cells (bodySmall), not a floating one; the
  cells are 48×56 with `headlineSmall` text. These are pureform's own values.
- **React Native code field paste:** a paste into one cell arrives as `onChangeText` with several
  characters and fills from there (or from the first cell for a whole code); there's no
  clipboard read.
- **Form reset:** the number field resets to its initial value through Zag; the code field has no
  reset handling (Zag's pin input has none), as the tags input.
- The rn-adapter `factory.spec.ts` sampling timed out once at 60s under load: two more components
  lengthen it; watch it at the gate.
