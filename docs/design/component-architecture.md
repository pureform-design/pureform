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

Non-goals: shadcn-style copying of source (§10).

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
- **Across the preset:** compounds went from 223 to 12, with output identical on both
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
  conditions the stylesheet uses, scoped to `[data-pf-theme="<hash>"]`. The hash is of
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
      follows its `reduceMotionChanged` event; the existing prop maps to `"reduce"`/`"full"`.
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
- **Server rendering.** The web rule is CSS, so the first paint is right. JS motion runs
  only after an interaction, so the hook can start from the provider's setting on the
  server and pick up the system value after mount without a mismatch.
- **Testing.** Browser-mode tests emulate `prefers-reduced-motion` and set each
  `data-pf-motion` value, checking computed `transition` is `none` and that a ripple and a
  token tween don't run; React Native tests mock `AccessibilityInfo`.

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
      radio groups, sliders, menus, and navigation.
    - React Native: the root default is `I18nManager.isRTL`, and selection gets
      `rtl` (the adapter's existing `rtl` state).
- **Styles flip without JS.** Logical properties do it on both targets. Where there's no
  logical property, the style says so with the `rtl` condition:
    - The switch's handle and state layer sit with `left` and center with
      `translate(-50%)`; they move to `insetInlineStart` with the translation flipped
      under `rtl`.
    - The linear progress's indeterminate keyframes run along `translateX`; an `rtl`
      set runs them the other way.
    - Symmetric uses (`left: 0` with `right: 0`, or centering with `left: 50%`) stay.
- **Icons that point.** The icon slot takes `mirror`, which sets `data-pf-mirror` and
  flips the icon with `scaleX(-1)` under `rtl`. Back arrows and chevrons set it; most icons
  don't. The icon slot contract decides the rest.
- **Guarded by a test.** A preset spec fails on a physical horizontal property
  (`left`, `right`, `marginLeft`, `translateX`, …) unless it's symmetric or under a
  direction condition.
- **Testing.** Each component renders in Chromium both ways, and every slot's box in
  `rtl` must mirror its `ltr` box across the root (`x' = width - x - w`). React Native
  does the same through selection with `rtl`. Keyboard suites run in both directions.

## 6. Generated glue

`pureform generate` (also run by the bundler plugin in dev and build) writes the factory
modules of §5.2 to `.pureform/`, and an index, also served as the virtual module
`virtual:pureform/registry`:

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
  run `pureform generate` first, for example from the `prepare` script. `pureform
generate` doesn't edit `.gitignore` itself; it prints the line to add when it finds the
  folder unignored in a git repository.
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

### 9.4 Controlled and uncontrolled state

Every piece of state a user can change takes three props on `Root` (and on the ready-made
component), Zag's shape, identical in Solid and React:

```tsx
<Checkbox.Root checked={agreed()} onCheckedChange={(d) => setAgreed(d.checked)} /> // controlled
<Checkbox.Root defaultChecked name="terms" />                                        // uncontrolled
```

- **Names come from the AST's states**, so the prop, the data attribute, and the style
  state match (`checked` → `data-checked` → `slot("root", "checked")`):

    | Prop       | Components                                                                                          |
    | ---------- | --------------------------------------------------------------------------------------------------- |
    | `checked`  | checkbox (`boolean \| "indeterminate"`), switch                                                     |
    | `selected` | chip, toggle icon button                                                                            |
    | `value`    | text field, text area, select, slider, radio group, tabs, navigation bar and rail, segmented button |
    | `open`     | menu, dialog, tooltip, select                                                                       |

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
  helper Zag uses (`bindable`), so button toggles, chips, and the text field behave like
  the Zag-backed ones.
- **Server rendering:** the controlled or default value renders on the server as its
  attributes (§5.7).
- **React Native:** the same props; a `name` does nothing.

### 9.5 Forms

Components take part in a native `<form>` the way native controls do: they submit, reset,
validate, and disable with it, with no form library.

- **Submitting.** A component with `name` submits under it:
    - Text field and text area: the `input` slot is the native `<input>` or `<textarea>`,
      so submitting, autofill, and the browser's validation work as is.
    - Zag-backed controls (checkbox, switch, radio group, slider, select): Zag's hidden
      native input, or for select its hidden `<select>`, so autofill fills it too. It
      becomes an unstyled `HiddenInput` part in the anatomy, alongside the slots;
      ready-made components render it themselves.
    - Values: checkbox and switch submit `value` (default `"on"`) when checked, a slider
      its number, a multiple select one entry per value.
- **Props:** `name`, `form` (a form's id, for a control outside it), `required`,
  `disabled`, and `readOnly`, forwarded to the native element.
- **Reset.** A form reset puts uncontrolled state back to its `default*` value. On
  controlled state it calls the change callback with `reason: "reset"`, and the owner
  decides. React 19 and Solid 2 form actions reset the form after submitting, so this
  path is common.
- **Disabled fieldsets** disable every control in them. Zag tracks this with
  `trackFormControl`; our own machines use the same helper from `@zag-js/dom-query`.
- **Validation.** Material's error look keys on the `invalid` state, which the CSS
  already matches as `aria-invalid` or `data-invalid`. Three ways in:
    - `invalid` (boolean): the app decides; nothing else changes.
    - `error` (string): sets `invalid`, shows the text as supporting text, and calls
      `setCustomValidity`, so the browser blocks submitting and its validation APIs agree.
    - `validate="native"`: the native constraints (`required`, `pattern`, `min`, …)
      decide. The binding sets `invalid` once the user has interacted or tried to submit
      (`:user-invalid`'s rule) and shows the browser's `validationMessage`.
- **Before hydration** the server's HTML holds the native and hidden inputs with their
  initial values (§5.7), so a form submits correctly even before scripts load.
- **React Native** has no forms; apps use the controlled props (§9.4).

### 9.6 Icons

pureform ships no icon set. An icon is whatever the app renders: an SVG component, a
Material Symbols glyph, an image. The icon slot owns its size, color, and direction; the
icon only has to follow them.

- **Web contract: `1em` and `currentColor`.** The icon slot (`iconBox`) sets
  `width`, `height`, and `font-size` to the icon size, and the slot's color. An SVG with
  `width="1em" height="1em" fill="currentColor"` (what Material Symbols' SVGs, Iconify,
  and `unplugin-icons` produce) or a font glyph then fits with no props. The AST has no
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
  renders only when given, and the root gets the data attribute that the icon-dependent
  styles match (the fields' and tabs' remaining compounds, §5.5).
- **Direction:** `mirror` flips an icon that points under `rtl` (§5.9).
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
different glue, and installing the CLI doesn't pull in the bundler plugin. A separate package keeps the command where users look for it and
gives later commands a home without growing the plugin.

- `pureform generate [--watch] [--check]`: writes the `.pureform/` glue and its type
  declarations without a bundler, for `tsc`, lint, and tests, or before a dev server
  starts; `--check` verifies committed glue (§6).

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
4. Add `@pureform/generate` (config loading, codegen, staleness), then
   `@pureform/bundler` (virtual registry, no pruning) and `@pureform/cli`
   (`pureform generate`) over it.
5. Bring CSS and Tailwind targets to parity; switch `css-demo`/`tailwind-demo` to the
   components.
6. Pruning (§7.3).
7. Move RN components out of `rn-web-demo` into `@pureform/react-native` on the same
   anatomy.

Preset changes these designs need, independent of the steps above:

- Reduced motion stops movement only (§5.8): gate each moving tween, not the whole
  `transition`; React Native's token tweens check the token's value type.
- Direction (§5.9): the switch handle on `insetInlineStart`, `rtl` keyframes for the
  linear progress, the icon slot's `mirror`, and the physical property spec.
- Icons (§9.6): the icon slots' `fill` token and `font-variation-settings`, set by the
  states Material draws filled.

## 12. Risks and open questions

1. **Lookup cost.** Benchmark before step 3 ends. Fallback: compile-time inlining of
   static variant classes by the bundler plugin.
2. **Solid 2 is RC.** API churn could break the Zag port; pin and track. Check whether
   `@zag-js/solid` supports Solid 2 before porting the adapter.
3. **Not yet covered:** how packages are versioned together.

Decided: factory generators live in each adapter's `/codegen` subpath; Panda's extractor
can't follow the registry, so we rely on `staticCss` and accept its bloat until pruning;
React built in parallel with Solid; text field gets its own machine; state lives on the
web as data attributes; too many variant combinations is solved by tokens a style sets
(§5.5), with fragments (§5.4) for the rest.
