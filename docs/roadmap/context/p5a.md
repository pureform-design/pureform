# p5a: CSS and Tailwind targets (output context)

Commits: b0ecb18..b9e3d0c, plus the `docs(roadmap)` commit that adds this file.

| Commit    | What                                                                                                          |
| --------- | ------------------------------------------------------------------------------------------------------------- |
| `b0ecb18` | `feat(styling)`: `registry.themeAttributes(name)`; each codegen returns its `themeAttribute`; react-demo glue |
| `d283a20` | `feat(binding-core)`: providers write their named theme's attributes (Solid and React providers, specs)       |
| `a01eef2` | `test(component-suites)`: six projects (binding × target), generated CSS/Tailwind glue, a themes suite        |
| `b34d73e` | `refactor(demos)`: css-demo and tailwind-demo are Solid apps on the bundler plugin and the registry           |
| `645e88b` | `refactor(css-adapter)!`: retire `pureformCss`, `pureformTailwind`, `buildCss`, `virtual:pureform/components` |
| `b9e3d0c` | `docs(design)`: "Built (p5a)" in §5.2, §5.6, §9.7; §4's loading; §12 step 5                                   |

## Built

### Theme scoping: `themeAttributes(name)`

- **`@pureform/styling`** (`src/registry.ts`):

    ```ts
    type ThemeAttributes = Readonly<Record<string, string>>;
    interface RegistryOptions {
        version?: string;
        themeAttribute?: string;
    }
    interface Registry<E> {
        readonly themeAttribute: string | undefined;
        themeAttributes(name: string | undefined): ThemeAttributes; // frozen; {} for no name or no attribute
        // …version, names, has, entry, preload as before
    }
    createRegistry({ button }, { version, themeAttribute: "data-theme" });
    ```

- **`@pureform/generate`**: `CodegenOutput.themeAttribute?: string` (checked: lowercase attribute
  name, else `GenerateError("adapter-output")`). `registryIndex(entries, themes, version,
themeAttribute?)` writes `{ version, themeAttribute: "…" }` (or `{ version }` without one).
- **Adapters' codegens return it:** Panda `THEME_ATTRIBUTE = "data-panda-theme"` (new export of
  `@pureform/panda-adapter`, in `src/options.ts`; the preset's theme rules use it); CSS and
  Tailwind `themeAttributeOf(options)` = `options.themeAttribute ?? DEFAULT_THEME_ATTRIBUTE`
  (`"data-theme"`), new exports of `@pureform/css-adapter` (`src/options.ts`), used by
  `compileCss`, `toTailwind`, and both codegens. React Native returns none.
- **`@pureform/binding-core`**: `providerAttributes(own: { motion?, theme? }, state: { dir,
registry? })` spreads `state.registry.themeAttributes(own.theme)` first, then `dir` and
  `data-pf-motion`. `ProviderAttributes` gained an index signature `[attr: string]: string |
undefined`. Only the provider's **own** `theme` writes attributes (an inherited one is on the
  ancestor). Solid's and React's `PureformProvider` pass `theme`; switching it moves or removes
  the attribute.
- `apps/react-demo/.pureform/index.ts` (committed) changed only in `{ version, themeAttribute:
"data-panda-theme" }`.

### `tests/component-suites` on three targets

```
vitest.config.e2e.ts   await generateGlue(); process.setMaxListeners(32);
                       projects: solid/panda, solid/css, solid/tailwind, react/panda, react/css, react/tailwind
                       each: binding plugin + styling[target]() (Panda's plugin | none | @tailwindcss/vite),
                             alias #binding → src/bindings/<binding>/harness.tsx,
                             alias #registry → src/targets/<target>/registry.ts,
                             setupFiles ["./src/targets/<target>/setup.ts"]
src/targets/
  targets.ts           TARGETS = ["panda", "css", "tailwind"], TargetName
  glue.ts              GLUE { css, tailwind: { target, options: { prefix: "pf", classPrefix: "pf" } } },
                       CONFIG (apps/solid-demo/pureform.config.ts), generateGlue(): writes .pureform/css and
                       .pureform/tailwind (every component; ignored by git)
  panda/registry.ts    re-exports apps/solid-demo/.pureform's registry; setup.ts imports apps/solid-demo/src/App.css
  css/registry.ts      re-exports .pureform/css; setup.ts imports @pureform/css-adapter/reset.css + styles.css
  tailwind/registry.ts re-exports .pureform/tailwind; setup.ts imports styles.css (@import "tailwindcss" + generated)
src/commands.ts        one SSR Vite server per binding/target (cacheDir node_modules/.vite/ssr-<binding>-<target>,
                       alias #registry), project names parsed as "<binding>/<target> (chromium)"
src/harness/scene.ts   SceneProvider gains theme?: string
src/themes.e2e.test.ts new suite (below)
```

