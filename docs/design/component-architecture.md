# Components and style registry: design doc

Status: accepted. Supersedes layer 3 ("copy-paste delivery") of
`docs/design/multi-config-ui-library.md` §3.

## 1. Goals

1. **Share everything that isn't framework glue.** Behavior, anatomy, prop contracts,
   state-to-style mapping, and test ids live in framework-free packages. A Solid, React, or
   React Native binding is a thin layer of reactivity and JSX.
2. **One config, everywhere.** `pureform.config.ts` is the single source. Build tools
   (Panda, Tailwind, the CSS adapter, Metro) and runtime code import the same file, so they
   can't drift.
3. **Static and runtime theming.** Themes compile to static CSS where possible, and switch
   or override at runtime through `dynamic` tokens and providers, with no rebuild.
4. **Pay for what you use.** Unused components ship neither JS nor CSS. Package layout does
   most of it; a bundler plugin does the rest.
5. **Styles come from a registry.** Components never import a recipe. They ask the
   registry for a slot's styles given a component, its variants, and its state. Panda,
   Tailwind, plain CSS, and React Native each fill the registry with their own factories.
6. **Components focus on behavior.** Accessibility, keyboard, focus, state, stable test
   ids, overridability. Compound anatomy: `Button.Root`, `Button.Label`, `Button.Icon`.
7. **Solid 2.0 first.** Zag.js for behavior where Material fits it; our own machines where
   it doesn't.

Non-goals: shadcn-style copying of source, and a standalone CLI (§10).

## 2. Bet: registry lookups are cheap

Every render of every slot calls `registry.get(component, slot, selection)`. This only
works if the lookup is a few property reads. The design keeps it so:

- Variant and state selection is precomputed at build time into a flat table per
  component, keyed by a small integer or short string (§5.3).
- Lookups are memoized per instance by Solid's fine-grained reactivity: the style
  expression reruns only when a variant or state signal it read changes.
- On the web, a lookup returns a class string (static) plus, when instance tokens exist, a
  style object of CSS variables. No style objects are built per render.
- On React Native, the lookup returns a cached, frozen style object per selection; the
  existing `useComponentState`/`useSelected` path in `rn-adapter` already does this and
  is the proof of the bet.

A benchmark (§12) gates the decision: 10k lookups per frame under 1ms on a mid-range
phone.

## 3. Package layout

```
@pureform/core              AST, config types, defineComponent (exists)
@pureform/theme, material   contracts, providers (exist)
@pureform/preset            Material components as AST (exists)

@pureform/styling           NEW. Registry contract and runtime: StyleRegistry, StyleFactory,
                            selection encoding, instance tokens, theme scope resolution.
                            Framework- and target-free.
@pureform/anatomy           NEW. Per component: parts, their roles, data attributes,
                            test ids, prop contract, state shape. Pure TS, no framework.
@pureform/machines          NEW. Behavior: Zag.js machines re-exported, plus our own
                            (ripple, state layer, morphing shapes, Material-specific
                            controls). Framework-free.

@pureform/style-panda       Factories from Panda recipes (move out of panda-adapter's
@pureform/style-tailwind    runtime side), Tailwind classes, plain CSS classes, RN styles.
@pureform/style-css         Each implements StyleFactory. Generated glue (§6) wires them.
@pureform/style-native      (Wraps rn-adapter's selection.)

@pureform/solid             NEW. Solid 2 bindings: provider, useStyles, compound
                            components. Includes internal Zag glue for Solid 2 (§8).
@pureform/react             NEW, built alongside Solid. Same anatomy and machines.
@pureform/react-native      Later. Moves component code out of rn-web-demo.

@pureform/bundler           NEW. Vite/Rollup/esbuild/Metro plugin (unplugin): config
                            loading, virtual registry module, style pruning, and the
                            `pureform generate` bin (§10).
```

Rule for where code goes: if it compiles without importing a framework, it's not in
`@pureform/solid`. Each component's Solid file should read as "wire anatomy to machine to
registry", typically under 80 lines.

Adapters (`panda-adapter`, `css-adapter`, `tailwind-adapter`, `rn-adapter`) stay build-time
compilers. The `style-*` packages are their runtime halves, so a production bundle never
pulls a compiler in.

## 4. `pureform.config.ts`

```ts
import { defineConfig } from "@pureform/core";
import { pureform } from "@pureform/preset";

export default defineConfig({
    ...pureform({ themes: { teal: {/* … */} } }),
    target: "panda", // "panda" | "tailwind" | "css" | "native"
    prefix: "pf",
    components: ["button", "checkbox", "circularProgress"], // optional allow-list (§7)
});
```

