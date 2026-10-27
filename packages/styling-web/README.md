# @pureform/styling-web

The web half of the style runtime: what bindings and generated web factory modules need beyond
the neutral [`@pureform/styling`](../styling/README.md). It holds the class factory's output types,
instance tokens as CSS vars, the CSS adapter's class function, runtime CSS themes, CSS var
naming, and the web registry. React Native never imports it.

It depends on `@pureform/core` (spring sampling), `@pureform/styling` (component types, the
neutral registry), and `@pureform/css-lowering` (`linear()` easing, var naming, `themeVars`).
Neither styling nor CSS lowering depends on it, and it depends on no binding.

## Modules

| Module                 | What it does                                                                                          |
| ---------------------- | ----------------------------------------------------------------------------------------------------- |
| `types.ts`             | `TokenStyle`, `SlotClasses`, `ClassSlots<C>`, `ClassFactory<C>` over styling's component types.       |
| `tokens.ts`            | `tokenStyle`, `withTokenStyle`, `joinClasses`, `TokenVars`, `SpringVars`.                             |
| `component-classes.ts` | `componentClasses`, the CSS adapter's manifest-driven class function.                                 |
| `registry.ts`          | `createWebRegistry`, `webRegistry`, `WebRegistry`, `AnyWebRegistry`, `VarOptions`, `ThemeAttributes`. |
| `runtime-theme.ts`     | Runtime themes: `defineRuntimeTheme`, `isRuntimeTheme`, `themeScope`, `preloadTheme`, `CssVars`.      |
| `theme-vars.ts`        | The `/theme-vars` subpath: `themeVars` from css-lowering, and `tokenVar`.                             |

## Web registry

```ts
import { createWebRegistry } from "@pureform/styling-web";

const registry = createWebRegistry(
    { button, card: { lazy: () => import("./web/card") } },
    { version, themeAttribute: "data-theme", vars: { prefix: "pf" } },
);
registry.entry("button"); // StaticEntry<typeof button>, as createRegistry types it
registry.themeAttributes("teal"); // { "data-theme": "teal" }, frozen; {} for no name
registry.vars; // { prefix: "pf" }, frozen; {} when none was recorded
```

`createWebRegistry` builds styling's neutral `createRegistry` and adds the web options;
`webRegistry(registry, options)` adds them to an existing neutral registry. Either way the
entries are the neutral registry's own objects (one lazy load is shared), static and lazy entry
types are inferred exactly as `createRegistry` infers them, and the result is frozen. The neutral
registry is left untouched. Generated web indexes (CSS, Tailwind, Panda) call
`createWebRegistry`; React Native indexes call styling's `createRegistry`. Web providers take an
`AnyWebRegistry`.

## Writing a web factory

```ts
import { selectionCache } from "@pureform/styling";
import type { Selection } from "@pureform/styling";
import { joinClasses, withTokenStyle } from "@pureform/styling-web";
import type { ClassFactory, ClassSlots } from "@pureform/styling-web";

const classes = selectionCache<Selection<"button">, ClassSlots<"button">>(
    { variants: ["variant"], defaults: { variant: "filled" } },
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

`withTokenStyle(slots, tokens, vars, slot = "root", springs?)` adds an instance's tokens as CSS
vars to one slot's `style` and returns `slots` itself when there are none. `tokenStyle` turns a
number into its string (pass lengths with their unit). A spring becomes `<var>-duration`,
`<var>-easing` (a `linear()` curve) and its parameters; a spring role's name on a spring token
reads the role's vars under the factory's `springs` prefixes. Full example:
`src/__fixtures__/web-button.ts`.

## Runtime themes

```ts
import {
    defineRuntimeTheme,
    preloadTheme,
    themeScope,
} from "@pureform/styling-web";

const seedTheme = defineRuntimeTheme<{ seed: string }>(
    "my-seed",
    () => import("./generate"),
);
const theme = seedTheme({ seed: "#006A60" }); // { source, input }, frozen
themeScope(theme); // "pf-1x2y3z": a hash of the source's name and the input
await preloadTheme(theme); // on the server, before rendering
```

A generator, `(input, vars: VarOptions) => { light, dark? }`, returns CSS vars named the target's
way. It must be pure: the server and the client run it apart. `@pureform/material/runtime-theme`'s
`seedTheme` is the one pureform ships.

## `/theme-vars`

`@pureform/styling-web/theme-vars` re-exports `themeVars` and `ThemeVarsOptions` from
`@pureform/css-lowering` and adds `tokenVar(path, vars)`: a token path's CSS var
(`"colors.primary"` → `--colors-primary`, `"components.button.container"` →
`--pf-components-button-container` with `prefix: "pf"`; a `--var` passes through). It replaces
the removed `@pureform/styling/theme-vars` subpath and keeps config lowering out of the root
entry that generated factory modules import.

## Scaffold, build and test

Scaffolded with the Omni MCP `ts-package` generator (lib, unit tests, no integration tests,
unpublished, `release_group: none`) into `/tmp/opencode/platform-phase4-generated/styling-web`,
then reconciled with `@pureform/web-contracts`' conventions: workspace config dependencies, no
example code or log/Zod dependencies, `sideEffects: false`, a `/theme-vars` entry. The package is
in the core release train (`cog.toml`, `generate`'s `CORE_PACKAGES`).

Through the omni MCP's `task_run`: `build` and `test:unit` on `@pureform/styling-web`.
`types.spec.ts` augments `@pureform/styling`'s `ComponentRegistry`, which reaches every spec in
the type check, so registry-dependent type tests live only there.
