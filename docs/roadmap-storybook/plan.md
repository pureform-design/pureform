# storybook-web: plan

One Storybook app, `apps/storybook-web` (omni name `@pureform/storybook-web`), built with Vite.
It shows the same component from every renderer (Solid, React, React Native through React Native
Web), with a toolbar toggle to switch between them. Svelte and Vue join later without changing
the app's structure.

## Goals

- **First slice:** three components (proposed: Button, Switch, TextField) in three renderers
  (Solid, React, React Native web), all in one Storybook instance with one sidebar entry per
  component.
- **Codegen:** the story files are generated from a list of components and renderers, so adding
  a renderer means adding an adapter, not editing every story.
- **Hooks:** the codegen accepts code from two places:
    - a **per-renderer** hook in that renderer's binding package (`@pureform/solid/storybook`:
      its provider, decorators or extra args);
    - a **shared** hook in `apps/storybook-web` that applies to every renderer.

## Architecture

### One framework-neutral host

Storybook allows one framework per instance. Instead of making React the host and mounting the
others inside it, the host is **`@storybook/html-vite`**: a story returns a DOM element, and each
renderer mounts into it through a small adapter. React isn't special, so Svelte and Vue are added
the same way as Solid.

```ts
// src/renderers/types.ts
export interface RendererAdapter<C = unknown> {
    name: "solid" | "react" | "native" | (string & {});
    title: string; // toolbar label
    mount(
        el: HTMLElement,
        component: C,
        args: Record<string, unknown>,
    ): MountHandle;
}
export interface MountHandle {
    update(args: Record<string, unknown>): void; // controls change, no remount
    unmount(): void;
}
```

- **Solid:** `render()` from `solid-js/web` with props in a store, `reconcile` on update.
- **React and React Native:** `createRoot()`; update re-renders with new props.
- **Later:** Svelte's `mount`/`unmount`, Vue's `createApp`.

A `renderer` global in `.storybook/preview.ts` gives the toolbar toggle, and a shared
`multiRender(impls)` picks the adapter, mounts, and unmounts on story change. Stories, args,
controls and `play` functions are shared, so one interaction test runs against every renderer.

### Vite: keeping the compilers apart

Copied from the demos where possible:

