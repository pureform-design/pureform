# c4b: App bar (output context)

Commits: see `git log 6138e87..c4b-app-bar`.

## Built

- **Preset** (`packages/preset/src/components/app-bar.ts`): `appBar`, with the parts `root,
leading, content, headline, subtitle, trailing` (structure `root: [leading, content,
trailing]`, `content: [headline, subtitle]`). It has 0 compounds.
    - Layout: one wrapping row. `leading` and `trailing` are icon slots (`iconBox` without its
      fixed size) the bar's `height` (64px) tall, so they make the first line; `trailing` has
      `marginInlineStart: auto`. `content` is a flex column.
    - `size`: `small` (default, `titleLarge`/`labelMedium`), `mediumFlexible`
      (`headlineMedium`/`labelLarge`, at least `mediumContentHeight` 48px) and `largeFlexible`
      (`displaySmall`/`titleMedium`, at least `largeContentHeight` 56px). A flexible size gives
      `content` `flexBasis: 100%`, so content rendered after `trailing` takes its own line, its
      headline at the bottom.
    - `centered` centers the headline; `search` changes the content's insets for a search bar.
    - `scrolled` sets the `container` token to `scrolledContainer` (`surfaceContainer`); the
      root's `stateTransition` fades it (a colour fade, kept under reduced motion).
    - `collapsed` only adds the headline's rise: `animation` `appBarCollapseIn` (8px up,
      `short4`, emphasized decelerate), `none` under `reducedMotion`. `APP_BAR_KEYFRAMES` is added
      to the config by `pureform()`.
    - Tokens: `container`, `scrolledContainer`, `leadingColor`, `headlineColor`, `subtitleColor`,
      `trailingColor`, `height`, `mediumContentHeight`, `largeContentHeight`, `paddingInline`
      (4), `contentPaddingInline` (12), `expandedPaddingInline` (16), `expandedPaddingBlockEnd`
      (12), `iconSize`, `iconFill`.
    - Registered in `index.ts` and `pureform.ts` (after `navigationRail`). Spec
      `app-bar.spec.ts` with a snapshot; additions to `pureform.spec.ts`, `icons.spec.ts`
      (leading/trailing icon slots) and `contrast.ts` (incl. against `scrolledContainer`).
- **Anatomy:** regenerated (`appBarAnatomy`, `pf-app-bar-*`); `anatomy.spec.ts`'s mirror list
  gains `appBar: ["leading", "trailing"]`.
- **binding-core** (`components/app-bar.ts`, the scroll-behaviour helper):
    - Types `AppBarPart`, `AppBarSize`, `AppBarScrollBehavior` (`"pinned" | "collapse"`),
      `AppBarVariantProps`, `AppBarScrollProps` (`scrollBehavior`, `scrollOffset`, `scrolled`,
      `collapsed`), `AppBarRootOwnProps` (+ `search`, `testId`, `unstyled`),
      `AppBarContentProps<Node, Search>` (`leading`, `headline`, `subtitle`, `trailing`,
      `searchBar`, `mirrorLeading`), `AppBarScrollState` (`{ scrolled, collapsed }`).
    - `appBarScrollState(offset, { size, behavior, previous })`: scrolled when offset > 0; a
      flexible bar with `collapse` collapses at `APP_BAR_COLLAPSE_OFFSET[size]` (48/56) and
      expands below half of it (hysteresis, since its own height change moves the page).
      `appBarDrawnState(props, fromOffset)` lets `scrolled`/`collapsed` props win;
      `appBarContentLast` (expanded flexible, not search); `appBarSelection(props, state)` selects
      `size: "small"` for a search or collapsed bar; `isFlexibleAppBar`; `APP_BAR_AT_REST`.
    - `dom.ts`: `subscribeScroll(target, onOffset)`, `scrollOffsetOf(target)`, `ScrollTarget`.
    - Usage `"app-bar"`: `appBar: same("size", "centered")`, `searchBar: {}`. Spec
      `components/app-bar.spec.ts`; `usage.spec.ts` gains the `app-bar:appBar` case.
- **Bindings:**
    - Solid and React `app-bar/`: `AppBar` (ready-made) with `Root` (`header`), `Leading`
      (`div`, `mirror`), `Content`, `Headline` (`h1`), `Subtitle` (`p`), `Trailing`; Root takes
      `scrollTarget` (element or `window`) besides the shared props; `useAppBarState()`. The
      ready-made always renders Leading and Trailing (they make the first line), puts Content
      after Trailing while an expanded flexible bar, and renders a `SearchBar` with `centered`
      and `scrolled` from `searchBar` props. Specs (4 each).
    - React Native `app-bar/`: `AppBar` (one component, `scrollOffset` from the app) and
      `useAppBarScroll()` (`{ scrollOffset, onScroll }` for a ScrollView). Tests in
      `components.spec.tsx` ("app bar").
    - Exports, `vite.config.ts` entries, registry fixtures (`displayRegistry`) and READMEs.
