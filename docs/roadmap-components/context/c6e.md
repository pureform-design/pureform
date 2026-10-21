# c6e: Grid list (output context)

Branch `c6e-grid-list`, from main `f1b5b019`. Commits: see `git log f1b5b019..c6e-grid-list`.

Sources, read 2026-10-21 for names and options only (guidelines §1): Angular Material's grid list
(`mat-grid-list` with `cols`, `gutterSize`, `rowHeight`; `mat-grid-tile` with `colspan`, `rowspan`;
`mat-grid-tile-header` and `-footer`). M3 gives no anatomy (Android's image grid page is a stub, M2
only), so every value below is a design call.

## Built

- **Preset** `packages/preset/src/components/grid-list.ts` (`gridList`, a slot component, registered
  in `index.ts` and `pureform.ts` after `carousel`): slots `root`, `tile`, `content`, `media`,
  `header`, `footer`, `headline`, `subhead`. Structure: `root > tile > content > media | header |
footer`, `header > headline | subhead` (the footer's lines are the same two parts, since the
  anatomy can nest a slot once).
    - Variants (each sets one token on the root, so none overlaps another; 0 compounds):
      `columns` 1 to 6 (default 3), `gutter` none, small (4), medium (8, default), large (16),
      `aspect` square (default), landscape (4:3), portrait (3:4), wide (16:9).
    - Tokens: `columns`, `gutter`, `aspect`, `radius` (`medium`), `container`
      (`surfaceContainerHighest`), `captionContainer` (`inverseSurface`), `captionContent`
      (`inverseOnSurface`), `captionOpacity` (80%), `captionSize` (48, plus `densityOffset`),
      `captionPadding` (`spacing 4`). `columns`, `gutter` and `aspect` take any value as instance
      tokens (`tokens={{ columns: 5, gutter: 12 }}`), past what the variants name.
- **binding-core** `components/grid-list.ts`: `GridListPart`, `GridListVariantProps`,
  `GridListRootOwnProps`, `GRID_LIST_ROOT_PROPS`, `gridListSelection`, `gridListRootProps`
  (`role="list"`), `gridListTileProps` (`role="listitem"`); usage entry `"grid-list"`.
- **Solid and React** (`src/grid-list/`): compound only, `GridList` is Root: `Root`, `Tile`,
  `Content`, `Media` (an `<img>`), `Header`, `Footer`, `Headline`, `Subhead`. Roles come from
  binding-core and drop when `as` is `ul`/`ol` on Root or `li` on a Tile. Parts outside Root throw
  naming both. New exports `@pureform/solid/grid-list` and `@pureform/react/grid-list`.
- **React Native** (`src/grid-list/`): the same compound parts over `useComponentSlots("gridList")`;
  `Media` is an `Image` with `resizeMode` from `objectFit`; `Headline`/`Subhead` are `Text`.