- **Import rules.** The config must be importable by Node (build tools) and by the browser
  bundle. It may only import pureform packages and pure data. No `fs`, no env reads at top
  level. A test in each adapter checks it.
- **Loading.** Build tools load it with jiti (already used by Metro's `withPureform`).
  `panda.config.ts` and Tailwind's entry become one-liners that import it:
  `pureformPanda(config)`, `@import "pureform/tailwind"` with the plugin reading the
  config.
- **Runtime.** Runtime code never imports the full config. It imports the generated
  registry module (§6), which carries only what runtime needs: selection tables, dynamic
  token names, theme names, defaults. The full AST stays at build time.

## 5. Style registry

### 5.1 Contract (`@pureform/styling`)

```ts
interface SlotStyle {
    class?: string; // web
    style?: Record<string, string>; // web: CSS vars for instance tokens
    native?: object; // RN: resolved style object
    drawing?: Drawing; // SVG drawings (RN, and web where needed)
}

interface StyleFactory<C extends ComponentName> {
    slots: readonly SlotOf<C>[];
    select(
        selection: Selection<C>,
        tokens?: InstanceTokens<C>,
    ): Record<SlotOf<C>, SlotStyle>;
}

interface StyleRegistry {
    get<C extends ComponentName>(name: C): StyleFactory<C> | undefined;
    register<C extends ComponentName>(name: C, factory: StyleFactory<C>): void;
}
```

`Selection<C>` is the union of a component's variants and its states (`hovered`,
`pressed`, `focusVisible`, `disabled`, `selected`, …), typed from the AST via
`defineComponent`'s inference, reusing Material's names.

### 5.2 Factories per target

- **Panda:** wraps the generated `sva`/`cva` recipe. Panda's static extractor can't see
  through the registry, so the generator emits `staticCss` for every variant of every
  registered component (or only the allow-listed ones, §7). States come from data
  attributes (`[data-pressed]`), not recipe variants, so the class set stays small.
- **Tailwind:** a generated table of class strings per slot per variant, using the
  Tailwind adapter's output, plus `@source inline(...)` so Tailwind keeps them.
- **CSS:** the CSS adapter already emits classes; the factory maps selection to
  class names (`pf-button__root pf-button--filled`).
- **Native:** wraps `rn-adapter`'s `useSelected` path: a precomputed table of resolved
  styles keyed by selection, plus token tweening (`useMovingTokens`).

On the web, states are expressed as data attributes on the element and matched in CSS, so
a state change costs no lookup at all; only variant changes re-select. On native,
states are part of the selection.

### 5.3 Selection encoding

Each component's variants and states are enumerated at build time. The selection key is
built from them in a fixed order (`"filled|md|pressed"`) and looked up in a `Map`. For
components whose variant product is large, the factory composes per-variant fragments
instead of storing the full product (a class string concat on web, a shallow merge cached
per key on native).

### 5.4 Instance tokens

`dynamic` component tokens (`components.circularProgress.value`) are props on the
component. On the web they become inline CSS vars on the root (registered with
`@property` when they have a `valueType`, so they transition). On native, they feed the
existing token tween. The component code doesn't know which: it passes `tokens` to
`select`.

### 5.5 Themes

- **Static:** each target scopes themes the way it natively does, and the factory exposes
  that as `themeAttributes(name)`, so components and providers never hard-code a selector:
    - Panda: its own `themes` config and `data-panda-theme`, with `getTheme`/`injectTheme`
      for themes loaded at runtime.
    - Tailwind v4: theme vars in `@theme`, scoped overrides under a `@custom-variant` on a
      data attribute, the convention Tailwind's docs use.
    - CSS adapter: our own `[data-pf-theme]` scope, since there's no native one.
    - React Native: a context value; no selectors.
      Switching a theme is an attribute (or context) change.
- **Runtime:** `<PureformProvider theme overrides>` sets theme scope and may override any
  `dynamic` token, writing CSS vars on web or a context value on native. Nested providers
  scope. This is the existing `@pureform/theme` provider model surfaced through the
  framework bindings.
- **Runtime-only themes** (generated from a seed color at runtime): the provider calls
  `@pureform/material`'s generators in the browser and writes vars. Opt-in import, so
  apps that don't use it don't ship the color math.

## 6. Generated glue

`pureform generate` (also run by the bundler plugin in dev and build) writes, or serves as
a virtual module `virtual:pureform/registry`:

