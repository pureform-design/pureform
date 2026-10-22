# @pureform/component-suites

Shared browser suites that check the rules every component follows, against the Solid and React
bindings at once, on each web target (Panda, plain CSS, Tailwind): controlled and uncontrolled
state, native forms, accessibility and the keyboard, direction, named and runtime themes, server
rendering, and indication. They're the design doc's §5.6, §5.7, §5.9, §9.4, §9.5, §9.7, and §9.8 as
tests. Private;
nothing depends on it.

It depends on `@pureform/solid`, `@pureform/react`, and a style registry and stylesheet per
target, all from the Panda fixture's config (`tests/panda-fixture/pureform.config.ts`), so every
component renders with its real classes and layout:

- **Panda:** the fixture's own generated registry and Panda stylesheet
  (`tests/panda-fixture/.pureform`, `tests/panda-fixture/src/styles.css`), written by the
  fixture's omni `generate` and `prepare` tasks.
- **CSS and Tailwind:** `.pureform/css` and `.pureform/tailwind` in this folder (ignored by git),
  which `vitest.config.e2e.ts` writes with `@pureform/generate` before the projects start
  (`src/targets/generated.ts`), with every component of the config.

Each binding's own specs (`packages/<binding>/src`) test the binding's details; these suites test
what both must agree on, on every target.

## How it fits together

```
src/*.e2e.test.ts            one suite per rule, written once, framework-free
      │  imports
      ├── src/components.ts  the cases (@pureform/component-cases) with Vitest's userEvent
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
  the target's styling plugin (Panda's over the fixture's config, Tailwind's, or none for plain
  CSS).
  So every suite file runs six times.
- **Targets** (`src/targets/`): `targets.ts` lists them; `generated.ts` writes the CSS and Tailwind
  registries (options `{ prefix: "pf", classPrefix: "pf" }`); each `<target>/registry.ts` re-exports
  a registry and each `<target>/setup.ts` imports the stylesheet as an app would (the CSS adapter's
  reset and `styles.css`; Tailwind's `styles.css`, which imports `tailwindcss` and then the
  generated stylesheet).
- **A scene** (`src/harness/scene.ts`) is what a suite asks for: a component's name, its props,
  its `indication` by name, a `wrapper` component it renders inside, and the provider's
  `indication`, `dir`, `motion`, `theme`, `seed` (a runtime theme), `hydrate`, and `overrides`.
  Indications go by name (`material`, `ink-sparkle`, `no-ripple`, `none`, `custom`) so a scene
  stays plain data the server can take; `src/harness/indications.ts` holds the suites' own. Each binding's `scene.tsx` renders it inside `PureformProvider` with the target's
  registry (`#registry`). `src/harness/themes.ts` turns a `seed` into Material's `seedTheme`
  through a source that counts its generations (`generated.count`), the same scope as
  `seedTheme`'s, so a suite can tell that hydrating generated nothing.
- **The harness** (`src/harness/harness.ts`) mounts a scene into a host (anywhere in the page:
  inside a form, a fieldset, a legend), sets props from outside as an owner would
  (`update`), hydrates server HTML, and `settle`s (waits for the machines and the framework).
  `observe()` makes an interaction source as an app does (`createInteractionSource()` in Solid,
  `useInteractionSource()` in React) in a component that renders `useInteractionState` over it.
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
  dependency cache. Its first load compiles the binding's sources, which can take over half a
  minute on a busy machine, so a suite that renders on the server starts it in `beforeAll`
  (`startServer` with `SERVER_START_TIMEOUT`, from `src/harness/server.ts`), outside its
  tests' time limits.

## Suites

