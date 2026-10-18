# @pureform/panda-fixture

The Panda setup the browser suites test against: a pureform config, the Panda preset compiled
from it, the registry `pureform generate` writes from it, Panda's codegen, a stylesheet, and a page
of every component. Private; nothing ships it. It belongs to the tests, so the demos can change,
prune, and rebuild without touching what the suites read.

- **Depends on:** `@pureform/panda-adapter` (the preset and the codegen), `@pureform/preset`,
  `@pureform/material`, `@pureform/theme`, `@pureform/core` (the config), `@pureform/cli` (the
  `generate` task), `@pureform/styling` and `@pureform/js-effects` (what the generated registry and
  the page import at run time), and Panda.
- **Used by:** `tests/component-suites` (the Panda target's registry and stylesheet, and the
  config the CSS and Tailwind targets are generated from) and `tests/browser-e2e-tests` (the
  config, the preset, the registry, the stylesheet, and the page).

## What's in it

```
pureform.config.ts   the config: Material's defaults, two morphing shapes, named densities,
                     a monospace text style, and the teal, sharp, and dense themes
pureform.codegen.ts     the options `pureform generate` reads: the Panda target, prefix "pf"
panda.pureform.ts    compilePreset(config) → pureformPreset; re-exports PREFIX and the config
panda.config.ts      Panda's config: the base presets, pureformPreset, every variant as staticCss
src/styles.css       the stylesheet root: Panda's layer declaration, which Panda's Vite plugin fills
src/page.tsx         Page: every component in its variants, states, and themes, a section each
src/ripple.tsx       the ripple layer the page's buttons and checkboxes draw
.pureform/           generated, ignored by git: the registry, staticCss, and their declarations
styled-system/       generated, ignored by git: Panda's codegen (`$recipes` in the suites)
```

There is no entry point: the suites import these files by relative path
(`../panda-fixture/panda.pureform`, `../panda-fixture/.pureform`), and their Vite configs point
Panda's plugin at `panda.config.ts` (`pandacss({ cwd, configPath })`) and alias `$` to
`styled-system/`. The browser tests also alias `#` to `src/` (`#/styles.css?inline`, `#/page`).

## Building

Through omni: `prepare` runs `generate` (`bun x pureform generate`, after building the packages
it loads) and then `panda codegen`. The suites' `test:e2e` tasks depend on it (`^prepare`), and
their cache keys include the fixture's files. It has no tests or build of its own.

`bun x` runs the CLI under Node, as Vite runs the bundler plugin: the preset computes a shape
morph differently under Bun, which changes the registry's hash.

## Worth knowing

- **Changing the config changes what every suite tests**, on every target: the component suites
  generate the CSS and Tailwind registries from this config too, and the browser tests compile every
  adapter from it. Screenshots (`tests/browser-e2e-tests/src/__screenshots__/`) and the
  indication fixtures (`tests/browser-e2e-tests/src/__fixtures__/indication/`) record what it
  draws; update them only when the change is intended.
- `.pureform/` always holds every component: `pureform generate` never prunes.
- `panda.config.ts` lists `src/` for Panda's extraction, so a `css()` call in the page adds a
  utility to the stylesheet the suites load.
- `tsconfig.json` leaves out `panda.config.ts`, as the demos do: Panda's own presets don't check
  against its `Preset` type under the repo's strict options.
