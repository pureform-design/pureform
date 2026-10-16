# Components and style registry: design doc

Status: accepted. Supersedes layer 3 ("copy-paste delivery") of
`docs/design/multi-config-ui-library.md` §3.

## 1. Goals

1. **Share everything that isn't framework glue.** Behavior, anatomy, prop contracts,
   state-to-style mapping, and test ids live in framework-free packages. A Solid, React, or
   React Native binding is a thin layer of reactivity and JSX.
2. **One config, everywhere.** `pureform.config.ts` is the single source. Build tools
   (Panda, Tailwind, the CSS adapter, Metro) import it, and runtime code gets the glue
   generated from it (§4, §6), so they can't drift.
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

Non-goals: shadcn-style copying of source (§10).

## 2. Bet: registry lookups are cheap

Components get their styles by calling a factory from the registry with their selection
(§5). This only works if the call is a few property reads. The design keeps it so:

- Variant and state selection is precomputed at build time into a flat table per
  component, keyed by a small integer or short string (§5.4).
- Lookups are memoized per instance by Solid's fine-grained reactivity: the style
  expression reruns only when a variant or state signal it read changes.
- On the web, a lookup returns a class string (static) plus, when instance tokens exist, a
  style object of CSS variables. No style objects are built per render.
- On React Native, the lookup returns a cached, frozen style object per selection. Today
  `rn-adapter`'s `useComponentState` memoizes per instance and selects again when a
  variant or state changes, over resolved styles cached per theme; the factory moves that
  cache to one shared table per component.

**Measured** (button, default config, median of 15 runs of 10,000 lookups, on a desktop
Ryzen 5 5600 under Node 26; `--jitless` stands in for Hermes, which has no JIT):

| Lookup                                                   | With JIT | Without JIT |
| -------------------------------------------------------- | -------- | ----------- |
| Web today: the CSS adapter's `componentClasses`, 4 slots | 1.5 µs   | 4.0 µs      |
| Web, cached per selection (key string and `Map.get`)     | 0.10 µs  | 0.18 µs     |
| Native today: `selectWithTransitions`, uncached          | 11.7 µs  | 52 µs       |
| Native, cached per selection (frozen, `Map.get`)         | 0.11 µs  | 0.21 µs     |

- **The bet holds with a per-selection cache, and only with it.** On the web a press or
  hover makes no lookup at all (§5.1), so lookups happen on mount and on a variant change;
  even uncached, 1,000 mounts cost about 4 ms without a JIT. On React Native every state
  change is a lookup, and uncached selection would cost about 52 ms for a 1,000-item list
  without a JIT, before a phone's slowdown. So the native factory caches every selection
  it has computed, keyed by its variants and states; the web factory caches too, since
  it's cheap.
- **The cache fills lazily.** Precomputing every combination isn't needed: a key's first
  lookup selects and freezes, and every later one is a `Map.get`.
- **The original gate**, 10,000 lookups per frame under 1 ms on a mid-range phone, was
  stricter than any real frame needs: even cached lookups take 1 to 2 ms per 10,000 on
  this desktop. With the cache, a lookup costs a fraction of a microsecond even without a
  JIT, so a measurement on a real phone isn't planned.

## 3. Package layout