Removed: `src/setup.ts`, `src/registry.ts`. `pandacss` moved from `vite.config.ts` into the
Panda projects. New dev deps: `@pureform/css-adapter`, `@pureform/generate`,
`@pureform/tailwind-adapter`, `@tailwindcss/vite`, `tailwindcss` (omni dependencies too).

**Themes suite** (per component, per project): `registry.themeAttributes(theme)` is `{
[registry.themeAttribute]: theme }` for `teal`, `sharp`, `dense`; the provider's element carries
it; the component draws (color, background, border, radius, outline, size of every part) exactly
as under the attribute set by hand on a wrapper; teal draws differently from the base theme.
**Server rendering**: a themed provider renders the attribute on the server and hydrates with no
change. Counts: 42 files (7 × 6 projects), 1026 passed, 54 skipped, 12 todo.

### css-demo and tailwind-demo

Both are client-rendered Solid apps now (`src/main.tsx`, `render` from `@solidjs/web`):

- `pureform.config.ts` (moved from `src/config.ts`, default export), `pureform.glue.ts`
  (`{ target: "css" | "tailwind", options: { prefix: "pf", classPrefix: "pf" }, components: [...] }`,
  allow-listed to what the page uses), `vite.config.ts` `[pureform(glue), (tailwindcss(),) solid()]`,
  `.gitignore` `.pureform`, tsconfig `jsx: preserve`, `jsxImportSource: @solidjs/web`, `include`
  `.pureform/**/*.*`.
- omni: `generate` task (`bun x pureform generate`, `^build`), `build` depends on it; cache keys
  add the config, glue, vite config, `index.html` (and `src/**/*.css` for Tailwind).
- Pages: `PureformProvider registry theme (dir)`, `@pureform/solid`'s `Button` and `Checkbox`,
  and `useClasses(name, selection)` for components without a Solid component (text, icon button,
  FAB, avatar, text field, switch, card, media). Theme buttons set the provider's `theme`.
  Tailwind's page overrides through slot classes (`class={{ root: "rounded-none" }}`) and uses
  `theme-teal:`/`dark:` variants. Checked by hand in Chromium (preview build): themes switch,
  checkbox toggles, no console errors.
- Build sizes: css-demo 118 kB JS (39 kB gzip), 644 kB CSS (112 kB gzip); tailwind-demo 112 kB
  JS, 553 kB CSS. The CSS is mostly tokens, themes, and shape paths, which the allow-list keeps.

### Retired

`@pureform/css-adapter/vite` (`pureformCss`, `pureformPlugin`, `writeIfChanged`),
`@pureform/css-adapter/build` (`buildCss`, the old `generate` with `components.js`/`.d.ts`),
`@pureform/tailwind-adapter/vite` (`pureformTailwind`), and `virtual:pureform/components`.
Both adapters dropped their optional `vite` peer and gained `@types/node` (dev, `types: ["node"]`
in their tsconfigs; vite's types used to bring Node's in). `compileCss`, `classesFor`,
`/runtime` (`componentClasses`), `compileTailwind`, `toTailwind` stay.

## Per target: app setup and behavior

All three: `pureform.config.ts` (default export), a `pureform.glue.ts` exporting `glue`, the
bundler plugin first in Vite's plugins (`pureform(glue)` from `@pureform/bundler/vite`), `.pureform`
in `.gitignore` (or committed, with `pureform generate --check` in CI), `".pureform/**/*.*"` in the
tsconfig's `include`, and `<PureformProvider registry={registry} theme?>` with `registry` from
`.pureform` (or `virtual:pureform/registry` with `@pureform/bundler/client` types). A Solid app
that server-renders keeps `ssr.noExternal: [/^@pureform\//]`.

- **Panda** (`apps/solid-demo`, `apps/react-demo`): `target: "panda"`, `options: { prefix }`;
  `pandacss()` after `pureform(glue)`; `panda.config.ts` spreads `.pureform/panda.ts`'s
  `staticCss`; run `panda codegen` after generating. Themes: `data-panda-theme`.
- **CSS** (`apps/css-demo`): `target: "css"`, `options: CssOptions` (`classPrefix`, `prefix`,
  `tokenPrefix`, `themeAttribute`, `layer`); import `@pureform/css-adapter/reset.css` (or your
  own) and `.pureform/styles.css`. Themes: `themeAttribute` (default `data-theme`). Color scheme:
  the system's unless the root has `.light`/`.dark`.
- **Tailwind** (`apps/tailwind-demo`): `target: "tailwind"`, `options: TailwindOptions`;
  `tailwindcss()` after `pureform(glue)`; the app's CSS does `@import "tailwindcss";` then
  `@import "../.pureform/styles.css";`. Themes: `themeAttribute` (default `data-theme`), the same
  attribute the `theme-<name>:` variants match. Utilities beat component styles (later layer);
  pass them through slot classes.

