# c1c: List and menu rows (output context)

Commits: `454a32b..` on `c1c-list-and-menu` (see `git log 38e43e0..c1c-list-and-menu`).

## Built

- **Preset** (`packages/preset/src/components/`):
    - `list.ts` now also exports the `list` slot component (`root`, the `ul`; `item`, the `li`),
      tokens `container` (`surface`), `paddingBlock`, `segmentedGap` (2px), variant
      `variant: standard | segmented` (segmented: the gap, a transparent root). Registered in
      `pureform.ts` (`list,`). Helpers: `POSITIONS`, `type Position`,
      `positionCorners(outer, inner): Record<Position, StyleMap>` (logical corners of a tile by
      its place in a block-direction run), `TILE_RADII` (`outerRadius: radius("large")`,
      `innerRadius: radius("extraSmall")`). `rowParts` and `rowGroupColors` take an optional
      `chosen` list of states (default `["selected"]`; output unchanged for the list item).
    - `list-item.ts`: variants `leadingType: icon | avatar | thumbnail | video` (40 round, 56,
      114×64; tokens `avatarSize`, `thumbnailSize`, `videoWidth`, `videoHeight`) and
      `position: none | first | middle | last | single` (corners from `positionCorners`, the
      container token pointed at `segmentedContainer`, `surfaceContainer`). No compound.
    - `menu.ts`: slots `itemGroup`, `itemGroupLabel`, `itemContent` (wraps `itemLabel` and
      `itemSupportingText`), `itemSupportingText`; variants `vibrant` (tertiary container
      colours, chosen item tertiary) and `grouped` (each group a tile 2px apart; the root is
      transparent, clips with `overflow: hidden` and the `large` radius, so groups need no
      position). Items fill when `selected` or `checked` (`aria-checked`, a toggleable item).
      The item's `height` became `minHeight` (two-line items grow). No compound.
    - `select.ts`: unchanged; option groups are the menu's group parts (the select's list is
      drawn by the menu's registry entry).
