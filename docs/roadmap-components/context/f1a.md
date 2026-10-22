# f1a: Lists and navigation (output context)

Branch `f1a-lists` from `aee1db3c`. Source: [f1](../phases/f1-fixes.md#f1a-lists-and-navigation),
[next.md §0 and §2](../next.md#0-decisions-2026-10-22). React, Solid and React Native; css, panda and
tailwind targets.

## What was built

- **Rail sections** (`6f2c4ccb`). A destination's `sectionLabel` (a node) is **removed**. It is
  replaced by a `section` string on each destination (`NavigationItem.section`). binding-core's
  `selectItemGroups` is now generic (`selectItemGroups(items, groupOf?)`, with
  `SelectItemGroup<Item>`), and the new `navigationSections(items)` groups the destinations through
  it. Each section gets one `sectionLabel` heading with its text, in the order sections first
  appear, like Select's `group`. The rail's ready-made renders the groups in React, Solid and
  React Native. The bar ignores `section` and keeps its order. The `sectionLabel` part (and the
  composed `SectionLabel`) stays as the heading part. Tests: the React/Solid navigation specs
  (one heading, grouped order, the bar's order unchanged) and the React Native spec.
- **Selection list** (`0113c819`). `selectionMode` now defaults to `single`; `multiple` is still
  an option. Changed in `selectionListMachineProps` (web) and React Native, which reads the same
  helper. Docs, READMEs and specs are swapped to match. In the component suite, the `multiple`
  example now passes `selectionMode: "multiple"`, and `single` and the state case use the
  default.
- **Avatar** (`2fae7bd2`). The web already had a non-`<img>` root, `role="img"` and `aria-label`
  from `label`, and `aria-hidden` without one. React Native set `role="img"` even without a
  label; it now matches the web: `role="img"` + `aria-label` only when named, otherwise
  `aria-hidden`. A new React Native spec covers it. There is no compatibility path for the old
  `<img>` root (the open question from c7c is settled: it stays a non-`<img>` root).
- **Expandable and swipeable list items** (`d48737fd`, next.md §2):
    - **Preset** `list-item.ts`:
        - A new `frame` slot: `position: relative; overflow: hidden`, with the tile corners per
          `position`. It holds the `action` and the row as siblings. `structure` keeps `frame`
          and `action` out of the tree, like `region`. A nested slot can't set tokens, and
          `actionColor` needs to.
        - The `swipeable` variant now slides **the row itself** (`root` transform on
          `swipeOffset`) instead of its parts. Its transition is the state tweens plus the
          `swipeOffset` spring, with only the state tweens while `pressed`.
        - A swipeable row's focus ring is drawn inside the row (`focusIndicatorOuterOffset`
          set to minus the thickness), because the frame clips.
        - `actionColor: error` sets its tokens on `action` instead of `root`.
    - **Anatomy:** regenerated (`frame`, and `action` is no longer under `root`). The
      "nests every part inside the root" spec now also allows `listItem.frame` and
      `listItem.action`.
    - **binding-core:**
        - New `ListItemFrameOwnProps` (the swipe props plus `actionColor`) and
          `LIST_ITEM_FRAME_PROPS`.
        - `ListItemRootOwnProps` no longer takes `swipeable`, `actionColor`, `revealed`,
          `defaultRevealed`, `onRevealedChange` or `swipeWidth`. They are **removed from
          Root**, and `Frame` replaces them.
    - **React and Solid:**
        - A new composed `ListItem.Frame` owns the swipe state and renders `frame`.
        - The swipe's instance tokens go on the frame (from its scope's root style), and
          `Action` and `Root` inherit them.
        - `Root` swipes when it's inside a `Frame` and keeps the pointer and key handlers.
          `Action` reads the frame.
        - The ready-made item wraps `[Action, Root]` in a `Frame` when it has a `swipeAction`,
          including an expandable one (the Region comes after the frame).
        - The ready-made no longer takes `swipeable`; `swipeAction` covers it.
        - Solid's swipe swallows the click that ends a drag with a capturing native listener,
          because Solid has no capture prop. The old `onClickCapture` prop never attached. The
          listener goes away on the next press if no click came.
        - Solid builds the frame inside the providers around it (a thunk), so an expandable
          row still sees `Expandable`.
    - **React Native:**
        - A swipeable item renders `frame.View` (the `PanResponder`, now
          `onMoveShouldSetPanResponderCapture` so it wins over a pressable row) around
          `[action, row]`.
        - An expandable item swipes and stays a pressable button.
        - A swipeable item that isn't expandable is still not pressable.
        - The web key handler for the arrows sits on the row.
    - Tests:
        - React/Solid list item specs: the frame's order, and an expandable item that swipes
          (a drag reveals without expanding, then a click expands).
        - React Native spec: an expandable swipeable item.
        - The preset expressive spec and the snapshot.
        - Component suites: `swipeable, destructive, revealed` (list item) and
          `swipeable, revealed` (expandable list item) examples.

## Decisions

- **The action sits beside the row, not "the root becomes a wrapper".** next.md §2 suggested
  turning every expandable item's root into a wrapper around a header button. That would have
  moved the row's styles, indication and test ids off `root` in all three bindings. A new
  `frame` part around `[action, root]` gives the same structure: the button and the action are
  siblings.
    - It changes the DOM of **swipeable** items only. Expandable items without an action are
      unchanged, so there are no screenshot or indication-fixture changes.
    - It also settles c7c's question about swipeable links and buttons: the action is no
      longer inside them.
- **The row slides, not its parts.** Before, the action was absolutely positioned inside the
  row, after the parts that slid. By paint order (positioned, later in the tree) it sat on top
  of the row's end even at rest. With the action under an opaque row, sliding the whole row is
  the only way to uncover it. This is also Compose's `SwipeToDismissBox` model (background
  content under moving foreground content).
