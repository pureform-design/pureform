# p4b-css: CSS adapter codegen (output context)

Commits: 5e7973d..8c208a3, plus the `docs(roadmap)` commit that adds this file.

| Commit    | What                                                                        |
| --------- | --------------------------------------------------------------------------- |
| `5e7973d` | `feat(css-adapter)`: the `/codegen` subpath, its spec and snapshots, README |
| `8c208a3` | `docs(design)`: "Built (p4b-css)" in §5.2                                   |

## Built

### `@pureform/css-adapter/codegen` (`packages/css-adapter/src/codegen.ts`, `src/codegen/factory.ts`)

New subpath in `package.json` `exports` (same shape as the others) and `vite.config.ts`
`lib.entry` (`codegen: "src/codegen.ts"` → `dist/codegen.mjs`). New dependency
`@pureform/generate` (`catalog:`; types and `defineCodegen`) in `package.json`,
`project.omni.yaml`, and `bun.lock` (by hand, one line). `generate({ target: "css" })`
resolves it from `dist` (checked from `apps/css-demo`'s root).

```ts
type CssCodegenOptions = CssOptions; // prefix, tokenPrefix, classPrefix, themeAttribute, layer, target
const codegen: CodegenAdapter<CssCodegenOptions>; // name "css", platform "web"; also the default export
const STYLESHEET_FILE = "styles.css";
const componentModules: (
    context: CodegenContext<Pick<CssOptions, "classPrefix" | "prefix">>,
) => ComponentModule[]; // web/<name>.ts per context.components
const subsetConfig: (
    config: CoreConfig,
    components: readonly string[],
) => CoreConfig;
const factoryModule: (input: FactoryModuleInput) => string;
interface FactoryModuleInput {
    name: string;
    manifest: ComponentManifest; // manifestOf(spec, { classPrefix })
    vars: Readonly<Record<string, string>>; // tokenVars(...)
}
const classExpression: (
    base: string,
    manifest: Pick<ComponentManifest, "variants" | "defaultVariants">,
) => string;
const tokenVars: (
    name,
    spec: AnyComponentSpec,
    prefix: VarPrefix | undefined,
) => Record<string, string>;
```

Output, for the names in `context.components` (the allow-list, config order):

- **`web/<name>.ts`**, export `<name>`:

    ```ts
    import { selectionCache, withTokenStyle } from "@pureform/styling"; // withTokenStyle only with tokens
    import type { ClassFactory, ClassSlots, Selection } from "@pureform/styling";

    const vars = { size: "--pf-components-checkbox-size", … } as const; // only with tokens

    const classes = selectionCache<Selection<"checkbox">, ClassSlots<"checkbox">>(
        {
            variants: ["density", "color"], // Object.keys(recipe.variants): config order
            defaults: { color: "primary", density: "inherit" }, // recipe.defaultVariants, as strings
        },
        (s) => ({
            root: {
                class: `pf-checkbox__root pf-checkbox__root--density_${s.density} pf-checkbox__root--color_${s.color}`,
            },
            touchTarget: { class: `…` }, // every slot, spec order
        }),
    );

    export const checkbox: ClassFactory<"checkbox"> = (s) =>
        withTokenStyle(classes(s), s.tokens, vars);
    // without tokens: export const text: ClassFactory<"text"> = classes;
    ```

    - Class base: `manifestOf(spec).className` (`classPrefix` applied, **`spec.name`**, not the
      config key), plus `__<slot>` for slot components; a single-slot component's class is
      the root's (`{ root: { class } }`).
    - A group with no default is written as
      `${s.size === undefined ? "" : ` …--size_${s.size}`}` (the runtime leaves it out too).
    - No groups: `() => ({ root: { class: "divider" } })`.
    - Non-identifier group or slot names are quoted (`s["icon-side"]`); template text is
      escaped (`` ` ``, `$`, `\`).
    - Token vars: a `dynamic` token's own `path` through `varName(path, prefix)`, else
      `varName(["components", name, token], prefix)`. The same rule as the Panda adapter's
      `tokenVars` (a copy; see notes).

- **`styles.css`**: `compileCss(subsetConfig(config, components), options)`. `generate` adds
  the `/* */` header. With every component allowed, the body is byte-identical to
  `compileCss(config, options)`; the allow-list drops other components' rules only (tokens,
  themes, keyframes, `@property` stay). Every preset component compiles alone, and none reads
  another component's vars (checked).

`generate` adds `index.ts` and `registry.d.ts` as p4a describes.

### What it replaced

Nothing is removed. The codegen **supersedes** what `virtual:pureform/components` (the Vite
plugin, `generate.ts`'s `js`/`dts`) delivered: a `componentClasses(manifest)` call per
component, returning class strings. The generated modules return `ClassSlots` (`{ class,
style? }` per slot), are registered in the glue's `registry`, typed through
`ComponentRegistry`, and carry instance tokens. The plugin, `buildCss`, `generate` (the
adapter's own), `classesFor`, and `/runtime` are unchanged; `css-demo` and `tailwind-demo`
still use the plugin.

### Equivalence (`packages/css-adapter/src/codegen.spec.ts`, 16 tests)

- Generates the preset's glue (`pureform()`, `{ classPrefix: "pf", prefix: "pf" }`) with
  `generate({ target: codegen })` into a temp app whose `node_modules/@pureform/styling`
  links to the workspace package, imports its `index.ts`, and for **every combination of
  every group's values of all 32 components** (over 40,000 selections) checks each slot's
  class equals `componentClasses(manifestOf(spec, options))`'s (a string becomes `root`);
  booleans share their strings' cached object; the defaults share `{}`'s, frozen.
- A small config does the same with a group with no default, a non-identifier group name, a
  value with `` ` `` and `${`, and a component with no groups.
- `styles.css` equals `compileCss(preset, options)` after the header; every instance token
  sets its var on the root and the stylesheet reads `var(<it>` (except the two unread preset
  tokens below); every `.pf-*` class in the stylesheet is one some factory returns.
- **Types:** runs TypeScript 7's `tsc` (no compiler API in TS 7, so `spawnSync` of
  `typescript/bin/tsc`) on the temp app with the repo's `@pureform/tsconfig/base.json`: all 32
  modules, `index.ts`, `registry.d.ts`, and an `app.ts` that reads
  `registry.entry("button").factory({ variant: "filled", tokens: { radius: 4 } }).label.class`
  and expects errors (`@ts-expect-error`) for `variant: "nope"` and a checkbox `label` slot.
- Snapshots of the small config's modules; allow-list (`["icon"]` → one module, stylesheet
  without the others); determinism; check mode `ok` after a write.
