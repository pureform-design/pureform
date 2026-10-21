# c6c: Paginator (output context)

Branch `c6c-paginator`, from main `f1b5b019`. Commits: see `git log f1b5b019..c6c-paginator`.

## Built

- **Preset** (`packages/preset/src/components/paginator.ts`): `paginator`, a slot component with parts
  `root, pageSize, pageSizeLabel, pageSizeSelect, rangeLabel, actions, firstTrigger, prevTrigger,
nextTrigger, lastTrigger`. One group, `density` (c6 follow-ups), 0 compounds. Tokens:
  `container` (`surface`), `content` (`onSurface`), `height` 56, `padding`, `gap`,
  `pageSizeGap`, `pageSizeWidth` 104, `pageSizeFieldHeight` 40, `rangeStart`, `rangeEnd`,
  `iconColor` (`onSurfaceVariant`), `disabledIconColor` (`onSurface` at 38%), `densityOffset`.
  `createPaginator(densities)`, as `createAccordion`. The row is `flex`, `wrap`,
  `justifyContent: end`, `minHeight: add(height, densityOffset)`, `bodySmall`, logical paddings
  and margins only. `actions` provides `iconButton: { accent: iconColor, disabledContent:
disabledIconColor }` (the icon button gained a `disabledContent` token for it). `pageSizeSelect`
  gives the select inside it a shorter field with `providedTokens: { select: { height } }`.
  Spec `paginator.spec.ts`. Registered in `index.ts`, `pureform.ts` (after `richTooltip`),
  `pureform.spec.ts`, `contrast.ts` (`content` on `container`).
- **Anatomy:** regenerated (`paginatorAnatomy`); `anatomy-drift.spec.ts` gains the pair.
- **Machine** (`packages/machines/src/paginator/`, `@pureform/machines/paginator`): Zag's
  `pagination`, re-exported with `connect`/`machine` wrapped. Parts: Zag's (`root`, four triggers,
  and the numbered `item`/`ellipsis`, kept in the API but not drawn) `extendWith`
  `pageSize`, `pageSizeLabel`, `pageSizeSelect`, `rangeLabel`, `actions`. The root is a labelled
  `role="group"`; `getRangeLabelProps` is `aria-live="polite"`; the triggers' default labels are
  capitalised ("Previous page"). A page size change keeps the first item of the page shown
  (`pageAfterSize`, an overridden `setPageSize` action), where Zag leaves the page alone. New
  dependency `@zag-js/pagination` (root catalog, machines `catalog:`); the solid and react vitest
  configs' `optimizeDeps` list it. Spec `paginator.spec.ts`.
- **binding-core** (`components/paginator.ts`): `PaginatorRootOwnProps` (`page`, `pageSize` as
  controllable, `count`, `pageSizeOptions`, `hidePageSize`, `showFirstLastButtons`, `disabled`,
  `translations`, `tokens`, `testId`, `unstyled`), `PAGINATOR_ROOT_PROPS`, `paginatorSelection`,
  `paginatorMachineProps`, `paginatorTriggerProps`, and the arithmetic React Native shares
  (`paginatorPageSizes`, `paginatorSizeItems`, `paginatorRange`, `paginatorRangeLabel`,
  `paginatorTotalPages`, `paginatorClampPage`, `paginatorPageAfterSize`). Glyph paths
  `firstPage`/`lastPage`. Usage entry `paginator` (paginator, select, menu, iconButton, ripple).
