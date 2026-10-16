# @pureform/panda-adapter

Compiles a pureform config to a [Panda CSS](https://panda-css.com) preset: tokens, semantic
tokens, text styles, keyframes, utilities, and a recipe or slot recipe per component. An app
adds the preset to its `panda.config.ts`, and Panda generates the CSS and recipe functions.

## Where it sits

```
@pureform/core ──► @pureform/css-lowering ──► @pureform/panda-adapter ──► your panda.config.ts
```

`@pureform/css-adapter` lowers through the same `css-lowering`, so both adapters emit the same
selectors and compute the same styles.

## Architecture

| Module       | What it does                                                                                   |
| ------------ | ---------------------------------------------------------------------------------------------- |
| `preset.ts`  | `compilePreset`: validates the config and assembles the preset.                                |
| `tokens.ts`  | Tokens, semantic tokens, breakpoints, text styles, keyframes, and utilities in Panda's shapes. |
| `recipes.ts` | Components to `defineRecipe` and `defineSlotRecipe` objects.                                   |
| `options.ts` | `CompileOptions`, and the lowering hooks that spell values and conditions Panda's way.         |

## Public API

```ts
// panda.config.ts
import { defineConfig } from "@pandacss/dev";
import { compilePreset } from "@pureform/panda-adapter";
import { pureform } from "@pureform/preset";

export default defineConfig({
    presets: [
        "@pandacss/preset-base",
        compilePreset(pureform(), { prefix: "pf" }),
    ],
});
```

| Export          | What it does                                                                                    |
| --------------- | ----------------------------------------------------------------------------------------------- |
| `compilePreset` | `(config, options?) => Preset`. Options: `name`, `prefix` (var prefix), `target`, `pandaPrefix` |
| `pandaContext`  | The lowering context `compilePreset` uses, for lowering a style map on its own                  |
| re-exports      | `compileValue`, `compileStyleMap`, `conditionKey`, `themeVars`, … from `@pureform/css-lowering` |

## States

pureform's recipes don't use Panda's built-in state conditions (`_hover`, `_checked`,
`_disabled`, …): their selectors also match a behavior library's attributes (`data-hover`,
`data-state="checked"`), and the other targets don't. Each state lowers to the shared selector
instead, such as `&:is(:checked, [aria-checked=true])`: the native pseudo-class, then ARIA, then
a `data-pf-*` attribute ([the full table](../css-lowering/README.md#how-states-match)). An
app's own `_hover` in its own styles keeps Panda's meaning.

Panda keys are still used where they mean the same thing on every target: `_dark`, `_light`,
and `_motionReduce` (conditions the preset declares), `_ltr`, and `_rtl`, plus breakpoints by
name. The preset's `motionReduce` replaces Panda's: it follows the system's
`prefers-reduced-motion` unless a `data-pf-motion` attribute on an ancestor overrides it
([the rules](../css-lowering/README.md#reduced-motion)), so an app's own `_motionReduce`
follows the provider too. Panda's `_motionSafe` still reads only the system.

## Build and test

Through the omni MCP (or `omni run`):

- `build`: Vite library build into `dist/`.
- `test:unit`: Vitest, with snapshot tests of the compiled preset.

The demo (`apps/solid-demo`) regenerates its `styled-system/` from this preset in its
`prepare` task; the browser suites in `tests/browser-e2e-tests` compare it with the other
adapters.

## Worth knowing

- Panda's static extractor can't see variants picked at runtime, so the demo lists its
  recipes in `staticCss` (design doc §5.2).
- Slot conditions select slots by class, so pass your Panda `prefix` as `pandaPrefix`.