- **Action before Root in the DOM**, so the row paints over it without a z-index. The preset
  has no plain z-index, and `zIndex("raised")` would escape the frame. As a result, Tab reaches
  a revealed action before the row (see open questions).
- Rail: `section` is a string, not a node, because it's grouped by equality, like Select's
  `group`. Sections are gathered (every destination of a section together, in first-appearance
  order), not only adjacent runs. That's what `selectItemGroups` does.

## Output changes

- List item (all targets): `frame` slot, and the `swipeable` styles moved from the parts to
  `root`. Slot recipe snapshot updated (`new-components.spec.ts.snap`).
- Anatomy: `listItem.frame` (`pf-list-item-frame`); `action`'s parent is `null`.
- Removed options: the rail destination's `sectionLabel`; web `ListItem.Root`'s `swipeable`,
  `actionColor`, `revealed`, `defaultRevealed`, `onRevealedChange` and `swipeWidth`; the web
  ready-made `swipeable`. Replacements are named in the READMEs and the gap analysis.
- Selection list default `single`; React Native avatar `aria-hidden` when unnamed.

## Checks

- `omni run build test -p @pureform/anatomy -p @pureform/binding-core -p @pureform/preset -p
@pureform/react -p @pureform/solid -p @pureform/react-native` passes; the last rerun was
  `-f failed`.
    - Earlier runs failed only on 5–60 s test timeouts under load average around 40
      (`rn-adapter` `factory.spec`/`codegen.spec`, a few preset specs).
    - The same files pass when run alone.
- `bunx tsc --noEmit -p tsconfig.json` is clean in anatomy, binding-core, preset, react, solid
  and react-native. `tests/component-suites` only lacks its generated `.pureform` targets until
  its e2e config writes them.
- Component suites, through Vitest with
  `-t "ListItem|SelectionList|NavigationRail|Avatar"`:
    - accessibility, direction, keyboard, controllable, server-rendering, indication and themes
      on `react/css` and `solid/tailwind`: 812 passed;
    - direction and server-rendering on `react/panda`: 96 passed.
- Not run: the whole suites, rn-web-demo e2e (it doesn't use the changed components),
  browser-e2e screenshots (no screenshot shows a swipeable item or rail sections).

## Refactoring hints

- **Helpers that look generic:** `selectItemGroups(items, groupOf)`
  (`binding-core/src/components/select.ts`) now groups any tagged items. A tree's or menu's
  groups could use it.
- **Code that looks like a sibling's:**
    - React's and Solid's `Frame` (`list-item.tsx`) both put their own scope's root token style
      on a non-root part (`scope.classes.root?.style`). A `tokenStyleOn(part)` render option in
      the parts helpers would replace that.
    - The React and Solid swipe gestures (`list-item/swipe.ts`) now differ in how they swallow
      the click after a drag: React uses a capture prop, Solid a native listener. The native
      listener would work in both.
- **Suggested home:** a token-carrying render option in `packages/{react,solid}/src/parts.tsx`.
- **What must not change:** the list item specs in all three bindings, the component-suite
  `ListItem` cases (direction compares the bindings' computed styles), and the preset snapshot.

## Open questions

- **Tab order of a revealed action:** it comes before the row, because the DOM order puts the
  row on top. A theme z-index for "above a sibling" would allow `[root, action]` instead.
- **Focus ring inside a swipeable row:** the frame clips, so a swipeable row's ring is inset
  (`focusIndicatorOuterOffset` = minus the thickness), unlike other list items.
- **React Native:** a swipeable item that doesn't expand still can't take `onPress`. It could
  now, since the frame takes the drag, but I left it unchanged.
- **Web `swipeable` variant prop:** it still exists on the selection (the frame sets it). Only
  Root's and the ready-made's props were removed. React Native's `ListItem` still takes
  `swipeable` (`ListItemVariantProps`).
- **The rail's sections are gathered, not run-by-run:** two separate runs of one section merge
  under one heading and reorder the destinations, as Select does. If "runs" should stay apart,
  `navigationSections` needs an adjacent-only grouping.
