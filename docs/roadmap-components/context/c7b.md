# c7b: Menu submenus, expandable list items, rail section label (output context)

Branch `c7b-submenu-expandable`, from main `07eaa67c`. Commits: `git log 07eaa67c..c7b-submenu-expandable`
(preset, machines, binding-core, Solid, React, React Native, then fixes, suites, docs and this file).

## Built

- **Preset**
    - `listItem` (`list-item.ts`): two new slots. `indicator` sits in the row after `trailingText`;
      it's `expandIndicator(parts.trailing, slot("root", "expanded"))` from `accordion.ts`, turning
      180° while the row is `aria-expanded`. `region` is an outermost slot, the row's sibling,
      because the row is a button. It sets only `paddingInlineStart: regionIndent` (spacing 4) and
      leaves its display to `hidden`. `content` now sets `textAlign: start`, so the text starts at
      the line's start inside a button (a no-op elsewhere). Variant groups and compounds don't
      change (0 compounds added).
    - `navigationRail`: a `sectionLabel` slot (structure `root: [header, sectionLabel, item]`). It's
      `display: none` in the base and `flex` in `expanded: true`: `titleSmall` in
      `sectionLabelColor` (`onSurfaceVariant`), `minHeight` `sectionLabelHeight` (56), and
      `sectionLabelPaddingInline` (spacing 4). Only `expanded` sets it, so no groups overlap.
      `contrast.ts` has the label on the container.
    - `menu`: only its comment changed. A submenu's trigger is an `item` with an arrow in
      `itemTrailing`.
    - Spec: `components/nested.spec.ts`. The `new-components` snapshot is updated.
- **Anatomy:** `generated.ts` is regenerated. `anatomy.spec.ts` now lists `listItem.indicator`
  as mirrored, and `listItem.region` as the one non-root part with no parent.
- **Machines**
    - `menu.ts`: `getTriggerItemProps` emits to the parent's item source under the child trigger's
      id, which is the value the parent highlights it by.
    - `returnFocusToParent`: when a submenu closes while holding focus, focus goes to its parent's
      content. Zag won't do this here, because the submenu's content sits inside the parent's,
      so Zag thinks focus is already in the parent.
    - Zag already stops propagation on the keys a submenu handles, so a key pressed in a submenu
      doesn't press the parent's highlighted item. The spec checks this.
    - `navigation`: a `sectionLabel` part and `getSectionLabelProps` (`data-part="section-label"`).
- **binding-core**
    - `MenuItem.items`: the items of a submenu.
    - `hasSubmenu`.
    - `submenuPositioning(dir)`: `right-start` (`left-start` under `rtl`), gutter 0.
    - `ListItemExpandProps` (`expanded` / `defaultExpanded` / `onExpandedChange`) and
      `LIST_ITEM_EXPAND_PROPS`.
    - `ListItemContentProps.region`; `ListItemData` takes the expand props too.
    - `LIST_ITEM_EXPAND_VALUE` and `listItemExpandMachineProps`, which give Zag's accordion one
      collapsible item.
    - `NavigationItem.sectionLabel`.
- **Solid and React**
    - Menu:
        - `Menu.Submenu` runs a second menu machine linked to its parent through
          `setChild`/`setParent`, positioned beside it.
        - Unless given its own, a submenu takes the parent's `onSelect`, `closeOnSelect`,
          `loopFocus`, `typeahead`, `color`, `density`, `vibrant` and `tokens`. It isn't grouped.
        - `Menu.TriggerItem` is the parent's item. It shows hover while its submenu is open.
        - In the ready-made menu, an item with `items` renders a submenu with a chevron (mirrored)
          in `itemTrailing`.
    - List item:
        - `ListItem.Expandable` holds Zag's accordion with one item. It wraps `Root`, which becomes
          a `button` and takes the trigger props, and `ListItem.Region`, which takes the content
          props.
        - `ListItem.Indicator` defaults to `ExpandIcon`.
        - The ready-made item becomes expandable when given a `region`.
        - `Region` resets the context, so list items nested inside it are plain rows.
        - The accordion's header emitter emits to Root's own interaction source. Root drops its own
          handlers while expandable.
    - Rail:
        - `NavigationRail.SectionLabel` (the parts come from the shared `createNavigation`).
        - In the ready-made rail, a destination's `sectionLabel` renders before it. The bar
          ignores it.
