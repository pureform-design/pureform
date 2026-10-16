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

Components get their styles by calling a factory from the registry with their selection
(§5). This only works if the call is a few property reads. The design keeps it so:

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

@pureform/styling           NEW. Types and a tiny registry: ClassFactory, StyleFactory,
                            Selection, instance tokens. Framework- and target-free.
@pureform/anatomy           NEW. Per component: parts, their roles, data attributes,
                            test ids, prop contract, state shape. Pure TS, no framework.
@pureform/machines          NEW. Behavior: Zag.js machines re-exported, plus our own
                            (ripple, state layer, morphing shapes, Material-specific
                            controls). Framework-free.

@pureform/*-adapter         Exist. Each gains a `/codegen` subpath (§5.2), run at build
                            time by `@pureform/bundler`, that emits ClassFactory (web) or
                            StyleFactory (native) modules into `.pureform/`.

@pureform/solid             NEW. Solid 2 bindings: provider, useClasses, compound
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
compilers, and their `/codegen` subpath turns their own output into factory modules, so
class names and the code using them change together. Small helpers the generated modules
need at runtime, such as joining classes, live in `@pureform/styling`. The rule: adapters
are build time, `styling` is runtime, and a production bundle never imports an adapter.

## 4. `pureform.config.ts`

```ts
import { defineConfig } from "@pureform/core";
import { pureform } from "@pureform/preset";

export default defineConfig(pureform({ themes: { teal: {/* … */} } }));
```

The config is the design system as pure data: tokens, themes, shapes, components. It
says nothing about how it's built. Whatever consumes it decides that, through its own
options:

```ts
// panda.config.ts
import config from "./pureform.config";
import { pureformPreset } from "@pureform/panda-adapter";
export default defineConfig({
    presets: [pureformPreset(config)],
    prefix: "pf",
});

// vite.config.ts
import pureform from "@pureform/bundler/vite";
export default defineConfig({
    plugins: [
        pureform({
            config: "./pureform.config.ts",
            target: "panda", // "panda" | "tailwind" | "css"; Metro implies "native"
            components: ["button", "checkbox"], // optional allow-list (§7)
        }),
    ],
});
```

- **Build options belong to the build tool.** The target, var and class prefixes, and the
  allow-list are options of the adapter or the bundler plugin, not fields of the config.
  The same config can then feed a Panda web app and a Metro app at once.

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

### 5.1 Two kinds of factory (`@pureform/styling`)

Web frameworks already apply class strings well, and a class string is the cheapest thing
a lookup can return. React Native has no classes. So the registry serves two kinds of
factory over one selection type:

```ts
type Selection<C> = Variants<C> & { tokens?: InstanceTokens<C> };

/** Web: class strings per slot, plus CSS vars for instance tokens. */
type ClassFactory<C> = (selection: Selection<C>) => {
    [S in SlotOf<C>]: { class: string; style?: Record<`--${string}`, string> };
};

/** React Native: resolved style objects per slot; states are part of the selection. */
type StyleFactory<C> = (selection: Selection<C> & States<C>) => {
    [S in SlotOf<C>]: { style: object; drawing?: Drawing };
};
```

`Variants<C>`, `States<C>` (`hovered`, `pressed`, `focusVisible`, `disabled`,
`selected`, …), `SlotOf<C>`, and `InstanceTokens<C>` are typed from the AST via
`defineComponent`'s inference, reusing Material's names.

On the web, interaction states are not part of the selection. Machines set them as data
attributes (`data-pressed`, as Zag already does), and the generated CSS matches them, so a
press changes one attribute and calls nothing. Only a variant or token change calls the
factory again. On React Native there are no selectors, so states are in the selection,
and each change is one `Map.get` returning a cached, frozen object.

### 5.2 Generated factories per target

**Panda:** a thin wrapper over Panda's own `sva`. Panda's static extractor can't see
through it, so the generator also emits `staticCss` for every variant of every registered
component (or only the allow-listed ones, §7); accepted until pruning lands.

```ts
// .pureform/web/button.ts (generated)
import { button as recipe } from "../../styled-system/recipes";
export const button: ClassFactory<"button"> = (s) => recipe(s);
```

**CSS and Tailwind:** plain lookup tables with no runtime dependency. Tailwind also gets
`@source inline(...)` so it keeps the classes.

```ts
// .pureform/web/button.ts (generated)
const base = { root: "pf-button__root", label: "pf-button__label" };
const variant = {
    filled: { root: "pf-button--filled" },
    outlined: { root: "pf-button--outlined" },
};
export const button: ClassFactory<"button"> = ({ variant: v = "filled" }) => ({
    root: { class: `${base.root} ${variant[v].root}` },
    label: { class: base.label },
});
```

**Native:** a precomputed table, generated by Metro's `withPureform`, the same data
`rn-adapter`'s `useSelected` reads today. Token tweening (`useMovingTokens`) wraps it.

```ts
// .pureform/native/button.ts (generated)
import { table } from "./button.table"; // key → frozen styles
export const button: StyleFactory<"button"> = (s) =>
    table.get(
        `${s.variant ?? "filled"}|${s.pressed ? 1 : 0}|${s.disabled ? 1 : 0}`,
    )!;
