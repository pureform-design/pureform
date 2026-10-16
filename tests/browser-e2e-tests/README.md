# @pureform/browser-e2e-tests

Browser tests in Chromium, through Vitest's browser mode, over the demo and the adapters. They
check what unit tests can't: computed styles, real pointer and keyboard states, and
screenshots. Private; nothing depends on it.

It renders the demo's page and recipes (`apps/solid-demo`) with the demo's own Panda config, and
compiles the other adapters' stylesheets in Node through browser commands (`src/commands.ts`).

## Suites

| File                          | What it checks                                                                                                                                                                                                                                                                      |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `state-matching.e2e.test.ts`  | For each state, an element marked each allowed way (native, ARIA, `data-pf-*`) matches the lowered selector, and Zag's attributes alone don't. Panda lowers to the same.                                                                                                            |
| `parity.e2e.test.ts`          | The CSS and Tailwind adapters compute the same styles as the Panda preset, at every variant value and in each state.                                                                                                                                                                |
| `rn-parity.e2e.test.ts`       | The React Native adapter, through React Native Web, computes the same key styles as the CSS adapter.                                                                                                                                                                                |
| `rn-motion.e2e.test.ts`       | A React Native color change fades over the transition's duration, with or without reduced motion; a progress value moves, and jumps under reduced motion.                                                                                                                           |
| `reduced-motion.e2e.test.ts`  | Under each way of asking for reduced motion (the system, a `data-pf-motion` provider, nested providers), computed `transition` keeps the fades and drops movement.                                                                                                                  |
| `direction.e2e.test.ts`       | Components with direction-aware styles (the switch, the linear progress) render left to right and right to left, and every part's `rtl` box mirrors its `ltr` box across the root.                                                                                                  |
| `icons.e2e.test.ts`           | Icon slots: an icon font's `FILL` is 1 on the current navigation destination and a selected toggle icon button, a `data-pf-mirror` icon flips under `rtl` only, and each toggle icon button fill takes Material's selected colors.                                                  |
| `panda-factories.e2e.test.ts` | The demo's Panda class factories (`apps/solid-demo/.pureform/`) return Panda's recipe classes for every variant combination, Panda's stylesheet has a rule for every class the recipe styles (the `staticCss` entries keep them), and instance tokens set the component's CSS vars. |
| `visual.e2e.test.tsx`         | A screenshot per demo section, plus measured layout rules.                                                                                                                                                                                                                          |

`src/force-pseudo.ts` forces pseudo-classes through the DevTools protocol, for states no
attribute can set on many elements at once (focus), and finishes the transitions that start.
The `emulateReducedMotion` command (`src/commands.ts`) switches `prefers-reduced-motion` on
the page.

`src/mirror.ts` measures parts against a root in both directions and lists where right to left
doesn't mirror left to right (`x' = width - x - w`): `mirroredBoxMismatches(doc, markup,
prepare?)` renders markup with a `[data-root]` and `[data-part]` elements under each `dir`;
`boxesWithin`, `mirrorBox`, and `mirrorMismatches` work on elements you've rendered yourself.

## Running

Through the omni MCP (or `omni run`): `test:e2e`, which first runs the demo's `prepare` (Panda
codegen). `.env.local` at the repo root sets `CHROMIUM_PATH` to use a system Chromium instead of
Playwright's download.

## Worth knowing

- The browser context emulates reduced motion for every suite. Color fades still run under
  it, so a test that changes a state after rendering waits for, or finishes, the transitions
  before reading computed styles.

- States in the parity suites are set through their ARIA or `data-pf-*` attributes on every
  element, so element and slot conditions both apply.
- `rn-parity`'s "every variant value at rest" fails on `main` as of p1a: color groups,
  densities, and tab indicators differ between the React Native and CSS adapters. It predates
  the state-matching change.
