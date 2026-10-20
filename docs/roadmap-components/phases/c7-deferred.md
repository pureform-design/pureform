# c7: Deferred features

**Depends on:** c6 (and c6a for expandable list items). **Subphases:** c7a to c7c, parallel.
**Gap analysis:** §2.7 "Later".

The items every earlier phase left out because they needed a feature that now exists.

## c7a: Scrollable tabs and chip set

One subphase: scrolling containers with edge padding and set behaviour.

- Tabs: `scrollable` variant (overflow scrolling, edge padding).
- `chipSet`: a styled container with set behaviour (zag `toggle-group` or `listbox`), plus the
  selection list built on `listbox` with `list` and `listItem`.
- Own files: `tabs.ts`, `chip.ts` (container part), a new `selection-list`, machines, bindings.

## c7b: Menu submenus and expandable list items

One subphase: both are nested, expandable rows.

- Menu: submenu trigger item (arrow in `itemTrailing`), zag nested menu.
- List: expandable items using c6a's accordion behaviour (an expand icon in `trailing` and a
  nested region). Rail `sectionLabel` for expanded rails.
- Own files: `menu.ts`, `list-item.ts`, `navigation-rail.ts` (section label only), machines,
  bindings.

## c7c: Avatar fallback, list swipe, slider inset icon, search bar width

Small, independent leftovers; one agent works through them in order.

- Avatar: zag `avatar` `image` and `fallback` parts.
- List: swipe to reveal an action (gesture and revealed region).
- Slider: `insetIcon` (an icon inside the active track, M and up).
- Search bar: max width and lift on scroll (with c4b's scroll behaviour).
- Own files: `avatar.ts`, `list-item.ts` (swipe only), `slider.ts` (insetIcon only),
  `search-bar.ts`, bindings and machines. c7b also edits `list-item.ts`: merge that pair by
  hand and record it.

## Done when

As for c1, and the gap analysis' "Later" row is empty or each leftover names why.
