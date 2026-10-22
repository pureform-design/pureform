# c7a: Scrollable tabs, chip set, selection list (output context)

Commits: `git log 07eaa67c..c7a-tabs-chipset`.

## Built

- **Tabs `scrollable`** (`packages/preset/src/components/tabs.ts`): new variant group
  `scrollable` (`false` default, `true`). Tokens `edgePadding` (52px) and `scrollableMinWidth`
  (90px), Compose's `PrimaryScrollableTabRow` values. The fixed tabs' `flexBasis: 0`,
  `flexGrow: 1`, `minWidth: 0` moved from the base into `scrollable.false` (same output for
  fixed tabs); `scrollable.true` sets the root `overflow: auto` and inline padding, and each tab
  `flexGrow: 0`, `flexShrink: 0`, `minWidth`. No group overlap, 0 compounds.
  binding-core `TabsVariantProps.scrollable` (root props, selection, usage). Solid and React
  scroll the newly selected tab into view with a new `revealInRow(item)`
  (`packages/binding-core/src/reveal.ts`, exported from `@pureform/binding-core/dom`): it moves
  only the nearest `overflow-x: auto|scroll` ancestor, never the page. React Native wraps the tab
  row in a horizontal `ScrollView` and scrolls the selected tab towards the centre.
- **`chipSet`** (`chip.ts`, registered in `pureform.ts`): slot `root`, token `gap` (8px),
  variant `singleLine` (`false`: `flexWrap: wrap`; `true`: `nowrap` + `overflow: auto`). 0
  compounds. Anatomy `chipSetAnatomy` (generated, `pf-chip-set-root`).
  Behaviour: the **button group's toggle-group machine** (`@pureform/machines/button-group`),
  reused as is (root `group`, items toggle buttons with `aria-pressed`, rtl arrows); drift pair
  `chipSet → buttonGroup`. binding-core `components/chip-set.ts`: `CHIP_SET_ROOT_PROPS`,
  `CHIP_SET_CONTENT_PROPS`, `ChipSetItem`, `chipSetSelection`, `chipSetMachineProps` (=
  `buttonGroupMachineProps`), `chipSetChipVariants`. Bindings `@pureform/{solid,react}/chip-set`
  (`ChipSet`, `.Root`, `.Chip`), `@pureform/react-native/chip-set` (ready-made, selection by hand,
  `singleLine` as a horizontal `ScrollView`).
- **Selection list**: no new preset component; it's `list` + `listItem`. Machine
  `packages/machines/src/selection-list.ts` (subpath `@pureform/machines/selection-list`,
  `selectionList` at the root; new dependency `@zag-js/listbox` in the root catalog): Zag's
  listbox with options emitting to interaction sources (highlight = hover, as the select), the
  highlight cleared on blur, and `tabIndex -1` while disabled. binding-core
  `components/selection-list.ts`: `SELECTION_LIST_ROOT_PROPS`, `SELECTION_LIST_CONTENT_PROPS`,
  `SelectionListItem`, `selectionListOptions`, `selectionListMachineProps` (`multiple` by
  default, as `mat-selection-list`; typeahead on). Bindings `@pureform/{solid,react}/selection-list`:
  `List.Root` is the listbox, each option an interactive `ListItem` (`role="option"`,
  `aria-selected`) inside an `li role="presentation"`. React Native: same rows, `role="listbox"`,
  RN `ListItem` gained an optional `role="option"` prop; selection by hand, no keyboard.
- Tests: preset (`tabs.spec.ts`, `chip.spec.ts`, `new-components.spec.ts`, snapshots,
  `pureform.spec.ts` lists), machines (`selection-list.spec.ts`, `index.spec.ts`, drift),
  binding-core (`dom.spec.ts` `revealInRow`, usage entries `chip-set`, `selection-list`),
  Solid/React/RN specs, component suites (`chip-set.ts`, `selection-list.ts`, a `scrollable` tabs
  example; `listbox` in optimized deps), browser suite (new section
  `chip-sets-and-scrollable-tabs` with its screenshot reviewed, a measured test, `chipSet` in
  `RN_COMPONENTS`).
