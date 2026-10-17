# p9e: Indication suites and demos (output context)

Commits: 4544784..1fb5c75, plus the `docs(roadmap)` commit that adds this file.

| Commit    | What                                                                                                                       |
| --------- | -------------------------------------------------------------------------------------------------------------------------- |
| `4544784` | `fix(binding-core)`: an indication's opacities given as numbers are percentages on the web                                 |
| `e169824` | `fix(machines)`: a disabled item ends its press; a radio is let go wherever the pointer comes up                           |
| `d13abf7` | `test(component-suites)`: the indication suite                                                                             |
| `41f5c12` | `fix(react-native)`: focus stays with its surface, the slider takes focus and keys, a disabled navigation ends its presses |
| `469222e` | `test(browser-e2e-tests)`: the indication rules on React Native Web                                                        |
| `41fae93` | `feat(demos)`: an indication switch and a shared source on solid-demo's `/components` and rn-web-demo                      |
| `14bb820` | `test(component-suites)`: the layer and sources benchmark                                                                  |
| `501a14c` | `docs`: READMEs                                                                                                            |
| `1fb5c75` | `docs(design)`: "Built (p9e)" in §9.8                                                                                      |

## Built

### `tests/component-suites`

- **`src/indication.e2e.test.ts`**, over every case with an `indication` (16 components: button,
  card, checkbox, chip, FAB, icon button, list item, menu, navigation bar and rail, radio group,
  select, slider, snackbar, switch, tabs), per anatomy entry (the snackbar's action and close):
    - hover, press (real mouse), and keyboard focus (Tab, or the case's `focus`) change the
      surface's computed background; the slider's drag tints it and the source reports `dragged`;
      the focus part draws an outline only when focused;
    - with `motion: "full"` a press adds one `[data-ripple]` to the layer, starting at the center when
      `centered`, else at the press (read from the ripple's first keyframe); under the page's reduced
      motion, none, and the press still tints;
    - provider `indication: "none"`: no layer, every state draws the rest color, the outline is
      Material's;
    - inside `Card interactive` with the custom indication (stronger tints, 6px focus), the component
      draws exactly as alone, and the card has its own layer;
    - shared source (`harness.observe()`): its press puts `data-pf-active` on a Button sharing the
      source and the Button's press on its state part, with the same tint as its own press;
      `useInteractionState` reports it; keyboard focus never reaches the Button (no outline, no
      `:focus-visible`, no focus attribute);
    - updating `disabled` (and, for composites, the first item's `disabled`) while pressed ends the
      press in the source and the hook;
    - `emit({ type: "app:longPress" })` reaches a subscriber and leaves the state idle;
    - a scene with the custom indication on the provider and the component hydrates with no log and
      no attribute change, the layer rendered on the server.
    - `describe("known gaps")`: two `it.fails` tests (below).
- **Case field** `ComponentCase.indication?: IndicationCase` (`src/components/types.ts`):
  `{ anatomy, props?, open?(host), source?(source), disabled?, itemDisabled?(source), focus?(host),
drags? }`; helpers `ownSource(anatomy, extra?)` and `itemSources(anatomy, items, extra?)`.
- **Scenes** (`src/harness/scene.ts`): `Scene.indication` and `SceneProvider.indication` by name
  (`SceneIndication = "material" | "ink-sparkle" | "no-ripple" | "none" | "custom" | "no-layer"`),
  `Scene.wrapper` (`{ component, props?, indication? }`, rendered around the scene's component).
  `src/harness/indications.ts`: `customIndication(material)`, `CUSTOM_TOKENS`, `CUSTOM_PRESSED`.
- **Harness** (`src/harness/harness.ts`): `observe(): { source, state() }` (Solid
  `createInteractionSource` + `useInteractionState`, React `useInteractionSource` +
  `useInteractionState`, rendered into an `<output data-interaction-state>`), `sources(count)`.
- **Hydration helpers** moved to `src/harness/hydration.ts` (`serverRendered`, `hydrate`), shared by
  the server rendering and indication suites.
- **Commands** (`src/commands.ts`): `mouse(action: "move" | "down" | "up", x, y)` (Playwright's
  mouse, in the test frame's coordinates), `performanceMetrics()` (CDP `Performance.getMetrics`).
- **`src/indication-benchmark.e2e.test.ts`**: skipped unless `VITE_PUREFORM_BENCH` is set.

### `tests/browser-e2e-tests`

- **`src/rn-indication.e2e.test.ts`**: the same rules (minus server rendering) for
  `@pureform/react-native`'s button, chip, icon button, FAB, card, list item, checkbox, switch,
  slider, radio group, tabs, navigation bar and rail, menu, and snackbar, over a registry of
  `nativeFactory` from the fixture's config precomputed for React Native (with `ripple`). The ripple's
  start is its disc's `left`/`top` (it then moves to the center as it grows).
- New dev dependencies `@pureform/anatomy`, `@pureform/react-native` (two lockfile lines); the vite
  config aliases `@pureform/react-native` to its `dist` (its sources are React JSX, which the Solid
  plugin there would compile as Solid's). Commands: `rnStyles(components?)`, `rnTokenKeys(components)`,
  `mouse(...)`.

### Fixes in packages

- `@pureform/binding-core`: `indicationTokenValue` writes a number given for an opacity as a
  percentage (`0.08` → `"8%"`); the four opacities of `noIndication` are now `"0%"` on the web.
- `@pureform/machines`: `InteractionEmitter.disabled()` (ends everything once the current work is
  done, via a microtask); `pressableItemProps`, `itemPressProps`, and the radio group's item props call
  it for a disabled item. The radio group's item lets go of Zag's `activeValue` on any `pointerup`.
- `@pureform/react-native`: `NativeInteraction.ownFocus`/`subscribeFocus`; `useInteraction`'s state
  takes `focused`/`focusVisible` from the surface's own interaction. The slider is `focusable`, takes
  arrow keys (sideways by `useDirection()`), Home, End, and `increment`/`decrement` actions, and emits
  focus and blur. `NavigationProps.disabled` disables every destination.

### Demos

- `apps/solid-demo` `/components`: an "Indication" section with three buttons switching the
  provider's `indication` (`Material`, `No ripple`, `None`) and a shared source (button, chip, icon
  button, and the state as text). Its smoke test gains a case for both.
- `apps/rn-web-demo`: an indication `Choices` row (`material indication`, `no ripple`,
  `no indication`) and a "Shared interaction source" section; its e2e test gains a case (11 tests).
- `apps/react-demo`, css-demo, tailwind-demo: unchanged.

## Deviations from the design

- **"Doesn't reach a nested component"** is checked by wrapping every component in an interactive
  card with its own indication (a card in a card is the same-kind case), since most components take
  no children.
- **Server rendering on RN-web** isn't applicable; the RN-web suite runs the other rules.
- **The snackbar's ready-made component takes no source**, so its shared-source, disabling, and
  app-kind cases are skipped on both platforms; it has no disabled state.
- **The menu's and select's keyboard "focus"** is the highlight (Arrow Down), which shows as hover;
  their items take no focus, so the outline isn't checked for them.
- **The slider's drag tint** is the pressed tint: its state layer follows another slot and has no
  drag state (p9b). The suite checks that a drag tints it and that the source reports `dragged`.
- **The benchmark's "lazy sources"** are sources the app made before the clock started (what a lazy
  source would save at mount), since no binding creates sources lazily.

## Stubs and gaps

- **The ripple's opacity** reads the theme's pressed opacity (the ripple's own `opacity` token), not
  the surface's `statePressedOpacity`: an `indication` prop's pressed opacity doesn't change the ink.
  `it.fails` in the indication suite ("a component's indication sets its ripple's opacity"). A fix:
  the layer sets `--…components-ripple-opacity: var(--…components-<c>-statePressedOpacity, <theme>)`,
  or the preset's indication root does. Same on React Native.
- **An override of `components.<c>.<indication token>`** above a component (provider `overrides`, a
  named theme) doesn't reach it, since each root resets its tokens. `it.fails` ("a provider's override
  of a component's indication token reaches it").
- **The snackbar's ready-made component** takes no `interactionSource` for its action or close.
- **The search bar** has no indication entry (unchanged); not in the suites.
- **Solid dev warning in the benchmark:** mounting a ready-made List of 1,000 items logs Solid's
  `HUGE_FAN_IN` diagnostic (an effect tracking 2,003 sources). Not from indication; not investigated.

## Benchmark

`VITE_PUREFORM_BENCH=1 bun x vitest --config vitest.config.e2e.ts run src/indication-benchmark
--project '*/panda' --silent=false` (from `tests/component-suites`). A ready-made `List` of 1,000
link items (each an interactive list item), median of 7 interleaved runs after a warm-up, Chromium
headless; "mount" is mounting plus a forced style and layout, "settled" adds the binding's settle and
a frame; style and layout are Chromium's `RecalcStyleDuration` and `LayoutDuration` deltas.

| Binding | Variant                        | Mount    | Settled  | Style   | Layout  |
| ------- | ------------------------------ | -------- | -------- | ------- | ------- |
| Solid   | layer, eager sources (today)   | 258.6 ms | 267.7 ms | 14.9 ms | 17.1 ms |
| Solid   | no layer, eager sources        | 216.3 ms | 223.7 ms | 12.1 ms | 9.6 ms  |
| Solid   | layer, sources made beforehand | 258.8 ms | 268.2 ms | 14.9 ms | 16.6 ms |
| React   | layer, eager sources (today)   | 397.6 ms | 493.2 ms | 15.2 ms | 17.2 ms |
| React   | no layer, eager sources        | 266.6 ms | 365.2 ms | 12.7 ms | 10.0 ms |
| React   | layer, sources made beforehand | 400.0 ms | 488.7 ms | 15.1 ms | 16.9 ms |

"No layer" is Material's indication with `layer: false` (its effect still starts).

**Recommendation:** keep sources eager: creating 1,000 makes no measurable difference. The layer
costs about 20% of Solid's mount and 50% of React's, but the DOM node itself is small (about 3 ms of
style recalculation and 7 ms of layout per 1,000); most of the cost is the bindings tracking the
layer element in state (`setLayer` in Solid's `usePartIndication` and React's `IndicatedPartElement`),
which re-renders each surface once after mount. Make the layer's wiring lazy first: keep the element
in the markup (server HTML and hydration unchanged), and find it at the first press
(`surface.querySelector(":scope > [data-ripple-layer]")`) instead of through state. Inserting the
element lazily is only worth its markup change if the 10 ms per 1,000 surfaces still matters after
that.

## How to verify

- `tests/component-suites` `test:e2e`: 48 files passed and 6 skipped (the benchmark), 14,130
  passed, 12 expected failures (the two known gaps on six projects), 492 skipped (6 of them the
  benchmark; before p9e: 13,140 passed, 294 skipped). The indication suite
  alone: 990 passed, 192 skipped (cases a component leaves out).
- `tests/browser-e2e-tests` `test:e2e`: 587 passed, 16 skipped (449 before; `rn-indication` adds
  138). `src/__fixtures__/indication/web.txt` and `native.txt` are unchanged.
- `@pureform/rn-web-demo` `test:e2e`: 11 passed; `@pureform/site`, `react-demo`, `css-demo`,
  `tailwind-demo` `test:e2e`: pass (site: 2 tests).
- Workspace `build` + `test:unit` through `task_run`: 150 results, none failed. New unit tests:
  machines (`InteractionEmitter.disabled()`, the radio let go elsewhere), react-native (focus not
  shared, the slider's focus and keys by direction, the navigation's `disabled`).

## Notes for the next phases

- **A new interactive component joins the suite** by giving its case an `indication`:
  `ownSource(anatomy)` when the root takes `interactionSource` and `disabled`, or
  `itemSources(anatomy, ITEMS)` for a composite whose items take `interactionSource` and `disabled`
  (pass `{ disabled: undefined }` when the composite has no `disabled` of its own). Add `props` or
  `open(host)` when the surfaces aren't shown at mount (a menu's `defaultOpen`, a select's click),
  `focus(host)` when Tab doesn't reach the trigger, and `drags: true` for a dragged surface. The
  anatomy's `indication` entries and parts' test ids do the rest. For React Native, add an `own(...)`
  or `items(...)` row to `CASES` in `tests/browser-e2e-tests/src/rn-indication.e2e.test.ts`.
- **Comparing colors:** a `color-mix()` computes to `color(srgb …)` while a theme color computes to
  `oklch(…)`; both suites compare through a canvas as 8-bit RGBA, within 1.
- **Pressing without clicking:** move the real mouse away before letting go, so a press doesn't
  click (and close a menu, or check a box). Composites' own presses set `data-pf-active` on their
  state part too (from the machine's `pressed`), so "forwarded" is only observable on the receiver.
- **RN-web:** components inside a card fit its content, so the suite wraps each in a 280px `View`
  (a slider is otherwise 0 wide). Focus checks wait `FOCUS_AFTER_PRESS_MS` after the last press.
- **omni's build cache** once served a stale `@pureform/react-native` `dist` after a source edit;
  `task_run` with `force: true` rebuilt it. Check `dist` when a test doesn't see a change.
- `apps/solid-demo/solid-env.d.ts` changes on workspace builds; restore it before committing.