```ts
// generated: do not edit
import { createRegistry } from "@pureform/styling";
import { button } from "@pureform/style-panda/button"; // per-component entry
import { buttonTable } from "./.pureform/panda/button"; // precomputed selection table
export const registry = createRegistry({
    button: () => button(buttonTable), // lazy: built on first get
});
export const themes = ["teal"] as const;
export type Components = "button" | "checkbox"; // augments typing
```

- Per-component imports and lazy factories keep it tree-shakable.
- A `.d.ts` augments `@pureform/styling`'s `ComponentRegistry` interface, so `Button`'s
  variant props type-check against the user's config, not the preset's defaults.
- Generated files live in `.pureform/` (git-ignored), like Panda's `styled-system/`.

The app registers it once:
`<PureformProvider registry={registry}>`. Components read it from context. Tests can pass
a fake registry.

## 7. Tree shaking

Three layers, cheapest first:

1. **Package layout.** One subpath export per component in every package
   (`@pureform/solid/button`, `@pureform/style-css/button`), `sideEffects: false`, no
   barrel re-exports in runtime entries. The root `@pureform/solid` re-exports for DX,
   and is fine under modern bundlers because nothing has side effects.
2. **Allow-list.** `components` in the config limits what's generated: CSS, Panda
   `staticCss`, Tailwind sources, and registry entries. Default: everything.
3. **Usage-based pruning (bundler plugin).** In build mode, `@pureform/bundler`:
    - collects which components are imported from `@pureform/solid` (module graph, after
      tree shaking, via `moduleParsed`/`generateBundle`),
    - collects statically known variant props (`<Button.Root variant="filled">`) through a
      light JSX scan; any dynamic value marks that variant "all",
    - regenerates the registry and the CSS for only those components and variants.
      Dev mode skips pruning (everything available, fast HMR).
      CSS target: emits the pruned stylesheet. Panda: narrows `staticCss`. Tailwind: narrows
      `@source inline`. Native/Metro: narrows the precomputed tables.

Pruning is a safety-off switch: if the scan fails or sees `registry.get(dynamicName)`, it
keeps everything and warns.

## 8. Behavior: Zag.js and Solid 2

Checked October 2026: `solid-js@next` is `2.0.0-rc.15`; `@zag-js/solid@next` is
`2.0.0-next.3`, but its peer is `solid-js >=1.1.3` and it depends on
`@solid-primitives/keyed`, i.e. it targets Solid 1's API (stores, `createEffect` shape,
`mergeProps`/`splitProps`). Solid 2 changes those.

Decision: **use the framework-free Zag packages** (`@zag-js/core` plus each machine, e.g.
`@zag-js/checkbox`) and **port the Solid adapter into `@pureform/solid/internal/zag`**.
The adapter is small: `useMachine` (bind service, props, effects, refs), `normalizeProps`,
`mergeProps`. Port it to Solid 2 primitives, with unit tests that run Zag's own anatomy
tests through it. Drop the port when `@zag-js/solid` ships Solid 2 support; keep the same
internal API so the swap is local.

Mapping of preset components:

| Component                                                                            | Behavior                                                                      |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| checkbox, switch, radio group, slider, tabs, menu, dialog, tooltip, select, combobox | Zag                                                                           |
| button, icon button, FAB, chip (assist/filter/input/suggestion)                      | own (simple; press, focus, toggle)                                            |
| linear and circular progress                                                         | own (no interaction; `role=progressbar` and value props)                      |
| ripple, state layer                                                                  | own (`@pureform/machines/ripple`; ports `apps/solid-demo/src/lib/ripple.tsx`) |
| navigation bar/rail, segmented button                                                | Zag `toggle-group`/`tabs` where it fits, else own                             |
| text field                                                                           | Zag-free own machine: Material's floating label states don't map to Zag's     |

Our own machines use the same shape as Zag's (`machine`, `connect` returning part props),
so bindings treat them uniformly.

## 9. Components

### 9.1 Anatomy

```tsx
<Button.Root variant="filled" onClick={save}>
    <Button.Icon>
        <SaveIcon />
    </Button.Icon>
    <Button.Label>Save</Button.Label>
</Button.Root>
```

- One part per AST slot. Anatomy is generated from `defineSlotComponent`'s `slots` and
  `structure`, so the AST and the anatomy can't drift; a test checks it.
