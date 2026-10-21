# c6d: Table and sort header (output context)

Branch `c6d-table`, from main `f1b5b019`. Commits: `git log f1b5b019..c6d-table` (this file is the
last).

## Built

- **Preset** `packages/preset/src/components/table.ts`: `createTable(densities)`, `table`
  (exported), registered in `pureform()` as **`dataTable`** (see deviations). Parts: `root`,
  `header`, `body`, `footer`, `headerRow`, `row`, `alternateRow`, `footerRow`, `headerCell`,
  `cell`, `footerCell`, `selectionCell`, `sortHeader`, `sortLabel`, `sortIndicator`. Structure:
  root → header/body/footer; header → headerRow → headerCell → sortHeader → sortLabel,
  sortIndicator; body → row, alternateRow; row → selectionCell, cell; footer → footerRow →
  footerCell (a part sits in one place only, so the alternate row's, header's and footer's
  cells aren't listed under them). Indication: one entry on `sortHeader` (trigger, surface and
  focus). Variants `stickyHeader: true|false`, `density` (the shared `densityTokenVariant`);
  **0 compounds**, no overlap (`stickyHeader` sets header styles, `density` a root token).
  Tokens: `container` (surface), `alternateContainer` (surfaceContainerLow), `headerColor`,
  `content`, `footerColor` (onSurface), `selectedContainer`/`selectedContent`
  (secondaryContainer), `outlineColor` (outlineVariant), `outlineWidth` 1, `headerHeight` 56,
  `rowHeight` 52, `footerHeight` 52, `cellPaddingInline` 16, `selectionWidth` 72, `arrowColor`,
  `arrowSize` (iconSmall), `arrowGap`, `arrowHintOpacity` 0.38, `densityOffset`, indication
  tokens. Spec `table.spec.ts` (+ snapshot); `contrast.ts` pairs; `pureform.spec.ts` lists.
- **Anatomy:** regenerated (`dataTableAnatomy`, scope `data-table`, test ids
  `pf-data-table-*`); `anatomy.spec.ts` gains the indication entry and the icon part
  (`sortIndicator`).