- **Specs and suites:** preset `grid-list.spec.ts`; Solid, React and React Native binding specs
  (the React Native one measures the layout in Chromium); `tests/component-suites` case
  `components/grid-list.ts` (seven examples) with a `GridListScene` wrapper in each binding's
  `scene.tsx`, so the scene stays plain data (as the toast's); the Panda fixture's `grid-lists`
  section with its screenshot and a measured layout test in `visual.e2e.test.tsx`; `gridList` in
  `rn-components.ts` (React Native parity and indication suites).
- **Docs:** gap analysis §1.3 and §1.9 rows; READMEs of preset, binding-core, solid, react,
  react-native.

## Design calls (M3 doesn't specify them)

1. **No CSS grid, no `calc` with a percentage.** Layout is a wrapping row of cells. The first draft
   took `calc((100% - gutters) / columns)` for the tile's width; React Native can't subtract pixels
   from a percentage for `width` (the adapter keeps a "percent plus offset" only for insets), so it
   laid tiles out ignoring the gutter. Now each `tile` (a grid cell) is `100% / columns` wide and
   padded by half the gutter on every side; the root takes the half gutter back with a negative
   margin; `content` inside it is the visible, rounded tile. The same output on every target
   (Panda, Tailwind, CSS, React Native; the React Native parity suite and the Chromium layout test
   agree). Angular's own tile has the same cell and content split.
2. **Cell and content are two parts**, so a tile is `Tile > Content > Media`. The roles
   (`listitem`) are on the cell.
3. **Spans are not built** (`colspan`, `rowspan`). A variant is chosen per grid, so a per-tile span
   would need a per-part token the bindings don't have; tiles can't change their size within the
   preset. A later phase could add a per-tile token style (web) and a width prop (React Native).
4. **Aspect is a width over height ratio** (`aspect`), where Angular's `rowHeight` takes a ratio, a
   fixed height or `fit`. Fixed heights and `fit` are left out: a fixed height ignores density and
   the theme; `fit` needs the container's height.
5. **Caption colours: the inverse surface at 80%, text in `inverseOnSurface`.** Material has no
   scrim-style caption role, and a fixed white on black would ignore the theme. The inverse pair
   keeps its contrast in light and dark and in a seed theme; at 80% the picture shows through. Type:
   `titleSmall` for the headline, `bodySmall` for the subhead. The band is 48 high (plus density),
   or its content's height with a subhead.
6. **Radius `medium` (12)** from the theme's roles, for the content; the corner style comes from the
   theme as everywhere. The bands sit square inside the clipped content.
7. **Gutters** are `spacing` 1, 2, 4 (4, 8, 16) plus none; columns 1 to 6. `density` doesn't change
   the gutter (it changes sized heights only, here the captions').
8. **Roles:** Root `role="list"`, tile `role="listitem"`, left off when the element already has the
   role (`ul`, `li`). A grid that isn't a list passes its own `role`.
9. **Keyboard:** the grid list is a layout and takes no focus. Tab passes over it (the keyboard suite
   has no case for it); what a tile holds (a link, a button) is focusable as itself. Arrow-key
   navigation is the ARIA `grid` pattern, which a grid list isn't: Angular's grid list isn't one.
10. **No animation, no state, no indication:** nothing to check for reduced motion (the
    reduced-motion suite still passes with the component in the list); no indication entries.

## Deviations from the roadmap

- Parts beyond the roadmap's "tile header and footer": `content`, `media`, `headline`, `subhead` (the
  last two for React Native, where text styles don't inherit).
- No ready-made component (as for the compound-only ones): the suites' scene wrapper builds the
  tiles from data.

## Stubs and gaps

- Spans (design call 3), fixed row heights and `fit` (4).
- No demo screens: neither the Solid nor the React Native web demo shows a grid list.
- `oxlint` can't load `oxlint.config.ts` here (`@pureform/oxlint-config` isn't linked at the root,
  like r5's anatomy note), so the touched files were formatted with `oxfmt` and checked with `tsc`
  only.

## How to verify

- `packages/preset`: `bunx vitest run src` (all but `doc-counts.spec.ts`, see merge notes).
- `bunx tsc --noEmit -p tsconfig.json` in preset, binding-core, solid, react, react-native.
- `bunx vitest run -c vitest.config.unit.ts src/grid-list` in solid and react;
  `src/grid-list.spec.tsx` in react-native; the whole of binding-core.
- `cd tests/component-suites && bunx vitest run -c vitest.config.e2e.ts -t GridList`: 276 passed
  (accessibility, direction in both directions, server rendering and hydration, themes with a named
  theme and a seed colour, keyboard and indication skipped as it has none, on Solid and React over
  Panda, Tailwind and CSS).
- `cd tests/browser-e2e-tests && bunx vitest run -c vitest.config.e2e.ts src/<file>`: `visual`
  (the `grid-lists` screenshot and the layout test), `rn-parity`, `parity`, `direction`,
  `state-matching`, `reduced-motion`, `rn-indication`, `indication`, `panda-factories`.

## Notes for the next phases and the merge

- **Merge:** `gridList` joins the lists in `pureform.spec.ts` (after `carousel`), the anatomy's
  `generated.ts` (rerun `generate`), the `package.json` exports and `vite.config.ts` of the three
  bindings (after `carousel`), `registry.ts` fixtures of Solid and React (before `card`),
  `usage.ts`, `rn-components.ts`, the visual `SECTIONS` (after `media`), the panda fixture's page
  (`gridList` import, helper after `grouped`, a section before `app-bars`), the suites' `scene.ts`,
  `index.ts` and both `scene.tsx`.
- **`doc-counts.spec.ts` fails** until the merge sets the component count (§1.8 says 57, the code
  has 58 with `gridList`). It is the only preset spec that fails. Left as is, as asked. Locally, a
  one-digit edit (not committed) let `omni run build` get past the preset's tests.
- A tile's per-grid tokens reach the cell and content on every target because the variants set
  them on the root slot (the React Native parity suite shows it).
- The Solid scene wrapper uses `<For>`, whose item is the plain value in this Solid version, not an
  accessor.

## Refactoring hints

- **Helpers that look generic:** `caption(edge)` in `grid-list.ts`: a band along one edge of a
  box, over its content, with a colour pair. The app bar, a card media caption and a snackbar don't
  share it (check 2: their values differ); the table's sticky header (c6d) or the stepper might want
  "a band over a surface", but not with this opacity mix. The half-gutter cell and negative-margin
  root is the way to space a wrapping row on every target without `calc`; a **tags input**, a **chip
  set** (c7a) or the **button group's** wrapping rows could use it instead of `gap` if they ever
  need exact percentage widths. Not extracted: no second caller.
- **Code that looks like a sibling's:** the Solid and React `grid-list.tsx` are each other's
  twins (as every compound there). The `GridListScene` wrappers in the suites' two `scene.tsx`
  files are the toast's pattern. Compare with c6a's accordion and tree, whose item parts also come
  from `plainParts`: none of it is shared code.
- **Suggested home:** if c6a to c6d each end with a "media or caption over a surface" part, a
  `caption` helper in `packages/preset/src/components/shared.ts`; `Media` with an `<img>` could be
  `plainParts` taking `"img"` (Solid and React `parts.tsx`: `element: "div" | "span"` today, the
  grid list's `Media` is the one hand-written part for that).
- **What must not change:** `grid-lists` screenshot, the measured layout test in `visual.e2e.test.tsx`,
  the React Native `grid-list.spec.tsx` (column widths with and without a gutter), `rn-parity`, and
  the component suites' `GridList` cases.

## Open questions

- Do you want spans (`colspan`, `rowspan`) after all? They need a per-part token style or width
  prop in all three bindings (design call 3).
- Is 80% inverse surface the right caption (design call 5)? Angular's is 38% black with white text;
  nothing in M3 contradicts either, and the contrast over a busy picture isn't checked.
- Should the ready-made components of the parity set take data (`tiles`), as the carousel's
  `items`? Compound only for now.
- `columns` is a variant of 1 to 6 plus a token. Is a wider range (up to 12) worth the extra
  values?
