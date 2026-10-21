# c6a: Accordion and tree (output context)

Branch `c6a-accordion-tree`, from main `f1b5b019`. Commits: `git log f1b5b019..c6a-accordion-tree`
(preset, machines, binding-core, Solid, React, React Native, the suites, then fixes, docs and this
file).

## Built

Two components M3 doesn't specify, from Angular Material's token names (read, not copied) and Zag's
part lists, drawn with the list's row parts.

- **Preset** (`packages/preset/src/components/accordion.ts`, `tree.ts`; spec `expandable.spec.ts`):
    - `accordion` = `createAccordion(densities)`. Slots `root`, `item`, `trigger`, `leading`,
      `text`, `title`, `description`, `indicator`, `content`. Tokens: `rowTokens("accordion", …)`
      (the row's colors and indication tokens, `container` overridden to `surfaceContainer`) plus
      `radius` (medium), `itemGap` (2px), `headerHeight` (56px), `paddingInline`, `gap`,
      `contentPaddingBlockEnd`, `contentColor` (`onSurfaceVariant`), `densityOffset`. One group:
      `density`. Indication: the `trigger`.
    - `tree` = `createTree(groups, densities)`. Slots `root`, `label`, `tree`, `branch`, `node`,
      `leading`, `text`, `indicator`, `group`. Tokens: `rowTokens("tree", …)` plus `nodeHeight`
      (48px), `nodeRadius` (full), `indent` (spacing 6, 24px), `paddingInline`, `gap`,
      `densityOffset`. Groups: `density`, `color` (the selected row's container, as the list item's).
      Indication: the `node`.
    - `expandIndicator(trailing, expanded)`: a row's trailing icon turned 180° while `expanded`, via
      `tweens("transform", "color")` (reduced motion keeps the color fade only).
    - Registered in `index.ts`, `pureform.ts` (after `carousel`), `contrast.ts` (`ROW_PAIRS`, plus
      the accordion's `contentColor` on its container), `pureform.spec.ts`.
    - 0 compounds; no variant overlap (each group sets one root token set).
- **Anatomy:** `generated.ts` regenerated; `anatomy.spec.ts` lists both components' icon parts
  (`leading`, `indicator`) and indication entries.
- **Machines** (`packages/machines/src/accordion/`, `tree-view/`, subpaths `@pureform/machines/accordion`
  and `/tree-view`; spec `src/expandable.spec.ts`): Zag's machines through `withInteraction`, each
  header (`getItemTriggerProps`) or row (`getItemProps`, `getBranchControlProps`) chained with
  `pressableItemProps` to its item's emitter. The tree's branch control also gets `aria-expanded`,
  `aria-current` (while selected, as Zag marks a selected leaf) and `aria-disabled`, so the row's
  styles read them from the row itself. Anatomies: Zag's, extended with the preset's parts (drift
  spec). New deps `@zag-js/accordion`, `@zag-js/tree-view` (root catalog `^1.46.0`).
- **binding-core** (`components/accordion.ts`, `tree.ts`; spec `components/expandable.spec.ts`):
  `AccordionRootOwnProps`, `ACCORDION_ROOT_PROPS`, `ACCORDION_CONTENT_PROPS`, `AccordionItem`,
  `accordionSelection`, `accordionMachineProps` (collapsible by default), `accordionItemProps`;
  `TreeRootOwnProps`, `TREE_ROOT_PROPS`, `TREE_CONTENT_PROPS`, `TreeNode`, `treeSelection`,
  `treeMachineProps`, `treeControlProps`, `treeCollectionOptions`, `treeNaming`, `isTreeBranch`.
  `GLYPH_PATHS.expand` (a down chevron). `usage.ts`: `accordion` (density), `tree` (density, color).
- **Solid and React** (`src/accordion/`, `src/tree/`, spec `src/expandable.spec.tsx`, subpaths
  `/accordion`, `/tree`, `ExpandIcon` in `glyphs.tsx`, registry fixtures):
    - `Accordion` ready-made (`items`) and `Accordion.Root/Item/Trigger/Leading/Text/Title/
Description/Indicator/Content`. Controllable `value` (`string[]`), `multiple`, `collapsible`,
      `disabled`, `density`.
    - `Tree` ready-made (`items`, `label`) and `Tree.Root` (takes `items`) `/Label/Tree/Branch/
BranchControl/Item/Group/Leading/Text/Indicator`. Controllable `expandedValue` and
      `selectedValue` (`string[]`), `selectionMode`, `expandOnClick`, `density`, `color`.
- **React Native** (`src/accordion/`, `src/tree/`, spec `src/accordion/accordion.spec.tsx`): the same
  ready-made props over React state (no Zag): pressable headers and rows with
  `useSurfaceIndication` per row, `aria-expanded`, `role="treeitem"`, a group rendered only while
  expanded. The indicator is the text glyph `⌄`.
- **Suites:** `tests/component-suites/src/components/expandable.ts` (`accordionCase`, `treeCase`:
  examples, state, keyboard incl. both directions' arrows, indication); the scenes; Zag deps in
  `vitest.config.e2e.ts`. Browser suite: `expandables` screenshot (Panda fixture page section, base,
  `teal` and `sharp` themes), `reduced-motion` fixtures for both indicators, `RN_COMPONENTS`, the RN
  indication cases, and the regenerated indication fixtures (`web.txt`, `native.txt`, additions only;
  web and native agree).

## Design calls (M3 doesn't specify these)

- **Accordion as list rows on tiles.** Each item is a tile (`surfaceContainer`, medium corners, 2px
  apart like a segmented list), its header an interactive list row (state layer, focus ring), so it
  can back expandable list items (c7b). Angular's elevated, joined panels and the expanded panel's
  spacing were not taken: tiles read as M3 Expressive's segmented lists.
- **Corners:** uniform medium on each tile, the header's bottom corners square while expanded (the
  focus ring follows the header). Per-position corners (first/last) would need a per-item variant;
  the AST has no `:first-child` condition, and items are parts of one component.
- **Header height** 56px (a one-line list item) plus density, constant: Angular's 48 collapsed / 64
  expanded would animate a height on every toggle.
- **Title** `titleMedium`, description `bodyMedium` in `onSurfaceVariant` under it (Angular puts the
  description beside the title; under it fits a list row's lines). Content `bodyMedium`
  `onSurfaceVariant`.
- **Indicator:** a down chevron in the trailing place (Material's `expand_more`), turned 180° while
  expanded. The tree uses the same one in its rows' trailing place, as the phase asks, not Angular's
  leading `chevron_right`.
- **No heading element:** the header is Zag's trigger button (as Angular's panel header is). An app
  that wants WAI-ARIA's heading wraps or composes it.
- **Collapsible by default** (`collapsible ?? true`), as Angular's panels close from their header.
- **Tree rows:** 48px (Angular's node min height) plus density, full-round corners (a navigation
  item's shape), `bodyLarge` text, `selected` colors from the `color` group like the list item's.
  Children indented by `indent` (24px) with logical inline padding on the group, so the row's
  highlight indents with it. Label `titleSmall` `onSurfaceVariant`.
- **Tree container** is `transparent` (resolved, c6 follow-ups): the tree and its unselected rows
  show what they sit on, as Angular's tree does; a selected row still paints `selectedContainer`.
  The contrast spec checks the tree's row colors on `surface`. React Native reads the same token.
- **Expanded and selected on the row:** Zag puts `aria-expanded`/`aria-selected` on the branch's
  treeitem, not on its focusable control, so the machine copies them to the control (`aria-current`
  for selected) for the row's styles. `slot("node", "expanded")` then can't match a collapsed parent
  through an expanded descendant.
- **Tree naming:** Zag names the tree by its label's id even without a label; `treeNaming` drops
  `aria-labelledby` unless a `Label` rendered (before the tree), keeping Zag's or the app's
  `aria-label`.

## Deviations from the design

- **Solid's Zag adapter** (`packages/solid/src/internal/zag/machine.ts`, not this subphase's file):
  `transitionOn` now reads the state through `readingLatest`. Zag sent an accordion header's blur
  and the next header's focus in one go; the second started from the state Solid showed (not yet
  flushed), so the focus was dropped and the next Enter did nothing. All Solid unit tests pass with
  the change. It may fix similar focus-moving machines elsewhere.
- Keyboard: WAI-ARIA's accordion pattern (Enter/Space, Up/Down between headers going round, Home,
  End) and tree pattern (Up/Down over shown rows, Right/Left expand, collapse or go to the parent,
  by direction, Home/End, typeahead, `*`) come from Zag. React Native has no keyboard model here
  (as its other composites).

## Stubs and gaps

- `doc-counts.spec.ts` fails with 57 vs 59 components (and the build chain that waits on the preset's
  tests): left to the merge as instructed. §1.8 also needs "zag machines wrapped" 16 → 18 (accordion,
  tree-view). Compounds unchanged (0 added).
- No async loading (`loadChildren`), checkboxes, renaming or indent guides on the tree; no
  `collapsible`-only `@zag-js/collapsible` wrapper (the accordion covers c7b's need).
- React Native: no keyboard, no typeahead; the indicator is a text glyph.

## How to verify

- `omni run test:unit -p @pureform/<p> -i -f all` for machines, binding-core, solid, react,
  react-native (RN carousel smooth-scroll flake only), anatomy, css-, tailwind-, panda-, rn-adapter,
  generate; preset passes but `doc-counts`.
- `bunx tsc --noEmit -p tsconfig.json` in preset, machines, binding-core, solid, react,
  react-native: clean.
- `tests/component-suites`: `bun x vitest --config ./vitest.config.e2e.ts run -t "Accordion|Tree"`:
  864 passed on all six projects.
- `tests/browser-e2e-tests`: `visual -t expandables`, `indication`, `reduced-motion`,
  `rn-indication`, `rn-parity`, `state-matching`, `direction`, `panda-factories`, `icons` pass;
  `parity` passes with `--testTimeout=300000` (its "where shape() can't" case ran just past 60s
  under a load average of 25).
- Setup: the builds here ran with `-i`, since the preset's failing `doc-counts` skips its build.

## Notes for the next phases

- c7b (expandable list items) can take `expandIndicator` and the accordion's trigger recipe, or put
  an accordion in a list.
- The root `oxlint.config.ts` can't load `@pureform/oxlint-config` (not linked at the root, as
  oxfmt-config was), so `bunx oxlint` fails in this checkout; files were formatted with oxfmt.

## Refactoring hints

- **Helpers that look generic:** `expandIndicator` (preset `accordion.ts`): any trailing icon that
  turns over while expanded; the select's arrow (`select.ts`) does the same with a `translateY`.
  `treeNaming` (binding-core) is specific to Zag's tree.
- **Code that looks like a sibling's:** the Solid/React accordion and tree follow the tabs' item
  pattern (`itemInteractionSources`, an item context, `createPartContext`), as c6b's stepper and
  c6c's paginator likely do. `Leading` icon parts are hand-written in React (as the tabs' `Icon`);
  Solid uses `iconParts`. The `Indicator` part with a default glyph appears twice per binding.
  React Native's per-row `useSurfaceIndication` + `useComponentSlots` + `IconSlot` row repeats the
  list item's.
- **Suggested home:** an `expandable.ts` in the preset for `expandIndicator` once c7b needs it; a
  React `iconPart` helper next to `plainParts` (both bindings), and a React Native `RowIcon` helper
  beside `IconSlot` for the leading/trailing icon views.
- **What must not change:** the `expandables` screenshot, the accordion and tree lines of
  `__fixtures__/indication/{web,native}.txt`, the reduced-motion expectations, and the specs named
  above.

## Open questions

- Angular's panel header is 48/64px; ours is a constant 56px. Revisit if Angular parity in height
  matters more than a stable layout.
- Tile corners: uniform medium vs a segmented list's large-outside / extra-small-inside. The latter
  needs a per-item position (a variant on a separate item component, or a first/last condition).
- ~~Should the tree's container be `surface` or follow its parent (transparent)?~~ Resolved:
  transparent; the contrast spec checks its rows on `surface` instead.
- The Solid Zag adapter change (above) is outside this subphase; the orchestrator may want r6 to
  check other machines that move focus inside a transition.
