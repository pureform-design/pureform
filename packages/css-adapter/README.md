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
