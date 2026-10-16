# @pureform/css-adapter

Compiles a pureform config to plain CSS: one stylesheet, and class name functions from a runtime
under 1 kB. No Panda and no build tool needed. Components keep Panda's class names, so markup
works with either adapter.

```ts
import { compileCss, classesFor } from "@pureform/css-adapter";
import { pureform } from "@pureform/preset";

const config = pureform();
const css = compileCss(config); // put it in a <style>, or write it to a file
const { button, avatar } = classesFor(config);

button({ variant: "tonal", size: "large" }).root;
// "button__root button__root--color_primary button__root--variant_tonal …"
avatar({ shape: "cookie9Sided" });
```

Selections are typed from the components' typed specs: `avatar({ size: "huge" })` is a type
error.

Its `/codegen` subpath is the CSS target's codegen for `@pureform/generate`: it writes the
`.pureform/` factory modules the bindings read through the style registry, with every class
written out, and the stylesheet for those components. It succeeds the Vite plugin's
`virtual:pureform/components` ([below](#generated-glue-codegen)).

## Where it sits

```
@pureform/core ──► @pureform/css-lowering ──► @pureform/css-adapter ──► @pureform/tailwind-adapter
                                                  │
                     @pureform/styling ◄──────────┤ (componentClasses, re-exported as /runtime)
                     @pureform/generate ◄─────────┘ (/codegen: the interface and defineCodegen)
```

`@pureform/panda-adapter` lowers through the same `css-lowering`, so both adapters emit the same
selectors and compute the same styles. `@pureform/tailwind-adapter` puts this stylesheet inside
Tailwind's components layer and reuses the Vite plugin.

## Architecture

| Module                | What it does                                                                              |
| --------------------- | ----------------------------------------------------------------------------------------- |
| `stylesheet.ts`       | `compileCss`: tokens, themes, keyframes, and component rules, in cascade layers.          |
| `serialize.ts`        | Lowered style objects to nested CSS, with color scheme and reduced motion rules expanded. |
| `options.ts`          | `CssOptions`, the lowering context, and class prefixing.                                  |
| `classes.ts`          | `manifestOf` (a component's classes, variants, defaults) and `classesFor`.                |
| `runtime.ts`          | Re-exports `componentClasses` from `@pureform/styling`.                                   |
| `generate.ts`         | The ahead-of-time output: the stylesheet, `components.js`, and `components.d.ts`.         |
| `build.ts`, `vite.ts` | `buildCss` writes that output to a folder; `pureformCss` serves it as virtual modules.    |
| `codegen.ts`          | The `/codegen` entry: `codegen`, the CSS target's adapter for `@pureform/generate`.       |
| `codegen/factory.ts`  | One component's `ClassFactory` module source, and its instance tokens' vars.              |

## Ahead of time

Compile once at build time, so the app ships only the stylesheet, the runtime, and each
component's variant manifest. The config, theme providers, and color generation stay out of
the bundle.

```ts
// scripts/build-css.ts
import { buildCss } from "@pureform/css-adapter/build";
import { pureform } from "@pureform/preset";

await buildCss(pureform(), { outDir: "src/pureform" });
// src/pureform/styles.css
// src/pureform/components.js     (export const button = componentClasses({…}), one per component)
// src/pureform/components.d.ts   (typed from each component's variant values)
```

```ts
import "./pureform/styles.css";
import { button } from "./pureform/components";
```

Each export is a pure call, so bundlers drop the components you don't import.

### Vite

The plugin serves the same output as virtual modules, and writes their declarations when given
a path:

```ts
// vite.config.ts
import { pureformCss } from "@pureform/css-adapter/vite";
import { pureform } from "@pureform/preset";

export default defineConfig({
    plugins: [pureformCss({ config: pureform(), dts: "src/pureform.d.ts" })],
});
```

```ts
import "virtual:pureform.css";
import { button } from "virtual:pureform/components";
```

## Generated glue (codegen)

`@pureform/css-adapter/codegen` is what `@pureform/generate` loads for `target: "css"`; nothing
else needs to import it. It succeeds `virtual:pureform/components`: the components become
`ClassFactory` modules in `.pureform/`, registered in its `index.ts` and typed by its
`registry.d.ts` (both written by `generate`), and the stylesheet becomes a file next to them.
The Vite plugin stays until the bundler plugin replaces it (p4c).

```ts
import { generate } from "@pureform/generate";

await generate({
    config: "pureform.config.ts",
    target: "css",
    options: { classPrefix: "pf", prefix: "pf" }, // CssCodegenOptions, the same as CssOptions
    components: ["button", "checkbox"], // optional allow-list
});
```

```
.pureform/
  web/button.ts    export const button: ClassFactory<"button">
  web/checkbox.ts
  styles.css       compileCss over the allow-listed components only
  index.ts         registry, themes, Components   (generate)
  registry.d.ts    ComponentRegistry augmentation (generate)
```

```ts
import "./.pureform/styles.css";
import { registry } from "./.pureform";

registry
    .entry("button")
    .factory({ variant: "tonal", tokens: { radius: "4px" } });
// { root: { class: "pf-button__root pf-button__root--color_primary …",
//           style: { "--pf-components-button-radius": "4px" } },
//   label: { class: "pf-button__label …" }, … }
```

Each factory module writes its classes out as a template per slot, so it needs no class name
runtime or manifest, only `selectionCache` and `withTokenStyle` from `@pureform/styling`:

```ts
const classes = selectionCache<Selection<"button">, ClassSlots<"button">>(
    {
        variants: ["color", "variant"],
        defaults: { color: "primary", variant: "filled" },
    },
    (s) => ({
        root: {
            class: `pf-button__root pf-button__root--color_${s.color} pf-button__root--variant_${s.variant}`,
        },
        label: {
            class: `pf-button__label pf-button__label--color_${s.color} pf-button__label--variant_${s.variant}`,
        },
    }),
);
export const button: ClassFactory<"button"> = (s) =>
    withTokenStyle(classes(s), s.tokens, vars);
```

- **The classes** are exactly `componentClasses`' for the component's manifest: every slot gets
  `<slot class>--<group>_<value>` for every group, in the config's order, with the default
  where the selection leaves a group out. A group with no default adds nothing until chosen. A
  single-slot component's class is the root's.
- **One frozen result per selection**: `{ toggle: true }` and `{ toggle: "true" }` share it, and
  `{}` shares the defaults'.
- **Instance tokens** (`selection.tokens`) go on the root's `style` as the component's vars: a
  `dynamic` token's own path, else `--<prefix>-components-<name>-<token>`, the var a theme
  override sets and the stylesheet reads.
- **The allow-list** (`components`) limits the modules and the stylesheet's component rules;
  tokens, themes, and keyframes are always in it.

| Export (`/codegen`)                       | What it is                                                                        |
| ----------------------------------------- | --------------------------------------------------------------------------------- |
| `codegen` (also the default export)       | `CodegenAdapter<CssCodegenOptions>`, named `css`, platform `web`                  |
| `CssCodegenOptions`                       | `CssOptions`: `classPrefix` and `prefix` name the factories' classes and vars too |
| `STYLESHEET_FILE`                         | `"styles.css"`                                                                    |
| `componentModules(context)`               | `web/<name>.ts` for each of the context's components, for adapters over this CSS  |
| `subsetConfig(config, components)`        | The config with only those components, in that order                              |
| `factoryModule({ name, manifest, vars })` | One factory module's source                                                       |
| `classExpression(base, manifest)`         | One slot's class expression over the selection `s`                                |
| `tokenVars(name, spec, prefix)`           | Each instance token's CSS var (`instanceTokenVars` from `css-lowering`)           |

## Options

`compileCss`, `buildCss`, and the plugin take:

| Option           | Default      | Sets                                                                   |
| ---------------- | ------------ | ---------------------------------------------------------------------- |
| `prefix`         | none         | The component var prefix: `pf` gives `--pf-components-*`               |
| `tokenPrefix`    | none         | The token var prefix: `pf` gives `--pf-colors-primary`                 |
| `classPrefix`    | none         | The class prefix: `pf` gives `.pf-button`. Pass it to `classesFor` too |
| `themeAttribute` | `data-theme` | The attribute that switches named themes: `[data-theme=teal]`          |
| `layer`          | `pureform`   | The cascade layer everything sits in, or `false` for none              |

`buildCss` and the plugin also take `transform`, a `(css) => css` post-process, and `runtime`,
where the generated modules import the runtime from.

The runtime, `componentClasses`, lives in [`@pureform/styling`](../styling/README.md), the
package every binding and generated factory uses at runtime. `@pureform/css-adapter/runtime`
re-exports it (with `ComponentManifest`, `ComponentClasses`, `Choice`), and stays the default
`runtime`, so generated modules and `.d.ts` files written before the move keep working.

## The stylesheet

- **Layers:** `pureform.reset`, `pureform.tokens`, then `pureform.components`, which holds base
  styles, variants, and compound variants in that order. Your own unlayered CSS wins over all
  of it.
- **Tokens** are CSS vars on `:root`. Dark values apply under a `.dark` class on the root, or
  with the system's dark scheme unless the root has `.light`. Named themes apply under their
  attribute: `<div data-theme="teal">`.
- **Reduced motion** follows the system's `prefers-reduced-motion`, unless a provider's
  `data-pf-motion="full"` sits on an ancestor; `data-pf-motion="reduce"` reduces it whatever
  the system says ([the rules](../css-lowering/README.md#reduced-motion)). Only movement
  stops; color, opacity, and elevation fades keep running.
- **Component tokens** are vars too, such as `--components-button-radius`: set one on a
  component or any ancestor to restyle it.

## Reset

The adapter emits no reset. Import the one it ships, or use your own:

```ts
import "@pureform/css-adapter/reset.css";
```

It sits in the `pureform.reset` layer and keeps what the components rely on (borders drawn by
width alone, border-box sizing, form controls inheriting the font), matching Panda's preflight.
It works with the Panda adapter too, if you turn Panda's preflight off.

## Older browsers and Lightning CSS

The stylesheet uses native nesting (baseline since 2023), `oklch()`, `color-mix()`, and media
ranges. To reach older browsers, run it through Lightning CSS, which flattens nesting with the
same specificity, adds color fallbacks, rewrites media ranges, and minifies.

With Vite, set Lightning CSS as the CSS transformer; it then processes the stylesheet like any
other, from a file or from the plugin:

```ts
export default defineConfig({
    css: { transformer: "lightningcss", lightningcss: { targets } },
    build: { cssMinify: "lightningcss" },
});
```

Elsewhere, pass it as the build's `transform`:

```ts
import browserslist from "browserslist";
import { browserslistToTargets, transform } from "lightningcss";

await buildCss(config, {
    outDir: "src/pureform",
    transform: (css) =>
        transform({
            filename: "styles.css",
            code: Buffer.from(css),
            targets: browserslistToTargets(browserslist("defaults")),
            minify: true,
        }).code.toString(),
});
```

Lightning CSS can't lower `@layer`, `shape()`, or `corner-shape`; components that use the last
two fall back to rounded corners where they're missing.

## States

Interaction and form states are matched on the element, so a state change costs no JS: the
native pseudo-class first (`:hover`, `:checked`, `:disabled`, …), then an ARIA attribute
(`aria-checked`, `aria-selected`, `aria-disabled`, …), and only where neither covers it one of
pureform's attributes (`data-pf-hover`, `data-pf-active`, `data-pf-dragging`,
`data-pf-filled`; the names are `STATE_ATTRIBUTES` in `@pureform/core`). A behavior library's
own attributes (`data-state`, `data-hover`, …) aren't matched. The full table is in
[`@pureform/css-lowering`](../css-lowering/README.md#how-states-match).

## Parity with the Panda adapter

Both adapters lower through `@pureform/css-lowering`, and the demo's end-to-end suite renders
every component at each variant value with each adapter and requires the same computed styles.
States are compared the same way, set through their ARIA or `data-pf-*` attributes, with focus
forced through DevTools.

## Build and test

Through omni: `task_run` `build` (writes `dist/`, which `@pureform/generate` loads the
`/codegen` subpath from) and `test:unit` on `@pureform/css-adapter`.

`src/codegen.spec.ts` checks the codegen end to end: it generates the preset's glue into a temp
app, imports its registry, and compares every factory with `componentClasses` for every
combination of every group's values (about 50,000 selections); it also checks the stylesheet
equals `compileCss`, that it reads every instance token's var, and that the glue type-checks
with TypeScript's `tsc`.