- **Machine** `packages/machines/src/table/` (`@pureform/machines/table`), our own in Zag's shape:
  `machine`, `connect`, `anatomy`, `props`/`splitProps`, and `table.logic.ts` (framework-free,
  React Native uses it): `nextSort(current, column, { start, clearable })`, `ariaSort`,
  `compareValues` (numbers/dates by value, text by `Intl.Collator` numeric, empties last),
  `sortRows(rows, sort, value, compare?)` (stable), `toggleRow(selection, row, mode)`,
  `selectAllState(selection, rows)`, `toggleAll(selection, rows)`. Props: `sort`/`defaultSort`/
  `onSortChange` (`{ column, direction } | null`), `sortStart`, `sortClearable`, `selectionMode`
  (`single | multiple`, absent = no selection), `selection`/`defaultSelection`/
  `onSelectionChange`, `rows` (every body row's value, for select-all), `translations`
  (`selectAll`, `selectRow`). API: `sort`, `selection`, `selectAll`, `toggleSort`, `toggleRow`,
  `toggleAll`, `isSelected`, `ariaSort` and a getter per part (`getRowProps({ value })`,
  `getHeaderCellProps({ column, sortable })`, `getSortHeaderProps({ column })`, …). Spec
  `table.spec.ts`; `anatomy-drift.spec.ts` pairs it with `dataTable`.
- **binding-core** `components/table.ts`: `TablePart`, `TableSort`, `TableSortDirection`,
  `TableSelectionMode`, `TableVariantProps`, `TableBehaviorProps`, `TableRootOwnProps`
  (+ `striped`), `TABLE_ROOT_PROPS`, `TableColumn<Row, Node>` (`id`, `header`, `footer`,
  `sortable`, `cell(row)`, `value(row)`), `TableContentProps` (`columns`, `rows`, `rowValue`),
  `TABLE_CONTENT_PROPS`, `tableCellValue`, `tableRowValue`, `tableMachineProps`, `tableSelection`,
  `tableRowPart(index, striped)`. Usage entry `table` → `dataTable` (`stickyHeader`, `density`),
  `checkbox`, `ripple`. Glyphs `arrowUpward`, `arrowDownward`.
- **Solid and React** `src/table/` (`@pureform/{solid,react}/table`): `Table` ready-made
  (`columns`, `rows`, sorts the rows by the sort) and `Table.Root`, `Header`, `Body`, `Footer`,
  `HeaderRow`, `Row` (`value`, `index`), `FooterRow`, `HeaderCell` (`column`, `sortable`), `Cell`,
  `FooterCell`, `SelectionCell` (the row's checkbox, or select-all in the header row; the existing
  `Checkbox`), `SortHeader` (`column`; `useMachineButton`, `filled` state while sorted), and
  `useTable()`. Glyph components `ArrowUpwardIcon`/`ArrowDownwardIcon`. Specs `table.spec.tsx`.
- **React Native** `src/table/` (`@pureform/react-native/table`): the ready-made `Table` only:
  views in flex rows with `role`s, a `SortHeader` (own indication, `filled` state, label
  "Name, sorted ascending"), a `BodyRow` per row (its own `useComponentSlots` call, `selected`
  state), the checkbox column; state through `@pureform/machines/table`'s logic. Spec.
- **Tests:** component suites `components/table.ts` (examples: plain, sorted, striped, selection,
  single selection, sticky header, compact, footer; state `selection`; keyboard; indication);
  browser suite `tables` screenshot (ltr, rtl, `dense`, `sharp` + sticky), indication fixtures
  (web and native), reduced motion (`sortIndicator`: `opacity` both ways), `RN_COMPONENTS`
  (rn-parity). Panda fixture `src/tables.tsx`.

## Design calls (M3 specifies no table)

Sources read: Angular Material's table and sort docs and M3 token names (`mat-table`:
`background-color`, `header-headline-*`, `row-item-label-text-*`, `row-item-outline-*`,
`header/row-item/footer-container-height`; `matSort`: `arrow-color`), and WAI-ARIA's sortable
table example. Nothing copied.

1. **Flex layout, not table layout.** Rows are flex rows and cells equal shares (`flex: 1 1 0`),
   as Angular's flex table, so React Native draws the same. The bindings render `<table>`,
   `<thead>`, `<tr>`, `<th>`, `<td>` and write the roles out, since a flex table element can drop
   its implicit role. Column widths are the app's (`slotProps`/`style` per cell).
