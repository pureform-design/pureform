# @pureform/component-suites

Shared browser suites that check the rules every component follows, against the Solid and React
bindings at once, on each web target (Panda, plain CSS, Tailwind): controlled and uncontrolled
state, native forms, accessibility and the keyboard, direction, named and runtime themes, and
server rendering. They're the design doc's §5.6, §5.7, §5.9, §9.4, §9.5, and §9.7 as tests. Private;
nothing depends on it.

It depends on `@pureform/solid`, `@pureform/react`, and a style registry and stylesheet per
target, all from the demo's config (`apps/solid-demo/pureform.config.ts`), so every component
renders with its real classes and layout:

- **Panda:** the demo's own glue and Panda stylesheet (`apps/solid-demo/.pureform`,
  `apps/solid-demo/src/App.css`), written by the demo's omni `generate` and `prepare` tasks.
- **CSS and Tailwind:** `.pureform/css` and `.pureform/tailwind` in this folder (ignored by git),
  which `vitest.config.e2e.ts` writes with `@pureform/generate` before the projects start
  (`src/targets/glue.ts`), with every component of the config.

Each binding's own specs (`packages/<binding>/src`) test the binding's details; these suites test
what both must agree on, on every target.

## How it fits together

```
src/*.e2e.test.ts            one suite per rule, written once, framework-free
      │  imports
      ├── src/components/    one case per component: props, examples, state, form, keyboard
      ├── src/harness/       Scene, Harness, page helpers, the server-render client
      └── #binding ────────► src/bindings/solid/harness.tsx   (projects "solid/<target>")
                             src/bindings/react/harness.tsx   (projects "react/<target>")
                                     │ both render
                             src/bindings/<binding>/scene.tsx  ◄── server.tsx (in Node)
                                     │ PureformProvider registry={…}
                             #registry ──► src/targets/<target>/registry.ts
                             setup     ──► src/targets/<target>/setup.ts (the stylesheet)
```

- **Six Vitest projects, one set of files.** `vitest.config.e2e.ts` defines a project per binding
  and target, named `<binding>/<target>`: `solid/panda`, `solid/css`, `solid/tailwind`,
  `react/panda`, `react/css`, `react/tailwind`. Solid's projects compile with Solid's plugin
  (hydratable output), React's with React's. Each aliases `#binding` to its binding's harness and
  `#registry` to its target's registry, loads its target's stylesheet as a setup file, and adds
  the target's styling plugin (Panda's over the demo's config, Tailwind's, or none for plain CSS).
  So every suite file runs six times.
- **Targets** (`src/targets/`): `targets.ts` lists them; `glue.ts` writes the CSS and Tailwind
  glue (options `{ prefix: "pf", classPrefix: "pf" }`); each `<target>/registry.ts` re-exports a
  registry and each `<target>/setup.ts` imports the stylesheet as an app would (the CSS adapter's
  reset and `styles.css`; Tailwind's `styles.css`, which imports `tailwindcss` and then the
  generated stylesheet).
- **A scene** (`src/harness/scene.ts`) is what a suite asks for: a component's name, its props,
  and the provider's `dir`, `motion`, `theme`, `seed` (a runtime theme), `hydrate`, and
  `overrides`. Each binding's `scene.tsx` renders it inside `PureformProvider` with the target's
  registry (`#registry`). `src/harness/themes.ts` turns a `seed` into Material's `seedTheme`
  through a source that counts its generations (`generated.count`), the same scope as
  `seedTheme`'s, so a suite can tell that hydrating generated nothing.
- **The harness** (`src/harness/harness.ts`) mounts a scene into a host (anywhere in the page:
  inside a form, a fieldset, a legend), sets props from outside as an owner would
  (`update`), hydrates server HTML, and `settle`s (waits for the machines and the framework).
  React runs unwrapped by `act`, scheduling as in an app.
