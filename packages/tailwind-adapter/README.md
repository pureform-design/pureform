# @pureform/tailwind-adapter

Compiles a pureform config to a Tailwind v4 stylesheet: the tokens as Tailwind theme
variables, so utilities such as `bg-primary` and `rounded-large` read pureform's values;
custom variants for the color schemes, reduced motion, and named themes; and the components'
CSS inside Tailwind's components layer, so utilities override components.

## Where it sits

```
@pureform/core ──► @pureform/css-lowering ──► @pureform/css-adapter ──► @pureform/tailwind-adapter
```

The components' CSS is the CSS adapter's, so components look the same as with plain CSS and
the Panda preset. `apps/tailwind-demo` uses it. The `/codegen` subpath is what
`@pureform/generate` loads for the `tailwind` target; it also depends on `@pureform/generate`
and reuses the CSS adapter's codegen.

## Architecture

| Module        | What it does                                                                                            |
| ------------- | ------------------------------------------------------------------------------------------------------- |
| `tailwind.ts` | `toTailwind`: the config as Tailwind's pieces (theme, variants, components); `tailwindCss` writes them. |
| `codegen.ts`  | `codegen`: the `tailwind` target's factory modules and stylesheet, for `@pureform/generate`.            |

The theme is `@theme inline`: each Tailwind variable names the pureform var it stands for, so a
dark scheme or a named theme switches utilities and components alike.

## Public API

| Entry                                | Exports                                                         |
| ------------------------------------ | --------------------------------------------------------------- |
| `@pureform/tailwind-adapter`         | `compileTailwind`, `toTailwind`, `tailwindCss`, and their types |
| `@pureform/tailwind-adapter/codegen` | `codegen`, `TailwindCodegenOptions`, `STYLESHEET_FILE`          |

An app uses the target through the bundler plugin (`@pureform/bundler`) or `pureform generate`,
which write the stylesheet and the registry into `.pureform/`:

1. `pureform.config.ts` (default export) and a glue file:

    ```ts
    // pureform.glue.ts
    import type { PureformPluginOptions } from "@pureform/bundler";
    import type { TailwindCodegenOptions } from "@pureform/tailwind-adapter/codegen";

    export const glue = {
        target: "tailwind",
        options: { prefix: "pf", classPrefix: "pf" },
    } satisfies PureformPluginOptions<TailwindCodegenOptions>;
    ```

2. The bundler plugin before Tailwind's, so the stylesheet exists when Tailwind reads it (add
   `.pureform` to `.gitignore`, and `".pureform/**/*.*"` to the tsconfig's `include`):

    ```ts
    // vite.config.ts
    import pureform from "@pureform/bundler/vite";
    import tailwindcss from "@tailwindcss/vite";
    import { glue } from "./pureform.glue";

    export default { plugins: [pureform(glue), tailwindcss(), solid()] };
    ```

3. The app's CSS imports Tailwind, then the generated stylesheet; the provider takes the
   registry:

    ```css
    @import "tailwindcss";
    @import "../.pureform/styles.css";
    ```

    ```tsx
    import { registry } from "../.pureform";

    <PureformProvider registry={registry} theme="teal">
        …
    </PureformProvider>;
    ```

Named themes are scoped by `themeAttribute` (default `data-theme`), the attribute the
`theme-<name>` variants match: the provider's `theme` writes `registry.themeAttributes(theme)` on
its element, so components and utilities switch together. Utilities override a component
through its slot classes (`class={{ root: "rounded-none" }}`), since they sit in a later layer.
`apps/tailwind-demo` is a working example.

Options are the CSS adapter's, plus `palette` (map the raw palette too), `replace` (clear
Tailwind's defaults in the namespaces pureform fills), and `themeVariant` (a named theme's
variant name, `theme-<name>` by default).

## Codegen

`@pureform/tailwind-adapter/codegen` exports `codegen`, the `CodegenAdapter` named `tailwind`
(platform `web`) that `generate({ target: "tailwind" })` loads. For the allow-listed components
(`components`, all by default) it writes, under `.pureform/`:

- **`web/<name>.ts`**: the CSS adapter's `ClassFactory` modules, byte for byte (its
  `componentModules`), since the Tailwind stylesheet keeps the CSS adapter's class names. See
  [the CSS adapter's codegen](../css-adapter/README.md#generated-glue-codegen).
- **`styles.css`**: `compileTailwind` over the config with only those components (tokens,
  themes, variants, and keyframes stay), narrowed to the variant values a pruned build uses
  (`subsetConfig` with `context.variants`, as the CSS target does). The app imports it after Tailwind:

    ```css
    @import "tailwindcss";
    @import "../.pureform/styles.css";
    ```

Its options are `TailwindOptions` (`classPrefix` and `prefix` name the factories' classes and
vars too). It returns `themeAttribute` (the option, default `data-theme`) for the registry's
`themeAttributes`, and `vars` (`prefix`, `tokenPrefix`) for its `vars`. `generate` adds `index.ts` and `registry.d.ts`.

There's no `@source inline(...)`: Tailwind v4 generates only utilities from the classes its
scanner sees, and keeps every rule of the components layer as written, so the factories'
classes need no listing. Listing them would only make utilities of any class that happens to
share a utility's name. The spec checks both: every component rule survives Tailwind's compiler
with no candidates, and the generated modules give the scanner nothing to make utilities of.

## Variants

| Variant         | Applies                                                                                                                                                                                                    |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dark`, `light` | under the scheme's class, or the system's scheme when the root doesn't set the other                                                                                                                       |
| `motion-reduce` | replaces Tailwind's: the system's reduced motion unless a provider's `data-pf-motion="full"` is on an ancestor, or under `data-pf-motion="reduce"` ([the rules](../css-lowering/README.md#reduced-motion)) |
| `theme-<name>`  | inside a named theme's attribute                                                                                                                                                                           |

Tailwind's own `motion-safe` still reads only the system.

## Build and test

Through the omni MCP (or `omni run`):

- `build`: Vite library build into `dist/`.
- `test:unit`: Vitest, including builds through Tailwind's compiler. `codegen.spec.ts`
  generates the preset's glue into a temp app and checks every selection of every component
  against `componentClasses`, and the stylesheet against `compileTailwind`.

`tests/browser-e2e-tests` checks it computes the same styles as the Panda preset, and the
reduced motion fixtures. `tests/component-suites` runs the bindings' shared suites on this
target, with Tailwind's preflight and Vite plugin.
