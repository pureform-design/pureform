# c4c: Toolbar (output context)

Commits: see `git log 6138e87..c4c-toolbar`.

## Built

- **Preset** (`packages/preset/src/components/toolbar.ts`, registered in `index.ts` and
  `pureform.ts` as `toolbar`): one slot, `root`. Tokens `container` (`surfaceContainer`),
  `content` (`onSurfaceVariant`), `size` (64px, the bar's thickness, plus the theme's density
  offset through `dense`), `radius` (`radius("full")`), `padding` (8px; `docked` sets 16px) and
  `gap` (4px). Variants:
    - `placement`: `floating` (default; `inlineFlex`, the `radius` corners, level 3 from
      `surface()`) or `docked` (`flex`, `width: 100%`, `justifyContent: spaceBetween`, no radius,
      level 0).
    - `orientation`: `horizontal` (row, `height`, inline padding) or `vertical` (column, `width`,
      block padding).
    - `color`: `standard` or `vibrant` (`primaryContainer`/`onPrimaryContainer` into `container`
      and `content`).
    - `overflow`: `false` or `true` (`overflow: hidden`, `maxWidth: 100%`, `minWidth: 0`,
      `flexShrink: 1`).
      0 compounds (none before: a new component). Specs: `toolbar.spec.ts`, a case in
      `expressive.spec.ts`, `pureform.spec.ts` lists it.
- **Anatomy:** generated `toolbarAnatomy` (`pf-toolbar-root`), no indication entries (the bar
  isn't interactive; its buttons are).
- **Machine:** none. The overflow and the arrow keys are binding-core helpers.
- **binding-core:**
    - `components/toolbar.ts`: `ToolbarPart`, `ToolbarVariantProps` (`placement`, `orientation`,
      `color`, `tokens`), `ToolbarRootOwnProps` (+ `overflow`, `testId`), `TOOLBAR_ROOT_PROPS`,
      `ToolbarItem<Node>` (`value`, `label`, `icon?`, `disabled?`, `selected?`,
      `onSelectedChange?(details)`, `onClick?`, `testId?`, `interactionSource?`),
      `ToolbarContentProps` (`items`, `overflowLabel`, `overflowIcon`), `TOOLBAR_CONTENT_PROPS`,
      `TOOLBAR_OVERFLOW_LABEL` ("More options"), `toolbarOverflowTestId(testId)` (a prefix:
      `edit` → `edit-overflow`, root `edit-overflow-root`), `toolbarSelection`,
      `toolbarRootProps` (`role="toolbar"`, `aria-orientation`), `toolbarMenuPositioning(o)`
      (`top-end` or `right-end`, `strategy: "fixed"` so the clipping bar doesn't cut the menu),
      `toolbarMenuItems(items, count)` (the elements past `count` as `MenuItem`s, toggles as
      checkbox items), `toolbarMenuSelect(items, value)`, `toolbarKeyTarget(key, index, count,
orientation, dir)`.
    - `overflow.ts` (the "overflow helper"): `overflowCount({ sizes, available, gap, trigger })`
      and `OverflowLayout`; framework-free, used by every binding.
    - `toolbar-dom.ts` (exported from `@pureform/binding-core/dom`): `watchOverflow({ root,
elements, trigger, vertical, onCount })` (ResizeObserver on the bar and its parent; the room
      is the parent's content box, since a floating bar hugs its content; hidden elements keep
      their last measured size) and `moveToolbarFocus(root, key, orientation, dir)`.
    - `glyphs.ts`: `GLYPH_PATHS.more` (three dots); `usage.ts`: the `toolbar` entry (toolbar,
      iconButton, button, menu, ripple).
- **Solid / React** (`@pureform/<b>/toolbar`): `Toolbar` (ready-made) and `Toolbar.Root` (the
  bar, `div role="toolbar"`, arrow keys along it, mirrored under `rtl`, Home and End). The
  ready-made renders an `IconButton` per item with an icon (`aria-label` = label), a text `Button`
  per item without, a toggle when `selected` is given. With `overflow`: every item and the
  overflow button render first (and on the server), then `watchOverflow` reports a count and the
  rest get `style={{ root: { display: "none" } }}`; the overflow button is `Menu.Trigger
as={OverflowButton}` (an `IconButton` dropping the menu's `data-scope`/`data-pf-part`/
  `data-testid`) inside `Menu.Root` (marked `data-pf-toolbar-overflow`, hidden when nothing
  overflows), with `Menu.Items` (Solid) / `Menu.ItemEntry` (React) for the overflowed items.
  `MoreIcon` added to each binding's `glyphs.tsx`. Registry fixtures: `toolbarRegistry`. Specs:
  `src/toolbar/toolbar.spec.tsx` (14 each).
- **React Native** (`@pureform/react-native/toolbar`): `Toolbar` (ready-made only). Overflow
  measures each element's wrapper and the overflow button by `onLayout` (ignoring zero sizes from
  hidden ones), and the room from a full-width row the bar sits in, centered; the menu is the RN
  `Menu` with a trigger function. Spec `src/toolbar/toolbar.spec.tsx` (real preset styles: 64px
  bar, 4px gaps, 8px padding, vertical, overflow count and menu click).
- **Suites:** `tests/component-suites/src/components/toolbar.ts` (`Toolbar` scene in both
  bindings): examples floating, vibrant, vertical, docked, docked vibrant; `opened.overflow`
  (browser only, since it measures after mount); keyboard Enter/Space click, End and arrows move
  focus (ltr and rtl); indication on the first item through `itemSources(iconButtonAnatomy, …)`.
  The keyboard suite's `KeyCase` gained an optional `focuses(host)` (where focus lands after a
  key), used only by the toolbar. Browser suite: `toolbars` section and screenshot (base, teal and
  sharp themes; floating, vibrant, docked, docked vibrant, vertical), a measured test (64px,
  9999px corners, 8px padding, 4px gap, shadow; docked full width, square, 16px, no shadow),
  `toolbar` in `RN_COMPONENTS` (parity), and a reduced-motion check that the toolbar has no
  transition of its own in every motion scenario (`STILL` in `reduced-motion.e2e.test.ts`).
