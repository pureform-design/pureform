# @pureform/css-lowering

The CSS lowering pureform's web adapters share: value nodes to CSS, conditions to selectors and
at-rules, style maps to nested style objects, utility templates, and `themeVars` for runtime
theming. `@pureform/panda-adapter` and `@pureform/css-adapter` build on it; apps use one of
those rather than this package.

A `LowerCtx` sets what a target spells its own way:

| Hook            | Panda                           | Plain CSS                  |
| --------------- | ------------------------------- | -------------------------- |
| `tokenRef`      | `token(colors.x)`, `{colors.x}` | `var(--colors-x)`          |
| `conditionKey`  | `_hover`, `_dark`, …            | none: the selector itself  |
| `breakpointKey` | the breakpoint's name           | none: the media query      |
| `classPrefix`   | Panda's `prefix`                | the adapter's class prefix |

Without a hook, a condition lowers to its selector or at-rule. The interaction selectors match
Panda's built-ins, so both adapters style the same elements.
