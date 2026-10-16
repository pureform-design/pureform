# @pureform/browser-e2e-tests

Browser tests in Chromium, through Vitest's browser mode, over the demo and the adapters. They
check what unit tests can't: computed styles, real pointer and keyboard states, and
screenshots. Private; nothing depends on it.

It renders the demo's page and recipes (`apps/solid-demo`) with the demo's own Panda config, and
compiles the other adapters' stylesheets in Node through browser commands (`src/commands.ts`).

## Suites

| File                         | What it checks                                                                                                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `state-matching.e2e.test.ts` | For each state, an element marked each allowed way (native, ARIA, `data-pf-*`) matches the lowered selector, and Zag's attributes alone don't. Panda lowers to the same. |
| `parity.e2e.test.ts`         | The CSS and Tailwind adapters compute the same styles as the Panda preset, at every variant value and in each state.                                                     |
| `rn-parity.e2e.test.ts`      | The React Native adapter, through React Native Web, computes the same key styles as the CSS adapter.                                                                     |
| `rn-motion.e2e.test.ts`      | A React Native state change animates over the transition's duration, and changes at once under reduced motion.                                                           |
| `visual.e2e.test.tsx`        | A screenshot per demo section, plus measured layout rules.                                                                                                               |

`src/force-pseudo.ts` forces pseudo-classes through the DevTools protocol, for states no
attribute can set on many elements at once (focus).

## Running

Through the omni MCP (or `omni run`): `test:e2e`, which first runs the demo's `prepare` (Panda
codegen). `.env.local` at the repo root sets `CHROMIUM_PATH` to use a system Chromium instead of
Playwright's download.

## Worth knowing

- States in the parity suites are set through their ARIA or `data-pf-*` attributes on every
  element, so element and slot conditions both apply.
- `rn-parity`'s "every variant value at rest" fails on `main` as of p1a: color groups,
  densities, and tab indicators differ between the React Native and CSS adapters. It predates
  the state-matching change.