- **Docs:** gap analysis §0.1 row 8, §1.4 docked and floating toolbar rows, §4.0 variant rows,
  §7 row and "Removed, and why"; READMEs of preset, binding-core, solid, react, react-native.

## Deviations from the design

- **No `elements` part.** The gap analysis says "container, elements"; the elements are the
  library's icon buttons and buttons, not a styled part of the toolbar, as the button group's
  buttons are.
- **Placement isn't positioning.** The toolbar doesn't place itself at the screen's bottom or
  16dp off it (Android's `layout_gravity`/margin); the app's layout does. Docked with
  `orientation: vertical` is allowed but not meaningful (the vertical width wins).
- **`overflow` is both a style variant and a behaviour prop:** the variant clips the bar; only
  the ready-mades move items. `Toolbar.Root` composed by hand has no overflow.
- **The toolbar doesn't recolor its buttons.** The icon buttons keep their own colors (the
  standard fill reads the `color` group's `accent`; a toggle's unselected content is
  `onSurfaceVariant`). Android has toolbar-specific icon button styles (`FloatingToolbar.IconButton
.Vibrant`) and Compose uses `LocalContentColor`; we have neither (see open questions). The bar's
  `content` token sets the root's `color` only.
- **Keyboard:** every element stays in the Tab order (no roving tabindex); the arrow keys add
  movement along the bar.
- **React Native overflow** wraps the bar in a full-width, centered row to measure its room.
- Deprecated options: none touched. The toolbar is new; the bottom app bar it replaces was never
  built.

## Stubs and gaps

- Spec values unconfirmed (m3.material.io needs a browser): 64dp thickness, 8dp padding and 4dp
  gap for floating, 16dp end padding and space-between for docked, level 3 elevation for
  floating. Sources: MDC-Android `docs/components/FloatingToolbar.md` (container colors
  `surfaceContainer`/`primaryContainer`, 50% rounded shape, read 2026-10-21) and Compose's
  `FloatingToolbarDefaults`/`DockedToolbar` naming from memory of the release notes.
