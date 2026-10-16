# p4b-tailwind: Tailwind adapter codegen (output context)

Commits: 23bd2e2..98010c3, plus the `docs(roadmap)` commit that adds this file.

| Commit    | What                                                                                      |
| --------- | ----------------------------------------------------------------------------------------- |
| `23bd2e2` | `refactor(css-lowering)`: `instanceTokenVars`, shared by the Panda and CSS codegens       |
| `c14534f` | `feat(tailwind-adapter)`: the `/codegen` subpath, its spec, README                        |
| `98010c3` | `docs(design)`: "Built (p4b-tailwind)" in §5.2; §7's Tailwind allow-list and pruning text |

## Built

### `@pureform/tailwind-adapter/codegen` (`packages/tailwind-adapter/src/codegen.ts`)

New subpath in `package.json` `exports` (same shape as the others) and `vite.config.ts`
`lib.entry` (`codegen: "src/codegen.ts"` → `dist/codegen.mjs`). New dependency
`@pureform/generate` (`catalog:`) in `package.json`, `project.omni.yaml`, and `bun.lock` (by
hand, one line; `bun install --frozen-lockfile` reports no changes). `generate({ target:
"tailwind" })` resolves it from `dist` (checked by hand from `apps/tailwind-demo`'s root).

```ts
type TailwindCodegenOptions = TailwindOptions; // CssOptions without layer, plus layer, palette, replace, themeVariant
const codegen: CodegenAdapter<TailwindCodegenOptions>; // name "tailwind", platform "web"; also the default export
const STYLESHEET_FILE = "styles.css"; // re-exported from @pureform/css-adapter/codegen
```

Output, for the names in `context.components` (the allow-list, config order):

- **`web/<name>.ts`**: `componentModules(context)` from `@pureform/css-adapter/codegen`, so
  byte-identical to the CSS target's modules for the same `classPrefix` and `prefix` (see
  [p4b-css](p4b-css.md) for their shape: a `selectionCache` writing each slot's classes as a
  template, `withTokenStyle` for instance tokens).
- **`styles.css`**: `compileTailwind(subsetConfig(config, components), options)`: `@theme`,
  `@theme inline`, the `@custom-variant`s, and the CSS adapter's stylesheet inside
  `@layer components`. With every component allowed, the body equals what the Vite plugin
  (`pureformTailwind`) writes to its `outFile`. The app imports it after Tailwind:
  `@import "tailwindcss"; @import "../.pureform/styles.css";`.

`generate` adds the header, `index.ts`, and `registry.d.ts` as p4a describes.

### `instanceTokenVars` (`@pureform/css-lowering`, `src/config.ts`)

```ts
const instanceTokenVars: (
    name: string,
    spec: AnyComponentSpec,
    prefix: VarPrefix | undefined,
) => Record<string, string>;
```

The rule both web codegens had a copy of (a `dynamic` token's own `path`, else
`components.<name>.<token>`, through `varName`). `@pureform/panda-adapter/codegen` and
`@pureform/css-adapter/codegen` still export it as `tokenVars` (`export const tokenVars =
instanceTokenVars`). Output unchanged: both codegen specs' snapshots pass and both demos'
`bun scripts/generate.ts --check` exit 0. New spec `css-lowering/src/config.spec.ts`.

### What it replaced

Nothing is removed. The codegen **supersedes** what `pureformTailwind` delivered:
`virtual:pureform/components` (class strings per slot, through the CSS adapter's plugin) and the
stylesheet written to `outFile`. The plugin, `compileTailwind`, and `toTailwind` are unchanged;
`tailwind-demo` still uses the plugin.

### Equivalence (`packages/tailwind-adapter/src/codegen.spec.ts`, 10 tests)

- The factory modules equal the CSS codegen's, for a small config and for the whole preset
  (`{ classPrefix: "pf", prefix: "pf" }`, read back from the generated files).
- Generates the preset's glue into a temp app (`node_modules/@pureform/styling` linked to the
  workspace package), imports `index.ts`, and for every combination of every group's values of
  all 32 components (over 40,000 selections) checks each slot's class equals
  `componentClasses(manifestOf(spec, options))`'s, the plugin's runtime.