| From               | What                                                                                                                                                                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/solid-demo`  | `@solidjs/vite-plugin`, `pandacss()`, `pureform(codegen)`, `pureform.config.ts`, `panda.config.ts`, `panda.pureform.ts`, the `ssr.noExternal`/`tsconfigPaths` settings that apply (no SSR, router, server functions, diagnostics or file routes) |
| `apps/react-demo`  | `@vitejs/plugin-react`, `createConfig` from `@pureform/vite-config/app`                                                                                                                                                                          |
| `apps/rn-web-demo` | the `react-native` → `react-native-web` alias, `WEB_EXTENSIONS`, the `pureformRn()` virtual module, `shimMissingExports`, `global`/`__DEV__` defines                                                                                             |

The configuration lives in `.storybook/main.ts` `viteFinal` (or `.storybook/vite.config.ts`
through `viteConfigPath`) so it isn't mixed with an app config.

JSX is the hard part: Solid's and React's plugins both claim `.tsx`.

- Stories are plain `.ts` (no JSX), generated.
- Renderer-specific code lives in separate folders: `src/solid/**` compiled by the Solid plugin
  (`include`), `src/react/**` and `src/native/**` by the React plugin (`exclude` the Solid
  folder). Each folder has its own `tsconfig.json` with its `jsxImportSource`.
- **Solid's `include` (and React's `exclude`) names every package that ships Solid JSX:**
  `@pureform/solid`, including its `storybook` export, by its workspace path
  (`/packages/solid/`) and by its `node_modules` path (`/node_modules/@pureform/solid/`).
- **Adapters and everything the generated stories import are JSX-free** (Solid through
  `createComponent`, React through `createElement`), or a TypeScript project reference: the
  root type check uses React's JSX, and a per-folder `tsconfig.json` doesn't stop it from
  reading Solid's JSX it imports. Hooks with JSX are type-checked by their own package.
- `.storybook/main.ts` runs under Node's TypeScript loading: relative imports need `.ts`.

The spike (step 1, [spike.md](spike.md)) showed both plugins coexist in one build, so there's
no composition fallback.

### Styling

- Solid and React use the Panda target, like solid-demo and react-demo, with one shared
  `pureform.config.ts`.
- React Native web uses `rn-adapter`'s runtime styles from a virtual module
  (`virtual:pureform-rn`, rn-web-demo's `pureformRn()`), not a second generated registry: the
  bundler plugin writes one `.pureform/`, the Panda one. The component list
  (`pureform.codegen.ts`'s `COMPONENTS`) serves both.
- **The scheme follows the system by default.** A `scheme` global (System, the default; Light;
  Dark) and a `theme` global (Default and the named themes), mapped to each renderer's provider:
    - **System forces nothing.** The web targets (Panda, css, tailwind) already write dark under
      `@media (prefers-color-scheme: dark)`, which `.light`/`.dark` on the root only override,
      so no class is set; React Native's provider defaults `scheme` to `useColorScheme()`, which
      React Native Web reads from `prefers-color-scheme`, so no `scheme` prop is passed.
    - **Light/Dark** set the root's class (web) or the provider's `scheme` (React Native);
      switching back to System removes them.
    - Changing the OS scheme updates every renderer live, without a reload (checked with
      Playwright's `emulateMedia({ colorScheme })` for all three).
    - Named themes go to the provider's `theme` in every renderer.
    - **A story can pin its scheme** with Storybook's story-level globals
      (`globals: { scheme: "dark" }`, on a story or a component's meta), which overrides the
      toolbar for that story and locks its item. No pin: the toolbar decides (System by
      default). `stories.config.ts` asks for pinned copies per component
      (`schemes: ["light", "dark"]` → `Light` and `Dark` stories next to `Default`) or pins the
      whole component (`scheme`); a hook's `extendStory` can set `globals` too. The shared
      `play` tests and the a11y checks run on the pinned stories, so contrast is checked in both
      schemes.
- **Storybook's own UI follows the system:** `.storybook/manager.ts` picks `themes.dark` or
  `themes.light` from `matchMedia("(prefers-color-scheme: dark)")` and switches live on a
  change; docs pages read it once when they load.
- **The canvas is the theme's surface** (`canvas`, in the current scheme), not Storybook's white.

## Codegen

`scripts/generate-stories.ts`, run by an omni `generate` task (before `build` and `dev`, as in
the demos):

1. **Inputs:** the data the components already have, so nothing is listed by hand:
    - **`@pureform/anatomy`** gives the component list and each component's variants with their
      values (`variants`, plain data generated next to the parts from the recipe's variants;
      `generated.ts` is regenerated, never edited, and the drift spec covers it). The controls
      (`argTypes`, a select or a boolean per variant) come from it, so no preset runs in the
      browser. `bindingVariants` (from the preset spec's field of the same name) marks the
      variants the binding sets itself (a button's `toggle`/`position`/`density`), which get no
      control. Composite anatomies (the radio group's) pair too, without controls.
    - **`@pureform/component-cases`** (the framework-neutral cases moved out of
      `tests/component-suites`, which now imports them) gives each component's stories and play
      tests: `props` is `Default`'s args, each of `examples` and `opened` is a story, `state` gives a play
      (read gives `from`, one `act`, read gives `to`), and each `keyboard` key a story with its
      play. Cases take `userEvent` as a parameter (`createCases(userEvent)`), so Storybook passes
      `storybook/test`'s and the suites Vitest's. A component is drawn when an anatomy and a case
      share its root test id.
    - **`stories.config.ts` holds overrides only:** the renderers, `skip` (with reasons),
      `schemes` and `overlayHeight` for every component, and per component extra
      `args`/`argTypes`/`parameters`, `schemes`, `height`, hooks, and story fields by export
      name. A renderer whose DOM the cases can't read sets `casePlays: false`, and `tests: false`
      leaves it out of the story tests (React Native Web, for now: **skipped until the cases get
      renderer-neutral readers**).
    - **Overlays** get room rather than hand-written stories: their `opened` renderings are
      stories, and a component whose case has `overlay` or `opened` gets a canvas at least
      `overlayHeight` (480px) tall from the shared hook.
2. **Output:** `src/stories/generated/<Component>.stories.ts` (ignored by git), one per
   component, importing each renderer's implementation and calling `multiRender`. A renderer
   without that component shows "not implemented" in the canvas.
3. **Hand-written stories** live in `src/stories/*.stories.ts` and are never overwritten. A
   generated file is skipped when a hand-written one with the same title exists.

### Hooks

A hook module exports any of:

```ts
export const decorators = [...]; // wrap every story (providers, theme)
export const args = { ... }; // default args merged into every story
export function extendStory(name, story) { ... } // per component: add stories, play tests
export function transformSource(name, source) { ... } // codegen-time: edit the generated file
```

Resolution order, later wins:

1. the **shared** hook in `apps/storybook-web/src/hooks.ts`;
2. the **per-renderer** hook, the binding package's `storybook` export;
3. a **per-component** override in `stories.config.ts` (its `hooks` modules and `args`).

The play tests come from the cases, not from hooks; a hook's `extendStory` can still add or
replace one.

Runtime hooks (`decorators`, `args`, `extendStory`) are imported by the generated files;
codegen hooks (`transformSource`) run in the script.

## Steps

1. **Spike (done, [spike.md](spike.md)):** one `html-vite` host for every renderer; no
   composition.
2. **App skeleton:** `apps/storybook-web` with `package.json`, `project.omni.yaml` (extending
   `ts-vite-app`), `.storybook/main.ts` and `preview.ts`, Panda and pureform config copied from
   solid-demo.
3. **Adapters:** Solid, React, React Native web, with the `renderer` and `theme` globals.
4. **Codegen and hooks:** the script, `stories.config.ts`, the three hook levels, an omni
   `generate` task.
5. **The three components**, with one shared `play` test each.
6. **Tests:** `@storybook/addon-vitest` running the stories in Vitest browser mode, one project
   per renderer; `@storybook/addon-a11y`. Targeted checks as in the roadmap conventions.
7. **Docs:** README (adding a renderer, adding a hook), link from the root README.

## Decisions

- **Components:** every one with an anatomy and a case (round 2; the first slice was Button,
  Switch and TextField). Toast and GridList are skipped: their cases need a scene (a toaster,
  tiles as children) that props can't give.
- **React Native:** skipped for now in the story tests and plays; needs renderer-neutral
  readers.
- **Host:** `@storybook/html-vite`, renderer-neutral; each renderer mounts through its adapter.
- **Per-renderer hooks** live in the binding packages, as a `storybook` export
  (`@pureform/solid/storybook`, `@pureform/react/storybook`, `@pureform/react-native/storybook`).
  `stories.config.ts` names the export, not a path.
- **Generated stories** are ignored by git (`src/stories/generated/`), written by the `generate`
  task.
- **The demos stay** beside storybook-web for now; they're removed later.
- **On-device React Native Storybook:** decided by how easy it is. Step 8 below is a spike that
  reports the cost; it isn't built unless it's cheap.

## Later

8. **Spike, on-device React Native:** can `@storybook/react-native` read the same stories and the
   React Native hook (`@pureform/react-native/storybook`) without the web adapters? Report the
   setup cost (Metro config, the app to host it, story format differences).
