# f2d: Table sort arrow (output context)

Branch `f2d-sort-arrow`, from main `fdbae596`. Commits: `git log fdbae596..f2d-sort-arrow`.

## What changed

- **Hover hint follows `sortStart`.** The arrow's turn is now decided by the arrow itself, not by
  its header cell's `aria-sort`, so an unsorted column's hint can point the way a click would sort.
    - Machines: `arrowDirection(sort, column, start)` (`table.logic.ts`, also React Native's) and
      the API's `arrowDirection(column)`; `getSortIndicatorProps`' `data-direction` uses it
      (same value as before).
    - Core: `STATE_ATTRIBUTES.descending` = `data-pf-descending`. The `descending` condition and
      slot state now match that attribute (css-lowering `conditions.ts`) instead of
      `[aria-sort=descending]`: the old match is removed, since the new one covers a sorted
      column too (nothing else used it).
    - Preset: `arrowTurn = turnedOver(slot("sortIndicator", "descending"))` (own slot, was
      `headerCell`). Snapshot updated (`"&:is([data-pf-descending])"`).
    - React and Solid set `states: { descending }` on the `sortIndicator` part from
      `api.arrowDirection(column)`. React Native passes `descending` from `arrowDirection` with
      `sortStart` (new `start` prop of its `SortHeader`).
- **Overshoot kept.** The turn stays on `springTweens("spatialFast", ["transform"], ["opacity"])`;
  nothing clamps it. Docs say it overshoots under expressive.
- **Web binding spec.** `tests/component-suites/src/table-sort.e2e.test.ts` (styled, every web
  binding and target) reads the arrow's computed transform: 0° unsorted/ascending, 180° sorted
  descending, 180° on every unsorted column with `sortStart: "descending"`, back to 0° on an
  ascending column. Reduced motion, so the end value is read at once.
- Unit specs: machines (`arrowDirection`), React and Solid (`data-pf-descending` marking),
  React Native (hint turned with `sortStart`), preset spec.
- Docs: core, css-lowering, preset READMEs; `component-architecture.md` (state row, §5.8.1).

## Tests

- `omni run build test -p` core, css-lowering, machines, preset, react, solid, react-native: pass
  after the snapshot update. Unrelated load flakes seen: react-native `overlays.spec.tsx` bottom
  sheet (known), `tab-indicator.spec.tsx`, `overlays.spec.tsx` snackbar, `rows.spec.tsx`, and
  `table.spec.tsx` "sorts by a header's button" (opacity mid-fade at mount); each passed on
  rerun (`table.spec.tsx` twice alone).
- `bunx tsc --noEmit -p tsconfig.json` clean in those seven packages.
- Component suites, `solid/css`, `react/panda`, `react/tailwind`: `table-sort.e2e.test.ts` 4
  passed each; `direction` and `themes` `-t Table` on `solid/css`: 17 passed.
- Browser suite `reduced-motion` and `state-matching` files: 162 passed.
- Setup note: the component suites need `omni run build -p` the three adapters and `omni run
generate -p @pureform/panda-fixture` first.

## Refactoring hints

- **Helpers that look generic:** `arrowDirection` (`machines/src/table/table.logic.ts`): none
  other would use it.
- **Code that looks like a sibling's:** the `states: { descending }` marking on a part beside
  slider's `states: { overflowing }`; no duplication.
- **Suggested home:** none.
- **What must not change:** `table.spec.ts.snap` (new selector), `reduced-motion` expectations,
  the new `table-sort.e2e.test.ts`, react-native `table.spec.tsx`.

## Open questions

- `descending` no longer matches `aria-sort`. A theme that styled a header cell by it (none in
  the repo) must now put the state on the arrow. Say if the header should keep matching too.
- The `descending` state is on the arrow only; the sort header and label don't get it.
