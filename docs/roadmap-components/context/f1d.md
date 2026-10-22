# f1d: Table sort arrow

Branch `f1d-sort-arrow`, from main `aee1db3c`. Commits: `git log aee1db3c..f1d-sort-arrow`.

## What changed

- **Core: a `descending` state.** Added to `FormCondition` (so to `ComponentState` too) and
  to `SlotState` (`packages/core/src/ast/nodes.ts`): a column header sorted descending.
    - Web (`css-lowering/src/conditions.ts`): condition `&[aria-sort=descending]`, slot state
      `[aria-sort=descending]` at rank 1 (with hover, filled, selected, checked, expanded). The
      table machine already writes `aria-sort` on the header cell, so the web needs no new
      attribute. Like `selected` and `pressed`, it describes the slot's own element only (no
      `:has()` alternative): a nested table's sorted header mustn't turn an outer one.
    - React Native: `descending` in rn-adapter's `State` (`select.ts`) and the factory's
      `STATES` order (`factory.ts`, after `expanded`); the slot condition lowers to the state of
      the same name.
    - `styling`'s `types.spec.ts` lists the new state.
- **Preset (`table.ts`):** `sortIndicator` gets `transform: rotate(180deg)` on
  `slot("headerCell", "descending")`, else `rotate(0deg)`, and its transition becomes
  `springTweens("spatialFast", ["transform"], ["opacity"])`: the turn on the chevrons' spring,
  the fade on its `short3` tween. Reduced motion keeps only the opacity fade. Snapshot updated
  (`table.spec.ts.snap`), plus a spec for the turn.
- **Bindings:** React and Solid always render `ArrowUpwardIcon` (the ↓ swap and its
  `descending`/`direction` locals are gone); React Native always draws `↑` and passes
  `descending` beside `filled` through `indication.states`. Nothing removed from public API
  (`ArrowDownwardIcon` stays exported from the glyphs).
- **Tests:** react-native `table.spec.tsx` checks the indicator is unturned while ascending and
  turns (`matrix(-1, …, -1, 0, 0)`) once sorted descending; browser suite
  `reduced-motion.e2e.test.ts` expects `transform, opacity` with full motion and `opacity`
  reduced.
- **Docs:** preset README (table), css-lowering README (both state tables),
  `component-architecture.md` (state table row; §5.8.1 bullet).
- `omni run generate`: `packages/anatomy/src/generated.ts` unchanged (no anatomy change).

## Choices

- **The state on `headerCell`, matched by `aria-sort`,** not a new `data-pf-*` attribute or the
  machine's `data-direction`: ARIA covers it, and the conditions never match a behaviour
  library's own attributes. `sortIndicator` reads its ancestor's state, which the structure
  already allows (`headerCell → sortHeader → sortIndicator`).
- **Named `descending`, a boolean,** rather than a valued "sort direction" condition: the slot
  state vocabulary is boolean, and ascending is the rest position.
- **`springTweens` rather than `chevronTransition`:** the chevron's fade part is `color`; the
  arrow's is `opacity` (its colour never changes). Same spring role (`spatialFast`).

## Checks

- `omni run build test -p` core, css-lowering, rn-adapter, styling, preset, react, solid,
  react-native: pass after the snapshot update, except react-native's
  `overlays.spec.tsx > the snackbar queue … holds while the pointer is over it` (timed out
  under load; it passes on its own run, and doesn't touch the table). Preset's carousel and
  accordion "draws from a named theme's colors" timed out in the first run under load and passed
  on `-f failed`.
- `bunx tsc --noEmit -p tsconfig.json` clean in all eight packages.
- Browser suite `reduced-motion.e2e.test.ts`: 54 passed.
- Component suites `direction.e2e.test.ts` and `themes.e2e.test.ts`, `-t Table`, on `solid/css`,
  `react/panda`, `react/tailwind`: 51 passed.
- By mistake, `omni run build -p @pureform/browser-e2e-tests -p @pureform/component-suites`
  ran component-suites' whole `test:e2e` (their build depends on it): 6 failures, all in
  `indication.e2e.test.ts` for TagsInput, NavigationBar and SplitButton (timeouts under load),
  none on the table.

## Refactoring hints

- **Helpers that look generic:** none new. The arrow's `when()` turn is `expandIndicator`'s
  (`preset/src/components/list.ts`) with a different condition and fade property; if a third
  turning icon fades `opacity`, a `turnOver(condition, fades)` beside `chevronTransition` in
  `shared.ts` could take both.
- **Code that looks like a sibling's:** none from f1a–f1c.
- **Suggested home:** `shared.ts`, as above.
- **What must not change:** `table.spec.ts.snap`, `reduced-motion.e2e.test.ts` expectations,
  react-native `table.spec.tsx`.

## Open questions

- **Hint direction:** an unsorted column's faint hover arrow points up even when `sortStart` is
  `descending` (as before f1d in all three bindings; the machine's indicator `data-direction`
  says descending). Making the hint turn too would need the state on the header cell before it
  sorts, which `aria-sort` can't say; a `data-pf-*` attribute could.
- **Overshoot:** under the expressive scheme `spatialFast` (ζ 0.6) overshoots the 180° turn, as
  the chevrons do (m2c's open question).
- **No web assertion of the rotated computed transform** in a binding spec (the Solid/React unit
  registries don't load the preset CSS); the Panda snapshot and the reduced-motion suite cover
  the selector and the transition. A browser-suite check could be added if wanted.
