# css-demo

pureform on the plain CSS target, with no Panda and no Tailwind: `@pureform/solid`'s button and
checkbox, and the registry's class factories for the components that have no Solid component
yet, all styled by the stylesheet the CSS target generates. A client-rendered Solid app.

```sh
bun run dev
```

## How it's wired

```
pureform.config.ts ──► pureform.codegen.ts { target: "css", options }
                              │
        vite.config.ts: pureform(codegen) ──► .pureform/  (ignored by git)
                              │              ├── web/<name>.ts   ClassFactory per component
                              │              ├── styles.css      the stylesheet, those components only
                              │              ├── index.ts        registry, themes
                              │              └── registry.d.ts   the types
src/main.tsx: imports reset.css and .pureform/styles.css,
              <PureformProvider registry={registry} theme dir> around the page
```

- `pureform.config.ts`: Material's defaults and a teal theme.
- `pureform.codegen.ts`: the target and its options (`prefix: "pf"`, `classPrefix: "pf"`, so classes
  read `pf-button__root`). `vite.config.ts` passes it to the bundler plugin, and
  `pureform generate` (the omni `generate` task) reads it. `vite build` prunes the registry
  and the stylesheet to the 10 components the page draws and the variant values it selects
  (the bundler's `prune`): the CSS goes from 847 kB (124 kB gzipped) with every component to
  429 kB (80 kB), the script from 167 kB to 140 kB.
- `src/main.tsx`: imports `@pureform/css-adapter/reset.css` and `.pureform/styles.css`, and renders
  the page inside `PureformProvider`. The theme buttons set the provider's `theme`, which writes
  `registry.themeAttributes(theme)` (`data-theme="teal"`) on its element; the scheme buttons put
  `.light` or `.dark` on the root (the stylesheet follows the system's scheme otherwise).
  Components without a Solid component yet read their classes with `useClasses(name, selection)`.

The build's script is about 40 kB gzipped (Solid, the button and checkbox with their Zag
machines, and the registry); the config, providers, and color generation stay at build time.

## Test

`test:e2e` (`vitest.config.e2e.ts`, over the demo's own Vite config) is a smoke test: the page
renders in Chromium from the registry the bundler plugin writes, its buttons styled by the generated
stylesheet, without an error. `build` runs it first. Set `CHROMIUM_PATH` (`.env.local`) to use a
system Chromium. Its global setup, `@pureform/vitest-config/browser-warmup`, compiles the page's
modules before the test opens it, so a cold server on a loaded machine neither runs out the test's
time nor reloads it.
