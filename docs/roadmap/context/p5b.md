# p5b: Runtime themes and server rendering of themes (output context)

Commits: b41162e..fb9c843, plus the `docs(roadmap)` commit that adds this file.

| Commit    | What                                                                                                                 |
| --------- | -------------------------------------------------------------------------------------------------------------------- |
| `b41162e` | `feat(styling)`: `defineRuntimeTheme`, `themeScope`, `preloadTheme`, `isRuntimeTheme`; `tokenVar`; `registry.vars`   |
| `5816c6b` | `feat(generate)`: `CodegenOutput.vars`; the index passes `vars` to `createRegistry`; Panda, CSS, Tailwind return it  |
| `b84975b` | `feat(material)`: `seedTheme` (`@pureform/material/runtime-theme`), its generator a separate chunk                   |
| `c0b6d7d` | `feat(binding-core)`: runtime theme attributes, the theme block, `overrideVars`, the reuse/regenerate decision       |
| `c9a5e40` | `feat(solid)`: the provider writes runtime themes with `useHead`, and overrides; `useThemeVars`; `preloadTheme`      |
| `9e093f3` | `feat(react)`: the provider writes runtime themes as `<style href precedence>`, and overrides; `useThemeVars`        |
| `ad5a84e` | `fix(material)`: the seed theme's numbers rounded to 10 significant digits (Node and Chromium differ in last digits) |
| `dc03cae` | `test(component-suites)`: runtime theme SSR, reuse, regenerate, drawing; overrides hydrate                           |
| `5ffcc13` | `docs`: READMEs (new one for `@pureform/material`)                                                                   |
| `fb9c843` | `docs(design)`: "Built (p5b)" in §5.6 and §5.7                                                                       |

## Built

### The provider's theme API (both bindings)

```tsx
<PureformProvider
    registry={registry}
    theme={seedTheme({ seed: "#006A60" })} // runtime; or theme="teal" (named)
    overrides={{ "colors.primary": "#006a60", "components.button.container": "red", "--brand": "x" }}
    hydrate="reuse" /* default; or "regenerate" */
>
```

- `ProviderOptions.theme?: ProviderTheme` where `type ProviderTheme = ThemeName | AnyRuntimeTheme`
  (`@pureform/binding-core`). `ThemeOverrides = Readonly<Record<string, TokenValue | undefined>>`.
- **Named theme:** unchanged from p5a (`registry.themeAttributes(name)` on the element).
- **Runtime theme:** the element gets `{ [registry.themeAttribute ?? "data-theme"]: themeScope(theme) }`
  (`pf-<hash>`), and the provider writes one block `[attr="pf-<hash>"] { light vars }` +
  `.dark [attr=…] { dark vars }` + `@media (prefers-color-scheme: dark) { :root:not(.light)
[attr=…] { dark vars } }`. Unlayered.
- **Overrides:** the provider's own, as inline CSS vars on its element (`display: contents`
  element's `style`, before the user's `style`), named by `registry.vars`. Rendered on the
  server. Inherited overrides reach descendants through the cascade.
- **`hydrate`:** `"reuse"` keeps the server's block and generates nothing; `"regenerate"`
  generates on the client while hydrating (sync if the generator is loaded, else after loading).
- **`useThemeVars()`** (Solid: `Accessor<ThemeSchemeVars | undefined>`; React: the value): the
  nearest runtime theme's generated vars; `undefined` while reusing the server's block, under a
  named theme (a provider with a named `theme` stops the inheritance), or with none.
- Both bindings re-export `preloadTheme` and the types `RuntimeTheme`, `ThemeSchemeVars`,
  `ProviderTheme`, `ThemeHydration`, `ThemeOverrides`.

### Head-tag mechanics per framework

- **Solid** (`packages/solid/src/provider.tsx`, `useThemeBlock`): `useHead(() => block?.css ===
undefined ? [] : { tag: "style", key: "pureform-theme:<scope>", props: { "data-pf-theme": scope,
children: css } })` from `@solidjs/web`. Same key dedupes providers with the same theme; Solid
  removes the tag when no provider uses it. On the server, `renderToString` puts the tags in the
  document's `</head>`, or hands them to its `onHead` option when the markup has none. On the
  client, Solid adopts the server's tag only when attributes and text match, so under `"reuse"`
  the provider reads the server block's text from the page (`serverThemeCss(scope)`) and uses it
  as its own `children`.
- **React** (`packages/react/src/provider.tsx`, `useThemeBlock`): renders `<style href={scope}
precedence="pureform">{css}</style>` beside its `div`. React hoists it to the head and dedupes
  by `href`; `renderToString` without a document puts it at the front of the markup. On the
  client React adopts an existing `style[data-href~=scope]` without comparing text; a hoisted
  style can't change later, so the provider only renders it once it has CSS (the server block's
  text under `"reuse"`, or generated). React never removes hoisted styles.
