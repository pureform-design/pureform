# @pureform/browser-e2e-tests

Browser tests in Chromium, through Vitest's browser mode, over the adapters. They check what unit
tests can't: computed styles, real pointer and keyboard states, and screenshots. Private; nothing
depends on it.

It renders the Panda fixture's page and recipes (`tests/panda-fixture`) with the fixture's own
Panda config, and compiles the other adapters' stylesheets from the fixture's pureform config in
Node through browser commands (`src/commands.ts`). The demos aren't involved: each has its own
smoke test.

## Suites

| File                          | What it checks                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `state-matching.e2e.test.ts`  | For each state, an element marked each allowed way (native, ARIA, `data-pf-*`) matches the lowered selector, and Zag's attributes alone don't. Panda lowers to the same.                                                                                                                                                                                                                                                                                                                                                                                         |
| `parity.e2e.test.ts`          | The CSS and Tailwind adapters compute the same styles as the Panda preset, at every variant value and in each state.                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `rn-parity.e2e.test.ts`       | The React Native adapter's factories, through React Native Web, compute the same key styles as the CSS adapter.                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `rn-motion.e2e.test.ts`       | A React Native color change fades over the transition's duration, with or without reduced motion; a progress value moves, and jumps under reduced motion.                                                                                                                                                                                                                                                                                                                                                                                                        |
| `reduced-motion.e2e.test.ts`  | Under each way of asking for reduced motion (the system, a `data-pf-motion` provider, nested providers), computed `transition` keeps the fades and drops movement.                                                                                                                                                                                                                                                                                                                                                                                               |
| `direction.e2e.test.ts`       | Components with direction-aware styles (the switch, the linear progress) render left to right and right to left, and every part's `rtl` box mirrors its `ltr` box across the root.                                                                                                                                                                                                                                                                                                                                                                               |
| `icons.e2e.test.ts`           | Icon slots: an icon font's `FILL` is 1 on the current navigation destination and a selected toggle icon button, a `data-pf-mirror` icon flips under `rtl` only, and each toggle icon button fill takes Material's selected colors.                                                                                                                                                                                                                                                                                                                               |
| `panda-factories.e2e.test.ts` | The fixture's Panda class factories (`tests/panda-fixture/.pureform/`, generated by the Panda adapter's codegen for every component) return Panda's recipe classes for every variant combination (booleans included), Panda's stylesheet has a rule for every class the recipe styles (the `staticCss` entries keep them), and instance tokens set the component's CSS vars, which the stylesheet reads.                                                                                                                                                         |
| `indication.e2e.test.ts`      | The state layer and the focus indicator against fixtures (`src/__fixtures__/indication/`, `web.txt` for Panda, CSS, and Tailwind, which must agree, and `native.txt` for React Native's selected styles): every component at each variant value, at rest, hovered, focused, pressed, dragged, and three combined states, draws the background, color, and outline recorded. And a component's own indication tokens on its root change it and not a nested one of the same kind. Update the fixtures with `-u` only when a change to what they draw is intended. |
| `visual.e2e.test.tsx`         | A screenshot per section of the fixture's page (`tests/panda-fixture/src/page.tsx`), plus measured layout rules.                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

`src/force-pseudo.ts` forces pseudo-classes through the DevTools protocol, for states no
attribute can set on many elements at once (focus), and finishes the transitions that start.
The `emulateReducedMotion` command (`src/commands.ts`) switches `prefers-reduced-motion` on
the page.

`src/mirror.ts` measures parts against a root in both directions and lists where right to left
doesn't mirror left to right (`x' = width - x - w`): `mirroredBoxMismatches(doc, markup,
prepare?)` renders markup with a `[data-root]` and `[data-part]` elements under each `dir`;
`boxesWithin`, `mirrorBox`, and `mirrorMismatches` work on elements you've rendered yourself.

## Running

Through the omni MCP (or `omni run`): `test:e2e`, which first runs the Panda fixture's `prepare`
(`pureform generate`, then Panda's codegen). `.env.local` at the repo root sets `CHROMIUM_PATH` to use a system Chromium instead of
Playwright's download.

## Worth knowing

- The browser context emulates reduced motion for every suite. Color fades still run under
  it, so a test that changes a state after rendering waits for, or finishes, the transitions
  before reading computed styles.

- States in the parity suites are set through their ARIA or `data-pf-*` attributes on every
  element, so element and slot conditions both apply.
- `rn-parity` selects through each component's factory (`componentFactory(...).for(...)`),
  which resolves the component again with the tokens its variants set (§5.5). Selecting with
  `select` alone missed them, which is why "every variant value at rest" failed for color
  groups, densities, and tab indicators until p8.
