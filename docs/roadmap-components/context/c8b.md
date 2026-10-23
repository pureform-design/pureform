# c8b: Context menu trigger (output context)

Branch `c8b`, from main `62e8ed69`. Not pushed; main untouched. Commits: `git log 62e8ed69..c8b`.

## What was done

- **A `contextTrigger` part on the menu** (`menuOverlayAnatomy`, `packages/anatomy/src/composites.ts`):
  an unstyled child of `root` (`data-part="context-trigger"`, test id `pf-menu-context-trigger`,
  `compositeTestIds.menu.contextTrigger`). The preset's `menu.ts` is unchanged: the part is
  unstyled, so no slot or token changed. Zag's own `getContextTriggerProps` backs it, so the
  menu opens at the pointer (`anchorPoint`) for a right-click, and for a touch held down
  (pointerdown, 700ms, cancelled by move, up or cancel). Submenus and groups work as in a
  triggered menu, since it is the same machine and content.
- **Keyboard** (`packages/machines/src/menu.ts`): `connect`'s `getContextTriggerProps` adds an
  `onKeyDown` for the context menu key and Shift+F10 (`isContextMenuKey`, exported). It sends
  Zag's `CONTEXT_MENU` at the bottom-start of the focused element (keyboard events carry no
  pointer) and prevents the default, so the browser's own `contextmenu` doesn't re-place it.
- **React and Solid:** `Menu.ContextTrigger` (a `<div>`, `as` supported) and, on the ready-made
  menu, `contextTrigger` (the area's content, from `MenuContentProps`, rendered before the
  positioner; works with or without `trigger`). Root has no extra option: the area is the part.
- **React Native:** `contextTrigger` on `Menu` (a `Pressable` area, `accessible={false}`). A long
  press opens the menu at the touch point (`pageX`/`pageY`, as the window rect the overlay
  anchors to); without a `trigger` the menu is the overlay alone. On the web, a right-click
  (`onContextMenu`) and the keys open it too. The area only reads the press; it doesn't touch
  scrolling.
- **Cases** (`@pureform/component-cases` `menu.ts`): examples "with a context trigger" and "with
  only a context trigger", so accessibility, direction, server rendering and Storybook pick them
  up. No new `opened` case: an open context menu has no pointer to sit at.
- **Deprecated options:** the menu has none; nothing removed.

## Tests

- Unit: anatomy (`composites.spec.ts`), machines (`isContextMenuKey`), React and Solid
  `menu.spec.tsx` ("context trigger"), React Native `overlays.spec.tsx` (right-click placement
  and Shift+F10, both engines).
- `omni run build test -p` anatomy, machines, binding-core, component-cases, react, solid,
  react-native: passed. Solid's `fade-through` "drops the old page at once" and React Native's
  FAB stagger test failed once each under load and passed on `-f failed` (unrelated flakes).
- `bunx tsc --noEmit -p tsconfig.json` clean in those packages and `tests/component-suites`.
- e2e after `omni run generate prepare -p @pureform/panda-fixture`, from `tests/component-suites`:
  `overlays.e2e.test.ts -t Menu` on solid/panda, react/css, react/tailwind (15 passed each,
  including the new "Menu context trigger": right-click placement, touch held, touch lifted
  early, both keys, other keys); `accessibility`, `direction`, `server-rendering`, `keyboard`
  `-t Menu` on solid/panda and react/css (132 passed each).

## Refactoring hints

- **Helpers that look generic:** `isContextMenuKey` (machines `menu.ts`) would serve any
  component with a context menu (a table row, a list item). React Native's `ContextTrigger`
  (`react-native/src/menu/menu.tsx`) and `WindowPoint` are a long-press-at-point area that a
  future context menu on a list item would reuse.
- **Code that looks like a sibling's:** React's and Solid's `ContextTrigger` copy `Trigger`.
  The RN web handlers restate `isContextMenuKey` inline (RN doesn't depend on machines).
- **Suggested home:** a binding-core helper for the key check if RN needs it; RN's area in
  `overlay.tsx` beside `useAnchoredOverlay` if a second overlay takes a point.
- **What must not change:** `overlays.e2e.test.ts` "Menu context trigger", the menu's
  composite-anatomy spec, RN `overlays.spec.tsx` "context trigger".

## Open questions

- **Option on Root vs a part:** the phase says "an option on Menu's Root". A part (Zag's own
  shape) lets the area wrap any content and works in composed menus, so the ready-made takes
  `contextTrigger` content instead of a boolean. Say if a Root boolean is wanted.
- **React Native nested pressables:** a pressable inside the area takes its own touches, so a
  long press on it doesn't reach the area (the responder system picks the deepest). Not worked
  around, to stay clear of driving touches.
- **React Native on touch devices** has no keyboard route; the key handlers run on the web only.
- Zag's long press is 700ms and not configurable; RN uses `Pressable`'s default (500ms).
