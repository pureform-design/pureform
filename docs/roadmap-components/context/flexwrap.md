# flexwrap: Text field counter row and snackbar long action (output context)

Commits: see `git log 6138e87..flexwrap-layouts`. The two intended changes proposed in
[r2](r2.md#proposed-intended-changes), now that core has `flexWrap` (c2c).

## Built

- **Text field / text area (breaking):** the `supportingRow` part is gone. `counterParts`
  (`packages/preset/src/components/field.ts`) makes the root a wrapping row (`flexDirection:
row`, `flexWrap: wrap`), gives the container `flexBasis: 100%` (it keeps the first line), and
  the supporting text `flexGrow: 1`, `flexShrink: 1`, `flexBasis: 0` (it fills the next line
  beside the counter, and long text wraps before the counter rather than pushing it onto its
  own line). `COUNTER_SLOTS` is `["counter"]`, `COUNTER_STRUCTURE` is
  `root: [container, supportingText, counter]`. The select (same `fieldParts`) is untouched: its
  root stays a column. Removed with it: the machine's `supportingRow` anatomy part and
  `getSupportingRowProps()`, binding-core's part name, Solid's and React's `SupportingRow`
  parts, React Native's `supportingRow` view (the counter now renders in the root), the
  registry fixtures' slot, and the wrapper in `tests/panda-fixture/src/page.tsx`. `generated.ts`
  regenerated; the c0b drift test passes.
- **Snackbar `longAction`:** the root keeps its row and wraps (`flexWrap: wrap`); the supporting
  text takes a whole line (`flexBasis: 100%`) and the `actions` wrapper sits at the end of the
  next line (`marginInlineStart: auto`), replacing the column + `alignItems: stretch` +
  `justifyContent: end`. The `actions` part stays (it keeps the action and close together).
  Stale comment in `snackbar.ts` updated.
- Specs: `text-field.spec.ts` (structure, root wraps, container basis), `snackbar.spec.ts`,
  snapshots `text-field`, `text-area`, `new-components` (snackbar's `longAction` only), the
  Solid/React text field specs' part lists, React Native's `components.spec.tsx` (counter in
  the root) and `overlays.spec.tsx` (the queue's long-action snackbar: `flex-wrap: wrap`, the
  actions below the text and at its end, under both motion engines).
- Docs: preset, machines, Solid, React READMEs; gap analysis §2.2 snackbar row, §2.5 text field
  rows, §7 snackbar row and "Removed, and why".

## Visible diffs

None. No screenshot or indication fixture changed: `text-fields`, `icon-fields-and-areas`,
`affixes-and-counter` (the only fixture with a counter, now without the wrapper) and
`search-and-feedback` (a `oneLine` snackbar) pass unchanged, and both indication fixtures pass.
An ad-hoc Chromium render of the before/after CSS (filled and outlined fields with short and
long helper text, with and without a counter, counter alone; `longAction` snackbars with short
and two-line text, LTR and RTL) gave the same box for every visible part; only two invisible
boxes grew (the supporting text beside a counter fills the line; the `actions` wrapper is now
its content's width, at the end, instead of the full line). React Native was checked through
`overlays.spec.tsx` (above). No screenshot shows `longAction`, before or after.

## Output comparison

`JSON.stringify(pureform())` differs only under `components.textField` and
`components.textArea` (`$meta.description`, `slots`, `structure`, `recipe`) and
`components.snackbar.recipe`. The generated `.pureform/` dirs (css, tailwind, solid, react,
rn-web demos and the panda fixture) differ only in the registry hash line, `registry.d.ts`'s
text field/area slot unions, `web/textField.ts`/`web/textArea.ts` (no `supportingRow` slot), and
`styles.css`'s text field, text area and snackbar `longAction` rules.

## Deviations from the design

None. Breaking removal (public): `supportingRow` slot, `getSupportingRowProps()`, `SupportingRow`
parts. Replacement: `flexWrap` on the existing row, the root; put the supporting text and the
counter in the root directly.

## Stubs and gaps

- No screenshot of the snackbar's `twoLine`/`longAction` layouts (as in c1f).

## How to verify

- `omni run build test -b 6138e87 -w -o continue`: everything passes except load-related
  timeouts under the sibling c4 agents (component-suites indication/controllable for other
  components, browser parity "disabled"); each passed when rerun alone.
- `bunx tsc --noEmit -p tsconfig.json` in preset, machines, binding-core, solid, react,
  react-native, anatomy, tests/panda-fixture.
- `cd tests/component-suites && bunx vitest run -c vitest.config.e2e.ts -t "TextField|TextArea|Snackbar"`
  (2034 passed); `tests/browser-e2e-tests`: `visual`, `indication`, `rn-indication`, `parity`.

## Refactoring hints

None: the change removes a wrapper rather than adding code.

## Open questions

- In `longAction` the close button still sits beside the action at the end (c1f's choice).
- Merge notes: `packages/anatomy/src/generated.ts` is generated (rerun `generate`); the gap
  analysis tables may need reformatting (oxfmt) if a sibling edits the same rows.
