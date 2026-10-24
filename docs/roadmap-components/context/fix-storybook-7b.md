# fix-storybook-7b: menus, accessibility and components

Branch `fix-storybook-7b` from main `1e2c1e01`, the "7b" items (10–20) of
[fix-storybook-7](../phases/fix-storybook-7.md). Not pushed. Logs under
`/tmp/opencode/fix-storybook-7b-*`.

## Items

### 10–12. Menu `auto`: the submenu's own size, at the press, vertically too, within a named container

- **Done** on every renderer.
- **binding-core:** `menuSubmenuRoomOf(menu, boundary, submenu?)` takes the submenu's measured
  `size` beside its `row`: `needed` is then the submenu's own width, and the room has `upright`
  (the taller of the room down from the row's top and up from its bottom: where it opens, or
  flips to) and `neededHeight`. `menuSubmenuMode` drills when either doesn't fit. New
  `MenuSubmenuBox` (boundary `top`/`bottom` optional), `menuDrillPathTo(items, groups, value)`
  (the drill path to a submenu item at any depth, for a cascaded submenu's own submenu), and
  `container` in `MenuContentProps` / `MENU_CONTENT_PROPS`.
- **`/dom`:** `menuSubmenuBoundary(anchor, container?)`: the window ∩ every ancestor of the
  trigger that clips (per axis) ∩ the nearest CSS container (`container-type`), or the ancestor
  whose `container-name` is `container`. `menuSubmenuRoom(menu, row, submenu, anchor,
container)` measures. `menuSubmenuPressed(row, menu)` / `noteMenuSubmenuPresses()` tell a
  submenu opened by a press (pointer down on its row, or Enter, Space or a sideways arrow in the
  menu, in the last 500 ms) from one opened by the pointer resting on it.
  `watchMenuSubmenuRoom` and the old two-argument `menuSubmenuRoom` are gone (replacement named in
  the React and Solid READMEs).
- **React, Solid:** the ready-made no longer measures at open. Under `auto` every submenu is a
  cascade (Zag nested menu) and `AutoSubmenu` (inside each `Submenu`, through an
  `AutoSubmenuContext` from the ready-made) decides as it opens, in a layout effect (React) /
  effect (Solid), before paint: laid out at its own size, it stays when it fits; else it's hidden
  and its item becomes a drill item (`drills` set, cleared on close). Opened by a press or key, the
  menu drills into it at once (focus back on the menu's content); opened by hover, the next press
  drills. Once drilled in, the menu is a drill until back at the top (as React Native).
- **React Native:** at the press, the bounds (menu box, window ∩ container frame, now with `y` and
  height) are measured, then the submenu is laid out unseen (an `aria-hidden`, `opacity: 0`,
  roleless copy through the portal, `measuring`), and its `onLayout` size decides cascade or
  drill. New `container` prop (the `PureformContainer` by `name`; `useContainerFrame(name)` /
  `useMeasureContainer(name)`); the internal frame prop is now `containerFrame`.
- **Tests:** binding-core `menu.spec.ts` (own size, up/down, unbounded; `menuDrillPathTo`). React
  and Solid `menu.spec.tsx`: "cascades by default … drills as it opens when its container is
  narrow" (keys drill, focus stays, back out stays a drill, hover doesn't drill or show, the next
  click drills), "measures the submenu's own width and height as it opens" (a 400 px panel: a menu-
  wide submenu cascades, a wider one drills; a 160 px-tall panel drills a tall one), "keeps within
  the nearest container, or the one `container` names". React Native `overlays.spec.tsx`
  "measures the submenu's own width and height as it opens, within the container `container`
  names" (both engines; the earlier container tests still pass, including "never flips").

### 13. Tree: focus and keys on the `treeitem`

- **Done** (web and React Native). APG lets a parent node "contain or own" its group; the web's
  Zag tree put focus on a `role="button"` control nested in the branch's `treeitem`. Now the
  **row is the treeitem** on every renderer: it takes focus and keys, says `aria-level`,
  `aria-selected`, `aria-expanded`, `aria-disabled`, and a branch's row owns its group
  (`aria-owns`); the branch's element is plain, holding the row and the group side by side, so the
  row's name is its own text (not its children's). Chosen over the treeitem-wrapper with an
  `aria-hidden` row because the row's styles (`expanded`, `selected`) and focus ring read the row's
  own ARIA and `:focus-visible`, which a wrapper would break (and the wrapper's ring would circle
  the whole subtree).
