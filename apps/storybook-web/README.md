# @pureform/storybook-web

pureform's components in one Storybook, from every renderer: Solid, React, and React Native
(through React Native Web). The toolbar's **Renderer** switches between them on the same story,
**Scheme** picks System (the default), Light or Dark, **Theme** a named theme from
`pureform.config.ts`, and **Engine** React Native's motion engine (Animated + SVG by default,
Animated, Reanimated, or Reanimated + SVG; the web renderers ignore it). Stories, controls
and `play` tests are shared, so one interaction test runs against every renderer.

```sh
omni run dev -p @pureform/storybook-web     # http://localhost:6006
omni run build -p @pureform/storybook-web   # storybook-static/
omni run test:e2e -p @pureform/storybook-web
# one renderer, some components (by their generated files):
bunx vitest run -c vitest.config.storybook.ts --project storybook/solid \
    src/stories/generated/Button.stories.ts src/stories/generated/Menu.stories.ts
bunx vitest run -c vitest.config.storybook.ts --project storybook/native \
    src/stories/generated/TextField.stories.ts
```

**Every renderer runs the plays.** The cases read state through ARIA only (roles, `aria-checked`,
`aria-pressed`, `aria-selected`, `aria-expanded`, `aria-current`, `aria-valuenow`, accessible
names, a textbox's value), so the same play reads Solid's, React's and React Native Web's DOM.
What a platform can't do is a narrow skip in `stories.config.ts`, with its reason
(`parameters.pureform.skip[renderer][story]`, below).

## How it fits together

- **The host** is `@storybook/html-vite`: a story returns a DOM element, and each renderer
  mounts into it through an adapter (`src/<renderer>/adapter.ts`, a `RendererAdapter` with
  `mount`, and a handle's `update` and `unmount`). `multiRender` (`src/renderers/`) picks the
  toolbar's adapter, updates in place when only args or the theme change, and remounts when the
  renderer does. A renderer without a component shows "isn't implemented" in the canvas.
- **One Vite build** (`.storybook/main.ts`) compiles all of them. Solid's plugin takes
  `src/solid/**` and every package that ships Solid JSX (the `SOLID` list); React's takes the
  rest. `pureform.codegen.ts` declares two targets: Solid and React draw with the Panda
  registry (`web`), React Native with the generated React Native one (`native`), which the
  bundler plugin gives to `src/native/**` by the target's `include`. `COMPONENTS` is every
  anatomy in `@pureform/anatomy`, for both.
- **Stories are generated** by `scripts/generate-stories.ts` (the omni `generate:stories`
  task, before `dev`, `build` and the tests) into `src/stories/generated/<Component>.stories.ts`
  (ignored by git), from data the components already have:
    - **`@pureform/anatomy`**: the component list (the preset's anatomies, then the
      hand-written composites', such as the radio group's), and each variant group's values,
      which a variant prop's control lists.
    - **The components' resolved props** (`scripts/prop-controls.ts`): at generate time the
      TypeScript checker (TypeScript 7's JS API, `typescript/sync`) reads the
      export each story renders, from the binding's built declarations (the `controls`
      renderer, React; Solid's props agree, all 61), with the app's `.pureform/registry.d.ts`,
      and resolves its props type (the call signature's first parameter). Then:
        - only properties **declared in `@pureform/binding-core`** are kept (the declaration's
          file; a mapped type's property, such as `Controllable`'s `selected`, counts its
          mapped type's): DOM, React and Solid attributes, `as` and `children` get none;
        - the **resolved type** picks the control: a string-literal union is a select,
          `boolean` a boolean, `string` text, `number` a number; a union of literals with a
          non-boolean member (`boolean | "indeterminate"`, `12 | 24`) is a select of the
          stringified values, with `mapping` back to the real ones (`true`, `12`); functions,
          nodes, objects, arrays and unions with a non-literal member get none (`control:
          false` when the story has the arg, so Storybook doesn't infer one; left out
          otherwise);
        - a prop typed **`VariantProp<C, "group">`** (directly or through
          `XVariantProps["group"]`) is read before the alias resolves, and takes its group's
          values from the anatomy, in the recipe's order: the text's `textStyle` is its
          `style`, a `true`/`false` group a boolean;
        - a select of **3 options or fewer is a `radio` control** (`argTypeFor`, for variant
          groups too); more stay a select;
        - a **`@control none | select | radio | boolean | text | number | color`** JSDoc tag on the prop in
          binding-core overrides the type (`@control color` is Storybook's color picker, on a CSS color string such as the color picker's `value`; `@control select` keeps a select of few options; `@control none` on ids, form names, submit values
          and every `default*` prop; `Controllable`'s mapped `default*` props take the tag
          from the mapped type's JSDoc).

        Any other arg (a shared hook's `disabled` on a component without one, `aria-label` from
        the binding) gets `control: false`. `scripts/prop-controls.spec.ts` (`omni run test:unit
      -p @pureform/storybook-web`) has a fixture per rule.

    - **`@pureform/component-cases`**: `props` gives `Default`, each of `examples` a story, the
      `state` a play test (read gives `from`, one `act`, read gives `to`) on the pinned `Light`
      and `Dark` copies, each of `opened` an `Opened: …` story (an overlay shown), and each
      `keyboard` key a `Key: …` story with its play. A component with several cases (the card
      and its action area) gets the others' examples too. A component whose case has `overlay`
      or `opened` gets a canvas at least `overlayHeight` tall (`parameters.pureform.height`,
      drawn by the shared hook), so a menu, a sheet or a dialog opens inside it. The cases act
      through `storybook/test`'s `userEvent` (`createCases(userEvent)`, `src/renderers/plays.ts`).
    - **`stories.config.ts`**, overrides only: renderers (`casePlays`, `tests`, `scenes`; both
      default to on), `include`,
      `skip` (by component, with the reason), `schemes` for every component, `overlayHeight`,
      and `controls` (the renderer whose exports give the props), and per component `title`
      (a group, `Plain form/Input`, or a name apart from one differing only in case; the
      generated file takes it, `/` and spaces as `-`), `args`,
      `argTypes`, `controls.exclude` (props to give no control, over the rules above; none
      needed today), `parameters`, `schemes`, `scheme`, `height`,
      `hooks`, and `stories` (fields by export name; `tags` are written into the file, where
      Storybook's indexer reads them, so `tags: ["!test"]` keeps a story out of the tests).

    A renderer's **skips** go in a component's `parameters.pureform.skip`, by renderer and
    story export name (`"*"`: every story): `{ play: reason }` skips that story's play there,
    and `{ a11y: { rule: reason } }` turns those axe rules off there (`RendererSkip` in
    `src/renderers/compose.ts`). Only for what the platform can't do: React Native doesn't
    bubble a press to a composite's root (`NO_BUBBLING`), has no file input, draws a disabled
    field's label as plain text. A renderer without the component (it draws "isn't
    implemented") runs no play.

    A renderer's **`scenes`** (`{ module, components }`) name the components whose case carries
    data, not props of the binding's export (`Toast`'s `toasts`, `GridList`'s `tiles`): the story
    draws the module's export of that name, which builds the toaster or the tiles
    (`src/<renderer>/scenes.ts`, the suites' `ToastScene` and `GridListScene`).

    A hand-written `src/stories/*.stories.ts` with the same `title` replaces the generated file;
    the script never writes outside `generated/`.

- **Tests:** `@storybook/addon-vitest` runs every story in Chromium (Vitest browser mode), one
  project per renderer (`storybook/solid`, `storybook/react`, `storybook/native`, set by the
  `renderer` global), in the component suites' 1280×900 viewport. `@storybook/addon-a11y`
  checks each story; a violation fails it. The cases act through Vitest's `userEvent` there
  (real Playwright input; `.storybook/main.ts` aliases `#user-event` under `VITEST`) and
  through `storybook/test`'s in Storybook, which the Interactions panel records.

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
   Every such component is drawn. Its controls come from its export's props (above); tag a
   binding-core prop `@control none` (or another kind) when its type gives the wrong one.
2. Override what the data gets wrong in its `components` entry (`args`, `controls.exclude`, `parameters`,
   `stories`), or `skip` it with the reason when its case can't be drawn from props alone.
3. Run its story tests: `bunx vitest run -c vitest.config.storybook.ts --project
   storybook/solid src/stories/generated/<Component>.stories.ts` (and `storybook/react`).

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
   `casePlays: false` only while a gap in its ARIA keeps the plays from reading it (better:
   fix the binding, or skip the story narrowly), `tests: false` to keep it out of the story
   tests; the Vitest projects come from this list), and to the `renderer` toolbar items
   in `.storybook/preview.ts`.
4. Its compiler in `.storybook/main.ts`: Svelte's and Vue's plugins claim their own extensions;
   another JSX renderer gets a path list like `SOLID`, excluded from React's plugin.
5. Add the binding to `package.json` and `project.omni.yaml`'s dependencies.

## Scripts

- `scripts/generate-stories.ts`: the codegen above.
- `scripts/screenshots.mjs <url> [dir] [scheme] [theme]`: one overview per renderer
  (`sb-web2-<renderer>.png`) of a sample of stories (Button, Switch, TextField, Slider, Tabs,
  Menu opened) against a running Storybook, and prints the page's errors.
- `scripts/system-scheme.mjs <url> [dir]`: the System scheme check above; exits 1 on a failure.
