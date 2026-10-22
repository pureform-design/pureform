# @pureform/storybook-web

pureform's components in one Storybook, from every renderer: Solid, React, and React Native
(through React Native Web). The toolbar's **Renderer** switches between them on the same story,
**Scheme** picks System (the default), Light or Dark, and **Theme** a named theme from
`pureform.config.ts`. Stories, controls
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
- **Stories are generated** by `scripts/generate-stories.ts` (the omni `generate:stories`
  task, before `dev`, `build` and the tests) into `src/stories/generated/<Component>.stories.ts`
  (ignored by git), from data the components already have:
    - **`@pureform/anatomy`**: the component list, and each variant's values, which become the
      controls (a select, or a boolean for `true`/`false`).
    - **`@pureform/component-cases`**: `props` gives `Default`, each of `examples` a story, the
      `state` a play test (read gives `from`, one `act`, read gives `to`) on the pinned `Light`
      and `Dark` copies, and each `keyboard` key a `Key: …` story with its play. The cases act
      through `storybook/test`'s `userEvent` (`createCases(userEvent)`, `src/renderers/plays.ts`).
    - **`stories.config.ts`**, overrides only: renderers, `include`/`skip`, and per component
      `args`, `argTypes`, `controls.exclude` (variants the binding derives, which aren't props),
      `schemes`, `scheme`, `hooks`, and `stories` (fields by export name).

    A hand-written `src/stories/*.stories.ts` with the same `title` replaces the generated file;
    the script never writes outside `generated/`.

- **Tests:** `@storybook/addon-vitest` runs every story in Chromium (Vitest browser mode), one
  project per renderer (`storybook/solid`, `storybook/react`, `storybook/native`, set by the
  `renderer` global). `@storybook/addon-a11y` checks each story; a violation fails it.

## Scheme and theme

- **System** (the default) forces nothing, so every renderer follows the OS, live: the web's CSS
  writes dark under `prefers-color-scheme: dark` when the root has neither `.light` nor `.dark`,
  and React Native's provider, given no `scheme`, follows `useColorScheme()` (React Native Web
  reads the same media query). **Light** and **Dark** set the root's class (the shared hook,
  `src/hooks.ts`) or React Native's `scheme` prop (its binding hook); System removes them.
- **Pinning a scheme:** a story or a component's meta can set Storybook's story-level
  `globals: { scheme: "light" | "dark" }`, which overrides the toolbar for that story (Storybook
  locks the Scheme item while it's pinned). Without a pin, the toolbar decides. In
  `stories.config.ts`, `schemes: ["light", "dark"]` generates `Light` and `Dark` stories next to
  `Default`, and `scheme: "dark"` pins every story of the component; a hook's `extendStory` can
  set `globals` as well. The pinned copies carry the case's state play, and the a11y checks run
  on them, so contrast is checked in both schemes. (`isBaseStory` tells a hook a story is
  `Default` or a pinned copy.)
- **Theme** goes to each provider's `theme` prop.
- The canvas paints the theme's surface (`src/index.css`), in the current scheme.
- Storybook's UI follows the system too: `.storybook/manager.ts` switches the manager live when
  the OS changes; docs pages (`parameters.docs.theme` in `preview.ts`) pick it when they load.
- `scripts/system-scheme.mjs <url>` checks all of this in every renderer with Playwright's
  `emulateMedia({ colorScheme })`.

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
   `stories.config.ts` (for example `src/components/<component>.ts`; none in this slice).

A renderer's object `args` replace a shared default the controls haven't changed, never a
component's.

## Adding a component

1. Give it an anatomy (the preset's component, `@pureform/anatomy`'s `generate`) and a case in
   `@pureform/component-cases` (`packages/component-cases/src/cases/<name>.ts`); the generator
   pairs them by the root's test id.
2. Add it to `include` in `stories.config.ts` (or drop `include` to draw every component with
   both), and its anatomy name (and any sub-component's, such as `supportingText`) to
   `COMPONENTS` in `pureform.codegen.ts`.
3. Override what the data gets wrong in its `components` entry: `controls.exclude` for
   variants that aren't props, `args`, `schemes: ["light", "dark"]` for pinned copies.
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
3. Add it to `stories.config.ts`'s `renderers` (`package`, `adapter`, `export`, `hooks`, and
   `casePlays: false` if the cases can't read its DOM), to
   the `renderer` toolbar items in `.storybook/preview.ts`, and to `RENDERERS` in
   `vitest.config.storybook.ts`.
4. Its compiler in `.storybook/main.ts`: Svelte's and Vue's plugins claim their own extensions;
   another JSX renderer gets a path list like `SOLID`, excluded from React's plugin.
5. Add the binding to `package.json` and `project.omni.yaml`'s dependencies.

## Scripts

- `scripts/generate-stories.ts`: the codegen above.
- `scripts/screenshots.mjs <url> [dir] [scheme] [theme]`: screenshots each component's
  `Default` in each renderer against a running Storybook, and prints the page's errors.
- `scripts/system-scheme.mjs <url> [dir]`: the System scheme check above; exits 1 on a failure.