- **Tests:** component suites `components/app-bar.ts` (9 examples; accessibility, server
  rendering, direction, themes on every binding and target: 366 tests pass with `-t AppBar`);
  `RN_COMPONENTS` gains `appBar` (rn-parity at rest); the Panda fixture's `app-bars` section and
  screenshot `app-bars-chromium-linux.png` (small, centered, scrolled, medium and large
  flexible, collapsed, search).
- **Theme conformance:** no radius at all (square under any shape theme; `radii.spec` passes,
  no exception); colours from tokens (static teal/sharp/dense and the runtime seed theme pass
  the themes suite); logical properties only (direction suite passes; the leading arrow
  mirrors); motion: the colour fade stays, the collapse rise stops under reduced motion (preset
  spec); type and icons from theme roles. No indication: the bar isn't interactive; its icon
  buttons and the search bar bring their own.

## Deviations from the design

- **Collapse is discrete**, not tied to the offset pixel by pixel as Compose's
  `exitUntilCollapsed`: past the threshold the bar switches to the small layout and the headline
  rises in (web). The expand back has no animation. Continuous collapse would need a per-frame
  instance token (React Native re-resolves per token set) or inline styles per target.
- **Variant order isn't precedence:** a later variant doesn't reliably override an earlier one on
  Panda (atomic), so `collapsed` doesn't restyle the layout; the bindings select `size: "small"`
  with it. Same for `search`.
- The parts follow the gap analysis draft, plus `content` (the headline/subtitle or search
  wrapper). The ready-made always renders `leading` and `trailing`, empty when not given.
- No hide-on-scroll (`enterAlways`) behaviour; `scrollBehavior` is `pinned` or `collapse`.
- Deprecated options: none touched. M3's non-flexible medium/large bars were never built;
  `mediumFlexible`/`largeFlexible` are their replacement (gap analysis §7).

## Stubs and gaps

- React Native: no collapse rise (keyframes are web only); `mirrorLeading` marks the whole
  component mirrored (a component's states are one set), so trailing icons flip too.
- No density (M3 gives the app bar none; noted as an open question).
- The search app bar uses the plain `SearchBar`; a `SearchView` is composed under `AppBar.Root`
  by the app (`useAppBarState()` gives it `scrolled`).
- The search bar keeps its level-3 shadow inside the bar.

## How to verify

- `omni run build test -b 6138e87 -w -o continue`: 101 succeeded after `-f failed`. Earlier
  failures fixed on the way: usage spec before the bindings existed, rn-parity (an opacity
  keyframe; now transform only), a test-pointer hover in the RN spec, the first screenshot
  recording. The React `Autocomplete` "controlled: a prop change" case flaked once under load
  (c3c's known flake) and passed on rerun.
- tsc clean in preset, anatomy, binding-core, solid, react, react-native, panda-fixture,
  browser-e2e-tests. `tests/component-suites` shows only errors inside other packages' `dist`
  (`jsx-runtime`, implicit any in built `.jsx`), none in its sources.
- `cd tests/component-suites && bunx vitest run -c vitest.config.e2e.ts -t AppBar`: 366 passed.
- `cd tests/browser-e2e-tests && bunx vitest run -c vitest.config.e2e.ts src/visual.e2e.test.tsx -t app-bars`.
- `bun install --frozen-lockfile`: no changes (no new dependencies).

## Notes for the next phases

- Merge: `pureform.spec.ts`'s component lists, `COMPONENT_NAMES`, `RN_COMPONENTS`, the visual
  `SECTIONS`, the page's sections and the fixtures are one-line additions; rerun `generate`.
- c4c's toolbar defines another bar container; see the hints.

## Refactoring hints

- **Helpers that look generic:**
    - `appBarScrollState`'s threshold-with-hysteresis and `subscribeScroll`/`scrollOffsetOf`
      (binding-core): any scroll-driven component (a toolbar that hides on scroll, a FAB that
      shrinks to its icon, the carousel).
    - `useAppBarScroll` (React Native): a generic `useScrollOffset()`.
    - The `edge()` icon-slot builder in `app-bar.ts` repeats search view's `icon()` (`iconBox`
      without its fixed width and height): an `iconSlotFor(ref, color)` in `shared.ts`.
- **Code that looks like a sibling's:** c4c's toolbar container (`placement`, a row of icon
  buttons) will look like the app bar's root and edges. The Solid/React `Leading`/`Trailing`/
  `Content` parts are plain `scope.render` divs like the card's sections and the search bar's.
- **Suggested home:** `binding-core/src/scroll.ts` for the scroll state and subscription;
  `shared.ts` for the icon slot; a `bar.ts` in the preset for what app bar and toolbar share.
- **What must not change:** `app-bar.spec.ts.snap`, the `app-bars` screenshot, the component
  suites' `AppBar` cases, rn-parity, and the bindings' app bar specs.

## Open questions

- Unconfirmed values (m3.material.io unreadable): the flexible heights (medium 112 = 64 + 48,
  large 120 = 64 + 56), insets (4 bar, 12/16 headline, 12 bottom), type roles per size, the
  scrolled container `surfaceContainer`, and the collapse threshold equal to the headline line.
- Should collapse follow the offset continuously (Compose) rather than switch?
- Should the search bar drop its shadow inside an app bar?
- Should the app bar get `density`?