Behavior is the same on all three: the suites pass unchanged, with no target branches. Class
names differ (Panda's recipe classes, `button__root…`, vs `pf-button__root…`), and the theme attribute
differs (read it from `registry.themeAttribute(s)`, never hard-code it).

## Deviations from the design

- **`themeAttributes` is on the registry**, not on each factory (§5.6 said "the factory exposes
  that"): the attribute is the target's, and the provider has the registry. Recorded in §5.6.
- **The demos became Solid apps** (they were framework-free DOM pages), per §12 step 5's "switch
  to the components"; components without a Solid component use `useClasses`.
- **The demos use `classPrefix: "pf"` and `prefix: "pf"`** (they had none), matching the suites'
  glue and the Panda demo's var prefix.
- **The suites run React on CSS and Tailwind too**, not only Solid (the phase's goal names Solid):
  six projects cost about 15 s in all.
- **Retiring the adapters' Vite plugins** happened here (p4c-bundler's note handed it over).

## Stubs and gaps

- **Runtime themes** (`overrides`, `hydrate`, seed or loaded themes) remain p5b's; the
  server-rendering suite keeps its `it.todo("hydrates with a runtime theme from the provider
(p5b)")`. Named themes are done.
- **Pruning** (p7): the demos use a hand-written allow-list; the stylesheet still carries every
  token, theme, keyframe, and shape.
- Pre-existing, unchanged: `rn-parity` "every variant value at rest" in `browser-e2e-tests`
  (still 99 differences).

## How to verify

- `task_run` `test:e2e` on `@pureform/component-suites`: 1026 passed, 54 skipped, 12 todo across
  six projects. One project by hand:
  `cd tests/component-suites && set -a; source ../../.env.local; set +a; bun x vitest --config
vitest.config.e2e.ts run src/themes --project solid/tailwind` (globs work: `'*/css'`).
- `task_run` `build` and `test:unit` on `@pureform/styling`, `generate`, `binding-core`, `solid`,
  `react`, `panda-adapter`, `css-adapter`, `tailwind-adapter`, `bundler`: pass.
- `task_run` `build` on `@pureform/css-demo` and `@pureform/tailwind-demo`; `bun x tsc --noEmit -p
tsconfig.json` in each after a build.
- Workspace `build` + `test:unit` + `test:e2e`: all pass except the pre-existing rn-parity case.

## Notes for the next phases

- **p6 (every component rollout): adding a component's tests on the CSS and Tailwind targets
  needs no target-specific step.** Follow p3c's five steps (name in `COMPONENT_NAMES`, both
  bindings' `components` maps, `src/components/<name>.ts`, `COMPONENTS`), and skip step 5: every
  target's registry is generated with every component of `apps/solid-demo/pureform.config.ts`
  (Panda through the demo's `generate` task and `staticCss`, CSS and Tailwind by
  `src/targets/glue.ts` on each run). Every suite then runs the component in six projects. If a
  component only fails on one target, run that project alone (`--project react/css`) and compare
  with `--project react/panda`; the targets differ only in stylesheet and registry, so a
  difference is a lowering bug (`css-lowering` or the adapter), not a suite bug. Don't branch a
  suite on the target; read `#registry` if a case needs target facts (as the themes suite reads
  `registry.themeAttributes`). The themes suite runs each new component automatically; a
  component the teal theme doesn't visibly change (no color from the scheme) would fail "draws
  differently in teal": give its case props that draw a themed color, or exclude it there with a
  comment.
- **Measuring two renders against each other** (as the themes suite does): measure one at a time
  in the same place; the pointer may rest on the first element on the page, and its hover state
  layer changes the background (`oklab(...)` vs `oklch(...)` serializations were the symptom).
- **SSR servers in `commands.ts`** need a `cacheDir` each: concurrent Vite servers sharing
  `node_modules/.vite/deps` fail with `ENOTEMPTY`.
- **p5b:** `providerAttributes` already spreads the named theme's attributes; a runtime theme can
  add its own scope (class or hashed attribute) alongside. Keep `theme` (a name) working: the
  themes suite and both demos use it. The suites' `SceneProvider` has `theme`; add `overrides` or
  a runtime theme next to it.
- **p7:** the CSS and Tailwind targets prune by narrowing `components` (the stylesheet follows);
  the demos' hand-written allow-lists are what pruning should reproduce.
- **Lockfile:** edited by hand again (workspace blocks only; `--lockfile-only` rewrote emnapi,
  lightningcss, aria-query, commander, dom-accessibility-api); `bun install --frozen-lockfile`
  reports no changes.
