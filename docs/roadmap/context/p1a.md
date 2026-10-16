# p1a: Match states on native, then ARIA, then data-pf (output context)

Commits: 7a3616d..49b5193, plus the `docs(roadmap)` commit that adds this file.

## Built

- **`@pureform/core`**: `packages/core/src/state-attributes.ts`, exported from the root
  `@pureform/core`:

    ```ts
    export const STATE_ATTRIBUTES = {
        hover: "data-pf-hover",
        pressed: "data-pf-active",
        dragged: "data-pf-dragging",
        filled: "data-pf-filled",
    } as const;
    export type AttributeState = keyof typeof STATE_ATTRIBUTES; // "hover" | "pressed" | "dragged" | "filled"
    export type StateAttribute = (typeof STATE_ATTRIBUTES)[AttributeState];
    ```

    **p2a and p2b set these** (import them; don't hard-code the strings). Every other state
    comes from the native element or the ARIA attribute the binding sets anyway.

- **`@pureform/css-lowering`** (`src/conditions.ts`): the condition table and the slot-state
  table rewritten from `STATE_ATTRIBUTES`; new `src/conditions.spec.ts`.
- **`@pureform/panda-adapter`** (`src/options.ts`): `CONDITION_KEY` keeps only `_dark`,
  `_light`, `_ltr`, `_rtl`, `_motionReduce`. Every interaction and form state lowers to the
  shared selector, never to `_hover`, `_checked`, `_disabled`, … The preset doesn't redefine
  Panda's conditions, so an app's own `_hover` keeps Panda's meaning.
- Specs and snapshots updated in `css-lowering`, `panda-adapter`, `css-adapter`, `preset`
  (`tailwind-adapter` needed no change: its specs don't pin state selectors).
- Preset comments and component descriptions now name ARIA only (chip: `aria-pressed`,
  list and list item: `aria-current`, menu: `aria-selected`); the demo's chips dropped the
  redundant `data-selected`.
- **Chromium fixtures**: `tests/browser-e2e-tests/src/state-matching.e2e.test.ts` (105 tests).
  For each condition and slot state: Panda's key equals the plain CSS key; each allowed
  marking matches (real `:hover` through `userEvent.hover`, real `:active` by holding Space
  on a focused button, real focus, `indeterminate` set on the input); Zag's attributes alone
  don't.
- **`tests/browser-e2e-tests/src/force-pseudo.ts`**: `forcePseudoClasses(frame, selector,
pseudoClasses)` forces pseudo-classes on every matching element inside an iframe through
  CDP (`vitest/browser`'s `cdp()`, `CSS.forcePseudoState`). The frame needs an `id`. The
  parity suites use it for the "focused" scenario.
- READMEs: created for `core`, `panda-adapter`, `tests/browser-e2e-tests`; updated for
  `css-lowering` (full selector tables), `css-adapter`, `preset`.

### Final selector per state

Identical for every web target (Panda, plain CSS, Tailwind through the CSS adapter).

| Condition          | Selector                                                                                                                   |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `hover`            | `&:is(:hover, [data-pf-hover])`                                                                                            |
| `pressed`/`active` | `&:is(:active, [data-pf-active])`                                                                                          |
| `focus`            | `&:focus`                                                                                                                  |
| `focusVisible`     | `&:focus-visible`                                                                                                          |
| `dragged`          | `&[data-pf-dragging][data-pf-dragging]`                                                                                    |
| `filled`           | `&:is(:is(input, textarea):not(:placeholder-shown), :has(:is(input, textarea):not(:placeholder-shown)), [data-pf-filled])` |
| `checked`          | `&:is(:checked, [aria-checked=true])`                                                                                      |
| `selected`         | `&:is([aria-selected=true], [aria-pressed=true], [aria-current]:not([aria-current=false]))`                                |
| `expanded`         | `&[aria-expanded=true]`                                                                                                    |
| `invalid`          | `&:is(:invalid, [aria-invalid=true])`                                                                                      |
| `disabled`         | `&:is(:disabled, [aria-disabled=true])`                                                                                    |
| `readOnly`         | `&:is(:read-only, [aria-readonly=true])`                                                                                   |

| Slot state (rank)        | `:is(...)` contents, repeated rank times                     |
| ------------------------ | ------------------------------------------------------------ |
| `hover` (1)              | `:hover, [data-pf-hover]`                                    |
| `filled` (1)             | as the condition                                             |
| `selected` (1)           | as the condition                                             |
| `checked` (1)            | `:checked, :has(:checked), [aria-checked=true]`              |
| `expanded` (1)           | `[aria-expanded=true], :has([aria-expanded=true])`           |
| `indeterminate` (2)      | `:indeterminate, :has(:indeterminate), [aria-checked=mixed]` |
| `focusWithin` (2)        | `:focus-within`                                              |
| `focusVisibleWithin` (2) | `:focus-visible, :has(:focus-visible)`                       |
| `pressed` (3)            | `:active, [data-pf-active]`                                  |
| `invalid` (4)            | `[aria-invalid=true], :has([aria-invalid=true])`             |
| `disabled` (5)           | `:disabled, :has(:disabled), [aria-disabled=true]`           |

Specificity is unchanged from before (every dropped alternative had the same weight), so
rule ordering behaves as it did.

CSS size for the demo's config: css-adapter −7760 B (gzip −187), tailwind-adapter −7760 B
(gzip −315), the Panda demo build −310031 B, −19.9% (gzip −8619). Numbers in 5e4adb0.

## Deviations from the design

- None in the selectors; they follow §5.1's review table. Decisions the table left open,
  now recorded in §5.1: the constants live in `@pureform/core` as `STATE_ATTRIBUTES`.
- The `disabled` slot state gains `[aria-disabled=true]` on the slot only, not
  `:has([aria-disabled=true])` (matches the table's wording; `checked` likewise has no
  `:has([aria-checked=true])`).
- Dropping `[disabled]` means a non-form element with a `disabled` attribute (a `div`) no
  longer matches; use `aria-disabled`.

## Stubs and gaps

- **No state couldn't follow the rule.** Focus states have no attribute at all now, by
  design (`:focus`, `:focus-visible`, `:focus-within` only).
- `readOnly` uses `:read-only`, which matches any non-editable element (a `div`), as it did
  before. Only meaningful on inputs and text areas; left as is.
- **Pre-existing failure, not from this phase:** `rn-parity.e2e.test.ts` "every variant
  value at rest" fails on `main` before p1a too (verified with the changes stashed): color
  groups, densities, and tab indicators differ between React Native and CSS. Every other
  e2e test passes (173 of 174).

## How to verify

- `task_run` `build` and `test:unit` over the workspace: all pass.
- `task_run` `test:e2e` on `@pureform/browser-e2e-tests` (needs `.env.local` with
  `CHROMIUM_PATH`): `state-matching`, `parity` (CSS and Tailwind, including "focused"),
  `visual`, and `rn-parity` pass except the pre-existing "at rest" case above.
- Single file: `cd tests/browser-e2e-tests && bun x vitest --config vitest.config.e2e.ts run
src/state-matching` (after `set -a; source .env.local; set +a`).

## Notes for the next phases

- **p2a, p2b:** set `STATE_ATTRIBUTES.hover` for hover driven by another element (a label),
  `STATE_ATTRIBUTES.pressed` for keyboard presses (`:active` covers pointer and Space on a
  native button), `STATE_ATTRIBUTES.dragged`, and `STATE_ATTRIBUTES.filled` for a value
  outside a text input (select). For everything else set ARIA (`aria-checked`,
  `aria-selected`/`aria-pressed`/`aria-current`, `aria-expanded`, `aria-invalid`,
  `aria-disabled`, `aria-readonly`) or rely on the native input. Zag's `data-*` attributes
  may stay on the elements; they style nothing.
- An empty required field doesn't match the `invalid` slot state (no `:invalid`), on
  purpose; set `aria-invalid` (§9.5).
- `filled` on a text input needs a `placeholder` (a single space works).
- **Rebuild dists** after changing these packages: the browser suites import `dist`. omni
  caches failures too; pass `force: true` to `task_run` after fixing a dist by hand.
- p1b, p1c, p1d also change preset snapshots: regenerate with
  `bun x vitest --config ./vitest.config.unit.ts run -u` in the package after rebasing.
- `forcePseudoClasses` is the way to put many elements in a focus state at once in a test.
