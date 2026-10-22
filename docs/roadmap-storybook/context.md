# storybook-web: context (steps 2–7)

Built on the spike ([spike.md](spike.md)) per [plan.md](plan.md), on branch `storybook-web`
from `main` (`da4f3d08`). Not pushed.

## What was built

- **Plan:** the spike's findings folded in (no composition fallback; JSX-free adapters and
  story imports; Solid's include list naming every Solid-JSX package by workspace and
  `node_modules` path; React Native's runtime styles from a virtual module; the theme toolbar
  mapped to each provider's props).
- **Binding hooks:** `@pureform/solid/storybook`, `@pureform/react/storybook`,
  `@pureform/react-native/storybook` (`src/storybook/index.ts`, a `package.json` export and a
  build entry each). Each exports `decorators` (the provider with the story's registry and
  theme; React Native also takes the `scheme`). React Native's also exports `args`, a function
  mapping the web's `onClick` to `onPress`. No JSX, no Storybook dependency (structural types).
- **Adapters:** `src/solid/adapter.ts` (props and context in stores, so args and theme update
  without a remount), `src/react/adapter.ts` (`reactDomAdapter`, shared with
  `src/native/adapter.ts` over the runtime-styles registry). All JSX-free. The adapter applies
  the renderer hook's decorators.
- **Globals:** `renderer` (Solid, React, React Native), `scheme` (System by default, Light,
  Dark) and `theme` (default, teal, squircle, sharp, compact). System sets nothing, so the web's
  `prefers-color-scheme` CSS and React Native's `useColorScheme()` follow the OS live; Light and
  Dark set the page's `.light`/`.dark` class (the shared hook's decorator) or React Native's
  `scheme` prop. Named themes go to the provider's `theme`.
- **System UI:** `.storybook/manager.ts` follows `prefers-color-scheme` and switches live; docs
  pages read it at load (`parameters.docs.theme`). The canvas (`.sb-show-main`, `.docs-story`)
  paints `--colors-canvas`, the theme's surface; the backgrounds addon is off.
- **Hooks:** `src/renderers/hooks.ts` (types, `extendWith`, `rendererArgs`),
  `src/renderers/compose.ts` (`composeStories`), shared `src/hooks.ts` (scheme decorator,
  `args`, `transformSource` adding the generated-file header), component hooks
  `src/components/{button,switch,text-field}.ts` (play tests; Button's `onClick: fn()`).
- **Codegen:** `stories.config.ts` + `scripts/generate-stories.ts` → `src/stories/generated/`
  (ignored). Omni task `generate:stories` before `dev`, `build` and `test:e2e`. The spike's
  hand-written Button story is gone; a hand-written story with the same title replaces a
  generated one.
- **Components:** Button (5 variant stories + Default), Switch, TextField (filled, outlined).
  One `play` per component on `Default`, run in every renderer.
- **Tests:** `vitest.config.storybook.ts`, `@storybook/addon-vitest` in browser mode, one
  project per renderer through the plugin's `initialGlobals`; `@storybook/addon-a11y` with
  `parameters.a11y.test: "error"`. Omni `test:e2e` runs it.
- **README:** `apps/storybook-web/README.md` (adding a component, hook, renderer).

## Decisions

- **Two kinds of decorators.** Shared and component hooks give Storybook decorators (around the
  canvas); renderer hooks give the renderer's own wrappers, which the adapter applies. The
  provider is a renderer decorator, so it moved out of the adapters into the bindings.
- **Renderer args sit between shared and component args** as the plan's order says: an object
  replaces a shared default the controls haven't changed, never a component's; a function maps
  the story's args to the renderer's props (React Native's `onPress`).
- **`extendStory(name, story)`** takes `{ component, story }`; every level's runs, in order
  (shared, each renderer's, component's). A renderer's `extendStory` changes the shared story,
  so it only suits renderer-neutral edits.
- **Generated story exports are object literals** (`{ ...stories.story("Default") }`):
  Storybook's indexer reads a call expression as a CSF factory and refuses it.
- **The codegen loads modules with Vite's `runnerImport`**, so `stories.config.ts` and the hook
  modules import without `.ts` extensions and type-check with the app.
- **Component availability** is read from the binding's `package.json` exports (`./<kebab>`).
- **`COMPONENTS`** gains `switchControl`, `textField`, `supportingText`.
- `scripts/spike-check.mjs` replaced by `scripts/screenshots.mjs`.

## Problems

- Importing `storybook/theming` in the preview made Vite optimize it mid-run and reload the
  Vitest page ("Vitest failed to find the current suite"); `optimizeDeps.include` in
  `vitest.config.storybook.ts` fixes it.
- `CSF: expected non-factory story` for `export const X = fn()` (fixed as above).
- `require.resolve("<pkg>/package.json")` fails: bindings don't export `./package.json`; the
  script reads it from `node_modules` directly.
- tsc reads bindings through their `types` export (`dist/*.d.ts`), so the type check needs the
  bindings built.

## Checks run

- `omni run build -p @pureform/solid -p @pureform/react -p @pureform/react-native`
- `omni run build -p @pureform/storybook-web`, `omni run test:e2e -p @pureform/storybook-web`
  (30 tests: 10 stories × 3 renderers, play + a11y)
- `bunx tsc --noEmit -p tsconfig.json` and `-p src/solid/tsconfig.json` in the app; the
  bindings' storybook modules are checked by their builds (declarations).
- A throwaway story confirmed a11y violations fail a test, and that the `native` project
  renders with `renderer: native`.
- `scripts/system-scheme.mjs` against the static build: for each renderer, the OS scheme
  flipped with `emulateMedia` changes the button and the canvas without a reload, the manager's
  sidebar too; Light holds under a dark OS, Dark under a light one, and System follows again
  (`/tmp/opencode/sb-web-system-<renderer>-{light,dark}.png`).
- `scripts/screenshots.mjs` against `storybook build` served statically: every component in
  every renderer, light, dark and teal, no page or console errors
  (`/tmp/opencode/sb-web-<component>-<renderer>[-dark|-teal].png`).

## Open questions

- **Switch's handle icon differs:** React Native shows a check mark when on by default; Solid
  and React show an icon only when given. A binding difference, not a storybook one.
- **The a11y panel shows a count for React Native** (Button 1, Switch 2) while the tests pass
  with `test: "error"`: likely "incomplete" results, not violations. Worth a look.
- **Theme toolbar:** the named-theme list is hand-written in `preview.ts`; it could come from
  `pureform.config.ts`'s `themes`.
- **Canvas under a named theme:** the canvas paints the base theme's surface, since the named
  theme's vars are scoped to the provider's element (`display: contents`), which can't paint.
- **Docs theme** follows the system at load only; there are no docs pages yet (no autodocs).
- Web components animate between schemes, so a color read right after a change can be mid
  transition; the check waits for colors to settle.
- **Component list from `@pureform/anatomy`** (the plan's idea) isn't done; `COMPONENTS` and
  `stories.config.ts` both list them.
- **No root README** exists to link from (plan step 7); the app's README stands alone.
- `test:e2e` is enabled, so the whole run (`omni run build test`) now includes these 30 tests
  (about 15 s per renderer).
- `prune: false` and runtime styles for every listed component keep the bundle large (the
  stories chunk was ~1.4 MB in the spike).