```

### 5.3 Hooks

Each binding offers a pair: a hook components use, and the lower-level hook it's built on.

|                | Web (Solid, React)                           | React Native                               |
| -------------- | -------------------------------------------- | ------------------------------------------ |
| Components use | `useClasses(name, selection)` → slot classes | `useStyles(name, selection)` → slot styles |
| Built on       | `useClassFactory(name)` → the factory        | `useStyleFactory(name)` → the factory      |

- `useClasses` memoizes the call: in Solid it takes an accessor and returns a memo; in
  React it takes the selection object and uses `useMemo`. Components can't forget the memo
  or get it wrong.
- `useClassFactory` is for calling the factory outside a component, or for several
  selections at once, such as one preview per variant in a picker.

```tsx
// Solid
function Root(props) {
    const api = useButtonMachine(props); // data-pressed, data-focus-visible, aria-*
    const slots = useClasses("button", () => ({ variant: props.variant }));
    return (
        <button
            {...api.rootProps}
            class={[slots().root.class, props.class]}
            data-testid={testId(props, "root")}
        >
            <Ctx value={{ api, slots }}>{props.children}</Ctx>
        </button>
    );
}

// React Native
function Root(props) {
    const api = useButtonMachine(props);
    const slots = useStyles("button", {
        variant: props.variant,
        pressed: api.pressed,
        disabled: props.disabled,
    });
    return (
        <Pressable {...api.rootProps} style={[slots.root.style, props.style]} />
    );
}
```

|                                      | Web                             | React Native                  |
| ------------------------------------ | ------------------------------- | ----------------------------- |
| Selection type, slot names, test ids | shared                          | shared                        |
| Factory                              | `ClassFactory`: class strings   | `StyleFactory`: style objects |
| States                               | data attributes, matched in CSS | part of the selection         |
| Instance tokens                      | CSS vars in `style`             | merged into styles, tweened   |
| Cost of a state change               | none                            | one `Map.get`                 |

### 5.4 Selection encoding and instance tokens

Each component's variants (and on native, states) are enumerated at build time, and the
key is built from them in a fixed order. For components whose variant product is large,
the generated factory composes per-variant fragments instead of storing the full product:
a class string concat on web, a shallow merge cached per key on native.

`dynamic` component tokens (`components.circularProgress.value`) are props on the
component, passed as `selection.tokens`. On the web, the factory returns them as CSS vars
for the root's `style` (registered with `@property` when they have a `valueType`, so they
transition). On native, they're merged into the styles and tweened. The component code
doesn't know which.

### 5.5 Fewer compound variants: tokens a style sets

Most compound variants pair two variant groups that each set half of a value, such as a
color group and a fill. A style can instead set the component's own `dynamic` tokens, and
other variants read them:

```ts
color: { error: { root: { tokens: { accent: sys("error"), onAccent: on("error") } } } },
variant: { filled: { root: { backgroundColor: token("accent"), color: token("onAccent") } } },
```

- **Typed:** in a typed recipe, `tokens` takes the component's own token names, with
  autocomplete, in base styles, variants, compounds, and states. The builder stores them
  by path (`components.button.accent`) and only allows them on a root slot.
- **Web:** each becomes its custom property in that rule, inherited by every slot.
- **React Native:** selection takes them out, and the component is resolved again with
  them, under the instance's own tokens (`withSetTokens`), cached per set of values.
- **Precedence:** the theme's default, then variants and states, then the instance.
- **Button, as built:** 7 color variants and 5 fills replace 35 compounds. Every
  combination resolves identically on React Native (5,250 selections) and computes
  identically in Chromium (21,000 slot styles), and the CSS is 35.7 KB smaller.
- **Density:** components with sizes get a `densityOffset` token, the theme's by default.
  Each `density` step sets it and each size adds it
  (`height: add(token("height"), token("densityOffset"))`), so one rule per size covers
  every step. `inherit` sets it back to the theme's offset, so a component inside a denser
  one doesn't inherit its parent's token.
- **Across the preset:** compounds went from 202 to 12, with output identical on both
  targets. Built CSS is about 28% smaller raw (7% gzipped) on the CSS target and 34% (9%)
  on Tailwind; React Native's precomputed styles are 12% smaller.
- **What stays compound:** cases that need both conditions at once: the FAB's size with
  its shape and with `extended`, each text input's fill with a leading icon, primary tabs
  with an icon, and card (3).

### 5.6 Themes

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

`pureform generate` (also run by the bundler plugin in dev and build) writes the factory
modules of §5.2 to `.pureform/`, and an index, also served as the virtual module
`virtual:pureform/registry`:

```ts
// generated: do not edit
import { createRegistry } from "@pureform/styling";
export const registry = createRegistry({
    button: () => import("./web/button").then((m) => m.button), // or a static import
});
export const themes = ["teal"] as const;
export type Components = "button" | "checkbox"; // augments typing
```

- Per-component modules keep it tree-shakable. By default the index imports them
  statically, so the first render needs no await; lazy imports are an option for code
  splitting.
- A `.d.ts` augments `@pureform/styling`'s `ComponentRegistry` interface, so `Button`'s
  variant props type-check against the user's config, not the preset's defaults.
- Generated files live in `.pureform/` (git-ignored), like Panda's `styled-system/`.

The app registers it once:
`<PureformProvider registry={registry}>`. Components read it from context. Tests can pass
a fake registry.

## 7. Tree shaking

Three layers, cheapest first:

1. **Package layout.** One subpath export per component in every package
   (`@pureform/solid/button`, `.pureform/web/button`), `sideEffects: false`, no
   barrel re-exports in runtime entries. The root `@pureform/solid` re-exports for DX,
   and is fine under modern bundlers because nothing has side effects.
2. **Allow-list.** The bundler plugin's `components` option limits what's generated: CSS, Panda
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

Pruning is a safety-off switch: if the scan fails or sees `useClassFactory(dynamicName)`, it
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
2. **Solid 2 is RC.** API churn could break the Zag port; pin and track. Check whether
   `@zag-js/solid` supports Solid 2 before porting the adapter.
3. **SSR:** registry and provider must work during SSR and hydrate without style
   mismatch, including runtime themes (write vars inline on the server). Not designed yet.
4. **Not yet covered:** controlled and uncontrolled props (`checked`, `defaultChecked`,
   `onCheckedChange`) mapped onto Zag the same way in Solid and React; native form
   participation; `prefers-reduced-motion`, including token tweens on React Native;
   direction (`dir`) for Zag and RTL; the icon slot contract; whether `.pureform/` is
   committed and how stale glue is detected; and how packages are versioned together.

Decided: factory generators live in each adapter's `/codegen` subpath; Panda's extractor
can't follow the registry, so we rely on `staticCss` and accept its bloat until pruning;
React built in parallel with Solid; text field gets its own machine; state lives on the
web as data attributes; too many variant combinations is solved by tokens a style sets
(§5.5), with fragments (§5.4) for the rest.