- `styles.css` after the header equals `compileTailwind(preset, options)`; the allow-list
  (`["icon"]`) gives one module and a stylesheet without the others; deterministic; check mode
  `ok` after a write.
- Through Tailwind's compiler (`@tailwindcss/node`) with **no candidates**, the built CSS styles
  exactly the `.pf-*` classes `compileCss(preset)` styles, and each is one a factory returns.
- Every word in the generated modules, given to Tailwind as candidates, adds nothing to the
  build: committed `.pureform/` files make no stray utilities.
- Types aren't checked again here: the modules are the CSS target's, which its spec type-checks.

## Deviations from the design

- **No `@source inline(...)`.** §5.2 said Tailwind "also gets `@source inline(...)` so it keeps
  the classes", and §7 that pruning narrows it. That was Tailwind v3's behavior (custom
  `@layer components` rules dropped unless their classes were scanned). Tailwind v4 (4.3 here)
  keeps every rule outside its utilities as written and builds only utilities from scanned
  candidates; verified both in the spec and by hand (`@source inline("pf-x hidden flex")`
  generated `.hidden` and `.flex` and did nothing for `.pf-x`, which was kept anyway, minified
  too). Listing the classes would only risk making a utility of a class named like one. The
  allow-list and pruning act on the stylesheet instead, as for the CSS target. Recorded in §5.2
  and §7.
- **Modules are the CSS adapter's, not Tailwind's own.** No Tailwind-specific factory code: the
  classes are the CSS adapter's, so the module source is shared through `componentModules`.

## Stubs and gaps

- **No demo uses it yet.** `tailwind-demo` still uses `pureformTailwind` (`outFile`,
  `virtual:pureform/components`); moving it to the generated registry and
  `.pureform/styles.css` is p5a's, retiring the plugin p4c's.
- `TailwindOptions.themeVariant` is a function; `generate`'s hash includes its source, so
  it works, but a CLI config would have to pass it from a module, not JSON.
- The preset's two unread tokens (p4b-panda, p4b-css) apply here too; not a codegen issue.

## How to verify

- `task_run` `build` and `test:unit` on `@pureform/tailwind-adapter` (23 tests across
  `tailwind.spec.ts` and `codegen.spec.ts`, with type checks), `@pureform/css-lowering`,
  `@pureform/css-adapter`, `@pureform/panda-adapter`.
- Workspace `build` + `test:unit`: all pass except the pre-existing rn-parity "every variant
  value at rest" case in `@pureform/browser-e2e-tests` (440 of 441).
- `bun scripts/generate.ts --check` in `apps/solid-demo` and `apps/react-demo`: exit 0 (the
  Panda output didn't change with `instanceTokenVars`).
- By hand: from a root depending on `@pureform/tailwind-adapter`, `generate({ root, config,
target: "tailwind", options: { classPrefix: "pf" }, components: ["button", "text"] })` writes
  `web/button.ts`, `web/text.ts`, `styles.css`, `index.ts`, `registry.d.ts`.

## Notes for the next phases

- **p4b-rn:** `instanceTokenVars` is web-only (CSS var names); native merges tokens into styles.
  The p4b shared pieces (oxfmt/oxlint ignore `.pureform/`, the `/codegen` wiring pattern, the
  temp-root spec with a `@pureform/styling` symlink) apply as before.
- **p4c-bundler / p4c-cli:** the Tailwind target needs the app's CSS to `@import` the generated
  `styles.css` after `tailwindcss` (Tailwind's Vite plugin reads imports from disk, so it must be
  generated before Tailwind runs, as `pureformTailwind` does today with `outFile`). Options are
  `TailwindOptions`.
- **p5a:** `tailwind-demo` today uses no `classPrefix`; keep whatever its stylesheet used when
  switching to `registry.entry(name).factory(selection).<slot>.class`. Replace
  `@import "./pureform.gen.css"` with the generated `styles.css`.
- **p7:** Tailwind pruning narrows `context.components` (the stylesheet follows), as for CSS;
  there's no `@source inline` to narrow. Narrowing variants needs `compileCss` to drop variant
  rules, which it can't yet.