- **Server rendering** goes through a browser command, `renderOnServer` (`src/commands.ts`): Node
  starts a Vite server in SSR mode with the binding's plugin, loads
  `src/bindings/<binding>/server.tsx`, and returns the HTML and the head: Solid's `useHead` tags
  (from `renderToString`'s `onHead`) and hydration bootstrap, or React's hoisted `<style
precedence>` blocks (split off the front of its markup). Each awaits `preloadTheme` for a
  runtime theme first, as an app's request handler would. The test puts the head in the page
  (`applyHead`: scripts run, a theme block replaces an earlier one for the same scope) and the
  HTML in a host, then hydrates it. There's one server per binding and target (the
  project's name says which), aliasing `#registry` as the project does, each with its own
  dependency cache.

## Suites

| File                           | What it checks                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `controllable.e2e.test.ts`     | §9.4: uncontrolled state changes on its own; controlled state asks and moves only with the prop (or when the owner takes the change); one callback per user action, none for a prop change; the default is read once; switching warns once.                                                                                                                                                                                                                                                                                                                                                                 |
| `forms.e2e.test.ts`            | §9.5: `FormData` entries (also through `form="id"` from outside the form); reset to the default, controlled and uncontrolled, with `reason: "reset"`; disabled fieldsets (nested, the first legend's exemption, toggled); `required`, `invalid`, `error`.                                                                                                                                                                                                                                                                                                                                                   |
| `accessibility.e2e.test.ts`    | axe over every example, both directions, with the real styles (so contrast counts).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `keyboard.e2e.test.ts`         | Tab reaches the component and skips it disabled; each key clicks it, changes its state, or does nothing; arrow keys in `ltr` and `rtl`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `direction.e2e.test.ts`        | §5.9: every part the machine marks gets the provider's `dir`, and each part's box in `rtl` mirrors its `ltr` box across the root (the mirrored-box helpers from `tests/browser-e2e-tests/src/mirror.ts`).                                                                                                                                                                                                                                                                                                                                                                                                   |
| `themes.e2e.test.ts`           | §5.6: the registry's `themeAttributes(name)` is the target's attribute; a provider's `theme` writes it on its element; the component draws exactly as under that attribute set by hand, for each of the demo's themes; teal draws differently from the base theme; a runtime theme from teal's seed draws teal's colors in both schemes.                                                                                                                                                                                                                                                                    |
| `server-rendering.e2e.test.ts` | §5.7: every example rendered in Node and hydrated, in both color schemes: no warning, no element replaced, no attribute changed; default and controlled state render on the server; the hydrated component responds; hydrated inside a disabled fieldset (and its first legend) it follows the browser's rule; a named theme's attribute renders on the server; a runtime theme renders its scope and block on the server, hydrates in both schemes keeping the server's block and generating nothing (`"reuse"`), and regenerates the same block (`"regenerate"`); overrides render and hydrate unchanged. |

## Adding a component

1. Add its name to `COMPONENT_NAMES` in `src/harness/scene.ts`.
2. Import it into each binding's `components` map: `src/bindings/solid/scene.tsx` and
   `src/bindings/react/scene.tsx`.
3. Write `src/components/<name>.ts`, a `ComponentCase` (`src/components/types.ts`):
    - `props`: what every scene gets (an accessible name), and `root`, the root's test id;
    - `examples`: plain-data props covering its variants and states (axe, direction, and server
      rendering run each);
    - `state` (if a user changes it): the prop, two values, the action between them, and how to
      read the state from the page;
    - `form` (if it's a form control): the native control, how the machine shows disabled, what it
      submits, and whether it resets, takes `required`, `invalid`, `error`;
    - `keyboard`: the focusable element (read again after each key, so it can follow focus: a
      radio group's checked radio), what each key does (a `change` can name the state it moves
      to with `to`), and `arrows` by direction if arrow keys do anything;
    - `unmirrored`: parts that don't point (a check mark), which must draw the same both ways.
4. Add the case to `COMPONENTS` in `src/components/index.ts`.

Every target's registry must have the component: each is generated with every component of the
demo's config (`apps/solid-demo/pureform.config.ts`), so a component the config has is already
in all three, and every suite runs it on Panda, CSS, and Tailwind with no target-specific step.
A part of the case left out skips the cases that need it.

## Running

Through the omni MCP (or `omni run`): `test:e2e`, which first runs the demo's `prepare` (Panda
codegen) and builds the adapters the CSS and Tailwind glue is generated with. `.env.local` at the
repo root sets `CHROMIUM_PATH`. One file, one binding, one target (`--project` takes globs:
`'solid/*'`, `'*/tailwind'`):

```sh
cd tests/component-suites
set -a; source ../../.env.local; set +a
bun x vitest --config vitest.config.e2e.ts run src/forms --project react/css
```

Type-check with `bun x tsc --noEmit -p tsconfig.json` (the React files carry a
`@jsxImportSource react` pragma; the rest is Solid's JSX).

## Worth knowing

- **Stubs:** `error` has no component yet (the text inputs bring it in p6b); an `it.todo`.
- **Targets differ only in their stylesheet and registry.** No suite branches on the target; a
  case that needs to know reads the registry (`#registry`), as the themes suite reads
  `registry.themeAttributes`.
- Elements are measured one at a time in the same place when two renders are compared (the
  themes suite): the pointer may rest on the first element on the page, whose hover state layer
  then changes its background. The runtime theme case mounts its scenes in a host with
  `pointer-events: none`, since its scenes stay on the page longer (the generator loads).
- Solid's plugin compiles tests non-hydratable; the `solid` project asks for hydratable output
  (`solid: { hydratable: true }`), as an app's client build is.
- Solid's server render returns a bootstrap that clears the previous render's `_$HY`, since every
  test hydrates in the same page.
- React's `settle` waits a frame and two tasks: React syncs the native input in a passive effect,
  which can land after a single timeout.
- The browser context emulates reduced motion, so boxes are measured at rest.
- The direction suite skips parts with no box (`display: none`): an icon button's outline unless
  it's outlined.
- **Components so far:** button, checkbox, chip, FAB, icon button, radio group (its `root` is the
  unstyled group element, `compositeTestIds.radioGroup.root`; its radios repeat the radio's test
  ids, so cases find them by value), and switch.
