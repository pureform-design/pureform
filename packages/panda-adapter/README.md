# @pureform/panda-adapter

Compiles a pureform config to a [Panda CSS](https://panda-css.com) preset: tokens, semantic
tokens, text styles, keyframes, utilities, and a recipe or slot recipe per component. An app
adds the preset to its `panda.config.ts`, and Panda generates the CSS and recipe functions.

Its `/codegen` subpath is the Panda target's codegen for `@pureform/generate`: it writes the
`.pureform/` factory modules the bindings read through the style registry, each a thin
`ClassFactory` over the recipe function Panda generated, plus the `staticCss` entries that
keep every variant in Panda's stylesheet.

## Where it sits

```
@pureform/core ──► @pureform/css-lowering ──► @pureform/panda-adapter ──► your panda.config.ts
```

`@pureform/css-adapter` lowers through the same `css-lowering`, so both adapters emit the same
selectors and compute the same styles.

The `/codegen` subpath also depends on `@pureform/generate` (its interface and
`defineCodegen`), which loads it at build time as the `panda` target:

```
pureform.config.ts ──► @pureform/generate ──► @pureform/panda-adapter/codegen ──► .pureform/
                                                                                    web/<name>.ts ──► styled-system/recipes/<name>
                                                                                    panda.ts      ──► your panda.config.ts (staticCss)
```

## Architecture

| Module                  | What it does                                                                                   |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| `preset.ts`             | `compilePreset`: validates the config and assembles the preset.                                |
| `tokens.ts`             | Tokens, semantic tokens, breakpoints, text styles, keyframes, and utilities in Panda's shapes. |
| `recipes.ts`            | Components to `defineRecipe` and `defineSlotRecipe` objects.                                   |
| `options.ts`            | `CompileOptions`, and the lowering hooks that spell values and conditions Panda's way.         |
| `codegen.ts`            | The `/codegen` entry: `codegen`, the Panda target's adapter for `@pureform/generate`.          |
| `codegen/factory.ts`    | One component's factory module source, its recipe's file name, and its token vars.             |
| `codegen/static-css.ts` | The `panda.ts` module: `staticCss` for every generated component and every theme.              |

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

### `@pureform/panda-adapter/codegen`

`generate({ target: "panda", options })` loads it; nothing else needs to import it.

```ts
import { generate } from "@pureform/generate";

await generate({
    config: "pureform.config.ts",
    target: "panda",
    options: { prefix: "pf" }, // PandaCodegenOptions
    components: ["button", "checkbox"], // optional allow-list
});
```

| Export                                                             | What it is                                                                                        |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `codegen` (default)                                                | The adapter: `name: "panda"`, `platform: "web"`                                                   |
| `PandaCodegenOptions`                                              | `outdir` (Panda's, default `"styled-system"`), `prefix` (the preset's var prefix, default none)   |
| `recipeFile`                                                       | A recipe's file name under `<outdir>/recipes/`, as Panda writes it (`iconButton` → `icon-button`) |
| `factoryModule`, `staticCssModule`, `tokenVars`, `STATIC_CSS_FILE` | The pieces `codegen` is built from                                                                |

It writes, under `.pureform/`:

- `web/<name>.ts` per component (only the allow-listed ones): `export const <name>:
  ClassFactory<"<name>">`. It imports the component's recipe from its own file
  (`styled-system/recipes/<file>`), caches one frozen result per selection with
  `selectionCache`, maps Panda's class string per slot to `{ class }` (a single-slot recipe's
  string becomes the root's), and adds instance tokens as the component's CSS vars on the root
  with `withTokenStyle`. Groups with `"true"` or `"false"` values go to Panda's recipe as
  booleans, since Panda compares them strictly.
- `panda.ts`: `export const staticCss = { themes, recipes: { <name>: ["*"], … } }`. Spread it
  into `panda.config.ts`'s `staticCss` (it's build time only: the factories import
  `styled-system/`, which Panda writes from this config).

`generate` adds the header, `index.ts` (the registry), and `registry.d.ts` (the types). The
codegen returns `themeAttribute: "data-panda-theme"` (`THEME_ATTRIBUTE`), the attribute Panda
scopes themes by, so `registry.themeAttributes("teal")` is `{ "data-panda-theme": "teal" }`, and
`vars: { prefix, tokenPrefix }` from its options. Pass the app's Panda `prefix` as `pandaPrefix`
when its Panda config sets one: `tokenPrefix` defaults to it, so the providers' token overrides,
runtime theme vars and a spring role's instance vars (`--<prefix>-springs-<role>-…`) match
Panda's. Set `tokenPrefix` only to name the token vars otherwise.

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
- `test:unit`: Vitest, with snapshot tests of the compiled preset and of the generated
  modules (`src/codegen.spec.ts`, which also runs `generate` with the adapter end to end).

The demos (`apps/solid-demo`, `apps/react-demo`) and the browser suites' Panda fixture
(`tests/panda-fixture`) regenerate their `.pureform/` with the codegen (their `generate` tasks)
and then their `styled-system/` from this preset (their `prepare` tasks). The browser suites in
`tests/browser-e2e-tests` compare the fixture's styles with the other adapters, and
`panda-factories.e2e.test.ts` checks every generated factory against Panda's recipe functions.

## Worth knowing

- Panda's static extractor can't see variants picked at runtime, so the codegen's `panda.ts`
  lists every variant of every generated component in `staticCss` (design doc §5.2). A pruned
  build (the bundler's `prune`, design doc §7) narrows each component it can to a rule listing
  every group, with the values in use or `["*"]`: `button: [{ variant: ["filled", "text"], size:
  ["*"] }]`. Panda adds each group's default itself, and every compound variant of a generated
  recipe, so the rule needs neither. The factory modules don't change.
- Pass the same `prefix` to `compilePreset` and to the codegen: the factories name instance
  tokens' vars with it.
- `prefix` (Panda's own class prefix, `pandaPrefix` here) doesn't change the recipe functions;
  the codegen takes it only to name the token vars (its `tokenPrefix` default).
- The generated modules import `@pureform/styling`, and `panda.ts` imports a type from
  `@pandacss/dev`; the app needs both.
- Slot conditions select slots by class, so pass your Panda `prefix` as `pandaPrefix`.
