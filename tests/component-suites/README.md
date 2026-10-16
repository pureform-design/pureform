# @pureform/component-suites

Shared browser suites that check the rules every component follows, against the Solid and React
bindings at once: controlled and uncontrolled state, native forms, accessibility and the
keyboard, direction, and server rendering. They're the design doc's §5.7, §5.9, §9.4, §9.5, and
§9.7 as tests. Private; nothing depends on it.

It depends on `@pureform/solid`, `@pureform/react`, and the demo's style registry and Panda
stylesheet (`apps/solid-demo/.pureform`, `apps/solid-demo/src/App.css`), so every component
renders with its real classes and layout. Each binding's own specs (`packages/<binding>/src`)
test the binding's details; these suites test what both must agree on.

## How it fits together

```
src/*.e2e.test.ts            one suite per rule, written once, framework-free
      │  imports
      ├── src/components/    one case per component: props, examples, state, form, keyboard
      ├── src/harness/       Scene, Harness, page helpers, the server-render client
      └── #binding ────────► src/bindings/solid/harness.tsx   (Vitest project "solid")
                             src/bindings/react/harness.tsx   (Vitest project "react")
                                     │ both render
                             src/bindings/<binding>/scene.tsx  ◄── server.tsx (in Node)
```

- **Two Vitest projects, one set of files.** `vitest.config.e2e.ts` defines a `solid` project
  (Solid's plugin, hydratable output) and a `react` project (React's plugin). Each aliases
  `#binding` to its own harness, so every suite file runs twice, once per binding.
- **A scene** (`src/harness/scene.ts`) is what a suite asks for: a component's name, its props,
  and the provider's `dir`/`motion`. Each binding's `scene.tsx` renders it inside
  `PureformProvider` with the demo's registry.
- **The harness** (`src/harness/harness.ts`) mounts a scene into a host (anywhere in the page:
  inside a form, a fieldset, a legend), sets props from outside as an owner would
  (`update`), hydrates server HTML, and `settle`s (waits for the machines and the framework).
  React runs unwrapped by `act`, scheduling as in an app.
- **Server rendering** goes through a browser command, `renderOnServer` (`src/commands.ts`): Node
  starts a Vite server in SSR mode with the binding's plugin, loads
  `src/bindings/<binding>/server.tsx`, and returns the HTML (and Solid's hydration bootstrap).
  The test puts it in the page and hydrates it.

## Suites

| File                           | What it checks                                                                                                                                                                                                                                            |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `controllable.e2e.test.ts`     | §9.4: uncontrolled state changes on its own; controlled state asks and moves only with the prop (or when the owner takes the change); one callback per user action, none for a prop change; the default is read once; switching warns once.               |
| `forms.e2e.test.ts`            | §9.5: `FormData` entries (also through `form="id"` from outside the form); reset to the default, controlled and uncontrolled, with `reason: "reset"`; disabled fieldsets (nested, the first legend's exemption, toggled); `required`, `invalid`, `error`. |
| `accessibility.e2e.test.ts`    | axe over every example, both directions, with the real styles (so contrast counts).                                                                                                                                                                       |
| `keyboard.e2e.test.ts`         | Tab reaches the component and skips it disabled; each key clicks it, changes its state, or does nothing; arrow keys in `ltr` and `rtl`.                                                                                                                   |
| `direction.e2e.test.ts`        | §5.9: every part the machine marks gets the provider's `dir`, and each part's box in `rtl` mirrors its `ltr` box across the root (the mirrored-box helpers from `tests/browser-e2e-tests/src/mirror.ts`).                                                 |
| `server-rendering.e2e.test.ts` | §5.7: every example rendered in Node and hydrated, in both color schemes: no warning, no element replaced, no attribute changed; default and controlled state render on the server; the hydrated component responds.                                      |

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
    - `keyboard`: the focusable element, what each key does, and `arrows` by direction if arrow
      keys do anything.
4. Add the case to `COMPONENTS` in `src/components/index.ts`.

The registry must have the component: register it in `apps/solid-demo/.pureform` (until p4c
generates it). A part of the case left out skips the cases that need it.

## Running

Through the omni MCP (or `omni run`): `test:e2e`, which first runs the demo's `prepare` (Panda
codegen). `.env.local` at the repo root sets `CHROMIUM_PATH`. One file, one binding:

```sh
cd tests/component-suites
set -a; source ../../.env.local; set +a
bun x vitest --config vitest.config.e2e.ts run src/forms --project react
```

Type-check with `bun x tsc --noEmit -p tsconfig.json` (the React files carry a
`@jsxImportSource react` pragma; the rest is Solid's JSX).

## Worth knowing

- **Stubs:** `error` has no component yet (the text inputs bring it in p6b), and server
  rendering runs on the Panda target only, without a runtime theme (p5a, p5b); each is an
  `it.todo`.
- Solid's plugin compiles tests non-hydratable; the `solid` project asks for hydratable output
  (`solid: { hydratable: true }`), as an app's client build is.
- Solid's server render returns a bootstrap that clears the previous render's `_$HY`, since every
  test hydrates in the same page.
- React's `settle` waits a frame and two tasks: React syncs the native input in a passive effect,
  which can land after a single timeout.
- The browser context emulates reduced motion, so boxes are measured at rest.