- **Solid and React** (`paginator/`): `Paginator` with `Root`, `PageSize`, `PageSizeLabel`,
  `PageSizeSelect`, `RangeLabel`, `Actions`, `FirstTrigger`, `PrevTrigger`, `NextTrigger`,
  `LastTrigger`. The ready-made renders the page-size `Select` (outlined) and the triggers as
  `IconButton`s through `as={IconButton}` (the calendar's pattern), with `FirstPageIcon`/
  `LastPageIcon` (new glyphs) and the chevrons, mirrored under `rtl` (`mirror` on by default).
  Exports, `vite.config.ts` entries, `paginatorRegistry` fixtures, specs, READMEs.
- **React Native** (`paginator/`): `Paginator` (no machine; binding-core's arithmetic), the same
  parts as views over a `Select` inside `ProvidedTokens` (for `pageSizeSelect`'s provided height)
  and `IconButton`s in the trigger slots. Spec.
- **Tests:** component suite `components/paginator.ts` (396 `-t Paginator` tests pass across
  solid and react on css, tailwind and panda: axe, direction, keyboard, themes incl. the seed
  theme, controllable, server rendering, forms); browser suite `paginators` screenshot and a
  measured-layout test; panda fixture section `paginators`; `RN_COMPONENTS` (rn-parity passes).

## Design calls (M3 doesn't specify the paginator)

- **Model: Angular Material's** (`mat-paginator`, read for its parts and token names, nothing
  copied): page-size label and select, range label ("1 – 10 of 100"), first/previous/next/last.
  Its M3 tokens: container surface, `bodySmall` text, 56px container, a 84px select, a 24px /
  32px range margin. We use `surface`, `onSurface`, 56, the margins from `spacing("6")` and
  `spacing("8")` (24, 32), and a 104px select (84 clips "10" with M3's field padding).
- **Pages aren't numbered.** Angular's paginator has none; Zag's `item`/`ellipsis` stay in the API
  for an app that wants them (they have no slot).
- **First and last buttons are off by default** (`showFirstLastButtons`, as Angular's
  `showFirstLastButtons`); the page-size select shows by default (`hidePageSize`). Default sizes
  are 10, 25, 50, 100, the current size added when missing (Angular does the same).
- **Page size change keeps the first item shown** (Angular's behaviour), so `onPageChange` fires
  with the new page and the new size.
- **Triggers are icon buttons, the page-size field a select**, not new parts of their own: the
  paginator slots only place them. A trigger without `as={IconButton}` is a plain `<button>`.
- **Compact select through provided tokens**, not a `density` prop on the select: density steps
  are named by the theme (`comfortable`, `compact`, … or `0`, `-1`, …), so a component can't
  name one that exists in every theme. `pageSizeFieldHeight` is the paginator's token for it.
- **Density (resolved, c6 follow-ups):** the paginator follows density like the other components:
  a `density` group (`inherit` by default, the theme's), `densityOffset` added to the 56px row.
  The bindings pass the paginator's `density` on to the ready-made page-size select, so its
  field (`pageSizeFieldHeight` 40) takes the same step; a step's name is the theme's, so it
  exists for the select too.
- **Page buttons' icons (resolved, c6 follow-ups):** `onSurfaceVariant` enabled and `onSurface`
  at 38% disabled, Angular's `paginator-enabled-icon-color`/`-disabled-icon-color`, through the
  `iconColor`/`disabledIconColor` tokens on web and React Native.
- **No indication of its own** (the anatomy has no `indication` entries): the triggers and the
  select draw theirs, so the component suite has no `indication` case. A text-only row says so.
- **Disabled** is the binding's (Zag's pagination has no `disabled`): `paginatorTriggerProps`
  disables every trigger, and the select takes `disabled`.
- **Motion:** none of its own, so there is no reduced-motion case (the icon buttons' and the
  select's are covered by their suites).
- **Keyboard** (WAI-ARIA: a group of buttons): Tab reaches each control, Enter and Space press a
  button (tested on the next button; the page-size select has the select's keys). A disabled
  button isn't a tab stop. The suite hides the page-size select for its keyboard case so Tab
  reaches the next button first.
- **Right to left:** the row ends at the inline end, the glyphs are mirrored; the direction
  suite passes with no allow-list entry.

## Deviations from the design

- The gap analysis said "range label, page-size select (reuses `select`), previous/next icon
  buttons". Added first and last (optional), the `pageSizeLabel`, `pageSizeSelect` and `actions`
  parts. §1.9 and the matrix row now say Done (c6c).
- `ComponentCase.props` of the suite sets `hidePageSize: true`, so Tab and the axe cases don't
  start in the select; the examples set it to `false` to cover it.

## Stubs and gaps

- No numbered page buttons or ellipsis (Zag has them; Angular doesn't).
- No `link` type (`getPageUrl`): the ready-made renders buttons.
- A composed trigger without `as={IconButton}` has no glyph styling beyond `flexShrink`.
- Not added to the rn-web or Solid demos (no screen holds a table yet; c6d may).
- The panda fixture uses text glyphs (`⏮ ‹ › ⏭`), as the page's other icons do.

## How to verify

- `omni run test:unit -i -p @pureform/{anatomy,machines,binding-core,solid,react}`: pass.
  `@pureform/preset`: 965 of 966; the one failure is `doc-counts.spec.ts` ("gap analysis §1.8:
  every entry of `pureform().components`", 57 vs 58), which fails only because of this component.
  The doc counts are the merge's to update (components 57 → 58 here; compounds unchanged at 28).
  `@pureform/react-native`: all but the known carousel smooth scroll flake.
- tsc (`bunx tsc --noEmit -p tsconfig.json`) clean in anatomy, binding-core, machines, preset,
  solid, react, react-native, browser-e2e-tests, panda-fixture. `component-suites` reports only the
  JSX runtime error every React file has there.
- `cd tests/component-suites && bunx vitest run -c vitest.config.e2e.ts -t Paginator`:
  396 passed (accessibility, direction, keyboard, themes, controllable, server-rendering, forms).
  The full `-t Paginator` run also hit the known "Failed to fetch dynamically imported module"
  for the indication file, and a `tabs-motion` iframe timeout under load.
- `cd tests/browser-e2e-tests && bunx vitest run -c vitest.config.e2e.ts src/visual.e2e.test.tsx
-t paginator`, `src/rn-parity.e2e.test.ts`, `src/panda-factories.e2e.test.ts`, `src/parity.e2e.test.ts`
  (the latter once timed out at 60 s under load and passed alone), `provided-tokens`,
  `state-matching`, `direction`, `indication`, `icons`, `rn-indication`, `rn-motion`,
  `reduced-motion`: pass.
- `bun install` and `bun install --frozen-lockfile` both pass; the lockfile gains only
  `@zag-js/pagination`.
- With the preset's `doc-counts.spec.ts` failing, `omni run build`'s chain stops at the preset's
  test; in this worktree the preset, anatomy, binding-core and machines were built with `bunx vite
build` in each package and `omni run generate -i -f all`.

## Notes for the next phases

- Shared files touched (small additive edits): root `package.json` catalog and `bun.lock`;
  machines `package.json`, `vite.config.ts`, `vitest.config.unit.ts`, `src/index.ts`,
  `anatomy-drift.spec.ts`; preset `index.ts`, `pureform.ts`, `pureform.spec.ts`, `contrast.ts`;
  binding-core `index.ts`, `usage.ts`, `glyphs.ts`; solid, react and react-native `package.json`,
  `vite.config.ts` (and solid's and react's `vitest.config.unit.ts`, `glyphs.tsx`, registry
  fixtures), the READMEs; component-suites `components/index.ts`, `harness/scene.ts`, both
  `scene.tsx`; browser-e2e `rn-components.ts`, `visual.e2e.test.tsx` (a section and a test), a
  new screenshot; panda-fixture `page.tsx`; the gap analysis (two Paginator rows). Rerun `generate`.
- The table (c6d) will want this footer: put a `Paginator` under it, and read its `page`/
  `pageSize` to slice rows (`Api.slice` is Zag's).
- A package's `vitest` may keep a stale `import.meta.glob` list for the binding-core usage spec
  (`usage.spec.ts` failed for `paginator` until run through omni; a copy of the file passed).
- Direct `vitest run` in machines needs `-c vitest.config.unit.ts` (browser mode).

## Refactoring hints

- **Helpers that look generic:**
    - `paginatorTriggerProps(props, disabled)` (binding-core): a machine's props with the
      component's own `disabled` forced on. A stepper's and an accordion's triggers would want it
      (zag `steps`, `accordion` have `disabled` per item, not per root).
    - The **trigger part** in Solid and React (`trigger(kind)` in `paginator.tsx`: a part rendered
      `as` an icon button with a glyph default, `mirrored` state and the machine's props) is the
      calendar's `step` (`calendar-parts.tsx`) again. A shared `iconTrigger(part, glyph)` in
      `parts.tsx` would serve the calendar, the paginator, the stepper's navigation and the
      table's sort arrow.
    - `pageSizeSelect`'s `providedTokens: { select: { height } }` is the way to make a nested
      select, text field or button compact without a named density. The table's filter field
      (c6d) would do the same.
- **Code that looks like a sibling's:** the keyed `PAGINATOR_ROOT_PROPS` and `*Selection` pattern is
  every component's; `paginatorPageAfterSize` exists in the machine and in binding-core (React
  Native can't import the machine, and the machine can't import binding-core): one line twice.
- **Suggested home:** a `trigger` builder in `solid/src/parts.tsx` and `react/src/parts.tsx`;
  the page arithmetic could move to `@pureform/utils` if both packages may depend on it.
- **What must not change:** `paginator.spec.ts`, `anatomy-drift`, `usage.spec.ts`, the component
  suite's `Paginator` cases, the `paginators` screenshot, rn-parity.

## Open questions

- The M3-ish values here are Angular's, not confirmed against any M3 spec: the 104px select
  (Angular's is 84 with its own field), the 40px field height, the range label's 24/32 margins,
  `bodySmall` text and the `surface` container (inside a card or a table the app sets
  `tokens.container`).
- ~~Should the first and last buttons be on by default, as in a table's footer?~~ Resolved: off by
  default (`showFirstLastButtons`), as Angular's.
- ~~Should the paginator follow density?~~ Resolved: yes, through a `density` group, 56px at the
  default step.
- Should numbered pages (Zag's `item`) become a variant (`pages: "numbered"`) rather than being
  left to apps?
- `doc-counts.spec.ts` fails per component until the merge bumps the number; should the spec read
  a list that siblings append to instead of one number?