- **Web (`machines/src/tree-view`):** `connect` reads Zag's props unnormalized, moves the
  treeitem's role and ARIA from `getBranchProps` to `getBranchControlProps`, adds `aria-owns` and
  gives `getBranchContentProps` the id (`branchGroupId`). Zag's keys and focus already target the
  control, so nothing else changes. The control's old `aria-current` is now `aria-selected`.
- **React Native:** the row `Pressable` is the treeitem on the web (`aria-owns` the group's
  `nativeID`). The tree is one tab stop (the focused row, else the first selected shown, else the
  first; roving `tabIndex`), with the keys on the tree: up/down, Home/End, the arrow toward the
  inline end expands or goes to the first child, the other collapses or goes to the parent (RTL
  swaps), Enter (React Native Web's) and Space select and toggle, a letter goes to the next row
  starting with it.
- **Tests:** machines `expandable.spec.ts` (control is the treeitem, owns its group, branch
  plain); React and Solid `expandable.spec.tsx` "makes each row its node's treeitem …" (no button,
  keys); React Native `a11y-roles.spec.tsx` (structure and names, Enter/Space on the treeitem, the
  keys and the tab stop). Component cases' tree reader comment updated (its reader already took
  rows).

### 14. React Native autocomplete: combobox + listbox of options

- **Done.** The suggestions are a `MenuListbox` (`role="listbox"`, named by the label, the
  combobox's `aria-controls` pointing at it) of `option`s. APG's list autocomplete: focus stays
  in the input (`aria-autocomplete="list"`); down/up open the list and highlight the next/previous
  option (wrapping), shown as the input's `aria-activedescendant` and the option's `aria-selected`
  (the highlighted one, as Zag's combobox does) and drawn hovered; Enter chooses it; Alt+Down
  opens with nothing highlighted, Alt+Up closes; typing clears the highlight. `MenuListbox` takes
  `listbox.active` (`MenuListboxOptions`, exported) for that mode: options get ids and take no
  focus.
- **Tests:** `a11y-roles.spec.tsx` "the autocomplete, a combobox with list autocomplete" (both
  engines); `components.spec.tsx` autocomplete test now picks an `option`. `CHOICE_ROLES` comment.

### 15. React Native select: type-to-find

- **Done**, as APG's select-only combobox: typing on the closed field opens the list on the first
  option starting with the text (nothing is chosen by typing); in the open list (any menu too,
  `MenuKeys`) typing moves focus to the next item starting with it; keys within 500 ms add up, one
  letter again and again goes round those starting with it. Helpers `typeahead`, `isTypedKey`
  (`menu/menu.tsx`). The web's Zag select chooses without opening; APG's opens, which we follow.
- **Tests:** `a11y-roles.spec.tsx` "the select's type-to-find" (both engines) and "type-to-find's
  typed text".
- Also: the select's focus return after the `Modal` checks again a frame later (the existing
  "takes the web's select's keys" failed about one run in three on main, reanimated, in full runs).

### 16. Tree "level N" localisable

- **Done** as the tree's `translations.level(label, level)` (`TreeTranslations`,
  `treeLevelLabel` the English default), exported from `@pureform/react-native/tree`;
  `nativeTreeRow` takes them. There is no app-wide locale messages object in the providers
  (`defaults` carries variants and tokens only), so a component's `translations`, as the
  paginator's, is the existing route.
- **Tests:** `a11y-roles.spec.tsx` "says its level in the tree's words".

### 17. Keep the axe `label-content-name-mismatch` exception on React Native Tree

- **Done:** kept in `apps/storybook-web/stories.config.ts`, its comment updated for the new
  structure (rows named from their text, a branch's row owning its group). Tree stories pass on
  all three renderers.

### 18. Small React Native pressables take `hitSlop`

- **Done:** checkbox, radio, switch, icon button and chip pass
  `hitSlop={touchTargetSlopOf(s.root, s.touchTarget)}`: the root's size (width/height, else
  min sizes) grown to its `touchTarget` slot's minimum (48 without one); a side with no number (a
  chip's label-set width) gets none. `touchTargetSlopOf` lives in `src/touch-slop.ts` (not the
  `TouchTarget` component, which needs the `touchTarget` registry entry: a hook there would throw
  in registries without it, and the usage check would count it as drawn), re-exported from
  `@pureform/react-native/touch-target`.
