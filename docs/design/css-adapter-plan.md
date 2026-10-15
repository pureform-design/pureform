# Plain CSS adapter plan

Status: implemented.

A second adapter that compiles a pureform `CoreConfig` to plain CSS, with no Panda. It proves the
core is target-agnostic and gives apps a zero-dependency path: one stylesheet and a small class
name runtime.

## Goals

- **Same output, no Panda.** Every component, token, theme, and condition the Panda adapter
  supports renders the same in the browser.
- **Shared lowering.** The CSS both adapters write comes from one place, so they can't drift.
- **Two delivery modes.** Compile at runtime from the config, or ahead of time into files that
  ship only the class name runtime.
- **Typed without codegen.** The runtime takes its variant types from the typed component specs.

## Non-goals

- Atomic CSS, `css()` style props, or patterns. Those are Panda features; apps that want them use
  the Panda adapter.
- Flat (non-nested) output from the adapter itself. Native nesting is baseline since 2023;
  apps that need older browsers lower it with Lightning CSS (below).

## Packages

| Package                   | Holds                                                                     | Depends on             |
| ------------------------- | ------------------------------------------------------------------------- | ---------------------- |
| `@pureform/css-lowering`  | Target-neutral CSS lowering: value nodes, selectors, at-rules, var names  | `core`                 |
| `@pureform/css-adapter`   | Stylesheet emitter, the class name runtime, the AOT build                 | `core`, `css-lowering` |
| `@pureform/panda-adapter` | Panda's syntax on top: `token()`, `_hover` keys, preset and recipe shapes | `core`, `css-lowering` |

### What moves into `css-lowering`

From `panda-adapter`, unchanged in behavior:

- `compileNodeToCSS` for every value node, with the token reference spelling made pluggable
  (Panda: `token(colors.x)` or `{colors.x}`; plain CSS: `var(--colors-x)`).
- `css.ts`: keywords, `hyphenate`, `formatColor`, `varName`, `tokenVarName`, `aliasTarget`.
- The condition tables: interaction and form selectors, `MEDIA_RULE`, `SLOT_STATE` with its
  ranks, `slotSelector`, breakpoint and container queries.
- Utility template expansion (`arg()` substitution) and static utility lookup.
- `themeVars` (runtime theming), which becomes shared since both adapters emit the same vars.

