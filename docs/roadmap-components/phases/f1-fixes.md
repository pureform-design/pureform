# f1: Fixes after m2

**Depends on:** m2. **Subphases:** f1a to f1f, parallel.
**Source:** [next.md §0](../next.md#0-decisions-2026-10-22), §1 and §2.

The decisions and open items the earlier phases left, gathered into one phase. Each follows the
component recipe and the conventions, in React, Solid and React Native, on the css, panda and
tailwind targets. Remove an option outright when its replacement covers it.

## f1a: Lists and navigation

- **Rail sections:** replace a destination's `sectionLabel` with a `section` tag on every
  destination. Runs of the same `section` share one heading, grouped like Select's `group`
  through `selectItemGroups`; the bar ignores it. `sectionLabel` is removed.
- **Selection list:** single selection by default; multiple stays an option.
- **Expandable and swipeable list items together:** the row's root wraps the header button and
  the swipe action as siblings, so an item can do both (§2).
- **Avatar:** stays a non-`<img>` root, with `role="img"` and an accessible name.

## f1b: Controls

- **Icon button:** the fallback outline width follows the size.
- **Vibrant toolbar:** an unstyled one recolours its icon buttons.
- **Chips:** expressive corners from Compose's `ChipsTokens` (§1 #2): the resting and pressed
  shape roles and the outline colour.
- **Text field label:** its float (movement and size) moves from `spatialFast` to
  `effectsDefault`, so it doesn't overshoot under expressive (m2 open question).
- **Slider:** the inset icon's cut-off follows the theme's `insetIconSize` and
  `insetIconPadding` instead of fixed values (§2).

## f1c: Overlays

- **React Native sheets:** slide in from their edge instead of the dialog's motion; a refused
  close after a drag springs back to rest; check that the drag's extra `Animated.View` doesn't
  change a standalone sheet's layout (m2b).
- **Web sheet drag-to-dismiss:** the sheet springs back toward rest while it slides out; it
  should leave from where the drag released it (m2 merge).
- **Toast:** shrinks to 80% as it fades out, like the snackbar (m2 open question).
- **Submenus** inside grouped menus aren't clipped.

## f1d: Table sort arrow

- Core gets a "sorted descending" state, with its web selector and the React Native state, so
  the table's sort arrow turns on m2c's chevron spring instead of swapping ↑ for ↓ (m2c).

## f1e: React Native tabs spring

- The tabs indicator's slide on React Native runs a real spring through rn-adapter's
  `settle()` instead of the sampled curve, so a slide interrupted by another tap keeps its
  speed (m2a).

## f1f: Spring component tokens

- A component token can hold a spring (a literal or an alias to a spring role). The web writes
  it as two vars, `<token>-duration` and `<token>-easing`, referencing the role's vars when it
  aliases one, so a theme's role change still reaches it; `compileSpring` reads a component
  token alias through those vars instead of inlining the value. css, panda and tailwind
  adapters; React Native resolves the alias to a real spring (test it).
- Bring back the tokens m2a removed as springs: tabs `indicatorSpring` and time picker
  `handSpring`, both `spring("spatialDefault")`.
- Tests: lowering per target, and a theme override of the token reaching the transition.
