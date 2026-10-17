# css-demo

pureform on the plain CSS target, with no Panda and no Tailwind: `@pureform/solid`'s button and
checkbox, and the registry's class factories for the components that have no Solid component
yet, all styled by the stylesheet the CSS target generates. A client-rendered Solid app.

```sh
bun run dev
```

## How it's wired

```
pureform.config.ts ──► pureform.glue.ts { target: "css", options, components }
                              │
        vite.config.ts: pureform(glue) ──► .pureform/  (ignored by git)
                              │              ├── web/<name>.ts   ClassFactory per component
                              │              ├── styles.css      the stylesheet, those components only
                              │              ├── index.ts        registry, themes
                              │              └── registry.d.ts   the types
src/main.tsx: imports reset.css and .pureform/styles.css,
              <PureformProvider registry={registry} theme dir> around the page
```

- `pureform.config.ts`: Material's defaults and a teal theme.
- `pureform.glue.ts`: the target and its options (`prefix: "pf"`, `classPrefix: "pf"`, so classes
  read `pf-button__root`), and the components the page uses, which the registry and the
  stylesheet are trimmed to. `vite.config.ts` passes it to the bundler plugin, and
  `pureform generate` (the omni `generate` task) reads it.
- `src/main.tsx`: imports `@pureform/css-adapter/reset.css` and `.pureform/styles.css`, and renders
  the page inside `PureformProvider`. The theme buttons set the provider's `theme`, which writes
  `registry.themeAttributes(theme)` (`data-theme="teal"`) on its element; the scheme buttons put
  `.light` or `.dark` on the root (the stylesheet follows the system's scheme otherwise).
  Components without a Solid component yet read their classes with `useClasses(name, selection)`.

The build's script is about 40 kB gzipped (Solid, the button and checkbox with their Zag
machines, and the registry); the config, providers, and color generation stay at build time.
