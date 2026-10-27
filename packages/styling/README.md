# @pureform/styling

The runtime every binding and generated factory uses to get a component's styles: the component
and factory types, a small registry of factories by name, and a per-selection cache. It knows no
framework and no target. `@pureform/solid`, `@pureform/react`, `@pureform/react-native`, and the
generated `.pureform/` modules build on it (design doc §5); adapters stay build time and never
ship in a bundle, this package is what does.

It depends on `@pureform/core` alone, for types and nothing else; it has no CSS or web
dependency, so React Native reaches no web package through it. The web half (the class factory's
output types, instance tokens as CSS vars, `componentClasses`, runtime CSS themes, `tokenVar` and
`themeVars`, and the web registry with its theme attribute and var prefixes) is
[`@pureform/styling-web`](../styling-web/README.md), which depends on this package. Generated
declarations still augment this package's `ComponentRegistry` and `SpringRoleRegistry`.

## Architecture

```
generated .d.ts ──augments──► ComponentRegistry ──► Variants, SlotOf, States, InstanceTokens
                                                          │
generated factory module ──uses──► selectionCache ◄───────┤ StyleFactory (React Native)
   (.pureform/native/button.ts)                           │ ClassFactory (web: styling-web)
                                                          │
generated index ──► createRegistry({ button, card: { lazy } }) ──► entry(name), preload(name)
                    (web: styling-web's createWebRegistry,               │
                     the same entries plus web options)   bindings' useClasses / useStyles
```

| Module               | What it does                                                                 |
| -------------------- | ---------------------------------------------------------------------------- |
| `types.ts`           | `ComponentRegistry` and the types derived from it: selections and factories. |
| `registry.ts`        | `createRegistry`: static and lazy entries, `entry`, `preload`.               |
| `package-version.ts` | `VERSION`, this package's version (set by `@pureform/release`).              |
| `cache.ts`           | `selectionCache`: a factory's results per selection key, frozen.             |

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

The generated registry passes the core's version as a second argument,
`createRegistry({ button }, { version: "0.4.0" })`, and `registry.version` returns it. In
development the bindings compare it with `VERSION`, this package's own version, and warn
once when they differ (the registry is stale, or two copies of `@pureform/styling` are
installed).

A web target's index makes `@pureform/styling-web`'s `createWebRegistry` instead: the same
entries (the same objects, typed the same way) plus the target's theme attribute and CSS var
prefixes. A React Native target's index makes this neutral registry, frozen, with neither.

### Writing a factory

```ts
import { selectionCache } from "@pureform/styling";
import type {
    Selection,
    StyleFactory,
    StyleSlots,
    States,
} from "@pureform/styling";

export const button: StyleFactory<"button"> = selectionCache<
    Selection<"button"> & States<"button">,
    StyleSlots<"button">
>(
    {
        variants: ["variant"],
        states: ["pressed"],
        defaults: { variant: "filled" },
    },
    (s) => ({ root: { style: { opacity: s.pressed ? 0.9 : 1 } } }),
);
```

- `selectionCache(order, compute)` keys a selection by its groups (defaults filled, booleans
  as `"true"`/`"false"`) then a bit per state, computes a key once, and deep-freezes the
  result. Tokens aren't in the key. `.size` and `.clear()` are there for tests.
- A web factory (`ClassFactory`, `withTokenStyle`, `joinClasses`) is written with
  `@pureform/styling-web`; see its README and `src/__fixtures__/web-button.ts` there.
- Full native example: `src/__fixtures__/native-button.ts`.

### Moved to `@pureform/styling-web`

`TokenStyle`, `SlotClasses`, `ClassSlots`, `ClassFactory`, `CssVars`, `componentClasses` (and
`Choice`, `ComponentClasses`, `ComponentManifest`), `joinClasses`, `tokenStyle`, `withTokenStyle`,
`TokenVars`, `SpringVars`, the runtime themes (`defineRuntimeTheme`, `isRuntimeTheme`,
`preloadTheme`, `themeScope` and their types), `ThemeAttributes`, `VarOptions`, the registry's
`themeAttribute`/`themeAttributes`/`vars`, and the `/theme-vars` subpath (now
`@pureform/styling-web/theme-vars`). There are no compatibility re-exports here.

## Build and test

Through the omni MCP's `task_run`: `build` and `test:unit` on `@pureform/styling`. The unit
run also type-checks the specs (`expectTypeOf`, `@ts-expect-error`); `types.spec.ts` augments
`ComponentRegistry`, which reaches every spec in the type check, so registry-dependent type
tests live only there.

## Limits

- Nothing here reads a DOM, a global, or a framework: factories must stay pure (§5.7). The
  registry itself isn't module-level state in an app; the provider holds it.
- A key joins values with `|`, so a variant value can't contain one.
- The registry's `springs` (beside `tokens`) types spring tokens: `InstanceTokens` gives a
  spring token `InstanceSpringValue` (a spring or a `SpringRole`, from `SpringRoleRegistry`)
  and every other token a `TokenValue`. How a target writes them is the target's.
- The hooks (`useClasses`, `useClassFactory`, `useStyles`) are the bindings'.
