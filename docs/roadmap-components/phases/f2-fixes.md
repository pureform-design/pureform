# f2: Fixes after f1

**Depends on:** r7. **Subphases:** f2a to f2e, parallel.
**Source:** f1's handoff notes, "Answers" (git history: `docs/roadmap-components/context/f1.md`).

The answers to f1's open questions. Each follows the component recipe and the conventions, in
React, Solid and React Native, on the css, panda and tailwind targets. Remove an option outright
when its replacement covers it.

## f2a: Lists

- **React Native `swipeable` prop:** removed. `ListItemProps` extends
  `Omit<ListItemVariantProps, "swipeable">`, as binding-core's root props do on the web, and the
  item is swipeable exactly when it has a `swipeAction`. The item still sets the variant for its
  styles. Update the README.
- **React Native `onPress`:** a swipeable item that isn't expandable takes `onPress`; a tap that
  isn't a drag fires it, a drag doesn't (as the web's click suppression after a drag).
- **Stacking:** the frame gets `isolation: isolate`, so the row's `zIndex: 1` stacks only against
  its action. No theme stacking role.

## f2b: Controls

- **Flaky test:** the toolbar's "keeps every element and no overflow button when they fit"
  fails intermittently under the full parallel suite (r7). Make it deterministic.

- **Slider:** the clipped icon button's focus ring uses the theme's focus ring width, not 1px.
  The handle clearance becomes a component token; add a styled web e2e for the inset icon's
  cut-off.
- **Toolbar:** an unstyled toolbar reads the provider's default `color` (not only its own prop)
  before recolouring its icon buttons as vibrant.
- **Text field label:** its float moves to `spatialFast`, overshooting like Compose's
  `FastSpatial`. This replaces f1b's `effectsDefault`.

## f2c: Overlays

- **Flaky test:** React Native `overlays.spec.tsx` "settles a dragged bottom sheet back when the
  app keeps it open" fails intermittently under the full parallel suite (also on main). Find the
  timing it depends on and make it deterministic.

- **React Native sheets:** slide by their own measured size, not the window's.
- **Toast:** exits with the shared `overlayShrinkOut`, not its own CSS `scale`.
- **Grouped menus:** the machine marks a group's first and last items with data attributes; the
  preset rounds them through those instead of raw `:first-child`/`:last-child`.
- **Async close:** `onClose` may return a promise. A dragged sheet holds where it was let go until
  it settles, then leaves (resolved true) or springs back. Same on web and React Native.

## f2d: Table sort arrow

- An unsorted column's hover hint points the way a click would sort, following `sortStart`.
- The turn keeps its overshoot under expressive.
- A web binding spec asserts the rotated transform.

## f2e: Springs

- **React Native delay:** a delayed spring slide uses `Animated.delay` (or the driver's
  equivalent), not `setTimeout`.
- **Instance spring tokens:** a factory instance can pass a component's spring tokens, as it does
  other tokens.
- **Aliases:** a theme override that aliases another component's spring token resolves as a
  spring (both vars), not one var.
- Spring tokens stay unregistered with `@property`.

## Done when

As for f1, with `/tmp/opencode/f2a.md`..`f2e.md` and the merge's `/tmp/opencode/f2.md`.

## Answers to the subphases' questions

- **f2a:** `isolation` reaches React Native (kept). A swipeable item with `onPress` loses its
  pressed look once a drag takes over (fine). Tabs' and the switch's raw `zIndex` move to a
  shared isolation helper in r8.
- **f2b:** the clipped ring follows the icon button's `outlineWidth`. The merge drops next.md
  §2's "slider cut-off following the theme".
- **f2d:** the header cell doesn't match `aria-sort` for styling (screen readers still get
  `aria-sort`); only the arrow carries `descending`.
- **f2e:** an instance passes springs only to spring tokens: the generated registry records which
  tokens are springs, and a spring on another token is a type error. An instance can also pass a
  spring role by name (`"spatialSlow"`). React Native slides settle within 0.001 (r7's question).
  These two go in at the merge.
