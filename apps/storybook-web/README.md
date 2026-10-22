# @pureform/storybook-web

pureform's components in one Storybook, from every renderer: Solid, React, and React Native
(through React Native Web). The toolbar's **Renderer** switches between them on the same story,
and **Theme** picks light, dark, or a named theme from `pureform.config.ts`. Stories, controls
and `play` tests are shared, so one interaction test runs against every renderer.

```sh
omni run dev -p @pureform/storybook-web     # http://localhost:6006
omni run build -p @pureform/storybook-web   # storybook-static/
omni run test:e2e -p @pureform/storybook-web
# one renderer, one component:
bunx vitest run -c vitest.config.storybook.ts --project storybook/native -t Button
```

## How it fits together

- **The host** is `@storybook/html-vite`: a story returns a DOM element, and each renderer
  mounts into it through an adapter (`src/<renderer>/adapter.ts`, a `RendererAdapter` with
  `mount`, and a handle's `update` and `unmount`). `multiRender` (`src/renderers/`) picks the
  toolbar's adapter, updates in place when only args or the theme change, and remounts when the
  renderer does. A renderer without a component shows "isn't implemented" in the canvas.
- **One Vite build** (`.storybook/main.ts`) compiles all of them. Solid's plugin takes
  `src/solid/**` and every package that ships Solid JSX (the `SOLID` list); React's takes the
  rest. Solid and React draw with the Panda registry in `.pureform/`, React Native with
  rn-adapter's runtime styles from `virtual:pureform-rn`. `pureform.codegen.ts`'s
  `COMPONENTS` lists the components (by anatomy name) for both.
- **Stories are generated**: `scripts/generate-stories.ts` (the omni `generate:stories` task,
  before `dev`, `build` and the tests) reads `stories.config.ts` and writes
  `src/stories/generated/<Component>.stories.ts` (ignored by git). A hand-written
  `src/stories/*.stories.ts` with the same `title` replaces the generated file; the script never
  writes outside `generated/`.
- **Tests:** `@storybook/addon-vitest` runs every story in Chromium (Vitest browser mode), one
  project per renderer (`storybook/solid`, `storybook/react`, `storybook/native`, set by the
  `renderer` global). `@storybook/addon-a11y` checks each story; a violation fails it.

Everything the generated stories import is JSX-free (`createComponent`, `createElement`): the
app's type check uses React's JSX and would read Solid's JSX as React's.

## Hooks

A hook module exports any of:

| Export            | When     | What                                                                                                                                               |
| ----------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `decorators`      | run time | Shared and component hooks: Storybook decorators. Renderer hooks: the renderer's own wrappers (`(story, context) => element`), the provider first. |
| `args`            | run time | Default args. A renderer hook's can be a function from the story's args to its props.                                                              |
| `extendStory`     | run time | `(name, story) => story`: add a `play` test, parameters or args to a story (`name` is `{ component, story }`).                                     |
| `transformSource` | codegen  | `(component, source) => source`: edit the generated file before it's written.                                                                      |

They resolve in this order, later wins:

1. **shared**: `src/hooks.ts` (listed in `stories.config.ts`'s `hooks`), for every renderer;
2. **per renderer**: the binding's `storybook` export (`@pureform/solid/storybook`,
   `@pureform/react/storybook`, `@pureform/react-native/storybook`);
3. **per component**: the `hooks` modules and `args` of the component's entry in
   `stories.config.ts` (`src/components/<component>.ts`).

A renderer's object `args` replace a shared default the controls haven't changed, never a
component's.

## Adding a component

1. Add it to `stories.config.ts`'s `components`, by its export name (`TextField` comes from each
   binding's `./text-field` export): its `args`, `variants` (a control and one story each) and
   `argTypes`.
2. Add its anatomy name (and any sub-component's, such as `supportingText`) to `COMPONENTS` in
   `pureform.codegen.ts`.
3. Give it a hook, `src/components/<component>.ts`, whose `extendStory` adds the `play` test to
   `Default`. Query by role and accessible name, so it holds in every renderer.
4. Run `omni run test:e2e -p @pureform/storybook-web`.

For a story the generator can't express, write `src/stories/<Component>.stories.ts` with the
same `title`; it replaces the generated one.

## Adding a hook

- **Shared:** export from `src/hooks.ts`, or add a module to `stories.config.ts`'s `hooks`.
- **Per renderer:** export from the binding's `src/storybook/index.ts`. Keep it JSX-free, and
  keep the binding free of Storybook dependencies (its types are structural).
- **Per component:** add a module to the component's `hooks` in `stories.config.ts`.

## Adding a renderer

1. Write its adapter, `src/<renderer>/adapter.ts`, without JSX: `mount(el, component, args,
context)` renders the component under `context.decorators` (each called with the story and
   `{ registry, theme, globals }`) and returns `update` and `unmount`.
2. Give the binding a `storybook` export (`package.json` export and its build's entry) with
   at least the provider decorator, mapping the theme to its provider's props.
3. Add it to `stories.config.ts`'s `renderers` (`package`, `adapter`, `export`, `hooks`), to
   the `renderer` toolbar items in `.storybook/preview.ts`, and to `RENDERERS` in
   `vitest.config.storybook.ts`.
4. Its compiler in `.storybook/main.ts`: Svelte's and Vue's plugins claim their own extensions;
   another JSX renderer gets a path list like `SOLID`, excluded from React's plugin.
5. Add the binding to `package.json` and `project.omni.yaml`'s dependencies.

## Scripts

- `scripts/generate-stories.ts`: the codegen above.
- `scripts/screenshots.mjs <url> [dir] [theme]`: screenshots each component's `Default` in each
  renderer against a running Storybook, and prints the page's errors.
