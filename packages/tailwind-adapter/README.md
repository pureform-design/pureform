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
the Panda preset. `apps/tailwind-demo` uses it.

## Architecture

| Module        | What it does                                                                                            |
| ------------- | ------------------------------------------------------------------------------------------------------- |
| `tailwind.ts` | `toTailwind`: the config as Tailwind's pieces (theme, variants, components); `tailwindCss` writes them. |
| `vite.ts`     | `pureformTailwind`: a Vite plugin writing the stylesheet to a file before Tailwind's plugin reads it.   |

The theme is `@theme inline`: each Tailwind variable names the pureform var it stands for, so a
dark scheme or a named theme switches utilities and components alike.

## Public API

| Entry                             | Exports                                                         |
| --------------------------------- | --------------------------------------------------------------- |
| `@pureform/tailwind-adapter`      | `compileTailwind`, `toTailwind`, `tailwindCss`, and their types |
| `@pureform/tailwind-adapter/vite` | `pureformTailwind`                                              |

```ts
// vite.config.ts
import { pureformTailwind } from "@pureform/tailwind-adapter/vite";
import tailwindcss from "@tailwindcss/vite";

export default {
    plugins: [
        pureformTailwind({ config, outFile: "src/pureform.gen.css" }),
        tailwindcss(),
    ],
};
```

Options are the CSS adapter's, plus `palette` (map the raw palette too), `replace` (clear
Tailwind's defaults in the namespaces pureform fills), and `themeVariant` (a named theme's
variant name, `theme-<name>` by default).

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
- `test:unit`: Vitest, including builds through Tailwind's compiler.

`tests/browser-e2e-tests` checks it computes the same styles as the Panda preset, and the
reduced motion fixtures.
