# Tailwind adapter plan

Status: implemented.

An adapter that brings a pureform config into Tailwind v4: the tokens become Tailwind's theme, so
apps write `bg-primary rounded-large` with pureform's values, and the components arrive as
classes that utilities can override.

## Goals

- **Tokens as utilities.** Colors, radii, spacing, text styles, and breakpoints become Tailwind
  theme variables, so Tailwind generates utilities and variants for them.
- **Components utilities can override.** Component styles sit in Tailwind's `components` layer,
  so `button().root + " rounded-none"` wins without `tailwind-merge`.
- **Same components as the CSS adapter.** The component CSS comes from the same lowering, and a
  parity test holds it to the same computed styles.
- **One shared transform.** A single function turns the config into Tailwind's pieces. Output
  formats are thin writers over it.

## Non-goals

- **Tailwind v3.** Only v4 and later are supported, since `@theme` and CSS-first config are v4.
- **Components as utility strings** (the `cva` style). Shapes, `color-mix`, and slot-state
  precedence don't fit utility classes cleanly. It can come later as an opt-in mode.
- **A JS plugin for now** (see below). The format option stays open for it.

## Why CSS and not a JS plugin

Checked against Tailwind v4's compiler. A generated CSS file keeps nested layers exactly as
written. The plugin API doesn't:

- `addComponents` is an alias of `addUtilities`. Rules land in the `utilities` layer, ordered by
  Tailwind's own sort, so a utility overriding a component property becomes a tie decided by
  order.
- Rules wrapped in `@layer` are dropped.
- Rules only appear for class names found by Tailwind's source scanning. pureform's class names
  come from runtime functions, so nearly all would be missing without a safelist.
- `addBase` keeps nested layers, but Tailwind's preflight sits unlayered in `base` and would beat
  them.

So components ship as CSS. A JS mode stays possible behind the same `format` option, for
example a plugin that only adds the theme, or a component mode if Tailwind's plugin API gains
layer control.

## Packages

`@pureform/tailwind-adapter`, depending on `@pureform/css-lowering` and `@pureform/css-adapter`.

- `toTailwind(config, options)`: the shared transform. Returns structured parts (theme
  variables, dark overrides, custom variants, the component stylesheet), not a string.
- `tailwindCss(parts)`: writes the parts as one CSS file.
- `pureformTailwind(options)` from `@pureform/tailwind-adapter/vite`: writes the file to disk.

Class names come from the CSS adapter's runtime (`classesFor(config)` or the generated components
module), unchanged.

The CSS adapter's Vite plugin and the new one share config loading, watching, and `.d.ts`
writing. That moves into a helper both use, rather than being copied.

## Output

```css
@theme {
    --color-primary: oklch(…);
    --radius-large: 16px;
    --text-body-large: 1rem;
    --text-body-large--line-height: 1.5rem;
    --breakpoint-medium: 600px;
}

@custom-variant dark (&:where(.dark, .dark *));

.dark {
    --color-primary: oklch(…);
}

@layer components {
    @layer pureform.base, pureform.variants, pureform.compounds;
    /* the CSS adapter's recipes */
}
```

- **The theme references pureform's vars.** `@theme inline` maps Tailwind's namespaces
  (`--color-*`, `--radius-*`, `--spacing-*`, `--text-*`, `--font-*`, `--shadow-*`,
  `--breakpoint-*`, `--ease-*`) to the CSS adapter's vars (`--color-primary:
  var(--colors-primary)`), and utilities read those directly. There's one set of variables, and
  no `tokenRef` change was needed. Only semantic colors map by default; `palette` adds the raw
  palette. Spacing's vars already have Tailwind's names, so they go in a plain `@theme` by value
  instead of referencing themselves. Breakpoints are values too, since media queries can't read
  vars.
- **Tokens with no Tailwind namespace** (component tokens, state layer opacities, motion
  durations) stay as plain custom properties under `:root`, not `@theme`, so they don't create
  stray utilities.
- **Dark and named themes** are variable overrides in plain CSS: dark under `.dark` and the
  `prefers-color-scheme` query with `:root:not(.light)`, themes under the configurable theme
  attribute, as in the CSS adapter.
- **Variants:** `dark` and `light` match pureform's scheme scopes, and each named theme gets
  `theme-<name>` (`themeVariant` renames it). Breakpoints come from `@theme`.
- **Reset:** Tailwind's preflight stays. The CSS adapter's reset isn't included.

## Options

- `format`: `"css"` only for now. The type is a union so a `"plugin"` mode can be added without
  breaking callers.
- `prefix`, `themeAttribute`: as in the CSS adapter.
- `palette`: also map the raw color palette.
- `replace`: clear Tailwind's defaults in each namespace pureform fills.
- `themeVariant`: the variant name for a named theme.

## Vite plugin

```ts
plugins: [
    pureformTailwind({
        config,
        outFile: "src/pureform.gen.css",
        dts: "src/pureform.d.ts",
    }),
    tailwindcss(),
];
```

- Runs with `enforce: "pre"` and writes in `configResolved`/`buildStart`, before Tailwind reads
  the file.
- Rewrites when the config or its imports change, and only when the contents differ, so
  Tailwind's watcher reloads once.
- The output can be gitignored. A `generate` export (and later the CLI) writes it for CI and
  editors before the first dev run.

## Verification

- **Unit tests** compile the output with `@tailwindcss/node`: utilities like `bg-primary` and
  `rounded-large` resolve to pureform's values, `dark:` and theme variants select the right
  scopes, and the nested layers survive.
- **Precedence test:** a utility overrides a component property, and compounds beat variants
  beat base.
- **Parity e2e:** the existing comparison, run with the Tailwind output against the Panda preset,
  through Tailwind's compiler with its theme and utilities but not its preflight.

## Steps

1. Share the Vite plugin plumbing between the CSS adapter and the new package.
2. `toTailwind` and the theme mapping, with the `tokenRef` hook.
3. `tailwindCss` writer and unit tests against Tailwind's compiler.
4. The Vite plugin and `generate`.
5. Parity e2e and a small Tailwind demo (`apps/tailwind-demo`).
6. Docs in the design doc's adapter section.