- **React Native**
    - `ListItem` with a `region`: a button (`aria-expanded`) with a `⌄` indicator in the
      `indicator` slot. The region is rendered only while expanded, from React state
      (`useControllable`).
    - `Menu` drills into a submenu in place, under a back row (`‹` and the item's label), instead
      of cascading. Submenu items show a `›` and `aria-haspopup`.
    - The rail renders each destination's `sectionLabel`.
- **Suites**
    - `tests/component-suites`: `expandableListItem` (examples, `expanded` state, Enter and Space,
      indication), and a menu "with a submenu" opened example.
    - Browser:
        - A `nested-rows` screenshot (new Panda fixture section: an expanded and a collapsed
          expandable item, a menu with an open submenu, the rail expanded and collapsed with
          section labels).
        - A `listItem.indicator` reduced-motion fixture.
        - Additions only in the indication fixtures (`web.txt` and `native.txt`, +22 each:
          `listItem*.indicator`).
    - `rn-adapter` `factory.spec.ts`: the list item's moving slots now include `indicator`.

## Design calls

- **Expandable list item = the accordion's behaviour for one item** (the phase asked to reuse c6a).
    - On the web it is Zag's `accordion` machine, so `aria-expanded`, `aria-controls`,
      `role=region` and `hidden` come from Zag, as the accordion's do. Clicking toggles. Zag
      handles `TRIGGER.CLICK` only once the header is focused, which a real click does.
    - React Native has no Zag, so it uses React state, as the RN accordion does.
- **Region outside the row:** the row is a `<button>`, so the nested rows can't sit inside it.
  `region` is an outermost slot, and the anatomy spec allows that one case.
- **Region indent** of 16px (`regionIndent`): M3 Expressive doesn't specify it.
- **Submenus render in place**, inside the parent's content, as the menu always has. There is no
  portal.
- **The submenu trigger's arrow** is `GLYPH_PATHS.chevronEnd` (mirrored), Material's
  `keyboard_arrow_right`.
- **Rail section label:**
    - M3 Expressive shows section headers only in the expanded rail. A collapsed rail hides them
      (`display: none`).
    - 56 high, `titleSmall`, `onSurfaceVariant`, inset 16 from the rail's padding. These values are
      estimated.
    - Composition plus the destination-data field, rather than a separate `sections` prop.

## Deviations

- **React Native submenus drill in** rather than cascade, because there's no nested popup. The
  README says so, and the meaning is kept. On the web, focus isn't moved to the first submenu item
  after drilling in (only the popup's first item gets focus when it opens).
- **Solid fix found along the way:** Solid's menu passes only the keys it needs to
  `menuMachineProps`. An earlier `...props` spread read `children` eagerly, which rendered the
  split button's menu outside its context.

## Merge notes

- **`list-item.ts` with c7c (swipe):** both add slots to the `slots` array and `structure`, and
  maybe tokens. Merge the union by hand:
    - My slots: `indicator` (in `root`'s structure, last) and `region` (outermost).
    - My token: `regionIndent`.
    - The `content` style gains `textAlign: start`.
    - In the bindings' `list-item.tsx`, my changes are Root's element and handlers when expandable,
      and the new `Expandable`, `Region` and `Indicator` parts. The ready-made splits into
      `ReadyMade` and `row()` (Solid) or `Row` (React).
- **Shared files touched (additive):**
    - binding-core `index.ts`.
    - Each binding's `navigation.tsx` (`SectionLabel`, and the ready-made section label).
    - The bindings' registry fixtures (`listItem` + `indicator`, `region`; `navigationRail` +
      `sectionLabel`).
    - `component-suites/src/components/index.ts`.
    - The browser suite's `visual.e2e.test.tsx` (`nested-rows`) and `reduced-motion.e2e.test.ts`.
    - The Panda fixture `page.tsx`.
    - Rerun `generate` for `generated.ts`.
- **Indication fixtures:** regenerate, or union them, after c7c. c7c's swipe parts will add their
  own lines.
- **Counts:**
    - No new components and no new compounds.
    - New parts: `listItem.indicator`, `listItem.region`, `navigationRail.sectionLabel`, and the
      machine's `navigation.sectionLabel`.
    - §1.8 totals and doc counts are left to the merge.
- **Pre-existing failure:** Solid and React `date-picker.spec.tsx` "marks today" fails on today's
  date (also on main), so builds ran with `-i`.

## How to verify

- Unit tests:
    - `omni run test:unit -i -f all` for machines, binding-core, solid, react, react-native,
      anatomy, preset, css-, tailwind-, panda- and rn-adapter, and generate. All pass except the
      date-picker case above.
    - `bunx tsc --noEmit -p tsconfig.json` is clean in preset, machines, binding-core, solid,
      react and react-native.
- `tests/component-suites`: `bun x vitest --config ./vitest.config.e2e.ts run -t "ListItem|Menu"`
  gives 2172 passed.
- `tests/browser-e2e-tests`: the whole run passes (893, `--testTimeout=300000`), with the new
  `nested-rows` screenshot.
- `bun install` and `bun install --frozen-lockfile` both pass. No dependencies changed.

## Refactoring hints

- **Helpers that look generic:**
    - `expandIndicator` (preset `accordion.ts`) now has three users: accordion, tree and list item.
      c6a suggested moving it to an `expandable.ts`, and that's still right.
    - `submenuPositioning` could serve any cascading popup.
- **Code that looks like a sibling's:**
    - Solid's and React's `useMenu` (Root and Submenu) repeat what `fab-menu.tsx` does for its
      machine.
    - React Native's `⌄` indicator `IconSlot` row repeats the RN accordion's.
    - The Solid ready-made list item's `NoPart` trick (a component chosen up front, so a row that
      can't expand makes no reactive node) would suit any optional part. The row-cost budget
      (68) still holds.
- **Suggested home:**
    - `expandIndicator` → `packages/preset/src/components/expandable.ts`.
    - The menu's variant and behaviour inheritance → a binding-core helper
      (`submenuSelection(parent, own)`), if a second cascading component appears.
- **What must not change:**
    - The `nested-rows` and `expandables` screenshots.
    - The `listItem*` lines of `__fixtures__/indication/{web,native}.txt`.
    - The reduced-motion `listItem` row.
    - `nested.spec.ts` (preset and binding-core).
    - The submenu specs in machines, Solid and React `menu.spec`.

## Open questions

- A `grouped` menu clips its root (`overflow: hidden`), so a submenu inside a grouped menu
  would be clipped. Should submenus portal out of their parent's content (to the top-level root)
  instead?
- The values for `regionIndent` (16), the section label (56 high, `titleSmall`) and the submenu
  gutter (0) are estimates, not confirmed M3 values.
- React Native drills into submenus. Should it cascade with a second `Anchored` popup instead?
- Should the ready-made rail take `sections` (groups of destinations) rather than a
  destination's `sectionLabel`?