| File                           | What it checks                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `controllable.e2e.test.ts`     | §9.4: uncontrolled state changes on its own; controlled state asks and moves only with the prop (or when the owner takes the change); one callback per user action, none for a prop change; the default is read once; switching warns once.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `forms.e2e.test.ts`            | §9.5: `FormData` entries (also through `form="id"` from outside the form); reset to the default, controlled and uncontrolled, with `reason: "reset"`; disabled fieldsets (nested, the first legend's exemption, toggled); `required`, `invalid`, `error`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `accessibility.e2e.test.ts`    | axe over every example and every opened overlay, both directions, with the real styles (so contrast counts).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `keyboard.e2e.test.ts`         | Tab reaches the component and skips it disabled (unless it has no disabled state); each key clicks it, changes its state, or does nothing, from the state focus left it in; arrow keys in `ltr` and `rtl`. A component with no `keyboard` case: Tab passes over it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `direction.e2e.test.ts`        | §5.9: for every example and opened overlay, every part the machine marks gets the provider's `dir`, and each part's box in `rtl` mirrors its `ltr` box across the root (the mirrored-box helpers from `tests/browser-e2e-tests/src/mirror.ts`); a component with no inner parts mirrors its root across its host, which takes the direction too. Animations are held at 300 ms while measuring.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `themes.e2e.test.ts`           | §5.6: the registry's `themeAttributes(name)` is the target's attribute; a provider's `theme` writes it on its element; the component draws exactly as under that attribute set by hand (both measured where the pointer can't hover), for each of the config's themes; teal draws differently from the base theme (unless `themed: false`); a runtime theme from teal's seed draws teal's colors in both schemes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `indication.e2e.test.ts`       | §9.8, for every component with an `indication` case, per anatomy entry (the snackbar has two): hover, a press, and keyboard focus tint the surface, and a drag the slider's; a press ripples in the surface's layer, from the center when the entry says so, and not under reduced motion; `noIndication` on the provider tints nothing, draws no layer, and keeps the focus indicator; inside an interactive card with its own `indication`, the component draws exactly as alone; a shared source shows a press on a button (`data-pf-active`) and the button's press on it, never focus, and `useInteractionState` reports it; disabling it (or its item) while pressed ends the press; an app's own interaction kind reaches subscribers and changes no state; a custom indication on the provider and the component hydrates unchanged. Known gaps are `it.fails` tests at the end. |
| `overlays.e2e.test.ts`         | §5.7, §5.8, for each overlay (menu, select, dialog, full-screen dialog, bottom and side sheets, tooltip, snackbar): open, it draws over a positioned element that follows it in the page (`elementFromPoint` at its center); opening runs an animation that moves and fades it, and closing one that fades it while it stays shown, then it hides; under reduced motion both only fade. The case's `overlay` names the surface, the parts that come and go with it, and how an app places it.                                                                                                                                                                                                                                                                                                                                                                                            |
| `server-rendering.e2e.test.ts` | §5.7: every example rendered in Node and hydrated, in both color schemes: no warning, no element replaced, no attribute changed; default and controlled state render on the server; the hydrated component responds; hydrated inside a disabled fieldset (and its first legend) it follows the browser's rule; a named theme's attribute renders on the server; a runtime theme renders its scope and block on the server, hydrates in both schemes keeping the server's block and generating nothing (`"reuse"`), and regenerates the same block (`"regenerate"`); overrides render and hydrate unchanged.                                                                                                                                                                                                                                                                              |
| `tabs-motion.e2e.test.ts`      | §9.10: the tabs' indicator, primary and secondary, in both directions, slides from the old tab (it starts over the old indicator's box, is between the two halfway, and ends aligned with its tab: centered under the label inside the tab's padding, or across the tab) over the tabs' `medium1` and emphasized tokens; it starts before the change is first drawn; a key and a controlled `value` slide too; a change mid-slide starts from where it had got to; reduced motion (the provider's or the system's) changes at once; a resize mid-slide, a wider page, and a longer label keep it aligned; it doesn't slide while hydrating, and does once hydrated. Each slide starts paused, and the test sets its time.                                                                                                                                                                |

`indication-benchmark.e2e.test.ts` isn't a suite: it mounts 1,000 interactive list items with and
without the layer element, and with eager sources or sources made beforehand, and logs the mount
time and Chromium's style recalculation and layout (the `performanceMetrics` command). It's
skipped unless `VITE_PUREFORM_BENCH` is set:

```sh
VITE_PUREFORM_BENCH=1 bun x vitest --config vitest.config.e2e.ts run src/indication-benchmark \
    --project '*/panda' --silent=false
```

## Adding a component

1. Add its name to `COMPONENT_NAMES` in `packages/component-cases/src/scene.ts`.
2. Import it into each binding's `components` map: `src/bindings/solid/scene.tsx` and
   `src/bindings/react/scene.tsx`.
3. Write `packages/component-cases/src/cases/<name>.ts`, a `ComponentCase` (`packages/component-cases/src/types.ts`):
    - `props`: what every scene gets (an accessible name), and `root`, the root's test id;
    - `examples`: plain-data props covering its variants and states (axe, direction, and server
      rendering run each);
    - `state` (if a user changes it): the prop, two values, the action between them, and how to
      read the state from the page;
    - `form` (if it's a form control): the native control, how the machine shows disabled, what it
      submits, and whether it resets, takes `required`, `invalid`, `error`; `aria`, when the
      element carrying `aria-invalid` isn't the native control (a select's combobox over its
      hidden select);
    - `keyboard`: the focusable element (read again after each key, so it can follow focus: a
      radio group's checked radio), what each key does (a `change` can name the state it moves
      to with `to`), and `arrows` by direction if arrow keys do anything;
    - `keyboard.disables: false` for a component with no disabled state of its own (an overlay),
      and `keyboard.focused`, the state focus alone moves it to (a tooltip opens on Tab), which the
      keys then start from;
    - leave `keyboard` out for a component focus never reaches (a progress indicator, an avatar):
      the keyboard suite checks that Tab passes over it;
    - `themed: false` for a component the scheme doesn't color (text, a touch target, the scrim,
      the ripple), which a recoloring theme can't change;
    - `themedProps`: props the themes suite renders it with, when its own props render nothing the
      theme colors until the browser runs (the toaster: its toasts come in on the client, so its
      examples are the empty region and the toasts are `opened`);
    - `measured: true` for a component that lays itself out from measuring the page once mounted
      (the carousel sizes its items from the row's width): the hydration checks (server rendering,
      themes, indication) still require no warning, but not that nothing changed;
    - `unmirrored`: parts that don't point (a check mark), which must draw the same both ways;
    - `opened`: renderings with an overlay open (`defaultOpen: true`). Zag places a floating
      overlay and hides the page around a modal one only in the browser, so axe and the direction
      suite run these, and server rendering doesn't. Keep `examples` closed.
    - `indication` (if it's interactive: its anatomy has `indication` entries): `ownSource(anatomy)`
      for a component with one surface, `itemSources(anatomy, items)` for a composite whose items
      each take a source, with `props` or `open` to show the surfaces (an open menu), `focus` when
      Tab doesn't reach the trigger (a highlighted menu item), `disabled: undefined` for a
      component with no disabled state, and `drags` for the slider. The suite finds each entry's
      trigger, surface, and focus part by their test ids, and the layer as the surface's
      `[data-ripple-layer]` child.
    - `overlay` (if it's an overlay): its surface (what animates and stacks), the parts that come
      and go with it (its positioner, a dialog's backdrop), props it's mounted with, and `place`
      where placing it is the app's (the snackbar, fixed at the bottom). `overlayParts(ids).overlay()`
      builds it for a trigger-and-positioner overlay.
4. Add the case to `COMPONENTS` in `packages/component-cases/src/cases.ts`.

Every target's registry must have the component: each is generated with every component of the
Panda fixture's config (`tests/panda-fixture/pureform.config.ts`), so a component the config has
is already in all three, and every suite runs it on Panda, CSS, and Tailwind with no
target-specific step. A part of the case left out skips the cases that need it.

## Running

Through the omni MCP (or `omni run`): `test:e2e`, which first runs the Panda fixture's `prepare`
(`pureform generate`, then Panda's codegen) and builds the adapters the CSS and Tailwind registries
are generated with. `.env.local` at the repo root sets `CHROMIUM_PATH`. One file, one binding, one
target (`--project` takes globs: `'solid/*'`, `'*/tailwind'`):

```sh
cd tests/component-suites
set -a; source ../../.env.local; set +a
bun x vitest --config vitest.config.e2e.ts run src/forms --project react/css
```

Type-check with `bun x tsc --noEmit -p tsconfig.json` (the React files carry a
`@jsxImportSource react` pragma; the rest is Solid's JSX).

## Worth knowing

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
- The browser context emulates reduced motion, so boxes are measured at rest; the indication
  suite's ripple cases ask the provider for full motion.
- **The indication suite uses the real mouse** (the `mouse` command, Playwright's), so `:hover`
  and `:active` match as for a user, and lets go away from everything so a press clicks nothing.
  It compares colors as 8-bit RGBA through a canvas: a `color-mix()` computes to `color(srgb …)`
  where the theme's color is `oklch(…)`.
- **Overlays** (`packages/component-cases/src/cases/overlay.ts`) are read by their trigger and surface agreeing, and
  acted on by clicking the trigger and waiting a few frames: Zag places a floating overlay a frame
  or two after it opens. They animate in and out, so the waits also wait out every animation that
  ends (`animationsDone`, `src/harness/animations.ts`), and one closing reads as closed (its
  surface's `data-state`) while it still shows. The axe and direction suites wait the same
  (`settlePlaced`); the keyboard suite waits out an overlay's exit before checking where focus is,
  and the indication suite mounts its other button at the top of the page, clear of an open
  overlay, which draws over what follows it.
- **The test browser emulates `prefers-reduced-motion: reduce`** (`vitest.config.e2e.ts`), so
  boxes are measured at rest; overlays still fade under it. A suite that checks full motion sets
  the provider's `motion: "full"`.
- **The pointer rests where the last test left it.** A snackbar under it is held open, and a
  hover onto a trigger it already rests on fires nothing: unhover first, or keep state off hover
  (the tooltip case opens on keyboard focus, since leaving the trigger also asks to close).
- The runtime theme's `regenerate` case imports Material's generator before it hydrates
  (`importSeedGenerator`), leaving the counted source unloaded, so the provider still loads it
  after hydrating without waiting on the import. The first import in a page has the dev server
  transform the generator's sources: it outran `waitFor`'s default second (the p6b flake), then
  10 s on a machine busy with other test runs and builds.
- **The emulated color scheme belongs to the page**, which later test files reuse: the suites that
  emulate one put `light` back in `afterAll`, or a later file reads colors (axe's contrast) in
  the dark scheme against a light page.
- The direction suite skips parts with no box (`display: none`): an icon button's outline unless
  it's outlined.
- **Components so far:** button, checkbox, chip, FAB, icon button, radio group (its `root` is the
  unstyled group element, `compositeTestIds.radioGroup.root`; its radios repeat the radio's test
  ids, so cases find them by value), select (opened with a click and chosen from its list, which
  takes focus while open; `packages/component-cases/src/cases/select.ts`), switch, text area, and text field (one
  shared case, `packages/component-cases/src/cases/text-input.ts`: `value` from `""` to `"a"`, typed), and the
  overlays (menu, tooltip, dialog, snackbar). The tags input (`tags-input.ts`) goes from `["red"]`
  to `["red", "blue"]` by typing and Enter; its indication case highlights the chip with the left
  arrow (shown as hover) and focuses the remove button by script, since Zag keeps it out of the tab
  order. The autocomplete (`autocomplete.ts`) chooses `value` from the suggestions opened by its
  arrow; its input submits the typed text. The search view (`search-view.ts`) opens from the
  search bar around it (its trigger, `data-state`), and is a modal: focus goes to its input.
- **Navigation and lists** (`tabs.ts`, `navigation.ts`, `list.ts`): the tabs' `value` moves with
  a click, Home and End, and the sideways arrows by direction (`read` checks each panel's `hidden`
  against its tab); `keyboard.focusable` is the selected tab, the only one Tab reaches. The
  navigation bar and rail share one case factory (`navigationCase`): Tab reaches the first
  destination, and Enter or Space choose it, so the state starts at the second (`from:
"search"`). The list item's case renders it as a button (`as: "button"`, plain data), so it
  has a focusable element and a disabled state; the list's case is a list of links (Enter clicks
  the first, `keyboard.disables: false`). Neither has state.
- **Time picker and time input** (`time-picker.ts`): `value` from 09:30 to 21:30 with a click on
  PM (`read` is the hidden input's value); Tab reaches the hour, whose arrows step it (the left
  arrow forward under `rtl`); 12 and 24-hour, minutes, scroll, vibrant and disabled examples. The
  dial's track, handle, centre and labels are `fixed`: under `rtl` they keep their boxes rather
  than mirror (a clock doesn't), which the direction suite checks.
- **App bar** (`app-bar.ts`): no state; examples by size, subtitle, centered, scrolled,
  collapsed by its offset, pinned, and holding a search bar, for markup, server rendering,
  direction (a mirrored back arrow) and themes.
- **Display** (`progress.ts`, `slider.ts`, `card.ts`, `search-bar.ts`, `static.ts`): the slider's
  `value` moves from 40 to 50 with a click in the middle of its range input (`read` checks the
  root's `value` token against the input), Home and End go to 0 and 100, and the arrows step by
  direction (the browser's own). The search bar is a text input (`""` to `"a"`, `required`). The
  card renders `as: "button"` (Root's indication entry); a second card case, `cardActionArea`, lays
  it out in sections with actions beside its action, so the action area acts (Enter and Space
  click it) and the container shows its indication (the action area's entry, whose layer sits in
  the action area: the indication suite looks for a layer in the part an entry names). The progress indicators, avatar, media, separator, scrim,
  supporting text, text, icon, touch target, and ripple have no state or keyboard case; pictures
  are an inline SVG data URL, so nothing loads.
