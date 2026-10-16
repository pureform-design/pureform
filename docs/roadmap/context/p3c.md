# p3c: Demo wiring and shared browser suites (output context)

Commits: 736da12..88a3693, plus the `docs(roadmap)` commit that adds this file.

| Commit    | What                                                                                                                              |
| --------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `736da12` | `fix(solid)`: the Zag port runs machine watches untracked (Solid's `STRICT_READ_UNTRACKED` warnings)                              |
| `0298aa7` | `test(component-suites)`: the new `tests/component-suites`, button and checkbox cases; catalog adds `axe-core`, `@pureform/solid` |
| `d124db7` | `fix(preset)`: the checkbox's check mark no longer flips into a chevron under `rtl`                                               |
| `5b9d4ad` | `fix(solid)`: the library's shared chunks are `.jsx` (an app's Solid plugin couldn't parse them as `.js`)                         |
| `ecae890` | `feat(solid-demo)`: `/components` page; `ssr.noExternal` for `@pureform/*`                                                        |
| `2b84219` | `test(component-suites)`: `unmirrored` parts draw the same both ways                                                              |
| `88a3693` | `docs(design)`: §13's fieldset risk closed; "Built (p3c)" in §5.7 and §9.7; hydrated fieldset cases                               |

## Built

### `tests/component-suites` (`@pureform/component-suites`, private)

Scaffolded with `ts-package` (`e2e-tests`). omni task `test:e2e` (depends on `@pureform/site`'s
`prepare`, Panda codegen). Dev deps: `@pureform/solid`, `@pureform/react`, `@pureform/anatomy`,
`@pureform/styling`, Solid and React with their Vite plugins, `axe-core` 4.14 (new catalog entry),
`@pandacss/vite`, Playwright.

```
vite.config.ts            Panda's plugin over apps/solid-demo (real classes and CSS)
vitest.config.e2e.ts      two projects: "solid" (solid({ ssr: true, solid: { hydratable: true } }))
                          and "react" (react()); each aliases #binding to its harness;
                          reduced motion emulated; commands; closeServers plugin
src/
  setup.ts                imports apps/solid-demo/src/App.css (Panda's stylesheet)
  registry.ts             re-exports apps/solid-demo/.pureform's registry (both bindings use it)
  commands.ts             renderOnServer(scene) (Node, Vite SSR server per binding), emulateColorScheme
  harness/
    scene.ts              COMPONENT_NAMES, ComponentName, Scene { component, props?, provider?: { dir?, motion? } }
    harness.ts            Harness { name; mount(scene, host?): Mounted; hydrate(scene, host): Promise<Mounted>; settle() }
                          Mounted { host; update(props): Promise<void>; unmount() }
    mounts.ts             unmounts every scene and clears the body after each test
    page.ts               mountCase(case, props, { host?, provider? }), stateNames(prop), hostIn(markup),
                          submitted(form, submit), afterReset(), watchConsole()
    server.ts             ServerRender { html; head }, renderOnServer(scene), runScripts(markup)
  bindings/solid/         scene.tsx (components map + SceneView), harness.tsx, server.tsx
  bindings/react/         same, with a `@jsxImportSource react` pragma
  components/
    types.ts              ComponentCase, StateCase, FormCase, KeyboardCase, KeyCase, KeyEffect, ActOptions, byTestId
    button.ts, checkbox.ts, index.ts (COMPONENTS)
  controllable.e2e.test.ts, forms.e2e.test.ts, accessibility.e2e.test.ts,
  keyboard.e2e.test.ts, direction.e2e.test.ts, server-rendering.e2e.test.ts
```

`ComponentCase`:

```ts
interface ComponentCase {
    component: ComponentName;           // "Button" | "Checkbox"
    props: SceneProps;                  // every scene: an accessible name
    root: string;                       // testIds.<component>.root
    examples: Record<string, SceneProps>; // plain data; axe, direction, SSR run each
    unmirrored?: string[];              // data-pf-part names that must draw the same in rtl
    state?: { prop; from; to; props?; act(host, { force? }); read(host) };
    form?: { control(host); disabled(host); submits: { props; entries }; omits?; submitter?;
             resets?; required?: { props; satisfy(host) }; invalid?: { props }; error?: { props; message } };
    keyboard: { focusable(host); keys: KeyCase[]; arrows?: { ltr: KeyCase[]; rtl: KeyCase[] } };
}
type KeyCase = { key: string /* userEvent syntax */; does: "click" | "change" | "nothing"; props? };
```

What each suite checks (per component, per binding):

- **controllable** (§9.4, needs `state`): uncontrolled changes and reports once; the default is
  read once; controlled asks (twice for two actions) and doesn't move; moves when the owner takes
  the change; a prop change moves it with no callback; switching warns exactly once (lines with
  `pureform:`).
- **forms** (§9.5, needs `form`): entries submitted (by the form's submit button, or by clicking
  the component when `submitter`); nothing when `omits`; `form="id"` from outside; reset
  (uncontrolled back to default with `{ [prop]: from, reason: "reset" }`, controlled asks and moves
  if taken, stays if ignored, a reset button); disabled fieldsets (disabled, nested, first-legend
  exemption, toggled, ignores the user); `required` blocks until satisfied; `invalid` sets
  `aria-invalid`; `error` (no component yet: `it.todo`, p6b).
- **accessibility**: `axe.run` over every example, in `ltr` and `rtl`, no violations.
- **keyboard**: Tab reaches `focusable`, skips it when disabled; each key's effect; arrows
  (default: Left/Right/Up/Down do nothing) in both directions.
- **direction** (§5.9): every `[dir]` under the scene equals the provider's; each part's box in
  `rtl` mirrors its `ltr` box (`mirrorMismatches` from `tests/browser-e2e-tests/src/mirror.ts`);
  `unmirrored` parts have equal physical borders, radii, and transform both ways.
- **server-rendering** (§5.7): every example, in light and dark: rendered in Node, hydrated; no
  console warning or error, no element replaced, no attribute changed (all attributes);
  default and controlled values render on the server; hydrated component responds; hydrated in a
  disabled fieldset and in its first legend follows the browser's rule. `todo`: other targets
  (p5a), runtime theme (p5b).

Counts: 6 files × 2 projects; 304 passed, 18 skipped (cases a component leaves out), 6 todo.

### `apps/solid-demo` (`@pureform/site`)

- `src/routes/components.tsx` → `/components` (nav link in `__root.tsx`; `routeTree.gen.ts`
  regenerated): `PureformProvider registry={registry} dir={dir()}`, every button variant (and
  disabled), sizes with icons, colors, a mirrored icon, a toggle, a composed button, every
  checkbox state, an indeterminate parent over three children, a form (required, a named
  checkbox, one in a disabled fieldset, submit and reset), a direction switch. Same page as
  `apps/react-demo`.
- Depends on `@pureform/solid` (package.json and `project.omni.yaml`).
- `vite.config.ts`: `ssr.noExternal: [/^@pureform\//]`.
- Checked by hand (dev server, Playwright): server-rendered with classes, hydrates, toggles,
  the parent checkbox, `rtl`, required blocks submit, submit sends `terms=on&news=weekly&action=send`.

### Fixes found by the suites and the demo

- **Solid's Zag port** (`packages/solid/src/internal/zag/track.ts`): watch effects ran Zag's
  actions in the effect half, which read props and context, so every watched change logged
  `STRICT_READ_UNTRACKED` (a keyboard toggle, a controlled switch). Now `untrack(effect)`.
- **`@pureform/solid` build**: shared chunks were `parts-*.js` holding JSX; an app's Solid plugin
  only reads JSX in `.jsx` files, so building the demo against `dist` failed. `chunkFileNames:
"[name]-[hash].jsx"`.
- **Server rendering in a Solid app**: externalized `@pureform/*` failed on the server (dist is
  JSX; in development the `development` condition resolves to TypeScript). The demo sets
  `ssr.noExternal`; any app that server-renders `@pureform/solid` must keep it bundled.
- **Preset**: the checkbox's check mark used `borderInlineEndWidth` with `rotate(45deg)`, so under
  `rtl` it became a chevron. Now `borderInlineEndWidth: when("rtl", 0, t)` and
  `borderInlineStartWidth: when("rtl", t, 0)`, i.e. always the physical right (React Native's
  `start`/`end` flip the same way). ltr output unchanged; snapshot `controls.spec.ts.snap` updated.
  Mirrored boxes couldn't see it; the direction suite's `unmirrored` check does.

## Deviations from the design

- **The suites live in a new project**, `tests/component-suites`, not in
  `tests/browser-e2e-tests` (which keeps the adapter and preset suites): it needs two framework
  plugins in two Vitest projects. The mirrored-box helpers are imported from
  `tests/browser-e2e-tests/src/mirror.ts` (in this project's cache key).
- **Server rendering compares every attribute**, not only class, `style`, `data-*`, `aria-*`,
  and fails on any warning or error during hydration, or any replaced element.
- **`error`** isn't on the checkbox (no supporting text slot); the forms suite's `error` case is
  defined and `todo` until a component (text inputs, p6b) declares `form.error`.
- **Arrow keys** for button and checkbox: they do nothing in either direction (checked). Components
  with arrows (radio group, tabs, slider; p6) declare `keyboard.arrows`.
- **Disabled fieldsets and Zag**: the gap p2a/p3a recorded (Zag's own closest-fieldset tracking,
  the legend exemption) doesn't show: in both bindings, mounted and hydrated, the first legend of
  a disabled fieldset leaves the checkbox enabled, and nested/toggled fieldsets disable it. §13's
  risk is closed on that evidence. Zag's effect still runs; if a later Zag release makes it take
  effect, the forms suite fails first.
- The color-scheme runs are cheap: nothing in the bindings reads the scheme, so they pass by
  construction; they stay to catch a future JS read.

## Stubs and gaps

- `it.todo`: `error` blocks submitting (p6b); server rendering on the CSS and Tailwind targets
  (p5a); with a runtime theme (p5b). All in `tests/component-suites/src/{forms,server-rendering}.e2e.test.ts`.
- Only the Panda target's registry (the demo's hand-written `.pureform/`) is exercised; p4c moves
  the demos onto generated registries, p5a adds the other targets.
- The suites aren't type-checked by the `test:e2e` task; run `bun x tsc --noEmit -p
tests/component-suites/tsconfig.json` (passes).
- Pre-existing, unchanged: `rn-parity` "every variant value at rest" (257 of 258 in
  `browser-e2e-tests`).

## How to verify

- `task_run` `test:e2e` on `@pureform/component-suites`: all pass (both projects).
- Workspace `build` + `test:unit`: pass except the pre-existing rn-parity case (via
  `browser-e2e-tests`' `test:e2e`).
- One file, one binding: `cd tests/component-suites && set -a; source ../../.env.local; set +a;
bun x vitest --config vitest.config.e2e.ts run src/forms --project react`.
- The demo: `task_run` `build` on `@pureform/site`; `SESSION_SECRET=… bun x vite` in
  `apps/solid-demo`, open `/components`.

## Notes for the next phases

- **Adding a component to the suites (p6, every component):**
    1. `COMPONENT_NAMES` in `src/harness/scene.ts`;
    2. the `components` map in `src/bindings/solid/scene.tsx` and `src/bindings/react/scene.tsx`;
    3. `src/components/<name>.ts`, a `ComponentCase` (copy `checkbox.ts` for a form control with
       state, `button.ts` for a pressable): `props` with an accessible name, `root` test id,
       `examples` (plain data, covering variants and states), `state` (`act` must pass
       `options` to `userEvent.click`, `read` should cross-check the native element and ARIA),
       `form`, `keyboard` (with `arrows` per direction for radio group, tabs, slider, menus),
       `unmirrored` for parts that don't point;
    4. add it to `COMPONENTS` in `src/components/index.ts`;
    5. register the component in `apps/solid-demo/.pureform` (and its `staticCss`) so the real
       classes exist, until p4c generates registries.

    Every suite then runs it in both bindings. Leaving a field out skips the cases that need it.
    A component whose state isn't a click away (a select's `value`) writes `act` as the keyboard
    or pointer steps that change it once.

- **p5a:** to run on the CSS and Tailwind targets, give the scene a target (or add Vitest projects
  per target) and load that target's stylesheet and registry; the `todo` in the server rendering
  suite marks the spot.
- **p5b:** add a `theme` to `SceneProvider` and a server-rendering case that hydrates it, checking
  the `<style>` block in `<head>` too (the snapshot only covers the host).
- **React harness timing:** `settle` waits a task, a frame, and two tasks; one timeout wasn't
  enough for Zag's native-input sync after a controlled prop change (a passive effect).
- **Solid hydration in tests:** compile hydratable (`solid: { hydratable: true }` in the Vitest
  project); the server's `head` clears `window._$HY` before the bootstrap, since tests hydrate
  repeatedly in one page.
- **`watchConsole`** in `src/harness/page.ts` collects `console.error`/`warn`; Solid's dev
  diagnostics log through `console.warn`, so new `STRICT_READ_*` warnings fail the server
  rendering suite.
- **A Solid app server-rendering `@pureform/solid`** needs `ssr.noExternal` for it; document this
  for users when p4c's CLI scaffolds apps.
- **bun.lock:** edited by hand again (`--lockfile-only` re-resolved commander, lightningcss,
  aria-query, emnapi, oxc types); kept only the workspace and `axe-core` hunks, then `bun install
--frozen-lockfile` installed 1 package with no lockfile change.