- Server: the generator must be loaded before rendering (`await preloadTheme(theme)`); otherwise
  the server renders the attribute and no block and `warnOnce`s
  (`unloadedThemeMessage`) in development.

### `@pureform/styling`

```ts
// runtime-theme.ts (root entry)
type ThemeInput = string | number | boolean | null | readonly ThemeInput[] | { readonly [k: string]: ThemeInput | undefined };
type CssVars = Readonly<Record<`--${string}`, string>>;
interface ThemeSchemeVars { readonly light: CssVars; readonly dark?: CssVars | undefined }
type ThemeGenerator<I = ThemeInput> = (input: I, vars: VarOptions) => ThemeSchemeVars;
interface ThemeSource<I> { readonly name: string; readonly loaded: ThemeGenerator<I> | undefined; load(): Promise<ThemeGenerator<I>> }
interface RuntimeTheme<I = ThemeInput> { readonly source: ThemeSource<I>; readonly input: I }
type AnyRuntimeTheme = RuntimeTheme<any>;
defineRuntimeTheme<I>(name, load: () => Gen | { default: Gen } | Promise<…>): (input: I) => RuntimeTheme<I>;
isRuntimeTheme(theme: unknown): theme is AnyRuntimeTheme;
preloadTheme(theme): Promise<void>;     // never rejects
themeScope(theme): string;              // "pf-" + cyrb53(name + "\0" + stable JSON of input).toString(36)

// registry.ts
interface VarOptions { readonly prefix?: VarPrefix; readonly tokenPrefix?: string }
RegistryOptions.vars?: VarOptions;  Registry.vars: VarOptions; // frozen, {} by default

// theme-vars.ts (/theme-vars subpath)
tokenVar(path, vars?): `--${string}` | undefined;
// "colors.primary" → --colors-primary; "fontSize.bodyLarge" → --font-sizes-body-large;
// "components.button.container" → --pf-components-button-container (prefix "pf"); "--x" → "--x"
```

### `@pureform/generate` and the adapters