```
@pureform/core              AST, config types, defineComponent (exists)
@pureform/theme, material   contracts, providers (exist)
@pureform/preset            Material components as AST (exists)
@pureform/css-lowering,     shared CSS lowering, the framework-free ripple, and helpers
  js-effects, utils,        (exist)
  type-utils

@pureform/styling           NEW. Types and a tiny registry: ClassFactory, StyleFactory,
                            Selection, instance tokens. Framework- and target-free.
@pureform/anatomy           NEW. Per component: parts, their roles, data attributes,
                            test ids, prop contract, state shape. Pure TS, no framework.
@pureform/machines          NEW. Behavior: Zag.js machines re-exported, plus our own
                            (ripple, state layer, morphing shapes, Material-specific
                            controls). Framework-free.

@pureform/*-adapter         Exist. Each gains a `/codegen` subpath (§5.2), run at build
                            time by `@pureform/generate`, that emits ClassFactory (web) or
                            StyleFactory (native) modules into `.pureform/`.

@pureform/binding-core      NEW (p2a). What every binding shares without a framework:
                            provider options and nesting, selections over defaults,
                            part attributes and props merging, controllable state,
                            reduced motion, measuring an icon slot.

@pureform/solid             NEW. Solid 2 bindings: provider, useClasses, compound
                            components. Includes internal Zag glue for Solid 2 (§8).
@pureform/react             NEW, built alongside Solid. Same anatomy and machines.
@pureform/react-native      Later. Moves component code out of rn-web-demo.

@pureform/generate          NEW. The build step both tools share, with no bundler or CLI
                            dependency: config loading, calling each adapter's
                            `/codegen`, writing `.pureform/`, hashing for staleness, and
                            the registry index.
@pureform/bundler           NEW. Vite/Rollup/esbuild/Metro plugin (unplugin) over
                            `@pureform/generate`: virtual registry module, dev
                            regeneration, style pruning.
@pureform/cli               NEW. The `pureform` bin (§10) over `@pureform/generate`.
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
import { compilePreset } from "@pureform/panda-adapter";
export default defineConfig({
    presets: [compilePreset(config, { prefix: "pf" })],
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
  `panda.config.ts` and the Vite config import it: `compilePreset(config)` today for
  Panda, and the `pureformTailwind({ config, outFile })` Vite plugin for Tailwind, which
  writes the stylesheet that `app.css` imports.
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

`Variants<C>`, `States<C>` (`hover`, `pressed`, `focusVisible`, `disabled`, `selected`,
…), `SlotOf<C>`, and `InstanceTokens<C>` are typed from the AST via `defineComponent`'s
inference, reusing the AST's condition names.

Built (p1e) in `@pureform/styling`: the generic types take a component's name, a key of the
`ComponentRegistry` interface that generated declarations augment with each component's
`variants`, `slots`, `states`, `tokens`, and `lazy`, or that shape inline. `defineComponent`
doesn't infer variant types, so the generator writes them from the config. `StyleFactory`
takes the style and drawing types as parameters, since `styling` can't import `rn-adapter`.
`selectionCache` is the per-selection cache of §2, and `withTokenStyle` adds instance tokens
as CSS vars. `componentClasses` moved here from the CSS adapter (which re-exports it);
`themeVars` stays in `css-lowering`, which it needs, and `@pureform/styling/theme-vars`
re-exports it.

On the web, interaction states are not part of the selection. The browser and the
bindings mark them on the element, and the generated CSS matches them, so a press changes
one attribute and calls nothing. Only a variant or token change calls the factory again.
On React Native there are no selectors, so states are in the selection, and each change is
one `Map.get` returning a cached, frozen object (measured in §2).

**How the web matches a state, in order of preference:**

1. **A native pseudo-class** (`:hover`, `:active`, `:focus-visible`, `:checked`,
   `:disabled`, `:placeholder-shown`, through `:has()` for a state inside the slot). It
   works before hydration, without our JS, and for plain-CSS and Tailwind users.
2. **An ARIA attribute** (`aria-checked`, `aria-selected`, `aria-pressed`,
   `aria-current`, `aria-expanded`, `aria-invalid`, `aria-disabled`, `aria-readonly`).
   Accessibility needs it set anyway, and it's a standard name, not a behavior library's.
3. **Our own `data-pf-*` attribute**, only where neither covers the state. The bindings
   set it; Zag's `data-*` attributes aren't matched, so swapping or upgrading Zag can't
   change styling.

State classes computed in JS were considered and rejected: they'd style nothing before
hydration, need our JS for plain-CSS users, cost a JS update per hover and press, and push
each state to every slot that reads it, where a descendant selector does that today.

Review of `css-lowering`'s lowering against these rules (the condition table, and the
slot-state table the preset mostly uses):

| State           | Native                                     | ARIA                                            | `data-pf-*`        | Change from today                                                                         |
| --------------- | ------------------------------------------ | ----------------------------------------------- | ------------------ | ----------------------------------------------------------------------------------------- |
| `hover`         | `:hover`                                   |                                                 | `data-pf-hover`    | `data-hover` → `data-pf-hover` (hover driven by another element, such as a label)         |
| `pressed`       | `:active`                                  |                                                 | `data-pf-active`   | Condition matched `data-active`, slot state `data-pressed`; one name now (keyboard press) |
| `focusVisible`  | `:focus-visible` (`:has()` within)         |                                                 |                    | Drop `data-focus-visible`                                                                 |
| `focusWithin`   | `:focus-within`                            |                                                 |                    | Drop `data-focused`; condition `focus` drops `data-focus`                                 |
| `dragged`       |                                            |                                                 | `data-pf-dragging` | `data-dragging` → `data-pf-dragging`                                                      |
| `filled`        | `:not(:placeholder-shown)` on an input     |                                                 | `data-pf-filled`   | `data-filled` → `data-pf-filled` (a select's value isn't in an input)                     |
| `checked`       | `:checked`                                 | `aria-checked=true`                             |                    | Drop `data-checked` and `data-state="checked"`                                            |
| `indeterminate` | `:indeterminate`                           | `aria-checked=mixed`                            |                    | Drop `data-indeterminate`                                                                 |
| `selected`      |                                            | `aria-selected`, `aria-pressed`, `aria-current` |                    | Drop `data-selected`                                                                      |
| `expanded`      |                                            | `aria-expanded`                                 |                    | Drop `data-expanded`                                                                      |
| `invalid`       | `:invalid` (condition only; not on fields) | `aria-invalid=true`                             |                    | Drop `data-invalid`                                                                       |
| `disabled`      | `:disabled`                                | `aria-disabled=true`                            |                    | Drop `data-disabled` and `[disabled]`; the slot state gains `aria-disabled`               |
| `readOnly`      | `:read-only`                               | `aria-readonly=true`                            |                    | Drop `data-read-only`                                                                     |

- **Panda** maps conditions to its built-in keys (`_hover`, `_checked`, …), whose
  selectors include Zag's attributes. pureform's recipes stop using those keys and emit
  the same selectors as the other targets; an app's own `_hover` keeps Panda's meaning.
- **The `data-pf-*` names** are exported as `STATE_ATTRIBUTES` from `@pureform/core`
  (`hover`, `pressed`, `dragged`, `filled` to their attributes); `css-lowering` builds its
  selectors from them and the bindings set them.
- **Output changes on purpose**, so it's checked against fixtures (an element in each
  state, marked each allowed way, plus Zag's attributes alone, which must not match)
  rather than the before-and-after equivalence check. Shorter selectors also shrink the
  CSS.

### 5.2 Generated factories per target

**Panda:** a thin wrapper over Panda's own `sva`. Panda's static extractor can't see
through it, so the generator also emits `staticCss` for every variant of every registered
component (or only the allow-listed ones, §7); accepted until pruning lands.

```ts
// .pureform/web/button.ts (generated)
import { button as recipe } from "../../styled-system/recipes";
export const button: ClassFactory<"button"> = (s) => recipe(s);
```

Built (p2c), hand-written in `apps/solid-demo/.pureform/` until p4b-panda generates it: Panda's
recipe returns a class string per slot, so the factory maps each to `{ class }`, caches one
frozen result per selection with `selectionCache`, and adds instance tokens with
`withTokenStyle`. The `staticCss` entries live in `.pureform/panda.ts`, a build-time module
`panda.config.ts` spreads in, apart from the runtime modules, which import `styled-system/`.

**CSS and Tailwind:** plain lookup tables with no runtime dependency. Tailwind also gets
`@source inline(...)` so it keeps the classes. This exists in part today: the CSS
adapter's Vite plugin (which the Tailwind adapter's reuses) generates each component's
class function from a manifest and serves it as `virtual:pureform/components`, typed from
the config, over `componentClasses` in `@pureform/css-adapter/runtime`. It returns a class
string per slot; the factory adds `style` for instance tokens and moves into `.pureform/`.

```ts
// .pureform/web/button.ts (generated; class names as the CSS adapter writes them, here
// with `classPrefix: "pf"`)
const base = { root: "pf-button__root", label: "pf-button__label" };
const variant = {
    filled: { root: "pf-button__root--variant_filled" },
    outlined: { root: "pf-button__root--variant_outlined" },
};
export const button: ClassFactory<"button"> = ({ variant: v = "filled" }) => ({
    root: { class: `${base.root} ${variant[v].root}` },
    label: { class: base.label },
});
```

**Native:** a precomputed table. Metro's `withPureform` already precomputes each theme's
resolved component styles, which `rn-adapter`'s `useSelected` selects from at runtime;
the factory adds the per-selection table on top. Token tweening (`useMovingTokens`)
wraps it.

```ts
// .pureform/native/button.ts (generated)
import { table } from "./button.table"; // key → frozen styles
export const button: StyleFactory<"button"> = (s) =>
    table.get(
        `${s.variant ?? "filled"}|${s.pressed ? 1 : 0}|${s.disabled ? 1 : 0}`,
    )!;
