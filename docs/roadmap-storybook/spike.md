# storybook-web: spike (step 1)

## Verdict: one host works

One Storybook instance on `@storybook/html-vite` hosts Solid, React and React Native (through
React Native Web) in **one Vite build**. A `renderer` toolbar global switches between them on
the same story. **Composition with `refs` isn't needed**, so the fallback wasn't tried.

Checked with `apps/storybook-web/scripts/spike-check.mjs` (Playwright) against `storybook build`
(served statically) and against `storybook dev`:

| Renderer     | Rendered | Background (filled)             | Radius   | Height |
| ------------ | -------- | ------------------------------- | -------- | ------ |
| Solid        | yes      | `oklch(0.4955 0.1304 293.7)`    | `9999px` | `40px` |
| React        | yes      | `oklch(0.4955 0.1304 293.7)`    | `9999px` | `40px` |
| React Native | yes      | `rgb(103, 80, 164)` (= #6750A4) | `9999px` | `40px` |

- Switching the toolbar (Solid → React → React Native → Solid) remounts each time (the mount
  counter goes up by one per switch), and the page logs no errors or console errors.
- Changing args (label and variant, sent on the channel as the Controls panel does) updates in
  place in every renderer: the mount counter stays the same, the update counter goes up, and
  the label and variant (`outlined`: transparent background) change.
- Same results under `storybook dev` (bindings resolve to their TypeScript sources through the
  `development` export condition) and `storybook build` (bindings' built `dist`).
- `omni run build -p @pureform/storybook-web` passes (generate → panda codegen → storybook build).
- `tsc --noEmit` is clean for `tsconfig.json` and `src/solid/tsconfig.json`.

Screenshots: `/tmp/opencode/sb-spike-{solid,react,native}.png` (build) and
`/tmp/opencode/sb-spike-dev/sb-spike-{solid,react,native}.png` (dev).

## Versions

| Package                         | Version                            |
| ------------------------------- | ---------------------------------- |
| storybook, @storybook/html-vite | 10.6.3 (added to the root catalog) |
| vite                            | 8.3.4 (rolldown)                   |
| @solidjs/vite-plugin            | 3.0.0-next.50                      |
| solid-js                        | 2.0.0-rc.15                        |
| @vitejs/plugin-react            | 6.1.2                              |
| react, react-dom                | 19.3.1                             |
| react-native-web                | 0.21.4                             |
| @pandacss/vite                  | 2.2.0                              |

## What the app is

- `apps/storybook-web` (omni `@pureform/storybook-web`, extends `ts-vite-app`): `generate`
  (pureform CLI) → `prepare` (`panda codegen`) → `build` (`storybook build`, output
  `storybook-static/`); `dev` is `storybook dev -p 6006`. e2e/unit tasks are off for now.
- `pureform.config.ts`, `panda.config.ts`, `panda.pureform.ts` copied from solid-demo;
  `pureform.codegen.ts` limits the Panda registry to `button` and `ripple`, with `prune: false`
  (controls pick variants at run time, which pruning can't see).
- `.storybook/main.ts`: all Vite config in `viteFinal`; no app `vite.config.ts`.
- `.storybook/preview.ts`: the `renderer` global (toolbar, `dynamicTitle`).
- `src/renderers/{types,multi-render}.ts`: `RendererAdapter`/`MountHandle` as in the plan, and
  `multiRender(impls)`, which keeps the mounted element across renders of the same story and
  renderer (calls `update`), and unmounts and remounts otherwise.
- `src/{solid,react,native}/adapter.*`: Solid `render()` with props in a store and `reconcile`
  on update; React and React Native `createRoot()` and re-render. Each wraps the component in
  its binding's `PureformProvider`.
- `src/stories/Button.stories.ts`: a hand-written `.ts` story (no JSX).

## Vite config tricks needed

1. **Keep the JSX compilers apart by path.** One regex list, used as Solid's `include` and
   React's `exclude`:
   `[/\/src\/solid\/.*\.[jt]sx?$/, /\/packages\/solid\/.*\.[jt]sx?$/]`.
   The second entry covers `@pureform/solid` both as `src/**/*.tsx` (dev, `development`
   condition) and as `dist/*.jsx` (build). Bun links workspace packages, so Vite sees the real
   `packages/solid/...` path; a published install would need `/node_modules/@pureform/solid/`
   too. Neither plugin needed any other change: Solid's runs first and leaves no JSX for Vite's
   oxc transform that plugin-react configures.
2. **Solid plugin with `ssr: false, start: false`**: no SSR, router or server functions.
3. **React Native Web, from rn-web-demo, applied globally:** the `react-native` alias (absolute
   path), the asset-registry alias, `WEB_EXTENSIONS` in `resolve.extensions` and in
   `optimizeDeps.rolldownOptions.resolve`, `shimMissingExports` in both
   `optimizeDeps.rolldownOptions` and `build.rolldownOptions`, and `global`/`__DEV__` defines.
   None of these upset Solid, React or Storybook's preview.
4. **RN styles without a second registry:** the bundler plugin writes one `.pureform/` per app,
   and it's the Panda target here. React Native uses a `virtual:pureform-rn` module (rn-web-demo's
   `pureformRn()` minus the brands) with `runtimeStyles(config)` and `instanceTokenKeys`, and the
   adapter builds a registry of `nativeFactory`s from it.
5. **`main.ts` runs under Node's own TypeScript loading**, so its relative imports need the
   `.ts` extension (`../pureform.codegen.ts`); without it, `Cannot find module`.
6. `build.target: "esnext"` (as solid-demo).

## Problems hit

- `solid-js/store` doesn't exist in Solid 2: `createStore` and `reconcile` come from `solid-js`.
- **Type checking crosses the folder configs.** A per-folder `tsconfig.json` only decides how
  that folder is checked as its own project. The stories (checked by the root config with React's
  JSX) import the Solid adapter, so tsc pulled `src/solid/adapter.tsx` into the React program
  and reported Solid's components as invalid React JSX. Fix in the spike: the Solid adapter is
  JSX-free (`createComponent`), so the root program can read it. `src/solid/tsconfig.json`
  (`jsxImportSource: @solidjs/web`) stays for Solid JSX the stories don't import directly.
  Vite isn't affected: it compiles by the include/exclude above, not by tsconfig.
- The Storybook toolbar's renderer menu is a listbox (`aria-haspopup="listbox"`, options with
  `role="option"`); tests select it by its `aria-label` (the global's `description`).
- The stories chunk is about 1.4 MB minified (three renderers, React Native Web and the runtime
  styles). Only a warning.

## Changes to the plan

- **Keep the host design**; drop the composition fallback from the plan's risks.
- **Adapters and anything the generated stories import must be JSX-free** (or use TypeScript
  project references, the Solid folder as a referenced composite project, so the root program
  reads its declarations rather than its source). Renderer hooks with JSX (`@pureform/solid/storybook`)
  are fine as long as they're imported through the adapter's renderer only, and are type-checked
  by their own package.
- **The Solid include list has to name `@pureform/solid` and any other package that ships Solid
  JSX** (later: the per-renderer storybook hooks), by real path and by `node_modules` path.
- **React Native styles come from runtime styles**, not a generated native registry, unless the
  bundler plugin learns to write two targets; the codegen config should list the components once
  for both (as `COMPONENTS` in `pureform.codegen.ts` does now).
- `.storybook/main.ts` imports need `.ts` extensions; worth a line in the codegen step's notes
  if it generates config.
- Note for the `theme` global: the React Native adapter passes `scheme="light"`; the theme
  toolbar needs each provider's own prop (Solid/React `theme` and the Panda attribute, React
  Native `scheme`/`theme`).