What stays in `panda-adapter`: the preset shape, Panda categories, `CONDITION_KEY` (mapping to
Panda's `_hover` keys), boolean selection conversion, and `[data-panda-theme]`.

The move is a pure refactor; the Panda snapshots must not change.

## Output

### Stylesheet

```css
@layer pureform.reset, pureform.tokens, pureform.components;

@layer pureform.tokens {
    :root {
        --colors-primary: oklch(…);
        …
    }
    :root.dark {
        --colors-primary: oklch(…);
    }
    [data-theme="teal"] {
        --colors-primary: …;
        --components-button-corner: squircle;
    }
    @keyframes …
}

@layer pureform.components {
    @layer base, variants, compounds;
    @layer base {
        .button {
            …;
            &:is(:hover, [data-hover]) { … }
        }
        .tabs__tab { … }
    }
    @layer variants {
        .button--variant_filled { … }
    }
    @layer compounds {
        .button--variant_filled.button--color_error { … }
    }
}
```

- **Class names** match Panda's: `.name`, `.name__slot`, `.name--group_value`. Markup, slot
  conditions, and the demo work with either adapter.
- **Layers** give the same precedence Panda's recipes have: base, then variants, then compound
  variants. Apps' own unlayered CSS wins over all of it.
- **Tokens** are the same vars Panda emits (`--colors-primary`, `--spacing-4`), so `themeVars`
  and component token overrides work unchanged.
- **Conditions** lower straight to selectors and at-rules: `_hover` becomes
  `&:is(:hover, [data-hover])`, a breakpoint becomes `@media (width >= 48rem)`.
- **Text styles** inline their properties where `textStyle` is used, and **utilities** expand in
  place, since plain CSS has neither.
- **Color scheme** follows the same rules as Panda (`.dark` / `.light` on the root, otherwise
  `prefers-color-scheme`), matching `COLOR_SCHEME_CONDITIONS`.

### Options

```ts
compileCss(config, {
    prefix?: VarPrefix,            // component var prefix, as in the Panda adapter
    classPrefix?: string,          // prefixes every class (what pandaPrefix does)
    themeAttribute?: string,       // default "data-theme"; named themes match [attr=name]
    layer?: string | false,        // root layer name, default "pureform"; false for none
});
```

`themeAttribute` also feeds slot and theme selectors, so a host app can pick `data-pf-theme` or
match Panda's `data-panda-theme`.

### Runtime

```ts
import { recipes } from "@pureform/css-adapter/runtime";

const { button, tabs } = classesFor(config); // or classesFor<typeof config>(manifest)

button({ variant: "tonal", size: "large" }); // "button button--variant_tonal button--size_large …"
tabs({ variant: "secondary" }).tab; // per-slot class strings
```

- A generic function, under 1 kB: it applies defaults, joins variant classes, and adds the
  compound classes. It needs only a **manifest** per component (name, slots, variant groups and
  values, defaults, compound matches), never the styles.
- Types come from the `Named` component specs and declared `variants`, so `button({ size: "huge" })`
  is a type error with no generated `.d.ts`.
- Booleans: `true` and `false` map to the `"true"` / `"false"` values, as with Panda.

### Ahead-of-time build

```ts
import { buildCss } from "@pureform/css-adapter/build";

await buildCss(config, { outDir: "src/pureform" });
// src/pureform/styles.css
// src/pureform/components.js       (export const button = recipe({…manifest}), per component)
// src/pureform/components.d.ts
```

- The generated JS is the manifest as literals plus the shared runtime import, one export per
  component, so bundlers tree-shake unused components and nothing compiles at runtime.
- The config, theme providers, and color generation stay out of the app bundle.
- A Vite plugin wraps the same build (`virtual:pureform.css`, `virtual:pureform/components`), so
  a dev server rebuilds on config change. The later Layer 3 CLI calls `buildCss` too.

## Reset

The adapter ships its own reset but never emits it: an app opts in by importing it.

```ts
import "@pureform/css-adapter/reset.css";
```

- A static file in the `pureform.reset` layer, so any app or component style wins over it.
- Drawn from existing modern resets (Andy Bell's modern reset, Josh Comeau's custom reset,
  modern-normalize, and Panda's preflight), keeping only what components rely on: `box-sizing`,
  margin removal, inherited fonts on form controls, block media, `text-wrap` defaults, and
  reduced motion. Each source's MIT notice is credited in the file.
- Not tied to the config, so it works with the Panda adapter too, for apps that turn Panda's
  preflight off.

## Lightning CSS

The stylesheet is plain, modern CSS, so Lightning CSS runs on it as a post-process with no
adapter support. It is how an app trades modern syntax for reach:

- **Nesting:** lowered to flat rules for older browsers, keeping the same specificity. This
  covers the flat output the non-goals defer.
- **Colors:** `oklch()` and `color-mix()` get fallbacks for older browsers.
- **Media ranges:** `@media (width >= 48rem)` becomes `min-width`.
- **Minifying and prefixing**, by the app's browserslist targets.
- What it can't lower: `@layer`, `shape()`, and `corner-shape`. The components already fall back
  on `@supports` for the last two.

Three ways in:

1. **Vite:** with `css: { transformer: "lightningcss" }` and `build.cssMinify: "lightningcss"`,
   Vite runs it on the imported stylesheet, AOT file or virtual module alike. Nothing to add.
2. **AOT build:** `buildCss(config, { transform })` takes a `(css) => css` hook, so a build can
   pass the output through `lightningcss`'s `transform()` with its own targets before writing.
   The adapter keeps no dependency on it.
3. **Runtime mode:** the CSS is built in the page, so no post-process applies; that mode is for
   modern browsers only.

## Verification

- **Unit tests** in `css-lowering` (moved from `panda-adapter`), and snapshot tests of the
  stylesheet and manifests in `css-adapter`.
- **Parity tests**: every component at its defaults and at each variant value, rendered on two
  pages, one with the demo's Panda CSS and Panda's recipe classes, one with the CSS adapter's
  stylesheet and runtime classes, and Playwright compares the computed styles of each pair.
  Any difference is a bug in one of them. (Both stylesheets share class names, so the pages
  are separate rather than a route in the demo.)
- **Panda snapshots unchanged** after the extraction.

## Steps

1. **Extract `css-lowering`.** Move the shared lowering out of `panda-adapter` behind a pluggable
   token reference spelling and condition output. Panda snapshots and all tests unchanged.
2. **Stylesheet emitter.** Tokens and themes, keyframes, recipes with layers and nesting,
   text styles and utilities inlined. Snapshot tests on the default `pureform()` config.
3. **Runtime.** `componentClasses(manifest)` and `classesFor(config)`, typed from the specs. Type tests.
4. **AOT build and Vite plugin.** `buildCss` writing CSS, JS, and `.d.ts`; the plugin's virtual
   modules.
5. **Parity tests.** The computed-style comparison against Panda, in the demo's e2e suite.
6. **Reset.** `reset.css`, opt-in, in the `pureform.reset` layer.
7. **Docs.** Package README, including Lightning CSS setup, and the design doc's adapter
   section.

Each step lands as its own commits, tested through `omni task_run test:unit`.