- **Tests:** `touch-target/touch-target.spec.tsx`: each component's `hitSlop` (read from its
  fiber, React Native Web keeps it off the DOM) grows it to 48; the pure function.

### 19. React Native DateInput separators spaced as the web's

- **Done:** a separator is a segment on the web (Zag's literal, with the segment's padding); React
  Native's now takes the segment's look (`ownText(s.input)` + `s.segment`).
- **Tests:** `date-pickers.spec.tsx` "spaces its separators as the web's" (padding and font equal
  to a segment's; the gap between segments is the separator's width).

### 20. Changelog line for `withSetTokens`' API change (r9a)

- **Done:** `packages/rn-adapter/CHANGELOG.md` (new, in the repo's cocogitto format) with an
  "Unreleased / Breaking changes" line; the commit carries a `BREAKING CHANGE:` footer.

## Checks

- `omni run build test -p @pureform/binding-core -p @pureform/machines -p @pureform/react -p
@pureform/solid -p @pureform/react-native -p @pureform/component-cases -p @pureform/preset`,
  then `-f failed` until green. Failures seen and fixed: the usage check (slop helper moved), the
  machines tree spec (updated), a binding-core type check. Unrelated flakes under load that passed
  on rerun: React Native `presence` (FAB stagger), `table` (sort arrow opacity), `horizontal-shared-axis`.
- Component suites (after `omni run generate prepare -p @pureform/panda-fixture`):
  accessibility, keyboard, controllable, direction for `solid/css` and `react/css`
  `-t "Tree|Menu|Autocomplete|Select|DateInput"`: 752 passed; overlays, expand-motion, forms
  with the small controls too: 270 passed; accessibility and keyboard for `react/panda` and
  `solid/tailwind` `-t "Tree|Menu"`: 186 passed.
- Visual suite `-t "expandables|select|search-and-autocomplete"`: 5 passed, no re-records.
- Story tests (solid, react, native): Tree, Menu, Autocomplete, Select, DateInput: 231 passed;
  native Checkbox, Switch, Chip, IconButton, RadioGroup: 71 passed.
- `bunx tsc --noEmit -p tsconfig.json` clean in binding-core, machines, react, solid,
  react-native, component-cases, preset, storybook-web. `omni run build -p
@pureform/storybook-web` passes. No conflict markers.

## Refactoring hints

- **Helpers that look generic:** `typeahead` / `isTypedKey` / `findTyped`
  (`react-native/src/menu/menu.tsx`): any React Native list with type-to-find (the tree has its
  own one-letter version in `tree/tree.tsx`; `SelectionList` has none). `touchTargetSlopOf`
  (`react-native/src/touch-slop.ts`) for any other small pressable. `menuSubmenuPressed`
  (`binding-core/src/menu-submenu-room.ts`) for anything that must tell a press-open from a
  hover-open.
- **Code that looks like a sibling's:** `AutoSubmenu` in React and Solid `menu/menu.tsx` mirror
  each other (as `MeasureSubmenuRoom` did); the React Native tree's key handling repeats Zag's
  tree keys; the autocomplete's highlight is the web's Zag combobox in small.
- **Suggested home:** the React Native typeahead and tree keys could join `MenuKeys` in a
  `react-native/src/list-keys.ts`.
- **What must not change:** the menu, tree, autocomplete, select, date input and touch-target specs
  above, and the component suites' Tree/Menu runs.

## Open questions

- **`aria-owns` rather than DOM nesting** for a branch's group (APG allows "contains or owns");
  Safari's support of `aria-owns` is weaker than Chrome's. Nesting would need the row's styles and
  focus ring keyed off the wrapper, a styling-layer change.
- **Hover-opened submenus that don't fit** close and turn their item into a drill item until the
  menu closes; a press then drills. Say if a hover should drill at once instead.
- **Web `auto` drills on a press** detected from a pointer down on the row or Enter/Space/sideways
  arrow in the menu within 500 ms; a programmatic `api.setOpen` on a submenu counts as hover.
- The default web boundary now includes the nearest CSS container (`container-type`), besides
  the window and clipping ancestors.
- **Select type-to-find opens the list** (APG); the web's Zag select picks without opening.
- **The autocomplete marks the highlighted option `aria-selected`** (APG, Zag), not the chosen
  value; the chosen one still shows the selected fill.
- No app-wide locale messages: `translations` per component. If one is wanted, the tree's
  `level` is the first entry.