- Docs: gap analysis rows (chip matrix row, selection list row, §2 `chipSet` and Tabs
  "Scrollable" verdicts, "Later" summary, §3 listbox/toggle-group, §7 row); READMEs of preset,
  machines, binding-core, solid, react, react-native.

## Merge notes

- **Left for the merge:** §1.8 totals (component count, missing list "selection list", zag
  machines wrapped). `packages/preset/src/doc-counts.spec.ts` fails until §1.8 counts 64
  components (`expected 63 to be 64`) — expected; it blocks omni's dependency chain, so I ran
  downstream tasks with `-i`.
- Shared files edited additively: preset `pureform.ts`/`pureform.spec.ts`, binding-core
  `index.ts`/`usage.ts`/`usage.spec.ts`, each binding's `package.json`/`vite.config.ts`/registry
  fixture (`chipSetRegistry`), suites' `components/index.ts`, `harness/scene.ts`, both
  `scene.tsx`, `vitest.config.e2e.ts`, browser `visual.e2e.test.tsx`, `rn-components.ts`,
  panda-fixture `page.tsx`, root `package.json` catalog + `bun.lock` (listbox), machines
  `package.json`/`vite.config.ts`/`index.ts`/`anatomy-drift.spec.ts`/`index.spec.ts`.
- New screenshot `chip-sets-and-scrollable-tabs-chromium-linux.png`; no existing screenshot
  changed (tabs snapshot changed only by the new tokens/variant).
- I didn't touch motion helpers.

## How to verify

- `bunx vitest run` in `packages/preset` (all but doc-counts pass);
  `-c vitest.config.unit.ts` in machines (selection-list, index, drift), binding-core (dom,
  usage), solid and react (`src/tabs src/chip-set src/selection-list`), react-native
  (`src/selection-components.spec.tsx` + tabs/list/button-group specs).
- `tests/component-suites`: `bunx vitest run -c vitest.config.e2e.ts -t "ChipSet|SelectionList|Tabs"`
  — all pass after the fixes (390 SelectionList cases; ChipSet and Tabs all green).
- `tests/browser-e2e-tests`: whole suite 900 passed after recording the new screenshot.
- `bunx tsc --noEmit -p tsconfig.json` clean in preset, machines, binding-core, solid, react,
  react-native.

## Refactoring hints

- **Helpers that look generic:** `revealInRow` (`binding-core/src/reveal.ts`) suits any
  scrolling row (carousel, toolbar overflow, single-line chip set on focus).
- **Code that looks like a sibling's:** `solid|react/src/chip-set/chip-set.tsx` repeat the
  button group's `Root` (toggle group, `buttonGroupRootProps`, `role="group"`) and its
  item-selection block (`getItemState` → `selected`, `buttonGroupItemProps`). A shared
  `useToggleGroupItem(api, selectable, value, disabled)` in each binding would serve both.
  `machines/src/selection-list.ts` repeats the select's `connect` (content press +
  `itemPressProps`); a `highlightableConnect` in `interaction/highlight.ts` could serve select,
  menu and selection list. RN chip set and button group both hand-roll single/multiple
  selection: a `toggleSelection(value, values, mode, deselectable)` in binding-core.
- **Suggested home:** `binding-core/src/components/button-group.ts` (or a `toggle-group.ts`) for
  the selection helper; `machines/src/interaction/highlight.ts` for the connect.
- **What must not change:** the `chip-sets-and-scrollable-tabs` screenshot, tabs/chip snapshots,
  the component-suite cases.

## Open questions

- Selection list defaults to `multiple` (Angular); M3 lists more often select one. Rows show
  selection by the list item's selected colours only — no checkbox (the app can put one in
  `trailing`).
- In scrollable tabs the divider (an inset shadow on each tab) doesn't run under the 52px edge
  padding. Material draws it full width; a root-level divider would need a fixed-tabs change.
- 52px edge padding and 90px minimum tab width are Compose's; the View docs don't state them.
- RN selection list has no keyboard/typeahead (no zag on RN); the RN scrollable tabs/single-line
  set were only checked in the browser test environment.
- Chips in a `singleLine` set don't set `flexShrink: 0`; they kept their size in the screenshot,
  but a very narrow set could squeeze labels.
