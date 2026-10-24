# rn-menu-container: React Native Menu `auto` respects the nearest container (output context)

Branch `rn-menu-container` from main `040b9fc1` (after r10). Single agent. Not pushed.

## What changed

- **rn-adapter (`src/react.ts`):** `PureformContainer` also measures its frame
  (`measureInWindow`, on every layout) and provides it through a new `FrameContext`, keyed as the
  widths are (nearest under `""`, named ones by name). New exports: `useContainerFrame(name?)`
  (the frame in window coordinates, `undefined` with no container or before it's measured),
  the `ContainerFrame` type, and `withContainer(outer, value, name)` (the keying both contexts
  share). `ContainerContext` (widths) is untouched, so `useStyleEnvironment`, `useComponentStyles`
  and container conditions work as before; a separate context means width consumers don't
  rerender when only the position changes. Re-exported from `@pureform/react-native`
  (`useContainerFrame`, `ContainerFrame`).
- **React Native `Menu` (`menu/menu.tsx`):** `auto` keeps the measured menu box and computes the
  room against the boundary: the window's x range intersected with the nearest container's frame
  (`menuSubmenuRoomOf` as before, binding-core unchanged). It cascades only when a submenu as wide
  as the menu fits beside it on one side within both. No container: the window alone, as before.
- **Portal host:** a menu with a trigger renders its surface through the portal host, which
  doesn't carry React context, so the trigger's `Menu` reads `useContainerFrame()` and passes it to
  the surface as an internal `container` prop (cascaded submenus inherit it through the spread).
- **Docs:** `packages/react-native/README.md` (menu `submenu`).

## Tests

- rn-adapter `react.spec.ts` "container frames": `withContainer` keying, and no frame outside a
  container or before it's measured (server render).
- React Native `overlays.spec.tsx` "cascades by default only when a submenu fits beside the menu
  within the nearest container too" (animated and reanimated): a 200-wide container drills, a
  400-wide one cascades, and with no container the window alone cascades.

## Refactoring hints

- **Helpers that look generic:** `withContainer` and `useContainerFrame`
  (`rn-adapter/src/react.ts`): anything else that needs where its container is.
- **Code that looks like a sibling's:** the Portal-doesn't-carry-context workaround (read in the
  trigger, pass as a prop) would also fit any other portal content reading adapter contexts.
- **Suggested home:** unchanged.
- **What must not change:** `react.spec.ts` (rn-adapter), the React Native menu specs in
  `components.spec.tsx` and `overlays.spec.tsx`.

## Open questions

- The frame is measured on the container's layout, so a container that moves without resizing
  (an ancestor scrolls or shifts) keeps its old position, as `auto` measures once per open.
- The container's frame only counts horizontally; vertical bounds don't affect cascading.
- Only the nearest container counts; a named container can be read with `useContainerFrame(name)`
  but `Menu` doesn't take a name.