- **Anatomy**: `listAnatomy` is now generated (styled); the composite and
  `compositeTestIds.list` were removed (test ids unchanged). `menuOverlayAnatomy` and
  `compositeTestIds.menu` gained the four menu parts (`itemLabel`'s parent is `itemContent`);
  `selectMenuAnatomy` and `compositeTestIds.selectMenu` gained `itemGroup`, `itemGroupLabel`
  (`pf-select-item-group`, `pf-select-item-group-label`).
- **Machines** (`packages/machines/src/menu.ts`): `connect` also wraps `getOptionItemProps`, so
  toggleable items emit to their interaction source; groups pass through. `menu.spec.ts`.
- **binding-core**: list `ListOwnVariantProps { variant, listTokens }`, `listSelection`,
  `listItemPosition(index, count, segmented)`, `leadingType` among the list's item defaults;
  list item `leadingType`, `position`; menu `vibrant`, `grouped`, `MenuGroup`, `groups`,
  `MenuItem.type | checked | onCheckedChange | supportingText`, `MENU_ITEM_PROPS`,
  `menuItemMachineProps(api, item)`, `menuGrouped(props)`; select `SelectItem.group`,
  `selectItemGroups`, `selectGroupedItems`; `usage.ts` entries. Spec: `components/rows.spec.ts`.
- **Bindings:** Solid and React: `List` styled (`variant`, `listTokens`, `leadingType`; a
  segmented ready-made list sets each item's `position`), `ListItem` `leadingType`/`position`,
  `Menu.ItemGroup` (`id`), `Menu.ItemGroupLabel`, `Menu.ItemContent`, `Menu.ItemSupportingText`,
  `Menu.Item` `type`/`checked`/`onCheckedChange`, ready-made `groups`, `vibrant`, `grouped`
  (set only when true, so plain menus keep their classes), `Select.ItemGroup`,
  `Select.ItemGroupLabel` with options grouped by `group`. React Native: a new ready-made
  `@pureform/react-native/list` (no compound parts), `ListDefaults`, and the same menu and
  select features in its ready-mades (toggleable items handled by hand: the RN menu has no Zag).
- **Suites:** component-suite cases for avatar/video/segmented list items, segmented lists,
  menus with supporting text, vibrant, toggleable items and groups, and select option groups;
  the `lists` screenshot shows a segmented avatar list and a grouped vibrant menu.

## Deviations from the design

- The list item's type variant is `leadingType`, not `leading`: the bindings' `leading` prop is
  the content.
- `vibrant` is its own boolean group, not a value of `color` (the `color` group is the theme's
  colour groups, typed from them).
- Menu groups aren't shaped by position per group: a part can't take a per-element variant and
  core has no first/last-child condition. The grouped menu clips instead (see open questions).
- The menu label always sits in `itemContent` now (a wrapper part not named in the phase), so
  supporting text can stack under it as the list item's `content` does.

## Stubs and gaps

- Spec values not confirmed against M3's site: segmented gap 2dp, outer `large`/inner
  `extraSmall` corners, `surfaceContainer` tiles, vibrant roles, group label `labelMedium`.
- React Native: a transparent grouped menu root's shadow relies on the platform drawing it from
  the children (Android elevation needs a background).

## How to verify

What was run (the whole suite is left to the orchestrator after the c1 merge):

- `omni run build test -b 38e43e0 -w -o continue`: 96 succeeded, 5 failed, all rerun and
  passing in isolation or fixed: binding-core `usage.spec` (fixed: `grouped` is computed, so it
  left the menu's usage entry), the browser suite's indication fixtures and `lists` screenshot
  (updated on purpose, reviewed), `state-matching` hover and RN `rows.spec` destinations (load
  flakes, pass alone), css-adapter codegen sweep (60s timeout under load, passes alone).
- `omni run build test -f all -p @pureform/binding-core -p @pureform/component-suites`: all 70
  tasks pass, including the component suites' e2e.
- `bunx tsc --noEmit -p tsconfig.json` clean in preset, anatomy, machines, binding-core, solid,
  react, react-native.
- Preset: `src/components/new-components.spec.ts` (rows: positions, leading types, menu parts).

## Notes for the next phases

- To round any run of tiles (button groups, segmented anything), use `positionCorners` and a
  `position` variant the binding sets from the index (`listItemPosition`).
- Files touched outside the subphase's own: `packages/anatomy/src/composites.ts` and its spec
  (list composite removed, menu/select-menu parts), `packages/css-adapter/src/codegen.spec.ts`
  and `tests/browser-e2e-tests/src/panda-factories.e2e.test.ts` (dropped
  `menu-supportingColor` from the unread allow-lists, now read),
  `packages/rn-adapter/src/codegen.spec.ts` (sweep timeout 120s to 300s: the list item's
  variant space grew from 210 to 4,200 combinations and the sweep took 127s alone),
  `tests/browser-e2e-tests/src/rn-components.ts` (`list`), `tests/panda-fixture/src/page.tsx`
  (segmented list and grouped vibrant menu in the `lists` section),
  `docs/design/component-gap-analysis.md` (oxfmt reflowed the §1.3, §1.4 and §2 tables).

## Refactoring hints

- **Helpers that look generic:** `positionCorners` and `TILE_RADII`
  (`packages/preset/src/components/list.ts`): tile corners by position; c2e's button group and
  any segmented control want them. `listItemPosition` (`packages/binding-core/src/components/list.ts`):
  index to position; same users. The `chosen` parameter of `rowParts`: any row that can be
  checked.
- **Code that looks like a sibling's:** the menu's and select's group rendering in each binding
  (group wrapper plus label from Zag's `getItemGroupProps`/`getItemGroupLabelProps`) are near
  copies; c1a's select affixes touch the same `select.tsx` files.
- **Suggested home:** `positionCorners`/`POSITIONS` in `packages/preset/src/components/shaped.ts`
  or a new `tiles.ts`; `listItemPosition` as a generic `tilePosition` in binding-core.
- **What must not change:** `packages/preset/src/components/__snapshots__/new-components.spec.ts.snap`
  (list, listItem, menu), the `lists` and `select` screenshots, the component suites' list,
  menu and select cases.

## Open questions

- The Solid agent ran `git stash`/`git stash pop` once in this shared checkout; all files came back, but say so.
- Grouped menus clip at the root (`overflow: hidden`), which also clips an outer focus ring on an
  item's sides. An inset ring (`materialState(..., { focusRing: "inset" })`) is unaffected. A
  first/last-child slot state in core would allow per-group corners without the clip.
- Should `vibrant` become a value of `color` (as the gap analysis first wrote it)?
- The select's options: should zag's `groupBy` be used instead of reordering items with
  `selectGroupedItems`?
