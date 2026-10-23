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

## Round 2 (branch `storybook-web-2`)

From `main` (`6d8b5460`). Not pushed.

### What changed

- **`@pureform/component-cases` joins the core train** (`cog.toml`); its `package.json`
  already matched `packages/anatomy`'s (no `private`, same exports, train version), so the
  release `workspace.spec.ts` passes.
- **Controls from binding-core's declarations** (replacing a first attempt, `bindingVariants`
  on the preset specs and the anatomy, which was reverted, `generated.ts` regenerated):
  `scripts/variant-props.ts` loads `@pureform/binding-core`'s built `dist/index.d.ts` with the
  TypeScript compiler API and reads the property names of `<Component>VariantProps` (the
  checker resolves `extends` and generics). A recipe variant that isn't one gets no control:
  `toggle` (Button, IconButton, Chip), the app bar's `search`, `scrolled`, `collapsed` (the
  last two are props, but of `AppBarScrollProps`, not the variant props), the toolbar's
  `overflow` (a root prop), and the fields' `trailingIcon` where the variant props have none.
  `density` and `position` are props, so they keep their controls. A property typed
  `VariantProp<C, "group">` names the variant it sets, so the text's `textStyle` is the control
  for its `style` variant.
    - **TypeScript 7** (the repo's `typescript`) ships no JavaScript compiler API, so the script
      imports `@typescript/typescript6` (the root's catalog entry, now a devDependency of the
      app). Its value import of a `.ts` file needed `allowImportingTsExtensions` in
      `tsconfig.project.json`; `@pureform/binding-core` joins the omni dependencies.
    - **A missing interface fails the codegen**, listing every component at once. Five are
      named differently and set `variantProps`: CircularProgress and LinearProgress
      (`ProgressVariantProps`), NavigationBar and NavigationRail (`NavigationVariantProps`),
      SelectionList (`ListVariantProps`); List reads `ListOwnVariantProps` (its own `variant`;
      `ListVariantProps` holds its items' defaults). Components with no variants (TouchTarget, the radio
      group's composite, TimeInput) aren't looked up.
    - **`controls.exclude` stays** for overrides: the fields' `leadingIcon`/`trailingIcon`/
      `prefixText`/`suffixText` (TextField, TextArea, TagsInput, Select, Autocomplete,
      DateInput, DockedDatePicker) and the dialog's `icon` are variant props (the parts'
      root's flags) but the ready-made components take them as content (`leadingIcon: "@"`),
      so a boolean control would draw "true".
- **React Native skipped for now; needs renderer-neutral readers.** `tests: false` on the
  renderer in `stories.config.ts` drops its Vitest project (the projects come from the
  config; `SB_RENDERERS=native` runs it anyway); `casePlays: false` stays. Its stories still
  draw. The case readers are unchanged.
- **React Native's disabled text field** is `disabled` on the web (`Platform.OS === "web"`;
  React Native Web forwards `disabled` to the input) rather than `editable={false}`, which
  React Native Web draws as `readonly`. Checked with `SB_RENDERERS=native … TextField -t
Disabled`: the input no longer fails, but the **label** does (color-contrast): it's a plain
  text element, not the input's `<label>`, so axe doesn't exempt it. The `TextField/Disabled`
  a11y todo stays, with that reason. The binding's unit specs (`components.spec.tsx -t ield`)
  pass.
- **Every component with an anatomy and a case:** `include` is gone. 61 generated (742 stories
  per renderer): Accordion, AppBar, Autocomplete, Avatar, Badge, BottomSheet, Button,
  ButtonGroup, Card, Carousel, Checkbox, Chip, ChipSet, CircularProgress, DateInput,
  DatePicker, Dialog, DockedDatePicker, DragHandle, Fab, FabMenu, FullscreenDialog, Icon,
  IconButton, LinearProgress, List, ListItem, LoadingIndicator, Media, Menu, NavigationBar,
  NavigationRail, Paginator, RadioGroup, RichTooltip, Ripple, Scrim, SearchBar, SearchView,
  Select, SelectionList, Separator, SideSheet, Slider, Snackbar, SplitButton, Stepper,
  SupportingText, Switch, Table, Tabs, TagsInput, Text, TextArea, TextField, TimeInput,
  TimePicker, Toolbar, Tooltip, TouchTarget, Tree.
    - **Skipped** (`skip` takes reasons now): **Toast** (its case renders a toaster from
      `toasts` data, the suites' `ToastScene`; no export takes them), **GridList** (its
      `tiles` become `GridList.Tile` children in the suites' `GridListScene`).
    - Anatomies with no case: `inputChip`, `calendarCell`, `radio` (drawn inside the chip
      set, the date pickers and the radio group).
    - Composite anatomies pair too (the radio group's root is `radioGroupAnatomy`'s), without
      controls. A component with several cases (Card + its action area, FabMenu, ListItem +
      expandable) is one file: the first case gives the plays, the others their examples
      over their own props. List and SelectionList share a root but are separate components.
    - `pureform.codegen.ts`'s `COMPONENTS` is every anatomy (`Object.keys(anatomy)`).
    - `schemes: ["light", "dark"]` is config-wide now.
- **Overlays:** each case's `opened` rendering is an `Opened: …` story, and a component whose
  case has `overlay` or `opened` gets a canvas at least `overlayHeight` (480px) tall: the
  codegen sets `parameters.pureform.height`, the shared hook wraps the canvas. No
  hand-written stories.
- `parameters` per component (the meta's), and story `tags` written into the file (the indexer
  reads them statically), so `tags: ["!test"]` drops a story from the tests.

### Problems and fixes found by the tests

- **`storybook/test`'s `userEvent` is synthetic:** a slider click has no pointer position (it
  read 0). Under Vitest the cases now act through `vitest/browser`'s `userEvent` (real
  Playwright input): `#user-event` (`package.json` `imports`, aliased in `.storybook/main.ts`
  when `VITEST` is set) is `src/renderers/user-event.vitest.ts`, else `user-event.ts`
  (`storybook/test`'s, for the Interactions panel; imported then exported, since Storybook's
  build can't rewrite an `export … from "storybook/test"`).
- **Solid's adapter held the args in a store**, whose arrays are proxies: the button group's
  and chip set's uncontrolled `defaultValue` never moved. The args are now a signal behind a
  getter proxy (plain values; still updated without a remount).
- **Story ids clashed:** a second `Key: Space` was exported as `KeySpace_`, whose id drops the
  `_`. Exports are numbered (`KeySpace2`) and display names too (`Key: Space 2`).
- A key's `null` prop (the radio group's `defaultValue: null`) is left out, since Storybook drops
  null args.