- Breaking the class template (`_` → `-`) fails 5 of them.

## Deviations from the design

- **Templates, not lookup tables.** §5.2 sketches a table per group value per slot. Every
  slot gets `<slot class>--<group>_<value>` for every group, so the module writes each slot's
  classes as one template over the (normalized, cached) selection. Same classes, much less
  code (a table repeats every class string per value and slot). Recorded in §5.2.
- **"No runtime dependency"** is read as no class name runtime or manifest: the modules import
  `selectionCache` and `withTokenStyle` from `@pureform/styling` (the registry's own package),
  for one frozen result per selection and instance tokens, as p1e asks of every factory.
- **The stylesheet is a codegen file** (`styles.css`), so the allow-list (§7) reaches the CSS
  and p4c can retire the plugin's `virtual:pureform.css`. The plugin's `transform` option has no
  codegen equivalent: Vite processes the imported file (Lightning CSS) anyway.

## Stubs and gaps

- **No demo uses it yet.** `css-demo` (and `tailwind-demo`) still import
  `virtual:pureform.css` and `virtual:pureform/components`; moving them to the generated
  registry is p5a's, and retiring the plugins is p4c's. `.pureform/styles.css` for the full
  preset is about 900 kB unminified, so an app should ignore `.pureform/` rather than commit it
  (§6's advice).
- **`tokenVars` is duplicated** in `@pureform/panda-adapter/codegen` and here (identical
  logic). A later cleanup could move it to `@pureform/css-lowering`; nothing depends on it
  being in one place.
- **Two preset tokens nothing reads** (`--pf-components-slider-stateLayerColor`,
  `--pf-components-menu-supportingColor`), as p4b-panda found; listed as `unread` in the spec.
- Values the types reject (a value not in the group) still produce a class, as the runtime did.

## How to verify

- `task_run` `build` and `test:unit` on `@pureform/css-adapter` (all specs pass, with type
  checks; the codegen spec runs in a few seconds) and `@pureform/tailwind-adapter` (unchanged,
  passes).
- Workspace `build` + `test:unit`: all pass except the pre-existing rn-parity "every variant
  value at rest" case in `@pureform/browser-e2e-tests` (440 of 441).
- By hand: from a root that depends on `@pureform/css-adapter`, `generate({ root, config,
target: "css", options: { classPrefix: "pf" }, components: ["button", "text"] })` writes
  `web/button.ts`, `web/text.ts`, `styles.css`, `index.ts`, `registry.d.ts`.

## Notes for the next phases

- **p4b-tailwind:** reuse this: `componentModules(context)` gives the factories (Tailwind keeps
  the CSS adapter's class names), and write the stylesheet with `compileTailwind` instead of
  `compileCss`, over `subsetConfig(context.config, context.components)`. The factories'
  classes are templates, so Tailwind's scanner can't read them from `.pureform/`; if Tailwind
  needs to see them, `@source inline(...)` must list them (they're the manifest's
  `<base>__<slot>--<group>_<value>` for every value). `tailwind-adapter` would add
  `@pureform/generate` the same way (package.json, omni, one `bun.lock` line).
- **p4c-bundler / p4c-cli:** the CSS target needs the app to import `.pureform/styles.css`
  (or the plugin to serve it as `virtual:pureform.css` from the generated file). Options are
  `CssOptions`; `transform` isn't one.
- **p5a:** `css-demo` today calls `button({ variant }).root` (a string); with the registry it's
  `registry.entry("button").factory({ variant }).root.class`, and a single-slot component's
  class is `.root.class` too. Use the same `classPrefix` and `prefix` the demo's stylesheet
  used (none today).
- **p7:** pruning narrows `context.components`; the stylesheet already follows it. Narrowing
  variants would need `compileCss` to drop variant rules (it can't yet).
- **Specs that import generated glue:** a temp root with `node_modules/@pureform/styling`
  symlinked to `packages/styling` works under Vitest; TypeScript 7 has no JS API, so run its
  `bin/tsc` with `--pretty false`.
