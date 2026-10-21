# c4d: Carousel (output context)

Commits: see `git log 6138e87..c4d-carousel`.

## Built

- **Preset `carousel`** (`packages/preset/src/components/carousel.ts`, exported with
  `CAROUSEL_LAYOUTS` and `CarouselLayout`): slots `root, itemGroup, item, mask, content`
  (`root > itemGroup > item > mask > content`). `layout`: `multiBrowse` (default), `hero`,
  `uncontained`, `multiAspect`, `fullScreen` (the root sets `padding: 0` and both take the
  parent's height); 0 compounds (before 0, after 0). Tokens: `container`
  (`surfaceContainerHighest`), `content` (`onSurface`), `radius` (`radius("extraLarge")`, Material's
  28dp item shape), `height` (200px), `gap` (8px), `padding` (16px) and the indication tokens. The
  mask is the interactive surface: `pressableRoot`, the state layer over `container`, and one
  indication entry `{ trigger: mask, surface: mask, focus: mask }`. Registered in `index.ts` and
  `pureform.ts`; a contrast pair; specs (`carousel.spec.ts`, `pureform.spec.ts`); the anatomy spec's
  indication table. `generated.ts` regenerated (`carouselAnatomy`).
- **Machines** (`@pureform/machines/carousel`, `src/carousel/`): `@zag-js/carousel` re-exported,
  `anatomy = zag.anatomy.extendWith("mask", "content")`, a `reducedMotion` prop, items that size
  themselves (`autoSize`, one per page), `getMaskProps({ index, disabled })` (focusable only on the
  current page, pressable to the item's interaction source keyed by its index) and
  `getContentProps`. Overrides of Zag: the arrow keys move focus between masks by direction (Zag's
  page by `ArrowRight` whatever `dir`) and scroll at once under `reducedMotion`, as do the API's
  `scrollTo*`; `setMatchingPage` measures the snap points first and picks the closest page (Zag's
  gives `-1` before they're measured and for items past the last page); no style reads as it starts
  (no `setSnapPoints` at entry, no tab-index sync); the row's tab index comes with its props; the
  preset's `gap`, not Zag's. Drift test, `index.spec.ts`, own spec. New dependency
  `@zag-js/carousel` (catalog `^1.46.0`; `bun.lock` entries for it and `@zag-js/scroll-snap` added
  by hand: `bun install` fails with "Workspace dependency @pureform/machines not found", as in r3).
- **binding-core** (`components/carousel.ts`): `CarouselRootOwnProps` (`layout`, `tokens`,
  `itemWidth`, `allowMouseDrag`, `id`, `page`/`defaultPage`/`onPageChange`, `testId`, `unstyled`,
  `indication`), `CAROUSEL_ROOT_PROPS`, `CarouselItem`, `CAROUSEL_CONTENT_PROPS`,
  `carouselSelection`, `carouselMachineProps`, `CAROUSEL_SIZES` (small 40 to 56, large 186), and
  the layout: `carouselKeylines(layout, viewport, gap, itemWidth?)` and
  `carouselItemSizes(options, metrics)` → `{ slot, mask, offset }[]`, `carouselInitialStyle`.
  `dom`: `observeCarouselRow`, `measureCarouselRow`, `carouselRowPadding(registry)` (the `padding`
  token's var, passed as Zag's `padding`, so the row's padding and scroll padding render on the
  server). Usage entry `carousel` (`layout`, ripple).
- **Solid and React** (`src/carousel/`): `Carousel` (ready-made, `items`) with `Root`
  (`slideCount`), `ItemGroup`, `Item` (`index`, `aspectRatio`), `Mask`, `Content`. Each item's
  slot and content keep the large width and the mask's width and `margin-inline-start` follow the
  scroll (inline styles); before measuring, every item is `itemWidth` (100% full screen). Exports,
  vite entries, registry fixtures, `optimizeDeps`, specs.
- **React Native** (`src/carousel/`): `Carousel` on a horizontal `ScrollView` (`snapToOffsets`),
  masks sized by `carouselItemSizes` on scroll, `page` controllable (scrolls with `animated:
!reducedMotion`), `onItemPress`. Spec on both engines.
- **Suites:** component-suites case `carousel.ts` (examples per layout, `page` state through the
  arrow keys, arrows by direction, item indication); new `ComponentCase.measured` flag. Browser
  suite: a `carousels` section on the Panda fixture (multi-browse, hero, uncontained under teal,
  sharp and the base theme) with its screenshot, `carousel` in `RN_COMPONENTS`, an RN indication
  case, indication fixtures (additions only).
- Docs: gap analysis (§1.3 row, §3 zag row, §7 row and the removed note); READMEs (preset,
  machines, binding-core, solid, react, react-native, component-suites).

## Deviations from the design

- **Masks by inline width and margin**, not `clip-path`: an item's slot keeps the large size (the
  row snaps by a constant step) and its mask's width and inline offset follow Material's keylines,
  interpolated by scroll position; near the row's end the keylines turn round so the last item
  ends large. A simplification of Android's keyline shifting, with the same rest states.
- **`measured: true`** on the component-suite case: hydrating changes the measured sizes (and Zag's
  `data-inview`), so the hydration checks (server rendering, themes, indication) check no warning
  but not "no change" for the carousel. Shared suite files got a one-line guard each.
- **Indication on the mask**, which takes focus; the row isn't a tab stop when it has items.
- The bundler's scan spec used `@pureform/solid/carousel` as its unknown component; it now uses
  `@pureform/solid/stepper` (c6).

## Stubs and gaps

- Horizontal only (no `orientation`); no hero `center` alignment; no prev/next or indicator parts
  (not in M3's anatomy); no text fading on small items.
- React Native has no arrow keys, and React Native Web may ignore `snapToOffsets`.
- `multiAspect` widths come from each item's `aspectRatio` times the row's height.

## How to verify

- `bunx vitest run` in `packages/preset`; `bunx vitest run -c vitest.config.unit.ts src/carousel`
  in `packages/machines`, `solid`, `react`, `react-native`; `src/components/carousel.spec.ts` in
  `packages/binding-core`.
- `cd tests/component-suites && bunx vitest run -c vitest.config.e2e.ts -t Carousel`.
- `cd tests/browser-e2e-tests && bunx vitest run -c vitest.config.e2e.ts`.
- `omni run build test -b 6138e87 -w -o continue`.

## Notes for the next phases

- Run `generate` after merging (`carouselAnatomy`); `bun install --frozen-lockfile` passes with the
  hand-added lockfile lines.
- Zag machines that read styles as they start (`getComputedStyle`) make a runtime theme's colors
  tween in on Solid, whose machines start in `onSettled` before the provider's theme block is in.
- Solid's suite `settle` is a `setTimeout(0)`: a resize observer's first call can come after it, so
  `observeCarouselRow` also measures in a microtask.

## Refactoring hints

- **Helpers that look generic:** `observeCarouselRow`/`measureCarouselRow` (a scroll container's
  inner size, gap and scroll distance, dir-independent) suit c4b's scroll behaviour helper (app bar
  lift-on-scroll) and c4c's overflow measuring. `carouselRowPadding` (a component token's var for a
  machine prop) is a pattern any binding could use: a `componentTokenVar(component, token,
registry)` in binding-core.
- **Code that looks like a sibling's:** the machine's `keyTarget` (arrow keys by direction, Home,
  End) repeats what tabs, the toolbar (c4c) and the radio group get from Zag; `px()`/`withStyle`
  inline-style helpers in the Solid/React carousel. The Solid and React carousels repeat the
  `sizes` memo and the aspect-ratio registration.
- **Suggested home:** a `scroll-metrics.ts` in `binding-core` (dom subpath) shared with c4b/c4c;
  a direction-aware `keyTarget` in `machines/src/interaction`.
- **What must not change:** the `carousels` screenshot, the indication fixtures' carousel lines,
  `carouselItemSizes`' spec values, and the carousel specs in every binding.

## Open questions

- Unconfirmed values (m3.material.io can't be read): item height 200, the 186 large width, the
  small item at 56 (40 minimum unused), full screen keeping the rounded corners and the gap.
- The keyline interpolation is our own; Android shifts the focal keylines differently mid-row.
- `measured` relaxes the hydration checks for one component; another option is client-only
  examples (`opened`) for every layout.
