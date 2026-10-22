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
- **Pinned schemes:** story-level `globals.scheme` overrides and locks the toolbar.
  `stories.config.ts` takes `schemes` (generated `Light`/`Dark` stories) and `scheme` (the meta's
  `globals`); `StoryName.scheme` tells hooks a story is pinned, and `isBaseStory` runs the play
  tests on `Default`, `Light` and `Dark`. Button, Switch and TextField each have both: 48 tests
  (16 stories × 3 renderers), the a11y checks in both schemes.
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
- **Components:** Button, Switch, TextField. (Superseded below: stories and plays now come
  from the anatomy and the component cases.)
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
  (now 48 tests: 16 stories × 3 renderers, play + a11y). A throwaway pinned story confirmed
  Vitest applies story globals (the page's `.dark` class was set); in the built Storybook, the
  pinned `Switch/Dark` renders dark under a light OS in every renderer with the Scheme item
  disabled (`/tmp/opencode/sb-web-pinned-dark-<renderer>.png`).
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

## Data sources (anatomy and component cases)

- **Anatomy variants:** `deriveAnatomy` adds `variants` (each recipe variant's values, in order,
  plain data) to every generated anatomy; `generated.ts` was regenerated with the `generate`
  task, not edited. The type field is optional because the hand-written composites
  (`composites.ts`) have none. The drift spec (`anatomy.spec.ts`, `toEqual(deriveAnatomy(spec))`)
  covers it; `derive.spec.ts` has a case for it. 218 unit tests pass.
- **`@pureform/component-cases`** (`packages/component-cases`): the cases moved from
  `tests/component-suites/src/components/` with `git mv` (`cases/<name>.ts`, `cases.ts` for the
  list, `types.ts`), plus `scene.ts` (`COMPONENT_NAMES`, `SceneProps`, moved out of the suites'
  `harness/scene.ts`, which re-exports them), `animations.ts` (`animationsDone`, re-exported by
  the suites' harness) and `user-event.ts`. `MutableInteractionSource` now comes from
  `@pureform/binding-core/interaction` instead of `@pureform/solid`.
    - **Scaffolded with the repo's generator:** `omni generator run -n ts-package` (the
      `omni/generators/ts-package` templates: lib, no unit/integration tests, release group
      `none`, not published), then trimmed: dropped the template's `src/add.ts` and its
      `@omni-oss/log`/`zod` dependencies, `@pureform/*` devDependencies as `workspace:^` (as in
      `packages/anatomy`), the vitest config deps (no tests of its own; it's tested through the
      suites and Storybook), and added `@pureform/anatomy` and `@pureform/binding-core`. Kept
      the generated `vite.config.ts` (library build), `tsconfig*.json`, `.npmignore` and
      `project.omni.yaml` (`ts-vite-lib` preset, publish off); README in anatomy's layout.
    - **userEvent as a parameter:** `createCases(userEvent)` returns the cases and sets the
      `userEvent` every action calls through (`user-event.ts`). It's one module-level slot, so
      two runners in one realm would share it; each runtime here has one (Vitest's in the
      suites, `storybook/test`'s in Storybook). The cases' `UserEvent` is a three-method
      interface (`click`, `keyboard`, `type`) both fit.
    - `tests/component-suites/src/components.ts` calls `createCases(userEvent)` from
      `vitest/browser` and re-exports the package. Checked narrowed: `controllable`,
      `keyboard`, `forms`, `accessibility` on `solid/panda` and `react/panda` with
      `-t "Button|Switch|TextField"` (562 passed), and `overlays`, `tabs-motion`, `direction`,
      `themes`, `indication`, `server-rendering` on `solid/css` with
      `-t "Menu|Toast|Tabs|Switch|Slider"` (339 passed). `component-recipe.md`'s suites step
      points at the package; older phase contexts keep their paths.
- **Codegen:** the component list is the anatomies that have a case (paired by the root part's
  test id); `stories.config.ts` keeps renderers, `include` (Button, Switch, TextField), `skip`,
  and per component `args`, `argTypes`, `controls.exclude`, `schemes`, `scheme`, `hooks` and
  `stories` (fields by export name). Stories: `Default` (the case's `props`), `Light`/`Dark`
  (pinned, with the state play, its state starting at `from` through `default<Prop>`), one per
  example (named as the case names it), one per key (`Key: Enter`, its play). A key that clicks
  checks an `onClick: fn()` spy the meta adds (React Native's hook maps it to `onPress`) and
  doesn't make the state uncontrolled, so a button stays a plain button. The component hooks
  (`src/components/*.ts`) are gone: the play tests come from the cases.
- **Tests now:** 54 stories × 3 renderers = 162, all passing (`vitest.config.storybook.ts`).

### Problems and decisions

- **React Native runs the stories without the case plays** (`casePlays: false` in
  `stories.config.ts`). The cases read the web bindings' DOM: the button's `aria-pressed`, the
  switch's native `<input>` (`pf-switch-control-input`), the field container's
  `data-pf-filled`; React Native Web draws none of these, so 11 plays failed there. Its a11y
  checks still run.
- **React Native Web's disabled text field** renders as `readonly`, so axe applies the contrast
  rule a disabled field is exempt from (2.25:1). `TextField/Disabled` has
  `parameters.a11y.test: "todo"` (set through `stories` in the config), for every renderer, since
  parameters can't vary by renderer.
- Recipe variants include ones the binding derives (`toggle`, `position`, `density` on the
  button; the field's `leadingIcon`/`prefixText`/…; the switch's `icons`), which aren't props;
  `controls.exclude` drops them per component. The anatomy can't tell them apart yet.
- The case types needed `Promise<unknown>` returns for Testing Library's `keyboard` (it returns
  its state); the package's own `userEvent` wraps calls to return `Promise<void>`.

### Open questions (data sources)

- Should the cases get renderer-neutral readers (ARIA only: `role=switch` + `aria-checked`, the
  input's value) so the plays run in React Native too, or should React Native get its own
  readers?
- Should the anatomy mark derived variants (not props), so `controls.exclude` isn't needed?
- React Native's disabled text field: a binding fix (`disabled` instead of `readOnly` on web)?