- **A link's Enter navigated the test frame** (the list's `href="#inbox"`), which closed
  Vitest's browser connection: the click spy calls `preventDefault`.
- The story tests use the component suites' 1280×900 viewport.

### Checks run

- release `workspace.spec.ts` (9). (core, preset and anatomy were tested for `bindingVariants`,
  since reverted; after the revert `generated.ts` regenerates with no diff.)
- `bunx tsc --noEmit` in the app (`tsconfig.json`, `src/solid/tsconfig.json`) and
  `packages/react-native`.
- Story tests by group, Solid and React each (`--project storybook/<renderer>` with the
  group's generated files): actions 110, selection 63, fields 174, display 151 (153 before the
  carousel's pinned plays were tagged out), navigation 155, overlays 80: **733 per renderer,
  all passing**. React Native: only `TextField -t Disabled` (above).
- `omni run build -p @pureform/storybook-web`; `scripts/screenshots.mjs` against it, served
  statically: `/tmp/opencode/sb-web2-{solid,react,native}.png` (Button, Switch, TextField,
  Slider, Tabs, Menu opened), no page or console errors.

### Marked todo or out of the tests (with reasons)

- **Carousel**, every story `a11y: todo`: axe finds focusable masks in items Zag hides
  (`aria-hidden-focus`); its `Light`/`Dark` are `tags: ["!test"]`: the state play reads page 2
  for 1. Both likely come from the items being sized from the row's width once mounted (the
  case's `measured`), which the canvas gives differently from the suites' page; the 1280px
  viewport didn't change it.
- **TextField/Disabled**, `a11y: todo`: React Native's label contrast (above).

### Open questions (round 2)

- **Variant props that are content in the ready-made components** (the fields' affixes, the
  dialog's `icon`) are excluded by hand; the ready-made props' types (a string, not a flag)
  could tell the codegen instead, if their interfaces were exported per component.
- `@typescript/typescript6` is used only for its compiler API; when TypeScript 7 ships one
  (`typescript/unstable/sync` is a start), the script can move.
- **Toast and GridList** need a scene a hook could give per renderer (a JSX-free toaster or
  tile builder), or cases whose props the bindings take directly.
- **Carousel** in Storybook: worth a look at what differs from the suites (focusable masks in
  hidden items).
- **React Native's opened menu** is drawn mid-canvas, not under its trigger (screenshot): its
  placement in React Native Web.
- The suites' `controllable` cases ran through Testing Library's synthetic events in the first
  round's Storybook plays; now the plays only see real input under Vitest, and the
  Interactions panel in Storybook still uses the synthetic ones (a slider click there reads 0).

## Round 3 (branch `storybook-web-3`)

From `main` (`85458948`). Not pushed.

### What changed

- **Controls from the components' resolved props** (`scripts/prop-controls.ts`, replacing
  `scripts/variant-props.ts` and its `<Component>VariantProps` lookup). For each component the
  codegen loads the export a story renders from the binding's built declarations (with the
  app's `.pureform/registry.d.ts`) in one `@typescript/typescript6` program, and resolves its
  props type: the export's first call signature's first parameter (a union's members merged).
    - **Renderer:** React (`controls: "react"` in `stories.config.ts`). Solid's props give the
      same controls for all 61 components (compared once, every field equal); React Native's
      aren't read (its stories use the web args, mapped by its hook).
    - **Kept:** properties whose declaration is in `@pureform/binding-core` (its `dist` or
      `node_modules` path). A mapped type's property has no declaration: the checker's root
      symbol's mapped type gives the file (`Controllable`'s `selected`, `defaultSelected`),
      read through the internal `links`, since the compiler API exposes none.
    - **Control by type:** string-literal union → select, `boolean` → boolean, `string` →
      text, `number` → number; functions, nodes (`ReactNode`, Solid's `JSX.Element`), objects,
      arrays and mixed unions (`boolean | "indeterminate"`) → none. None is `control: false` when
      the story has the arg, and left out of `argTypes` otherwise, so the panel doesn't list
      every callback.
    - **Variant link:** a prop typed `VariantProp<C, "group">` (or an indexed access to one,
      `ButtonVariantProps["color"]`) is read from its declaration's type node before it resolves;
      its control takes the anatomy group's values in the recipe's order (a `true`/`false`
      group is a boolean), so `textStyle` is the text's `style` select. The registry makes the
      resolved types concrete too, but `VariantValue<"false" | "true">` is a mixed union.
    - **`@control` tag:** `@control none | select | boolean | text | number` on the prop's
      JSDoc in binding-core overrides the type (an unknown kind fails the codegen).
    - **Other args** (not the component's binding-core props, including the shared hook's
      `disabled` on components without one, `children`, `as`, `href`, `aria-label` where the
      binding declares it) get `control: false`.
    - `variantProps` is gone from the config type and `stories.config.ts`, and so are every
      `controls.exclude` (the fields' affixes, the dialog's `icon`): `controls.exclude` stays
      available (now `control: false`), unused.
- **Spec:** `scripts/prop-controls.spec.ts` (9 tests) on fixtures in
  `scripts/__fixtures__/prop-controls/` (a binding-core file, a DOM-props file, a component
  export through `Omit`): one per rule, plus the variant link through an indexed access and
  `argTypeFor`'s anatomy/tag precedence. `vitest.config.unit.ts`, and the app's `test:unit`
  task is enabled.

### `@control` tags added (all `@control none`, in `packages/binding-core/src/components/`)

| Prop    | Where                                                                                                                                                                                                                                                                            | Why                                                                                           |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `id`    | accordion, autocomplete, avatar, button-group, button, carousel, checkbox, chip-set, fab, navigation, paginator, radio-group, ripple, search-bar, search-view, select, selection-list, slider, snackbar, stepper, switch, table, tabs, tags-input, text-field, time-picker, tree | the root element's id: a `string`, so a text field, but nothing to see when changed           |
| `name`  | autocomplete, button, checkbox, date-picker, fab, radio-group, search-bar, select, slider, switch, tags-input, text-field, time-picker                                                                                                                                           | the name a form submits under; no visible effect                                              |
| `form`  | autocomplete, button, checkbox, fab, radio-group, search-bar, select, slider, switch, tags-input, text-field, time-picker                                                                                                                                                        | the owning form's id; no visible effect                                                       |
| `value` | button, fab, checkbox, switch                                                                                                                                                                                                                                                    | the value submitted with the form (not the controlled value the other components' `value` is) |
| `type`  | button, fab                                                                                                                                                                                                                                                                      | the native `button`/`submit`/`reset`: a select with no visible effect in a story              |

`testId` and `ids` needed none: `testId` is declared by the bindings (`PartProps`), `ids` is an
object.

### Controls that changed

- **New:** AppBar `scrolled`, `collapsed`, `search`, `scrollOffset`; Toolbar `overflow`;
  SelectionList `variant`; behaviour flags and values across the board (`disabled`,
  `selected`/`defaultSelected`, `open`/`defaultOpen`, `checked`, `invalid`, `required`,
  `readOnly`, `toggle`, `min`/`max`, `placeholder`, labels such as `closeLabel`); `textStyle`
  stays the text's `style`.
- **DateInput's** `leadingIcon`/`prefixText`/`suffixText`/`trailingIcon` are booleans now: its
  ready-made root takes them as flags (the parts are children), which the old blanket
  `AFFIXES` exclude hid. The other fields' affixes and the dialog's `icon` are nodes and fall
  out.
- **Gone:** the fields' affixes, the dialog's `icon`, and everything not declared in
  binding-core.

### Checks run

- `bunx tsc --noEmit` in the app (`tsconfig.json`, `src/solid/tsconfig.json`) and in
  `packages/binding-core`; `omni run build -p @pureform/binding-core`.
- `bunx vitest run -c vitest.config.unit.ts` (9 passed).
- `omni run build -p @pureform/storybook-web` (generate, prepare, `storybook build`).
- Story tests per group, Solid and React each (`--project storybook/<renderer>` with the
  group's generated files): actions 119, selection 70, fields 162, display 199, navigation
  110, overlays 80: **740 per renderer, all passing**. React's overlays group failed once on
  `Tooltip/Key Escape` and passed on its rerun (Tooltip alone three times, the group once):
  a flake under load. After the last commit (the shared `disabled` arg's `control: false`,
  an argTypes-only change), AppBar, Text, Toolbar and Scrim reran in both (35 each).
- Controls panels against the static build: `/tmp/opencode/sb-web3-button-controls.png`,
  `/tmp/opencode/sb-web3-appbar-controls.png`.

### Open questions (round 3)

- **`selected` and `defaultSelected` both get controls** (and `open`/`defaultOpen`,
  `value`/`defaultValue`): setting the controlled one freezes the story's state. Tag the
  `default*` ones `@control none`, or hide the controlled ones, if the panel feels busy.
- **Mixed unions get no control** (`boolean | "indeterminate"`, `number | string`); a
  `@control select` tag could list them if wanted.
- **The mapped-type declaration** is read through TypeScript's internal symbol `links`; a
  compiler upgrade could move it (the spec's `selected` fixture would catch it).
- `aria-label`/`aria-labelledby` keep text controls where binding-core declares them
  (IconButton, Menu, dialogs, sheets): they're required labels, arguably content.

## Round 4 (branch `storybook-web-4`)

From `main` (`a94bbe0b`). Not pushed.

### What changed

- **`default*` props have no control.** Every `default*` prop in `binding-core` is
  `@control none`: the ones `Controllable` maps (`defaultSelected`, `defaultOpen`,
  `defaultValue`, `defaultChecked`, `defaultPage`, `defaultExpanded`, …) through one tag in
  `controllable.ts`, and the declared ones (`defaultSort`, `defaultSelection` in the table;
  `defaultValue`, `defaultView` in the time picker) on their own JSDoc. The compiler attaches no
  JSDoc to a mapped type node, so `tagOf` reads the `@control` kind from the text just inside
  the mapped type's brace (`mappedTag`; the spec's `defaultSelected` fixture covers it).
  `aria-label` keeps its text control.
- **Literal unions are selects with a mapping** (`controlOfType`): string, number and boolean
  literals, at least one non-boolean, become `select` with the stringified values as options (`true`,
  `false` first, then the rest in the checker's order) and `mapping` for the non-strings
  (`{ true: true, false: false }`; numbers `{ "12": 12 }`). `argTypeFor` passes `mapping` through
  (not for a variant prop, whose values the anatomy gives). Plain `true | false` stays boolean;
  a union with a non-literal member (`boolean | string`, `boolean | {…}`) stays none. Spec: 12
  tests (fixtures `mixed`, `count`, `flag`, `loose`, `tricky`, and the mapped `default*` tag).
- **The ready-made DateInput takes `leadingIcon`, `trailingIcon`, `prefixText` and `suffixText`
  as content** (Solid, React, React Native), like TextField: `DateInputContentProps` gains the
  four nodes (and their keys), the ready-made's props `Omit` the flags from Root's, and Root
  gets the flags from `isPresent(content)`. Composed parts keep the flags. React and Solid draw
  them in the container in the text field's order (leading icon, prefix, segments, suffix, label,
  trailing icon); React Native draws them like its text field. **Breaking:** `<DateInput
leadingIcon />` (a flag) is now a node, so nothing is drawn for `true`.
- **DockedDatePicker already did this** (Solid, React and React Native take the icons and
  affixes as content and omit the flags; its trailing icon is always on), so it needed no change.
- **Deprecated options:** none of these components has any.

### Controls that changed

- **New:** Checkbox `checked` (`true`, `false`, `indeterminate`), TimePicker and TimeInput
  `hourCycle` (`12`, `24`). Every other union that was none stayed none.
- **Removed:** DateInput's `leadingIcon`, `trailingIcon`, `prefixText`, `suffixText` booleans
  (now nodes, so no control); `defaultSelected`, `defaultOpen`, `defaultValue`, `defaultChecked`,
  `defaultPage`, … on every component (`control: false` when the story passes them, so the
  panel doesn't infer one from the args).

### Checks run

- `bunx tsc --noEmit` in binding-core, react, solid, react-native and the app (both
  tsconfigs); `omni run build test -p` those four (one `rows.spec.tsx` render-count failure in
  the first run, passing on `-f failed`: a flake under load); the app's unit spec (12 passed).
- Date input and docked date picker specs per package (React 24, Solid 28, React Native 20 with
  the date pickers').
- Component suites after `omni run generate prepare -p @pureform/panda-fixture`, narrowed with
  `-t "DateInput|DockedDatePicker"`, `solid/panda` and `react/css`: controllable 6, accessibility
  30, overlays 3, keyboard 18, themes 18 each, all passing (forms ran nothing for them).
- `omni run build -p @pureform/storybook-web`; story tests for fields and selection (19
  components: Checkbox, Switch, RadioGroup, Slider, ChipSet, ButtonGroup, SelectionList,
  TextField, TextArea, Select, Autocomplete, TagsInput, SearchBar, SearchView, DateInput,
  DatePicker, DockedDatePicker, TimeInput, TimePicker): **267 per renderer, Solid and React,
  all passing** (they cover Checkbox, TimePicker and TimeInput, the newly controlled).

### Open questions (round 4)

- **Selects of stringified values** show `true`/`false` as text options; a radio or
  inline-radio control would suit `checked` better.
- **`checked` as a controlled prop** freezes the checkbox's own state, like the other
  controlled props; now that `default*` has no control, that is the only way to set it.
- A string literal `"true"` mixed with the boolean `true` in one union would collide in the
  mapping; none exists.
- The date input's icons render `children` only; no `mirror` content props (the text field has
  `mirrorLeadingIcon`/`mirrorTrailingIcon`).

## Round 5 (branch `storybook-web-5`)

From `main` (`42cef4ad`). Not pushed.

### What changed

- **DateInput's affix props take content, not a flag** (unreleased, accepted without a
  deprecation): `leadingIcon`, `trailingIcon`, `prefixText` and `suffixText` on the ready-made
  are nodes (round 4); Root and the composed parts keep the flags. The binding READMEs didn't
  mention the flags; they now say the ready-made takes content.
- **`mirrorLeadingIcon` and `mirrorTrailingIcon` on the ready-made DateInput** (React, Solid,
  React Native), like the text field: they join `DateInputContentProps` and
  `DATE_INPUT_CONTENT_PROPS` in binding-core, and the icon parts get `mirror` (the parts already
  took it). React Native sets the `mirrored` state when either is on, so both flip, as in its
  text field. Specs: React and Solid check `data-pf-mirror` on the marked icon only; React
  Native checks the computed transform flips under `dir="rtl"` and not unmarked. A new
  `icons and affixes` example in `@pureform/component-cases` (date input) puts them through the
  direction suite and a story.
- **`radio` controls:** `argTypeFor` turns a select of 3 options or fewer into `radio`
  (`RADIO_MAX`), for the resolved types, the mappings (`true`, `false`, `indeterminate`) and the
  anatomy's variant groups (`controlFor`); above 3 stays `select`. `@control radio` is a new tag
  kind (forces it); `@control select` keeps a select. `PropControl.control` itself still says
  `select` (the decision is in `argTypeFor`, so the spec's type fixtures are unchanged); the spec
  gained fixtures `scale` (4 options), `wide` (`@control radio`) and `pair` (`@control select`).

### Checks run

- `bunx tsc --noEmit` in binding-core, react, solid, react-native (clean) and the app's
  `tsconfig.json` (clean; `tsconfig.project.json` has the same 253 lines of third-party
  declaration errors as `main`).
- `omni run build test -p` binding-core, react, solid, react-native: passing (React Native's
  new specs included).
- The app's unit spec: 14 passed.
- `omni run generate prepare -p @pureform/panda-fixture`, then the direction suite narrowed with
  `-t DateInput` on `solid/panda` and `react/css`: 16 passed.
- `omni run build -p @pureform/storybook-web`; story tests for **all 61 groups**, since a radio
  lands in most of them: **741 per renderer, Solid and React, all passing**.

### Open questions (round 5)

- Boolean-valued variant groups with a third option, and `checked`'s `true`/`false`/
  `indeterminate`, are now radios; confirm that suits the panel.