`CodegenOutput.vars?: CodegenVars` (`{ prefix?: string | { ui?, components?, global? };
tokenPrefix?: string }`, exported). `registryIndex(entries, themes, version, themeAttribute?,
vars?)` writes `{ version, themeAttribute: "…", vars: { prefix: "pf" } }` (undefined keys
dropped; `vars` left out when empty). Panda returns `{ prefix, tokenPrefix }` from
`PandaCodegenOptions` (new `tokenPrefix?`: Panda's own `prefix`, if the app sets one); CSS and
Tailwind return their `prefix` and `tokenPrefix`. `apps/react-demo/.pureform/index.ts`
regenerated (`vars: { prefix: "pf" }`).

### `@pureform/material/runtime-theme` (new subpath)

```ts
type SeedThemeInput = {
    readonly seed: HexColor;
    readonly customSeeds?;
    readonly overrides?;
};
const seedTheme: (input: SeedThemeInput) => RuntimeTheme<SeedThemeInput>; // source name "material-seed"
// src/runtime-theme/generate.ts (chunk, loaded on demand): generateSeedTheme (also default)
```

The generator resolves Material's providers with `materialColor({ ...input, space: "oklch" })`,
takes `tokens.colors` and `semanticTokens.colors` (roles and elevation tints), lowers both
schemes with `themeVars`, keeps in `dark` only what differs, and rounds numbers to 10
significant digits. Material now depends on `@pureform/styling` (package.json, omni, bun.lock).

### `@pureform/binding-core`

Root: `ProviderTheme`, `themeAttributes(theme, registry)`, `themeAttributeOf(registry)`
(registry's attribute or `"data-theme"`); `providerAttributes` uses `themeAttributes`.

`/dom` (from `src/web-theme.ts`): `THEME_BLOCK_ATTRIBUTE = "data-pf-theme"`,
`THEME_PRECEDENCE = "pureform"`, `themeSelector(attr, scope)`, `themeCss(selector, vars)`,
`overrideVars(overrides, registry): CssVars | undefined`, `interface ThemeBlock { scope; vars;
css }`, `initialThemeBlock(theme, registry, { hydrate, server, existing? })`,
`needsThemeLoad(block, hydrate)`, `generateThemeVars(theme, registry)` (sync if loaded),
`loadThemeVars(theme, registry)`, `generatedBlock(theme, registry, vars)`,
`serverThemeCss(scope)` (finds `style[data-pf-theme=…]` or `style[data-href~=…]`),
`unloadedThemeMessage(theme)`. The root entry still imports no CSS lowering (`overrideVars`
pulls `@pureform/styling/theme-vars`, so it's on `/dom`).

### `tests/component-suites`

- `SceneProvider` gains `seed?: \`#${string}\``, `hydrate?`, `overrides?`.
`src/harness/themes.ts`: `countedSeedTheme`(same scope as`seedTheme`, counts generations in
`generated.count`), `sceneTheme(provider)`.
- Servers (`src/bindings/*/server.tsx`) are async: `await preloadTheme` for a runtime theme; Solid
  passes `onHead` and returns the tags in `head`; React splits the hoisted `<style
data-precedence>` off the front of its markup into `head`. `harness/server.ts`'s `runScripts`
  became `applyHead` (scripts run; other tags go into `document.head`, replacing a block with the
  same scope).
- `server-rendering.e2e.test.ts` (per component, every project): server renders scope and block;
  hydrates in light and dark with no log, no change, one block, `generated.count` unchanged, and
  the root reads the block's vars; `"regenerate"` generates (count grows) the identical block;
  overrides render and hydrate unchanged. The p5b `it.todo` is gone.
- `themes.e2e.test.ts`: a runtime theme from teal's seed draws teal's colors (color, background,
  border, outline of every part) in both schemes, and differs from the base.
- Counts: 1110 passed, 54 skipped, 6 todo (the `error` todo, p6b), six projects.

## Deviations from the design

- **The server must preload the generator** (`await preloadTheme(theme)`); the design implied the
  provider generates on the server without saying how a lazily loaded generator gets there.
- **Reuse reads the server's block text from the page**, rather than "only needs the hash": Solid
  adopts a head tag only on an exact text match, and React can't update a hoisted style.
- **Generators aren't bitwise pure across engines** (Node vs Chromium last digits), so
  `seedTheme` rounds to 10 significant digits. If engines still disagree under `"regenerate"`,
  Solid replaces the block (same look), React keeps the server's.
- **Panda's `getTheme`/`injectTheme` aren't used:** every target goes through vars → CSS in the
  binding, since the var names match (the "theme's CSS as a string" is `themeCss`'s output).
- **A seed theme writes colors only** (every color token and role, both schemes); other domains
  keep the base config's values.
- **Overrides** use React Native's token paths (plus raw `--vars`); scheme-independent; only the
  provider's own are written. A token declared at the root from an overridden one keeps its value.
- **New `registry.vars`** (and `CodegenOutput.vars`), needed to name override and theme vars
  with the target's prefixes.
- **`useThemeVars`** is new: it's what makes `"regenerate"` useful ("code reads the theme's
  values in JS").
- Recorded in the design doc (§5.6, §5.7 "Built (p5b)").

## Stubs and gaps

- **React never removes a hoisted theme block**; switching runtime themes leaves old blocks in the
  head (unused, harmless). Solid removes them.
- **Switching to a new runtime theme on the client** shows the base theme until the generator
  loads the first time (the attribute moves at once). Preload to avoid it.
- **Loaded themes** (fetched data rather than a seed) have no ready-made source; an app writes one
  with `defineRuntimeTheme(name, load)` whose generator returns `{ light, dark }` vars.
- **React Native** (p8) doesn't consume runtime themes yet: `providerAttributes` and the web
  theme code are web-only; `RuntimeTheme`/`ThemeGenerator` return CSS vars. p8 needs a native
  generator output (theme values) or its own source.
- The demos don't show a runtime theme (not in scope); the suites cover it end to end.
- Pre-existing, unchanged: `rn-parity` "every variant value at rest" (still 99 differences).

## How to verify

- `task_run` `build` + `test:unit` on `@pureform/styling`, `generate`, `panda-adapter`,
  `css-adapter`, `tailwind-adapter`, `material`, `binding-core`, `solid`, `react`: pass.
- `task_run` `test:e2e` on `@pureform/component-suites`: 1110 passed, 54 skipped, 6 todo.
  One file, one project: `cd tests/component-suites && set -a; source ../../.env.local; set +a;
bun x vitest --config vitest.config.e2e.ts run src/server-rendering --project react/css`.
- Workspace `build` + `test:unit` (and `test:e2e`): all pass except the pre-existing rn-parity
  case.
- `bun x tsc --noEmit -p tests/component-suites/tsconfig.json`: passes.

## Notes for the next phases

- **p6 (rollout):** every new component in `COMPONENTS` runs the runtime theme cases
  automatically. "Draws teal's colors" compares colors only and needs the component to draw a
  themed color (as "draws differently in teal" already does). Measure compared scenes in an
  `unhovered()` host (`pointer-events: none`) when a scene stays on the page a while.
- **p8 (React Native):** `ProviderTheme` includes runtime themes; a native provider should either
  reject them or add a source whose generator returns theme values. `overrides` on native are
  rn-adapter's (`overridesFor`), keyed the same way as the web's.
- **Apps server-rendering a runtime theme:** `await preloadTheme(theme)` in the request handler;
  Solid with a custom `renderToString` and no `</head>` must pass `onHead` (as the suites do).
- **Lockfile:** edited by hand twice (material's and the suites' `@pureform/*` entries only;
  `--lockfile-only` rewrote emnapi, aria-query, commander, dom-accessibility-api, lightningcss);
  `bun install --frozen-lockfile` reports no changes.
- `apps/solid-demo/solid-env.d.ts` is regenerated by workspace builds; restore it before committing.