- **Two flavors.** Compound parts (`Button.Root`, `Button.Label`) for full control, and a
  ready-made `Button` that is only shorthand for a fixed composition of them. Ready-made
  components stay as flexible as possible by addressing each slot through props keyed by
  slot name:

    ```tsx
    <Button
        label="Save"
        class={{ root: ["wide", { busy: saving() }], label: "caps" }}
        style={{ root: { "margin-top": "8px" } }}
        testId={{ root: "save", label: "save-label" }}
        slotProps={{ icon: { "aria-hidden": true } }}
    />
    ```

    Each slot's `class` accepts the framework's class syntax: Solid 2's built-in
    string/array/object `class`, and in React a string, array or object joined by a small
    class-merging helper (`clsx`-compatible, such as `cnfast`). `testId` also takes a plain
    string as a prefix for every part. Typed: the keys are the component's slot names from
    the AST.

- Parts read a `ButtonContext` created by `Root`: machine API, selection, and the
  resolved slot styles from one `select` call.

### 9.2 What every part does

- Spreads, in order: machine part props, `data-pf-part`/`data-scope`, state data
  attributes, `class` from the registry, then user props.
- **Overrides:** `class` merges (registry first), `style` merges, `asChild`-style
  polymorphism via an `as` prop or render prop (`Button.Root as={A}`), `unstyled` opts a
  part out of registry styles.
- **Stable test ids:** `data-testid` defaults to `pf-<component>-<part>` (`pf-button-root`),
  overridable by `testId` on Root, which prefixes every part (`save-root`, `save-label`).
  Also always present: `data-pf-part`, and state attributes (`data-pressed`,
  `data-disabled`) usable as selectors. Exported `testIds.button.root` constants from
  `@pureform/anatomy` so tests don't hard-code strings.
- **Per-instance styling hooks:** `tokens={{ value: 40 }}` sets instance tokens (§5.4).

### 9.3 Configurability

- **Global defaults** per component through the provider:
  `defaults={{ button: { variant: "tonal" } }}`.
- **Slot overrides** through the config (AST level, compiled) or through the provider
  (`slotProps={{ button: { label: { class: "…" } } }}`, runtime).
- **Ownership:** compound parts and slot-keyed overrides replace copying source. An
  `eject` command is deferred (§10).

### 9.4 Testing

- **Machines and anatomy:** Vitest unit tests, no DOM.
- **Solid components:** Vitest browser mode (existing setup), with
  `@solidjs/testing-library`; each component has an accessibility check (axe) and
  keyboard tests.
- **E2E:** `tests/browser-e2e-tests` selects by `testIds` and roles; a shared contract
  suite runs the same specs against the Solid build and, later, React and RN-web, so
  bindings stay behaviorally identical.

## 10. CLI: deferred

No separate `@pureform/cli` package for now. Packaged components and the bundler plugin
cover the main path. `@pureform/bundler` ships one bin:

- `pureform generate [--watch]`: writes the `.pureform/` glue and its type declarations
  without a bundler, for `tsc` in CI or before a dev server starts.

Deferred until there's demand:

- `init`: one-time wiring of the config, bundler, and provider (a README covers it).
- `eject`: copying a component's file into the app. Slot-keyed overrides and compound
  parts should make it rarely needed.
- `doctor`: checking the config is importable from build and runtime, and the glue is
  fresh.

## 11. Migration from what exists

1. Extract `@pureform/styling` from `rn-adapter`'s `useSelected`/selection code and the
   Panda/CSS adapters' runtime bits.
2. Add `@pureform/anatomy` generated from the preset; test against the AST.
3. Port Zag's Solid adapter to Solid 2; build checkbox and button end to end on
   `solid-demo` with the Panda target.
   Build `@pureform/react` alongside it from the start, so anything the two duplicate
   surfaces early and moves into the shared packages.
4. Add `@pureform/bundler` with config loading and the virtual registry (no pruning).
5. Bring CSS and Tailwind targets to parity; switch `css-demo`/`tailwind-demo` to the
   components.
6. Pruning (§7.3).
7. Move RN components out of `rn-web-demo` into `@pureform/react-native` on the same
   anatomy.

## 12. Risks and open questions

1. **Lookup cost.** Benchmark before step 3 ends. Fallback: compile-time inlining of
   static variant classes by the bundler plugin.
2. **Panda's extractor** can't follow the registry; we rely on `staticCss`, which can
   bloat CSS without pruning. Is that acceptable in dev?
3. **Solid 2 is RC.** API churn could break the Zag port; pin and track.
4. **Variant explosion** for components with many variants (§5.3 fragments).
5. **SSR:** registry and provider must work during SSR and hydrate without style
   mismatch, including runtime themes (write vars inline on the server).
6. **Where state lives on the web:** data attributes (proposed) vs. selection.

Decided: separate `@pureform/style-*` packages; Panda `staticCss` bloat accepted until
pruning; React built in parallel with Solid; text field gets its own machine.
