# @pureform/css-lowering

The CSS lowering pureform's web adapters share: value nodes to CSS, conditions to selectors and
at-rules, style maps to nested style objects, utility templates, and `themeVars` for runtime
theming. `@pureform/panda-adapter`, `@pureform/css-adapter`, and (through the CSS adapter)
`@pureform/tailwind-adapter` build on it; apps use one of those rather than this package. It
depends only on `@pureform/core`.

## Architecture

```
style map ──► style-map.ts ──► conditions.ts ──► compile-node.ts ──► CSS strings
                (nesting)       (selectors,        (value nodes)
                                 at-rules)
config.ts: component token vars, registered properties, slot ancestry
runtime.ts: themeVars, a theme's custom properties at runtime
```

| Module            | What it does                                                                   |
| ----------------- | ------------------------------------------------------------------------------ |
| `compile-node.ts` | One value node to a CSS value: units, colors, math, shapes, references.        |
| `conditions.ts`   | Conditions to selectors or at-rules, and conditional values to nested objects. |
| `style-map.ts`    | A whole style map to a nested style object.                                    |
| `css.ts`          | Var names, token references, keyword and color formatting.                     |
| `config.ts`       | Component token vars, `@property` registrations, slot ancestors.               |
| `utilities.ts`    | Utility templates and argument substitution.                                   |
| `runtime.ts`      | `themeVars`: a theme's vars, for switching themes at runtime.                  |

## Public API

Everything is exported from the root, `@pureform/css-lowering`: `compileNodeToCSS`,
`compileValue`, `compileConditional`, `conditionKey`, `compileStyleMap`, `themeVars`, and the
helpers above.

```ts
import { conditionKey } from "@pureform/css-lowering";

conditionKey("checked", ctx); // "&:is(:checked, [aria-checked=true])"
```

A `LowerCtx` sets what a target spells its own way:

| Hook            | Panda                                              | Plain CSS                  |
| --------------- | -------------------------------------------------- | -------------------------- |
| `tokenRef`      | `token(colors.x)`, `{colors.x}`                    | `var(--colors-x)`          |
| `conditionKey`  | `_dark`, `_light`, `_ltr`, `_rtl`, `_motionReduce` | none: the selector itself  |
| `breakpointKey` | the breakpoint's name                              | none: the media query      |
| `classPrefix`   | Panda's `prefix`                                   | the adapter's class prefix |

Without a hook, a condition lowers to its selector or at-rule. Interaction and form states
never take a target's own key, so every adapter styles the same elements.

## How states match

Each state matches the native pseudo-class first, then an ARIA attribute, and only where
neither covers it one of pureform's `data-pf-*` attributes, whose names come from
`STATE_ATTRIBUTES` in `@pureform/core`. A behavior library's attributes (Zag's `data-state`,
`data-hover`, `data-readonly`, …) are never matched, so swapping or upgrading it can't change
styling.

Conditions (`when("hover", …)`), on the styled element:

| Condition          | Selector                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------- |
| `hover`            | `&:is(:hover, [data-pf-hover])`                                                             |
| `pressed`/`active` | `&:is(:active, [data-pf-active])`                                                           |
| `focus`            | `&:focus`                                                                                   |
| `focusVisible`     | `&:focus-visible`                                                                           |
| `dragged`          | `&[data-pf-dragging][data-pf-dragging]` (doubled to outrank hover, focus, and pressed)      |
| `filled`           | `&:is(:is(input, textarea):not(:placeholder-shown), :has(…), [data-pf-filled])`             |
| `checked`          | `&:is(:checked, [aria-checked=true])`                                                       |
| `selected`         | `&:is([aria-selected=true], [aria-pressed=true], [aria-current]:not([aria-current=false]))` |
| `expanded`         | `&[aria-expanded=true]`                                                                     |
| `invalid`          | `&:is(:invalid, [aria-invalid=true])`                                                       |
| `disabled`         | `&:is(:disabled, [aria-disabled=true])`                                                     |
| `readOnly`         | `&:is(:read-only, [aria-readonly=true])`                                                    |

Slot states (`slot("root", "checked")`) match on the slot's element, or on an ancestor slot's
class, and also through `:has()` for a control inside the slot. Each repeats its `:is()` to
its rank, so later states win: rank 1 for hover, filled, selected, checked, and expanded; 2 for
indeterminate, focusWithin, and focusVisibleWithin; 3 for pressed; 4 for invalid; 5 for
disabled.

| Slot state           | Matches                                                                                             |
| -------------------- | --------------------------------------------------------------------------------------------------- |
| `hover`              | `:hover, [data-pf-hover]`                                                                           |
| `pressed`            | `:active, [data-pf-active]`                                                                         |
| `filled`             | as the condition                                                                                    |
| `selected`           | as the condition                                                                                    |
| `checked`            | `:checked, :has(:checked), [aria-checked=true]`                                                     |
| `indeterminate`      | `:indeterminate, :has(:indeterminate), [aria-checked=mixed]`                                        |
| `expanded`           | `[aria-expanded=true], :has([aria-expanded=true])`                                                  |
| `focusWithin`        | `:focus-within`                                                                                     |
| `focusVisibleWithin` | `:focus-visible, :has(:focus-visible)`                                                              |
| `invalid`            | `[aria-invalid=true], :has([aria-invalid=true])` (not `:invalid`, so an empty required field waits) |
| `disabled`           | `:disabled, :has(:disabled), [aria-disabled=true]`                                                  |

The Chromium fixtures in `tests/browser-e2e-tests/src/state-matching.e2e.test.ts` check every
row: each allowed marking matches, and Zag's attributes alone don't.

## Build and test

Through the omni MCP (or `omni run`):

- `build`: Vite library build into `dist/`.
- `test:unit`: Vitest, with type checks.

## Worth knowing

- `readOnly` uses `:read-only`, which matches every element that isn't editable, not only a
  read-only input. Use it on inputs and text areas.
- `filled` sees a text input's value through `:placeholder-shown`, so the input needs a
  placeholder (a single space works when none should show).