2. **Heights 56/52/52** (Angular's M3 header, row and footer heights), each plus the density
   offset; `density` steps 4px each, as Angular's table density does.
3. **Colours:** surface container, onSurface text (header `titleSmall`, cells and footer
   `bodyMedium`), outlineVariant 1px rule under each row (not under the footer).
4. **Selected rows** fill with secondaryContainer/onSecondaryContainer, as the list does;
   `aria-selected` on the row (only when the table has a `selectionMode`). Rows take a hover
   state layer, and the focus one while something inside has keyboard focus (`slotStateLayer`).
5. **Zebra:** a part, `alternateRow` (every other body row when `striped`), on
   `alternateContainer` (surfaceContainerLow). The style AST has no `:nth-child` condition, and
   React Native needs the binding to choose anyway, so the binding picks the part by the row's
   index. `striped` is a binding prop, not a variant.
6. **Sort header is a button** inside the `th`, which carries `aria-sort` (WAI-ARIA's sortable
   table pattern, not the grid pattern: Tab reaches each sort header and each checkbox, Enter and
   Space sort). Order: `sortStart` (ascending), the other direction, then cleared
   (`sortClearable`, Angular's `disableClear` inverted).
7. **The arrow** is an arrow-upward or arrow-downward glyph the binding picks (no rotation, so
   no movement to drop under reduced motion); it fades in (`opacity`) when the column is sorted
   (`filled` state on the sort header: `data-pf-filled`), shows at 0.38 while an unsorted header
   is hovered or keyboard-focused (Angular's hint), else 0. A later `when` case wins on every
   target, so `filled` is last.
8. **Sort header indication:** a transparent state layer of the header colour and the outer
   focus ring, like a text button.
9. **Selection column** is one part for all rows, `selectionWidth` (72) wide with the checkbox
   centred, so an empty footer cell keeps the columns aligned. In single mode the header's
   selection cell is a plain `td` (axe's empty-table-header).
10. **Sticky header** through `platform({ css: literal("sticky") }, relative)`; React Native has
    no sticky position, so it doesn't stick there (documented; use `stickyHeaderIndices`).
11. **The table never sorts data itself**; the ready-made sorts `rows` by the column's `value`
    (default `row[id]`), with `compareValues`.
12. Shape: no radii (a table has no corners in Angular's M3 tokens), so nothing for
    `radii.spec`; no exception needed.

## Deviations from the design

- **Registered as `dataTable`, not `table`.** Tailwind's scanner reads the generated modules,
  and a bare `table` (the component's name in `.pureform/index.ts` and `web/table.ts`) made a
  `.table { display: table }` utility, failing tailwind-adapter's "gives Tailwind's scanner
  nothing to make utilities of" spec. The bindings' component is still `Table`, at the subpath
  `table` (as `switchControl` is `Switch`). `binding-core/src/usage.spec.ts` gained a
  `"table:dataTable"` case for that (like `"switch:switchControl"`).
- Machine anatomy is named `table` (`createAnatomy("table")`); only part names are compared.
- React Native has no compound parts, only the ready-made, as most of its components.

## Stubs and gaps

- No column resizing, reordering, sticky columns, sticky footer, or virtualisation; no
  expandable rows; no numeric (end-aligned) column flag (apps set `slotProps`).
- No range selection (Shift+click) and no grid keyboard navigation (arrow keys between cells):
  the WAI-ARIA sortable-table pattern needs neither.
- React Native: no sticky header, no `aria-sort` (React Native has none); the sort state is in the
  sort button's label.

## How to verify

- `omni run build test -b f1b5b019 -w -o continue`: 99 succeeded, 2 failed: preset's
  `doc-counts.spec.ts` (§1.8 says 57 components, the code has 58: left to the merge, as asked)
  and `rn-web-demo#test:e2e` ("Failed to resolve entry for package @pureform/rn-adapter" while it
  was rebuilt in the same run; it failed the same way in the setup build at f1b5b019, and passed
  alone: `omni run test:e2e -p @pureform/rn-web-demo -i -f all`).
- Earlier, under other agents' load: rn-adapter `factory.spec.ts` "gives what selection
  gives…" timed out at 60 s once (it passes alone in 39 s; the new component adds to its work),
  and React Native's overlays snackbar/carousel smooth-scroll/tab-indicator flakes.
- `cd tests/component-suites && bunx vitest run -c vitest.config.e2e.ts -t "Table"`: 486 passed
  (every binding × target: accessibility ltr/rtl, direction, themes static and seed, server
  rendering, keyboard, controllable, indication).
- `cd tests/browser-e2e-tests && bunx vitest run -c vitest.config.e2e.ts src/visual.e2e.test.tsx
-t tables`, `src/indication.e2e.test.ts src/rn-indication.e2e.test.ts`,
  `src/reduced-motion.e2e.test.ts src/rn-parity.e2e.test.ts src/panda-factories.e2e.test.ts
src/direction.e2e.test.ts src/parity.e2e.test.ts src/state-matching.e2e.test.ts
src/rn-motion.e2e.test.ts`: all pass.
- Unit specs: preset `table.spec.ts`, machines `table.spec.ts` (browser config), Solid/React/RN
  `src/table` specs, binding-core `usage.spec.ts`.
- tsc clean in preset, anatomy, machines, binding-core, solid, react, react-native.
  `bun install --frozen-lockfile`: no changes (no new dependencies).
- `oxlint` couldn't load its config in this worktree (`@pureform/oxlint-config` not found), so
  only `oxfmt` ran.

## Notes for the next phases (merge notes)

- Shared files touched (additive): preset `index.ts`, `pureform.ts` (`dataTable` after
  `carousel`), `pureform.spec.ts` (two lists), `contrast.ts`; anatomy `anatomy.spec.ts`
  (`ICON_PARTS`, `INDICATION`), `generated.ts` (regenerate); machines `index.ts`, `package.json`,
  `vite.config.ts`, `anatomy-drift.spec.ts`; binding-core `index.ts`, `usage.ts`, `usage.spec.ts`
  (one case), `glyphs.ts` (two paths); Solid/React `glyphs.tsx` (two glyphs), `package.json`,
  `vite.config.ts`, `__fixtures__/registry.ts` (`dataTable`, and `checkbox` in
  `displayRegistry`); React Native `package.json`, `vite.config.ts`; component suites
  `components/index.ts`, `harness/scene.ts`, both `bindings/*/scene.tsx`; browser suite
  `visual.e2e.test.tsx`, `reduced-motion.e2e.test.ts`, `rn-components.ts`, indication fixtures
  (appended at the end; siblings will append too: regenerate with `-u` after merging); Panda
  fixture `page.tsx` (one line, `<TableSection />` at the end of `main`); gap analysis rows §1.6,
  §1.9 and §7; package READMEs.
- **doc-counts:** after the merge, §1.8's component count needs the wave's new components
  (58 with this one alone), and its "Our own machines" row could count `table`.
- Regenerate (`omni run generate -f all`) after merging; the panda fixture needs `prepare` for
  the suites.
- Siblings naming a component after a Tailwind utility (`grid`, `table`, `flex`, `hidden`,
  `container`…) hit the same Tailwind scanner spec; c6e's `gridList` is fine.

## Refactoring hints

- **Helpers that look generic:**
    - The `part(name, label, element, machine)` helper in Solid's and React's
      `src/table/table.tsx` is `machinePart` for any element: `machinePart` (`parts.tsx`) only
      takes `div | span | label`. Widen `machinePart`'s element to `ValidComponent`/`ElementType`
      and the table can use it.
    - `RowContext` (where a cell sits) in both bindings: a nested part asking its row for a value.
      c6a's tree (a node's value for its children) may need the same; not shared yet.
    - `CellContent` in React Native's table (Text for a string, View otherwise, in one slot's
      style) looks reusable by any RN part that holds either text or a node.
    - `table.logic.ts`'s `sortRows`/`compareValues` are generic data sorting; c6c's paginator
      slices the same rows (a ready-made paginated table would chain them).
- **Code that looks like a sibling's:** c6c's paginator will sit under a table (Angular's
  `mat-paginator` with `mat-table`); a ready-made "table with paginator" is a composition, not
  shared code. c6a's tree rows reuse `listItem`; the table's rows don't (different layout model:
  equal-share cells, not leading/content/trailing).
- **Suggested home:** `machinePart` widened in each binding's `parts.tsx`; `CellContent` in React
  Native's `parts.tsx` if a second user appears.
- **Not extracted, with the failing check:** the row state layer is `slotStateLayer` already
  (shared); the selected colours repeat `ROW_TOKENS`' secondaryContainer pair, but the list row's
  `rowParts` builds leading/trailing/supporting parts the table doesn't have (check 2).
- **What must not change:** `table.spec.ts.snap`, the `tables` screenshot, the `dataTable` lines of
  both indication fixtures, the component suites' `Table` cases, reduced-motion's `dataTable`.

## Open questions

- The registry name `dataTable` (forced by Tailwind's scanner): keep it, or teach the Tailwind
  codegen to hide component names from the scanner and use `table`?
- Unconfirmed values (Angular's M3 tokens give names; the values here are ours where Angular's
  aren't public): the 0.38 arrow hint, the 72px selection column, surfaceContainerLow stripes,
  secondaryContainer selected rows, `titleSmall` headers.
- Should selection also follow a row click (Angular leaves it to the app), and should there be a
  grid keyboard mode (arrow keys between cells) for editable tables?
- React Native has no `aria-sort`; the sort is spoken through the button's label only for a string
  header. Good enough?