```

### 5.3 Hooks

Each binding offers a pair: a hook components use, and a lower-level hook that returns
the factory itself. Both read the same registry entry.

|                | Web (Solid, React)                           | React Native                               |
| -------------- | -------------------------------------------- | ------------------------------------------ |
| Components use | `useClasses(name, selection)` → slot classes | `useStyles(name, selection)` → slot styles |
| Lower level    | `useClassFactory(name)` → the factory        | `useStyleFactory(name)` → the factory      |

- `useClasses` memoizes the call: in Solid it takes an accessor and returns a memo; in
  React it takes the selection object and uses `useMemo`. Components can't forget the memo
  or get it wrong.
- `useClassFactory` is for calling the factory outside rendering: tests, event handlers,
  scripts. Several selections at once, such as one preview per variant in a picker, call
  `useClasses` once per selection instead, so they work with lazy entries too:

    ```tsx
    <For each={variants}>
        {(v) => (
            <Preview slots={useClasses("button", () => ({ variant: v }))} />
        )}
    </For>
    ```

**Static and lazy entries.** Each registry entry's kind is fixed when `.pureform/` is
generated, not by whether its chunk has loaded, so the server and the client always take
the same path and hydration sees the same shape of value (§5.7).

```ts
// Solid, roughly
function useClasses(name, selection) {
    const entry = useRegistry().entry(name);
    if (entry.kind === "static")
        return createMemo(() => entry.factory(selection())); // sync, no boundary
    return createMemo(async () => {
        const s = selection(); // tracked before the await
        return (await entry.load())(s); // resolves to classes, which serialize
    });
}
```

- **`useClasses`, static entry:** a plain memo. Nothing suspends, and no boundary is
  needed.
- **`useClasses`, lazy entry:** always an async memo, even when another component has
  already loaded the chunk. The component's code doesn't change; it needs a `<Loading>`
  (Solid) or `<Suspense>` (React) boundary somewhere above it.
    - Server: waits for the chunk and streams the classes.
    - Solid client: adopts the serialized classes, and loads the chunk the first time the
      selection changes.
    - React client: React doesn't serialize the value, so `use(promise)` holds that
      boundary's hydration until the chunk loads, then hydrates with the same classes.
      There is no flash or mismatch, but hydration waits on the chunk.
- **`useClassFactory`, static entry:** returns the factory; works everywhere.
- **`useClassFactory`, lazy entry:** client-only, since a function can't be serialized.
  It's a separate hook, `useLazyClassFactory`, which suspends with
  `ssrSource: "client"`: the server renders the boundary's fallback, and the client loads
  the chunk after hydrating. The generated registry types `useClassFactory` to accept only
  static names, so the client-only behavior shows where it's called, and in development
  `useLazyClassFactory` warns when it runs during a server render.
- **Preloading:** `registry.preload(name)` starts loading a lazy entry early, from a
  router loader or on hover, so its first change doesn't wait on the network.
- **Built (p2a), Solid:** as sketched. `useClasses` also lays the selection over the
  provider's `defaults` for the component (`withDefaults` in `@pureform/binding-core`), and
  reads the entry's kind once per instance. `useLazyClassFactory` boxes the factory in an async
  memo with `ssrSource: "client"`. Components rarely call `useClasses` directly: Root calls
  `useComponent(anatomy, { selection, testId, unstyled })`, which makes the one call and builds
  every part (§9.2). With nothing registered (a binding's own build), `Selection` takes any
  group and `tokens`, and every group and token takes `undefined` for its default.
- **Built (p2b), React:** `useClasses(name, selection)` takes a plain object and memoizes the
  factory call on the selection's value (`selectionSignature` in `@pureform/binding-core`), so
  an inline object is fine. A lazy entry goes through `use(entry.load())` (the registry's
  promise is shared and stable). `useLazyClassFactory` throws on the server, React's way of
  rendering a `<Suspense>` boundary's fallback there and the content on the client.

```tsx
// Solid
function Root(props) {
    const api = useButtonMachine(props); // aria-*, data-pf-active, data-pf-hover
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
- **Across the preset:** compounds went from 223 to 12, with output identical on both
  targets. Built CSS is about 28% smaller raw (7% gzipped) on the CSS target and 34% (9%)
  on Tailwind; React Native's precomputed styles are 12% smaller.
- **What stays compound:** cases that need both conditions at once: the FAB's size with
  its shape and with `extended`, each text input's fill with a leading icon, primary tabs
  with an icon, and interactive cards per fill (3).

### 5.6 Themes

- **Static:** each target scopes themes the way it natively does, and the factory exposes
  that as `themeAttributes(name)`, so components and providers never hard-code a selector:
    - Panda: its own `themes` config and `data-panda-theme`, with `getTheme`/`injectTheme`
      for themes loaded at runtime.
    - Tailwind v4: theme vars in `@theme`, scoped overrides under a `@custom-variant` on a
      data attribute, the convention Tailwind's docs use.
    - CSS adapter: `[data-theme=<name>]`, the attribute set by its `themeAttribute`
      option, since plain CSS has no native scope. The Tailwind adapter uses the same
      option for its `@custom-variant`.
    - React Native: a context value; no selectors.
      Switching a theme is an attribute (or context) change.
- **Runtime:** `<PureformProvider theme overrides>` sets theme scope and may override any
  `dynamic` token, writing CSS vars on web or a context value on native. Nested providers
  scope. Both halves exist today: `rn-adapter`'s `PureformProvider` takes `overrides`, and
  `css-lowering`'s `themeVars` turns a config's tokens into CSS vars. The bindings bring
  them under one provider. (`@pureform/theme`'s "providers" are something else: the
  token sources a config is composed from.)
- **Runtime-only themes** (generated from a seed color at runtime): the provider calls
  `@pureform/material`'s generators in the browser and writes vars. Opt-in import, so
  apps that don't use it don't ship the color math.

### 5.7 Server rendering

Goal: the server's HTML has every class, attribute, and CSS var the client would render,
so hydration changes nothing and the first paint is styled, in either color scheme.

- **Factories are pure.** A factory reads only its selection: no DOM, no globals, no
  state between calls. The server and the client get the same classes and vars from the
  same input. A contract test calls each generated factory in Node and in the browser and
  compares.
- **The registry is static by default; lazy entries suspend.** A static entry gives a
  component its factory on its first render, on the server and while hydrating. A lazy
  entry works too, as long as the lookup waits rather than returning nothing:
    - The lookup is an async memo that resolves to the **classes**, not the factory.
      Solid 2 serializes every async memo's result for hydration, and a factory is a
      function, which can't be serialized: resolving to it crashes the server render.
      Classes are plain data.
    - With Solid's default `ssrSource: "server"`, the client adopts the server's classes
      and doesn't load the entry while hydrating. It loads the entry the first time the
      selection changes.
    - The component needs a `<Loading>` boundary around it.
    - `useClasses` takes this path for every lazy entry, and `useClassFactory` accepts
      only static ones (§5.3).
    - A lazy entry behind a synchronous lookup renders without classes on the server and
      patches them in after loading: an unstyled flash, and Solid doesn't warn about it.
- **Code splitting is per component.** A component module imports its factory
  statically, and the app splits with the framework's `lazy()`. The factory travels in
  the component's chunk, so this needs no async lookup and no extra request.
- **Verified in Solid 2** (rc.15, `@solidjs/vite-plugin` start mode, streaming render): a
  static entry, a lazy entry with the async lookup, and a `lazy()` component whose factory
  is a static import all render their classes on the server, hydrate with the same classes,
  respond to clicks, and log nothing. The async lookup's chunk loaded only when its variant
  changed after hydration. The sync lookup over a lazy entry rendered no class on the
  server.
- **Nothing is module-level.** The registry, theme, and overrides come from
  `PureformProvider`'s context, so concurrent requests can't leak into each other.
- **Interaction states start off.** Machines render their initial state on the server
  (`data-disabled`, `aria-checked` from props). Hover, press, and focus states are set
  only by client events, so the server never guesses them.
- **Ids match.** Zag ids and the `aria-*` links between parts come from the framework's
  hydration-safe ids (Solid's `createUniqueId`, React's `useId`).
- **Client-only effects stay in effects.** Ripples, `matchMedia`, and measuring run after
  mount (`onSettled`, `useEffect`) and never change what was first rendered.

**Color scheme.** The server doesn't know the system preference, so nothing styles by
scheme in JS. The stylesheet already follows the system with
`@media (prefers-color-scheme)` and lets `.light`/`.dark` on the root override it. An
app that stores the user's choice reads it from a cookie on the server and renders the
class. No script runs before paint.

**Runtime themes and overrides** (§5.6) are written so either scheme works without JS:

- **Small overrides** (a few tokens, scheme-independent): an inline `style` with CSS vars
  on the provider's element, rendered on the server.
- **Whole themes** (from a seed color, or loaded at runtime): the provider generates both
  schemes' vars, on the server too, and writes one `<style>` block under the same scheme
  conditions the stylesheet uses, scoped to the target's theme attribute with the hash as
  its name (`[data-theme="pf-<hash>"]`, or `data-panda-theme` on Panda). The hash is of
  the theme's input (the seed and options), so the server and client agree on it without
  generating anything, and two providers with the same theme share one block. The block
  goes into `<head>` through the framework's own API, keyed by the hash so it's
  deduplicated:
    - Solid 2: `useHead` from `@solidjs/web`, which keeps head tags in step through
      hydration. `@solidjs/meta@1.0.0-next.2` (peer `solid-js ^2.0.0-rc.0`) is a thin
      `<Style key>` over it; the binding calls `useHead` directly, so apps don't need
      `@solidjs/meta`.
    - React 19: `<style href={hash} precedence="pureform">`, which hoists and dedupes.
    - Panda's `injectTheme` touches the DOM, so the Panda factory exposes the theme's CSS
      as a string and the provider renders it the same way.
- **Hydrating a runtime theme: both options.** `PureformProvider`'s `hydrate` option
  picks how the client gets a server-rendered theme:
    - `"reuse"` (the default): the client keeps the server's `<style>` block and
      generates nothing while hydrating; it only needs the hash, which comes from the
      input. The generators load lazily, the first time the theme changes on the client.
    - `"regenerate"`: the client runs the generators again while hydrating. They're pure,
      so the vars match. Use it when code reads the theme's values in JS, or when the
      server doesn't render the block (client-only routes).

**Instance tokens** become inline CSS vars from the factory, so they render on the
server. `@property` registrations are in the static stylesheet, so transitions work from
the first paint.

**React Native Web.** `StyleFactory` is pure as well, so RN-web's server-side style
extraction works as it does today. Animated tweens start once mounted, from the rendered
values.

**Testing.** Solid doesn't warn when hydration changes an attribute, so the suite compares
the DOM itself. It renders each component on the server, hydrates it, and fails on any
hydration warning or on any class, `style`, `data-*`, or `aria-*` attribute
that differs between the server's HTML and the hydrated DOM. It runs for each web target
and in both color schemes, plus once with a runtime theme.

### 5.8 Reduced motion

Today the web follows `prefers-reduced-motion` in CSS, and the ripple checks it in JS;
React Native only follows a `reducedMotion` prop on its provider, which defaults to off.
The design makes one setting, followed by everything that moves, on every target:

- **One setting, the system's by default.** `PureformProvider` takes
  `motion="system" | "reduce" | "full"`, defaulting to `"system"`, so an app can offer
  its own switch and nest it like a theme.
    - Web: the stylesheet's `reducedMotion` condition becomes
      `@media (prefers-reduced-motion: reduce)` on `:not([data-pf-motion="full"])`, or
      `[data-pf-motion="reduce"]` on an ancestor, the same pattern as `.light`/`.dark`
      (§5.7). The provider writes the attribute only when it isn't `"system"`.
    - React Native: `"system"` reads `AccessibilityInfo.isReduceMotionEnabled()` and
      follows its `reduceMotionChanged` event; the existing prop maps to `"reduce"` or
      `"full"`.
- **One hook for JS motion.** `useReducedMotion()` in each binding combines the provider's
  setting with the media query (web) or the OS (native). The ripple, Animated token tweens,
  and our own machines read it; nothing calls `matchMedia` on its own.
- **What reduces: movement only**, which is what `prefers-reduced-motion` asks for:
    - Stops: anything that moves, resizes, or reshapes. Transitions of `transform`,
      position, size (a progress bar's `width`), and `clip-path` (shape morphs); ripples;
      and token tweens of lengths, angles, and numbers, such as a progress value.
    - Keeps: color, opacity, and elevation (`box-shadow`) fades, so state changes stay
      as smooth as without the setting; and token tweens of colors.
    - Keeps: indeterminate progress, since its motion is the only sign that work is
      going on.
    - Zag's enter and exit animations need no change: Zag's presence logic finishes at
      once when no animation runs.
    - In the preset, the gate moves from the whole `transition` to each tween:
      `STATE_TWEENS` (colors and elevation) always run, and `tweens(...)` gates only the
      moving properties it's given. This changes output on purpose, so it's checked
      against expected values rather than the before-and-after equivalence check.
    - Built (p1b): `transitionMoves` and `valueTypeMoves` in `@pureform/core` decide what
      moves, and the preset's `motionTransition(...parts)` drops those parts under
      `reducedMotion` (`none` when nothing is left). The web rule is
      `REDUCED_MOTION_RULES` in `@pureform/css-lowering`; a `full` provider nested in a
      `reduce` one wins, for two levels. The Panda preset's `motionReduce` condition and the
      Tailwind adapter's `motion-reduce` variant are replaced with it, so an app's own
      reduced-motion styles follow the provider too.
- **Server rendering.** The web rule is CSS, so the first paint is right. JS motion runs
  only after an interaction, so the hook can start from the provider's setting on the
  server and pick up the system value after mount without a mismatch.
- **Testing.** Browser-mode tests emulate `prefers-reduced-motion` and set each
  `data-pf-motion` value, checking computed `transition` is `none` and that a ripple and a
  token tween don't run; React Native tests mock `AccessibilityInfo`.
- **Built (p2a):** the provider resolves `motion` as the CSS does: the nearest `"reduce"` or
  `"full"`, else `"system"`, so an explicit `"system"` inside a `"reduce"` provider keeps
  `"reduce"` (it writes no attribute, and the CSS can't say "system"). `useReducedMotion()`
  starts from `false` for the system and subscribes after mount (`subscribeReducedMotion` in
  `@pureform/binding-core/dom`).

### 5.9 Direction

The preset already uses logical properties (`paddingInline`, `insetInlineStart`) almost
everywhere, and the AST has `ltr`/`rtl` conditions that lower to
`:where([dir=rtl], :dir(rtl))` on the web and to `I18nManager.isRTL` on React Native.
What's missing is one source of direction for JS, and a few styles that don't flip.

- **Where direction comes from.** `PureformProvider` takes `dir="ltr" | "rtl"`,
  inherited by nested providers, `"ltr"` at the root by default:
    - Web: the provider writes `dir` on its element, so CSS and the browser agree with
      JS. Apps that set `<html dir>` pass the same value; it's a prop, so the server and
      client render the same thing (§5.7).
    - Zag: every machine gets `dir` from the provider, which drives arrow keys in tabs,
      radio groups, menus, and navigation. The slider's native range input takes its
      direction from the `dir` the provider writes.
    - React Native: the root default is `I18nManager.isRTL`, and selection gets
      `rtl` (the adapter's existing `rtl` state).
- **Styles flip without JS.** Logical properties do it on both targets. Where there's no
  logical property, the style says so with the `rtl` condition:
    - The switch's handle and state layer sit with `left` and center with
      `translate(-50%)`; they move to `insetInlineStart` with the translation flipped
      under `rtl`.
    - The linear progress's indeterminate keyframes run along `translateX`; an `rtl`
      set runs them the other way.
    - Symmetric uses stay: `left: 0` with `right: 0` or `width: 100%` (a control's
      native input, an outline layer), and centering with `left: 50%` and
      `translate(-50%)` (the touch target). The ripple is placed from pointer
      coordinates, which are physical anyway.
- **Icons that point.** The icon slot takes `mirror`, which sets `data-pf-mirror` and
  flips the icon with `scaleX(-1)` under `rtl`. Back arrows and chevrons set it; most icons
  don't. The icon slot contract decides the rest. Built as the portable `mirrored`
  condition (`STATE_ATTRIBUTES.mirrored`), which every icon slot reads under `rtl`.
- **Guarded by a test.** A preset spec fails on a physical horizontal property
  (`left`, `right`, `marginLeft`, `translateX`, …) unless it's symmetric or under a
  direction condition.
- **Decided in building it:** the switch's centering is `when("rtl", translate(50%, -50%),
translate(-50%, -50%))`; the linear progress's `rtl` keyframes are
  `linearProgressSlideRtl`, picked with `when("rtl", …)` on `animation`. The spec is
  `packages/preset/src/direction.spec.ts`; besides symmetric and direction-conditioned
  styles it takes an `ALLOWED` list of exceptions with reasons (the ripple, placed from
  pointer coordinates). A control's native input resets its margins, since the browser's
  default checkbox margins are physical. The mirrored-box helpers live in
  `tests/browser-e2e-tests/src/mirror.ts`.
- **Testing.** Each component renders in Chromium both ways, and every slot's box in
  `rtl` must mirror its `ltr` box across the root (`x' = width - x - w`). React Native
  does the same through selection with `rtl`. Keyboard suites run in both directions.

## 6. Generated glue

`pureform generate` (also run by the bundler plugin in dev and build) writes the factory
modules of §5.2 to `.pureform/`, and an index, also served as the virtual module
`virtual:pureform/registry`. It succeeds today's `virtual:pureform/components` from the
CSS and Tailwind adapters' Vite plugins:

```ts
// generated: do not edit
import { createRegistry } from "@pureform/styling";
import { button } from "./web/button";
export const registry = createRegistry({ button }); // static, for server rendering (§5.7)
export const themes = ["teal"] as const;
export type Components = "button" | "checkbox"; // augments typing
```

- Per-component modules keep it tree-shakable. The index imports them statically by
  default, so the first render needs no await, on the server too. A lazy entry is an
  option, looked up asynchronously (§5.7).
- A `.d.ts` augments `@pureform/styling`'s `ComponentRegistry` interface, so `Button`'s
  variant props type-check against the user's config, not the preset's defaults.
- Generated files live in `.pureform/`, like Panda's `styled-system/`.

**Committing it is the app's choice; the advice is not to.** It's glue derived from the
config and the installed packages, so committing it only adds diffs to review. Either way:

- **Not committed (recommended):** add `.pureform/` to `.gitignore`. The bundler plugin
  writes it when dev or build starts; for steps without a bundler (`tsc`, lint, tests),
  run `pureform generate` first, for example from the `prepare` script.
  `pureform generate` doesn't edit `.gitignore` itself; it prints the line to add when
  it finds the folder unignored in a git repository.
- **Committed:** `pureform generate --check` exits non-zero when the folder differs from
  what it would write, for CI.
- **Staleness.** Every generated file starts with a header holding a hash of the config,
  the build-tool options, and the pureform package versions. The plugin and `generate`
  rewrite only when it differs, so unchanged glue doesn't trigger a rebuild, and `--check`
  compares hashes before contents.
- **Missing glue.** If `.pureform/` is missing, importing it fails with a message naming
  `pureform generate` and the bundler plugin, rather than a bare module-not-found.

The app registers it once:
`<PureformProvider registry={registry}>`. Components read it from context. Tests can pass
a fake registry.

## 7. Tree shaking

Three layers, cheapest first:

1. **Package layout.** One subpath export per component in every package
   (`@pureform/solid/button`, `.pureform/web/button`), `sideEffects: false`, no
   barrel re-exports in runtime entries. The root `@pureform/solid` re-exports for DX,
   and is fine under modern bundlers because nothing has side effects.
2. **Allow-list.** The bundler plugin's `components` option limits what's generated:
   CSS, Panda `staticCss`, Tailwind sources, and registry entries. Default: everything.
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

Checked October 2026: `solid-js@next` is `2.0.0-rc.15`; `@zag-js/solid` `latest`
(1.46.0) and `next` (2.0.0-next.3) both peer on `solid-js >=1.1.3` and depend on
`@solid-primitives/keyed`, i.e. they target Solid 1's API (stores, `createEffect` shape,
`mergeProps`/`splitProps`). Solid 2 changes those.

Decision: **use the framework-free Zag packages** (`@zag-js/core` plus each machine, e.g.
`@zag-js/checkbox`) and **port the Solid adapter into `@pureform/solid/internal/zag`**.
The adapter is small: `useMachine` (bind service, props, effects, refs), `normalizeProps`,
`mergeProps`. Port it to Solid 2 primitives, with unit tests that run Zag's own anatomy
tests through it. Drop the port when `@zag-js/solid` ships Solid 2 support; keep the same
internal API so the swap is local.

**Built** (`packages/solid/src/internal/zag`, from `@zag-js/solid` 1.46.0):

- `useMachine` starts the machine in `onSettled` (Solid 1's `onMount`), and builds state
  and events as plain objects instead of `mergeProps` results, keeping the bindable's
  `ref` getter live.
- `createBindable` reads `ref.current` through a getter rather than an effect that lags
  a write, and boxes its signal's value, since Solid 2 treats a function passed to
  `createSignal` as a computation.
- `createTrack` uses Solid 2's split `createEffect(compute, effect)`.
- `normalizeProps` also maps Zag's React-style camelCase attributes (`tabIndex`,
  `readOnly`, `autoComplete`, …) to Solid 2's lowercase names, and keeps Zag's mapping of
  `defaultChecked`/`defaultValue` to `checked`/`value`, since Zag passes the current state
  there.
- `useMachine` accepts `undefined` for any prop, which the repo's
  `exactOptionalPropertyTypes` would otherwise reject, so components pass their optional
  props straight through.
- **Same exports as v1:** `useMachine`, `normalizeProps`, `mergeProps`, `PropTypes`,
  `useSyncExternalStore`, and `Key`, with v1's module names and signatures, so swapping
  to `@zag-js/solid` later is an import change. `Key` keeps its props but is built on
  Solid 2's `<For keyed>`, dropping the `@solid-primitives/keyed` dependency. The one
  addition is the `MachineProps` type that `useMachine` accepts.
- Browser-mode tests run Zag's checkbox, switch, and radio group through the port in
  Chromium, wired as the preset wires them (§9.5): pointer and keyboard input, focus
  visibility, controlled props that only ask to change, callbacks, and `FormData`.

Mapping of preset components:

| Component                                                                                            | Behavior                                                                                                                                                                                                                                                                    |
| ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| checkbox, switch, radio group, tabs, menu, dialog, tooltip, select, combobox (not in the preset yet) | Zag                                                                                                                                                                                                                                                                         |
| slider                                                                                               | own: the preset draws it over a native `<input type="range">`, which already handles dragging, the keyboard, forms, screen readers, and direction; Zag's slider expects to own the pointer and a focusable thumb instead. A range slider with two thumbs would revisit this |
| button, icon button, FAB, chip (assist/filter/input/suggestion)                                      | own (simple; press, focus, toggle)                                                                                                                                                                                                                                          |
| linear and circular progress                                                                         | own (no interaction; `role=progressbar` and value props)                                                                                                                                                                                                                    |
| ripple, state layer                                                                                  | own: the ripple is already framework-free in `@pureform/js-effects`; `apps/solid-demo/src/lib/ripple.tsx` is the Solid wiring to port                                                                                                                                       |
| navigation bar/rail, segmented button (not in the preset yet)                                        | Zag `toggle-group`/`tabs` where it fits, else own                                                                                                                                                                                                                           |
| text field                                                                                           | Zag-free own machine: Material's floating label states don't map to Zag's                                                                                                                                                                                                   |

Our own machines use the same shape as Zag's (`machine`, `connect` returning part props),
so bindings treat them uniformly.

**Built** (`@pureform/machines`, p1g): every machine is a namespace in Zag's shape
(`machine`, `connect`, `anatomy`, `props`, and its types), from the root or its own subpath.
Zag's checkbox, switch (as `switchControl`, since `switch` can't be an import name), and radio
group are re-exported; the rest follow with their components. Own machines: `button` (states
`idle` and `pressed`; focus, hover, and an optional toggle on `selected`), `ripple` (the
js-effects ripple attached to the layer's parent, reading its props at each press), and stubs
for `textField` and `slider`. The specs run them through Zag's vanilla adapter in Chromium.

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

- Parts read a `ButtonContext` created by `Root`: machine API, selection, and every
  slot's classes from one `useClasses` call (on React Native, styles from one
  `useStyles` call).
- **Built (p3a), Solid:** one subpath per component (`@pureform/solid/button`,
  `@pureform/solid/checkbox`). Its export is the ready-made component with the compound parts
  as properties (`Object.assign`), so `Button` and `Button.Root` come from one import. Every AST
  slot is a part, the touch target included (`Button.TouchTarget`). The ready-made button takes
  `label`, `icon` (its part renders only when given), and `mirrorIcon`, not children. Root's own
  props, how they map onto the selection and the machine, and the adjustments to Zag's part
  props live in `@pureform/binding-core` (`src/components/`), so React reads the same lists.
  Root's `id` is the machine's root id, since the machines find their elements by id. Variant
  props are typed `VariantProp<"button", "variant">`: the app's registered values, or any value
  while nothing is registered.
- **Built (p3b), React:** the same subpaths (`@pureform/react/button`, `@pureform/react/checkbox`),
  export shape, parts, elements, and DOM order, on the same binding-core lists. Slot-keyed
  classes are `className`, content props take `ReactNode`, and parts take a `ref`. Components
  call a `useMachine` wrapper that lets each machine prop be `undefined`, as Solid's port does.

### 9.2 What every part does

- Spreads, in order: machine part props, `data-pf-part`/`data-scope`, state data
  attributes, `class` from the registry, then user props.
- **Overrides:** `class` merges (registry first), `style` merges, `asChild`-style
  polymorphism via an `as` prop or render prop (`Button.Root as={A}`), `unstyled` opts a
  part out of registry styles.
- **Stable test ids:** `data-testid` defaults to `pf-<component>-<part>` (`pf-button-root`),
  overridable by `testId` on Root, which prefixes every part (`save-root`, `save-label`).
  Also always present: `data-pf-part`, and the ARIA and `data-pf-*` state attributes
  (§5.1), usable as selectors. Exported `testIds.button.root` constants from
  `@pureform/anatomy` so tests don't hard-code strings.
- **Per-instance styling hooks:** `tokens={{ value: 40 }}` sets instance tokens (§5.4).
- **Decided in building it:**
    - The anatomy is generated: a script in `@pureform/anatomy` writes it from the preset's
      default components as plain data, and a drift test compares it with what the AST
      derives. Deriving at import would bundle the whole preset to learn part names.
    - Attribute values and test ids are kebab case: the `touchTarget` part of `iconButton`
      is `data-pf-part="touch-target"`, `data-scope="icon-button"`, and
      `data-testid="pf-icon-button-touch-target"`; with `testId="save"` on Root it's
      `save-touch-target`. `testIds.iconButton.touchTarget` keeps the AST's names.
    - Each part records whether it's an icon that takes `mirror`: any of its styles reads
      the `mirrored` state.
- **Built (p2a), Solid:** `useComponent` returns a scope whose `part(name, options)` merges the
  sources above, plus the provider's `slotProps` between the registry and the user, and whose
  `render(name, { element, as, machine, states, props })` renders it. Classes join registry
  first (Solid's array form), styles merge (a string style is parsed), handlers all run, other
  keys take the last defined value. `combineProps` in `@pureform/binding-core` holds these
  rules, with the class and style joins passed in, so React shares them. Polymorphism is the
  `as` prop only, no render prop. An icon part provides its element to `useIconStyle()`, which
  measures it after mount and re-reads when the component's attributes change, a transition in
  it ends, or it resizes.
- **Built (p2b), React:** the same `useComponent` scope, with values instead of accessors. The
  merge order is binding-core's `partSources`, shared with Solid; React joins classes into one
  `className` string with `cx` (`clsx`-compatible, in binding-core) and merges style objects.
  Ready-made components take `className` keyed by slot, not `class`, as React props do.

### 9.3 Configurability

- **Global defaults** per component through the provider:
  `defaults={{ button: { variant: "tonal" } }}`.
- **Slot overrides** through the config (AST level, compiled) or through the provider
  (`slotProps={{ button: { label: { class: "…" } } }}`, runtime).
- **Ownership:** compound parts and slot-keyed overrides replace copying source. An
  `eject` command is deferred (§10).

### 9.4 Controlled and uncontrolled state

Every piece of state a user can change takes three props on `Root` (and on the ready-made
component), Zag's shape, identical in Solid and React:

```tsx
<Checkbox.Root checked={agreed()} onCheckedChange={(d) => setAgreed(d.checked)} /> // controlled
<Checkbox.Root defaultChecked name="terms" />                                        // uncontrolled
```

- **Names come from the AST's states**, so the prop and the style state match, and the
  CSS reads the state from the native element or ARIA (§5.1): `checked` →
  `:checked` or `aria-checked` → `slot("root", "checked")`:

    | Prop       | Components                                                                                                                  |
    | ---------- | --------------------------------------------------------------------------------------------------------------------------- |
    | `checked`  | checkbox (`boolean \| "indeterminate"`), switch                                                                             |
    | `selected` | chip, toggle icon button (`toggle: "true"` and `aria-pressed`)                                                              |
    | `value`    | text field, text area, select, slider, radio group, tabs, navigation bar and rail, segmented button (not in the preset yet) |
    | `open`     | menu, dialog, tooltip, select                                                                                               |

- **Controlled means defined.** A prop that isn't `undefined` controls the state; the
  `default*` prop is read once, at creation. Switching between them warns in development.
- **Controlled is strict.** The component asks with `on*Change` and shows the new state
  only once the prop changes. If the owner ignores the call, nothing moves, including a
  native input's value, which the binding writes back.
- **Callbacks report user actions only**, with a details object (`{ checked }`,
  `{ open, reason }`) so fields can be added later. A prop change never calls them. A
  form reset counts as a user action (§9.5).
- **Typed:** a `Controllable<"value", T>` helper writes the three props, and components
  with a value are generic over it (`Select<string[]>` when `multiple`).
- **Own machines match Zag.** `@pureform/machines` uses the same controllable-state
  helper Zag uses (`bindable`), so button toggles, chips, the slider, and the text field
  behave like the Zag-backed ones.
- **Server rendering:** the controlled or default value renders on the server as its
  attributes (§5.7).
- **React Native:** the same props; a `name` does nothing.
- **Built (p2a):** `Controllable<N, T>` and the switch warning live in
  `@pureform/binding-core`. Solid's `useControllable(component, name, props)` hands the machine
  the value, the default read once, and the callback; Zag already uses the same names. The
  warning fires once per instance.
- **Built (p3a):** the browser toggles a checkbox's native input before the machine hears of
  the click, and Zag writes the input only when its state changes, so a controlled checkbox
  whose owner ignored the change kept the toggle. The binding puts the input back
  (`syncCheckedInput` in `@pureform/binding-core/dom`) in a microtask after the click, once the
  machine's send and the owner's update have run.
- **Built (p3b), React:** the restore runs in a microtask after Zag's queued send, but the
  owner's update may render before or after it. So it doesn't read the machine (whose
  uncontrolled value only updates on render); when controlled, it puts the input back to the
  value last committed (read through a ref), and the owner's update, if any, moves it with the
  machine's own sync. Uncontrolled, the browser's toggle already is the new state.

### 9.5 Forms

Components take part in a native `<form>` the way native controls do: they submit, reset,
validate, and disable with it, with no form library.

- **Submitting.** A component with `name` submits under it:
    - Text field and text area: the `input` slot is the native `<input>` or `<textarea>`,
      so submitting, autofill, and the browser's validation work as is.
    - Checkbox, switch, radio, and slider: the preset already gives each an `input` slot,
      a native input stretched invisibly over the control that takes every interaction
      (`controlInput`), so the CSS's `:checked` and `:disabled` work. For checkbox,
      switch, and radio group, Zag's hidden-input props go on that slot, without Zag's
      visually-hidden inline style, which the slot's style replaces. Zag drives these
      machines from that input's click and focus events, so this is the path it expects.
      The slider is our own over its native range input (§8).
    - **Verified** in Chromium with Zag 1.46 and its vanilla adapter: pointer clicks and
      the keyboard (Space, arrow keys in the radio group) through the overlaid input
      change the state, fire the callbacks once each, keep `:has(:checked)` in step, and
      submit the right `FormData`.
    - Select: Zag's hidden `<select>`, so autofill fills it too, as an unstyled
      `HiddenSelect` part outside the slots; ready-made components render it themselves.
    - Values: checkbox and switch submit `value` (default `"on"`) when checked, a slider
      its number, a multiple select one entry per value.
- **Props:** `name`, `form` (a form's id, for a control outside it), `required`,
  `disabled`, and `readOnly`, forwarded to the native element, so `:read-only` and
  `:disabled` match (§5.1).
- **Reset.** A form reset puts uncontrolled state back to its `default*` value. On
  controlled state it calls the change callback with `reason: "reset"`, and the owner
  decides. React 19 and Solid 2 form actions reset the form after submitting, so this
  path is common.
    - **The bindings own it, not Zag.** In the same check, a reset did nothing for the
      checkbox and switch: Zag sets the input's `defaultChecked` to the current state on
      every render, so the native reset restores the current value, and Zag's own reset
      tracking changed nothing. For the radio group the native reset cleared both
      inputs while Zag kept its value, so the page and the machine disagreed.
    - So the bindings set the native input's default from the component's `default*`
      prop (not from the current state), listen for the form's `reset` event, and send
      the machine the default themselves, after the browser's reset has run.
- **Disabled fieldsets** disable every control in them. Zag tracks this with
  `trackFormControl` from `@zag-js/dom-query`. Its reset half didn't hold up (above), so
  the fieldset half got the same browser check; our own machines use pureform's
  `trackFormControl` instead, in the same shape (below).
- **Decided in building it** (`@pureform/machines/form`, p1g):
    - `trackFormReset(element, { onBeforeReset, onReset })` calls `onReset` in the task after
      the `reset` event: microtasks can run before the browser resets the controls, so a
      microtask is too early.
    - The native default is what a reset should show: the `default*` value when uncontrolled,
      the controlled value otherwise (the owner decides, and the input mustn't move). The
      binding writes it with `setNativeDefault` after Zag's props, which write the current
      state, and again in `onBeforeReset`, so the browser's own reset already shows it.
    - The fieldset half didn't hold up either: Zag reads only the closest fieldset, missing
      an enabled fieldset inside a disabled one and the first-legend exemption.
      `trackFieldsetDisabled` follows every fieldset around the control by the browser's
      rule, checked against `:disabled`; `trackFormControl` keeps Zag's shape over both.
- **Validation.** Material's error look keys on the `invalid` state. On a text input's
  slots the CSS matches `aria-invalid` on the slot or inside it, and not `:invalid`, so an
  empty required field doesn't show an error before the user acts. Three ways in:
    - `invalid` (boolean): the app decides; nothing else changes.
    - `error` (string): sets `invalid`, shows the text as supporting text, and calls
      `setCustomValidity`, so the browser blocks submitting and its validation APIs agree.
    - `validate="native"`: the native constraints (`required`, `pattern`, `min`, …)
      decide. The binding sets `invalid` once the user has interacted or tried to submit
      (`:user-invalid`'s rule) and shows the browser's `validationMessage`.
- **Before hydration** the server's HTML holds the native and hidden inputs with their
  initial values (§5.7), so a form submits correctly even before scripts load.
- **React Native** has no forms; apps use the controlled props (§9.4).
- **Built (p2a):** Solid's `useFormReset(input, { resetsTo, onBeforeReset, onReset })` and
  `useFieldsetDisabled(input)` wrap the helpers above. Zag's checkbox, switch, and radio group
  still reset themselves during the `reset` event, to their value at creation, which for a
  controlled component isn't the default. So `trackFormReset` now listens in the capture phase,
  and `onBeforeReset` opens a window until the next task in which those callbacks are marked
  `reason: "reset"` when uncontrolled (the value at creation is the default) and dropped when
  controlled; the binding's own send after the browser's reset then reports the real default
  with `reason: "reset"`. Zag's fieldset tracking still runs too; components OR
  `useFieldsetDisabled` into `disabled`, which covers the missed outer fieldset but not the
  legend exemption.
- **Built (p3a), checkbox:** Root is a `<label>` around the native input, as Zag's root props
  expect, so a click on the touch target, outside the control, toggles it. The preset has no
  label slot, so Zag's `aria-labelledby` (pointing at a label part) is dropped: the input is
  named with `aria-label`, which the ready-made checkbox forwards to it, or by a `<label for>`
  pointing at Root's `ids.input`. `readOnly` also sets `aria-readonly`. The marks drop Zag's
  `hidden`, since the CSS shows each in its state with a transition.

### 9.6 Icons

pureform ships no icon set. An icon is whatever the app renders: an SVG component, a
Material Symbols glyph, an image. The icon slot owns its size, color, and direction; the
icon only has to follow them.

- **Web contract: `1em` and `currentColor`.** The icon slot (`iconBox`) sets `width`,
  `height`, and `font-size` to the icon size, and each component sets the slot's color.
  An SVG with `width="1em" height="1em" fill="currentColor"` (what Iconify and
  `unplugin-icons` produce) or a font glyph such as Material Symbols then fits with no
  props. Raw Material Symbols SVG files carry only a `viewBox`, so they're imported
  through such a tool or given those attributes. The AST has no
  child selectors, and none are added for this.
- **React Native contract: a hook.** Nothing inherits there, so the icon part provides
  `useIconStyle()` → `{ size, color }`, and icon components take them as props
  (`<MyIcon size={size} color={color} />`). The web bindings offer the same hook for icon
  libraries that want numbers.
- **Material Symbols' axes.** Material draws some states with a filled icon, such as the
  active navigation destination. Icon slots get a `fill` token (0 or 1) that those states
  set, written as `font-variation-settings: "FILL" <fill>` for icon fonts. SVG icons can't
  read it, so `useIconStyle()` also returns `filled`, for apps that swap the SVG.
- **Placement.** Compound parts (`Button.Icon`, `TextField.LeadingIcon`), or props on the
  ready-made component (`icon`, `leadingIcon`, `trailingIcon`) taking any element. A slot
  renders only when given, and the component sets the matching variant
  (`leadingIcon: "true"` on the fields, `icon: "true"` on tabs), which the remaining
  compounds read (§5.5).
- **Direction:** `mirror` flips an icon that points under `rtl` (§5.9).
- **Decided in building it:**
    - The fill token is each component's `iconFill` (`0`), read by every icon slot through
      `iconBox` as `fontVariationSettings: fontVariations({ FILL: … })`, a new AST value
      (`fontVariations`). Only root slots can set tokens, so a state doesn't set `iconFill`;
      the icon slot switches to a second token while the state holds: `activeIconFill` on
      the current navigation destination, `selectedIconFill` on a selected icon button, both
      `1`. The standalone `icon` sets no fill unless `filled: "true" | "false"`, so it
      follows the slot it sits in. React Native drops the property.
    - `mirror` is an attribute, not a variant: a component can hold two icons and only one
      points. The binding sets `data-pf-mirror` (web) or the `mirrored` state (React
      Native) on the icon part; the `mirrored` condition matches it, and every icon slot
      flips with `scaleX(-1)` under `rtl` after its own transform.
    - A toggle icon button takes `toggle: "true"`: Material draws an unselected toggle
      differently from a plain icon button, so the binding sets the variant whenever
      `selected` or `defaultSelected` is given, and marks the state with `aria-pressed`. The
      unselected and selected colors per fill follow Material's toggle icon buttons through
      the color group's tokens; `elevated`, which Material doesn't toggle, selects to the
      group's color.
- **Accessibility.** Icons in a slot are decorative: `aria-hidden="true"`. The standalone
  `Icon` takes `label`, which makes it `role="img"` with that name. Icon-only components
  (icon button, FAB without text) require `aria-label` or `aria-labelledby` in their
  types, and in development they warn if both are missing at runtime.

### 9.7 Testing

- **Machines and anatomy:** Vitest unit tests, no DOM.
- **Solid components:** Vitest browser mode (existing setup), with
  `@solidjs/testing-library`; each component has an accessibility check (axe) and
  keyboard tests. A shared suite checks the rules of §9.4 for every stateful component:
  uncontrolled state changes on its own, controlled state doesn't change until the prop
  does, each callback fires once per user action and never for a prop change, and a form
  reset restores the default. A forms suite submits a form and compares its `FormData`,
  resets it, disables a fieldset, and checks that `required` and `error` block submitting.
- **E2E:** `tests/browser-e2e-tests` selects by `testIds` and roles; a shared contract
  suite runs the same specs against the Solid build and, later, React and RN-web, so
  bindings stay behaviorally identical.

## 10. CLI

`@pureform/cli` ships the `pureform` bin. It holds no generation logic of its own: it
calls `@pureform/generate`, the same step the plugin runs, so the two can't produce
different glue, and installing the CLI doesn't pull in the bundler plugin. A separate
package keeps the command where users look for it and gives later commands a home
without growing the plugin.

- `pureform generate [--watch] [--check]`: writes the `.pureform/` glue and its type
  declarations without a bundler, for `tsc`, lint, and tests, or before a dev server
  starts; `--check` verifies committed glue (§6).

Deferred until there's demand:

- `init`: one-time wiring of the config, bundler, and provider (a README covers it).
- `eject`: copying a component's file into the app. Slot-keyed overrides and compound
  parts should make it rarely needed.
- `doctor`: checking the config is importable from build and runtime, and the glue is
  fresh.

## 11. Versioning

Two groups, versioned differently, both under Conventional Commits and cocogitto
(`cog.toml`) as today:

- **The core train, in lockstep.** Every package that shares the AST format, the
  generated glue, or the factory types carries one version and is bumped together as one
  cocogitto package, `core-train` (tag `core-train-vX`): `core`, `theme`, `material`,
  `preset`, `css-lowering`, every `*-adapter`, `js-effects`, `utils`, `type-utils`,
  `styling`, `anatomy`, `machines`, `generate`, `bundler`, and `cli`. Users never match these by hand, and a mismatch between them is
  what breaks builds.
- **Bindings, independent.** `@pureform/solid`, `@pureform/react`, and
  `@pureform/react-native` follow their framework's pace and their own fixes, with their
  own package tags. Each declares the core train it works with as a peer range
  (`"@pureform/styling": "^0.4"`), and a train release that breaks them bumps that range
  in a binding release.
- **Tooling** (`tsconfig`, `vite-config`, `vitest-config`, the oxlint and oxfmt configs,
  `release`) is internal and keeps its own versions; it isn't part of either group.
- **Before 1.0:** a breaking change bumps the minor and everything else the patch, so
  `^0.y` only takes compatible releases.
- **Framework peers:** while Solid 2 is a release candidate, `@pureform/solid` peers on
  the exact RC it's tested with, and moves to `^2` when Solid 2 is stable. React peers on
  `^19`.
- **Mismatch detection:**
    - Build: `@pureform/generate` fails when installed core-train packages differ in
      version, or when an installed binding's peer range excludes the train, naming the
      packages and the versions to install.
    - Runtime, in development: the generated glue records the train's version, and each
      binding warns once if the runtime `@pureform/styling` differs from it, which means
      the glue is stale or two copies are installed. Production skips the check.
- **`cog.toml`:** the train is one package, `core-train`, whose `include` lists every train
  package's directory; a commit touching any of them bumps the whole train, and its bump
  hook (`@pureform/release`) sets every train package's version in `package.json` and
  `bun.lock`. Bindings and tooling keep their own package tags; apps and tests aren't in
  `cog.toml`. There is no global tag: cocogitto skips the global bump when no package
  bumps, so a train-only change would never release, and the global tag also counts commits
  to apps, tests, and docs.

## 12. Migration from what exists

1. Extract `@pureform/styling` from `rn-adapter`'s `useSelected`/selection code,
   `@pureform/css-adapter/runtime`'s `componentClasses`, and `css-lowering`'s
   `themeVars`.
2. Add `@pureform/anatomy` generated from the preset; test against the AST.
3. Port Zag's Solid adapter to Solid 2 (done, §8); build checkbox and button end to end on
   `solid-demo` with the Panda target.
   Build `@pureform/react` alongside it from the start, so anything the two duplicate
   surfaces early and moves into the shared packages.
4. Add `@pureform/generate` (config loading, codegen, staleness), then
   `@pureform/bundler` (virtual registry, no pruning) and `@pureform/cli`
   (`pureform generate`) over it.
5. Bring CSS and Tailwind targets to parity; switch `css-demo`/`tailwind-demo` to the
   components.
6. Pruning (§7, item 3).
7. Move RN components out of `rn-web-demo` into `@pureform/react-native` on the same
   anatomy.

Preset changes these designs need, independent of the steps above:

- Reduced motion stops movement only (§5.8): gate each moving tween, not the whole
  `transition`; React Native's token tweens check the token's value type.
- Direction (§5.9): the switch handle on `insetInlineStart`, `rtl` keyframes for the
  linear progress, the icon slot's `mirror`, and the physical property spec.
- Versioning (§11): the `cog.toml` changes, the train check in `@pureform/generate`, and
  the development warning in the bindings.
- Icons (§9.6): the icon slots' `fill` token and `font-variation-settings`, set by the
  states Material draws filled.
- State (§9.4): a `selected` state on the icon button, for toggle icon buttons.
- State matching (§5.1): rework `css-lowering`'s condition and slot-state tables to
  native, then ARIA, then `data-pf-*`, as the review table lists; Panda recipes stop
  using its built-in state keys; the bindings set the `data-pf-*` attributes.

## 13. Risks and open questions

1. **Zag over the preset's native inputs** (§9.5): verified for checkbox, switch, and
   radio group, with Zag's vanilla adapter and through the Solid 2 port (§8), except form
   reset, which the bindings take over. The slider doesn't use Zag (§8). Left: disabled
   fieldsets.

Decided:

- Factory generators live in each adapter's `/codegen` subpath.
- Panda's extractor can't follow the registry, so we rely on `staticCss` and accept its
  bloat until pruning.
- React is built in parallel with Solid.
- The text field gets its own machine.
- Solid 2 is treated as stable at RC, since any breaking change should be minor to fix;
  the exact RC is pinned (§11).
- Lookups cost little once cached per selection (§2), so there's no phone measurement.
- On the web, states are matched by native pseudo-classes, then ARIA, then pureform's own
  `data-pf-*` attributes (§5.1).
- Too many variant combinations is solved by tokens a style sets (§5.5), with fragments
  (§5.4) for the rest.
