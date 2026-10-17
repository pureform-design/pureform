# @pureform/styling

The runtime every binding and generated factory uses to get a component's styles: the factory
types, a small registry of factories by name, a per-selection cache, and helpers for class
strings and instance tokens. It knows no framework and no target. `@pureform/solid`,
`@pureform/react`, and the generated `.pureform/` modules build on it (design doc §5); adapters
stay build time and never ship in a bundle, this package is what does.

It depends on `@pureform/core` for types, and on `@pureform/css-lowering` only for the
`/theme-vars` subpath.

## Architecture

```
generated .d.ts ──augments──► ComponentRegistry ──► Variants, SlotOf, States, InstanceTokens
                                                          │
generated factory module ──uses──► selectionCache ◄───────┤ ClassFactory (web)
   (.pureform/web/button.ts)       withTokenStyle         │ StyleFactory (React Native)
                                   joinClasses            │
generated index ──► createRegistry({ button, card: { lazy } }) ──► entry(name), preload(name)
                                                                        │
                                                bindings' useClasses / useStyles
```

| Module                 | What it does                                                                 |
| ---------------------- | ---------------------------------------------------------------------------- |
| `types.ts`             | `ComponentRegistry` and the types derived from it: selections and factories. |
| `registry.ts`          | `createRegistry`: static and lazy entries, `entry`, `preload`.               |
| `package-version.ts`   | `VERSION`, this package's version (set by `@pureform/release`).              |
| `cache.ts`             | `selectionCache`: a factory's results per selection key, frozen.             |
| `tokens.ts`            | Instance tokens as CSS vars, and `joinClasses`.                              |
| `component-classes.ts` | `componentClasses`, the CSS adapter's manifest-driven class function.        |
| `theme-vars.ts`        | The `/theme-vars` subpath: `themeVars` from `@pureform/css-lowering`.        |

## Public API

### Types

A component is named by a key of `ComponentRegistry`, which generated declarations augment
from the app's config, or described inline by a `ComponentShape`:

```ts
declare module "@pureform/styling" {
    interface ComponentRegistry {
        button: {
            variants: { variant: "filled" | "text"; toggle: "true" | "false" };
            slots: "root" | "label";
            states: "pressed" | "disabled"; // default: every ComponentState
            tokens: "accent"; // dynamic tokens an instance may set; default none
            lazy?: true; // the registry entry loads on demand
        };
    }
}
```

| Type                      | For `"button"` above                                                      |
| ------------------------- | ------------------------------------------------------------------------- |
| `Variants<C>`             | `{ variant?: "filled" \| "text"; toggle?: "true" \| "false" \| boolean }` |
| `SlotOf<C>`               | `"root" \| "label"` (`"root"` when the shape has no slots)                |
| `States<C>`               | `{ pressed?: boolean; disabled?: boolean }`                               |
| `InstanceTokens<C>`       | `{ accent?: string \| number }`                                           |
| `Selection<C>`            | `Variants<C> & { tokens?: InstanceTokens<C> }`                            |
| `ClassFactory<C>`         | `(s: Selection<C>) => { root: { class, style? }; label: … }`              |
| `StyleFactory<C, Style?>` | `(s: Selection<C> & States<C>) => { root: { style, drawing? }; … }`       |

Every group and token also takes `undefined`, which means its default, so a component can pass
its optional props straight through (`{ variant: props.variant }`).

While nothing is registered, any string names a component, typed openly: any group, and
`tokens`. That's how a binding's own code sees every component, since the app's declarations
aren't part of its build. Once the registry is augmented, an unknown name is a type error.
`StaticComponentName` and `LazyComponentName` split the registered names by entry kind; with
nothing registered, both are `string`.

### Registry

```ts
import { createRegistry } from "@pureform/styling";
import { button } from "./web/button";

const registry = createRegistry({
    button, // static: the factory is there on the first render, on the server too
    card: { lazy: () => import("./web/card") }, // the module itself, its default, or its `card`
});

registry.entry("button"); // { kind: "static", name, factory }
await registry.entry("card").load(); // { kind: "lazy", name, load() }, one shared promise
registry.preload("card"); // start early; never rejects
```

An entry's kind is fixed at creation, so the server and the client take the same path (§5.7).
`entry` returns the same object on every call and throws for an unknown name.

Generated glue passes the core train's version as a second argument,
`createRegistry({ button }, { version: "0.4.0" })`, and `registry.version` returns it. In
development the bindings compare it with `VERSION`, this package's own version, and warn
once when they differ (the glue is stale, or two copies of `@pureform/styling` are installed).

It also passes the attribute the target scopes named themes with, and
`registry.themeAttributes(name)` gives the attributes that put an element and everything under
it in that theme. Providers write them on their element; an app can spread them anywhere:

```ts
const registry = createRegistry({ button }, { themeAttribute: "data-theme" });
registry.themeAttributes("teal"); // { "data-theme": "teal" }, frozen
registry.themeAttributes(undefined); // {}: the base theme
```

Panda's glue passes `data-panda-theme`, the CSS and Tailwind targets their `themeAttribute`
option (default `data-theme`), and React Native nothing, so its `themeAttributes` is always
empty.

### Writing a factory

```ts
import { joinClasses, selectionCache, withTokenStyle } from "@pureform/styling";
import type { ClassFactory, ClassSlots, Selection } from "@pureform/styling";

const classes = selectionCache<Selection<"button">, ClassSlots<"button">>(
    {
        variants: ["variant", "toggle"],
        defaults: { variant: "filled", toggle: "false" },
    },
    (s) => ({
        root: {
            class: joinClasses(
                "pf-button__root",
                `pf-button__root--variant_${s.variant}`,
            ),
        },
        label: { class: "pf-button__label" },
    }),
);
export const button: ClassFactory<"button"> = (s) =>
    withTokenStyle(classes(s), s.tokens, {
        accent: "--components-button-accent",
    });
```

- `selectionCache(order, compute)` keys a selection by its groups (defaults filled, booleans
  as `"true"`/`"false"`) then a bit per state, computes a key once, and deep-freezes the
  result. Tokens aren't in the key. `.size` and `.clear()` are there for tests.
- `withTokenStyle(slots, tokens, vars, slot = "root")` adds an instance's tokens as CSS vars
  to one slot's `style`, and returns `slots` itself when there are none.
- Full examples: `src/__fixtures__/web-button.ts` and `src/__fixtures__/native-button.ts`.

### Moved here

- `componentClasses`, `ComponentManifest`, `ComponentClasses`, `Choice`: the CSS adapter's
  class name runtime. `@pureform/css-adapter/runtime` re-exports them, and its generated
  modules still import from there.
- `@pureform/styling/theme-vars` re-exports `themeVars` and `ThemeVarsOptions` from
  `@pureform/css-lowering`, where they still live (they need its lowering). The root entry
  doesn't import it, so React Native doesn't pull in CSS lowering.

## Build and test

Through the omni MCP's `task_run`: `build` and `test:unit` on `@pureform/styling`. The unit
run also type-checks the specs (`expectTypeOf`, `@ts-expect-error`); `types.spec.ts` augments
`ComponentRegistry`, which reaches every spec in the type check, so registry-dependent type
tests live only there.

## Limits

- Nothing here reads a DOM, a global, or a framework: factories must stay pure (§5.7). The
  registry itself isn't module-level state in an app; the provider holds it.
- A key joins values with `|`, so a variant value can't contain one.
- `tokenStyle` turns a number into its string: pass a length with its unit.
- The hooks (`useClasses`, `useClassFactory`, `useStyles`) are the bindings' (p2a, p2b, p8).