- No floating toolbar with a FAB, no hide-on-scroll (Android's `HideViewOnScrollBehavior`), no
  expand/collapse motion (Compose's `expanded`). With no motion of its own, the toolbar's
  reduced-motion test checks it stays still; its buttons' corner morph and its menu's overlay
  motion are covered by their own reduced-motion tests.
- Overflow edge cases: an element whose size changes while hidden keeps its old size until shown
  again; on the web the room is the parent's content box, so a bar sharing a row with siblings
  overestimates it. Not in the rn-web or Solid demos.

## How to verify

- `omni run build test -b 6138e87 -w -o continue`: 99 succeeded, 2 failed; both reran clean with
  `-f failed` (101 succeeded): `react-native#test:unit`'s `overlays.spec.tsx` snackbar-queue
  pointer hold (a 30s click timeout under load; the toolbar isn't involved) and
  `rn-web-demo#test:e2e` "Failed to resolve entry for package @pureform/rn-adapter" (built
  before rn-adapter's dist in that run).
- `bunx tsc --noEmit -p tsconfig.json`: clean in preset, binding-core, solid, react,
  react-native, browser-e2e-tests, panda-fixture. component-suites shows the same TS2875/TS2322
  errors from compiling the React sources under Solid's JSX that it had before; the toolbar adds
  one TS2875 line of that kind.
- `cd tests/component-suites && bunx vitest run -c vitest.config.e2e.ts -t Toolbar` (after
  `omni run prepare -p @pureform/panda-fixture`): 390 passed.
- `cd tests/browser-e2e-tests && bunx vitest run -c vitest.config.e2e.ts src/visual.e2e.test.tsx
src/reduced-motion.e2e.test.ts src/rn-parity.e2e.test.ts src/panda-factories.e2e.test.ts
src/indication.e2e.test.ts src/rn-indication.e2e.test.ts`: all pass (the new `toolbars`
  screenshot was created on purpose and reviewed).
- Bindings: `bunx vitest run -c vitest.config.unit.ts src/toolbar` in solid, react and
  react-native; binding-core `src/components/toolbar.spec.ts` and `usage.spec.ts`; preset
  `src/components/toolbar.spec.ts`, `expressive.spec.ts`, `pureform.spec.ts`, `radii.spec.ts`.
- `bun install --frozen-lockfile`: no changes (no new dependency).

## Notes for the next phases

- A Solid or React ready-made button takes `style` (and `class`) keyed by part:
  `style={{ root: … }}`, not a plain style object.
- Anything clipped by `overflow: hidden` that opens a Zag popup inside it needs
  `positioning.strategy: "fixed"`.
- A Solid effect callback must not read props; read them in the compute function (the server
  rendering suite fails on `STRICT_READ_UNTRACKED` warnings).
- Files touched outside c4c's own: registration files (preset `index.ts`, `pureform.ts`,
  `pureform.spec.ts`; binding-core `index.ts`, `dom.ts`, `usage.ts`, `glyphs.ts`; each binding's
  `package.json`, `vite.config.ts`, registry fixture and `glyphs.tsx`), `expressive.spec.ts`,
  `tests/component-suites` (`harness/scene.ts`, both `scene.tsx`, `components/index.ts`,
  `components/types.ts` and `keyboard.e2e.test.ts` for `focuses`), `tests/browser-e2e-tests`
  (`visual.e2e.test.tsx`, `rn-components.ts`, `reduced-motion.e2e.test.ts`),
  `tests/panda-fixture/src/page.tsx`, `packages/anatomy/src/generated.ts` (regenerated).

## Refactoring hints

- **Helpers that look generic:**
    - `overflowCount` (`binding-core/src/overflow.ts`) and `watchOverflow`
      (`binding-core/src/toolbar-dom.ts`): any row that moves what doesn't fit into a menu; c4b's
      app bar trailing actions (Compose's `AppBarRow` overflow) are the obvious second user.
    - `toolbarKeyTarget`/`moveToolbarFocus`: roving arrow-key focus along an axis with `dir`; the
      app bar's actions, and anything with `role="toolbar"`.
    - `toolbarMenuItems`/`toolbarMenuSelect`/`toolbarMenuPositioning`: data items to menu items,
      for any "more" menu.
    - `OverflowButton` (Solid/React `toolbar.tsx`): an `IconButton` as `Menu.Trigger`'s `as`,
      dropping the menu's attributes; the split button's `TRIGGER_ATTRIBUTES` does the same by
      hand. A shared `menuTriggerAs(Component)` in each binding's `menu/` would serve both and an
      app bar's overflow.
    - `GLYPH_PATHS.more`/`MoreIcon`: the app bar's overflow.
- **Code that looks like a sibling's:** c4b's app bar defines a bar container too (height,
  container color, a `scrolled`/vibrant swap, logical padding, trailing icon buttons). The phase
  asks to keep them apart: compare `toolbar.ts` with `app-bar.ts` in r4 (a `barContainer(ref)`
  helper in `shared.ts`). Both likely face the "icon buttons in the bar's content color" gap.
  The React Native `ROOM` wrapper (measure the room by a full-width row) would repeat in any RN
  overflow row.
- **Suggested home:** `overflow.ts` stays in binding-core; `toolbar-dom.ts`'s two functions could
  become a generic `overflow-dom.ts` and `roving-focus.ts` once a second user exists; bar
  container styles in `packages/preset/src/components/shared.ts`.
- **What must not change:** `toolbars-chromium-linux.png`, the toolbar's measured visual test,
  `toolbar.spec.ts` in preset and binding-core, the bindings' `src/toolbar` specs, the component
  suites' `Toolbar` cases.

## Open questions

- Should the toolbar recolor its icon buttons (Android's toolbar icon button styles; Compose's
  `LocalContentColor`)? Options: a `content` fill on `iconButton` that reads `currentColor`, or a
  toolbar-only icon button variant. Today a vibrant toolbar's standard icon buttons draw in
  `primary` on `primaryContainer`.
- Should elements leave the Tab order but one (a roving tabindex, as WAI-ARIA's toolbar pattern
  suggests)? Left as every element tabbable plus arrow keys.
- Spec values above (64/8/4/16dp, level 3) need confirming on m3.material.io.
- Should overflow hide items from the end (as implemented, `OverflowLinearLayout`'s order) or
  let items set a priority?
