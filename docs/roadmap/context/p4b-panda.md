# p4b-panda: Panda adapter codegen (output context)

Commits: af54617..f7bb24a, plus the `docs(roadmap)` commit that adds this file.

| Commit    | What                                                                                             |
| --------- | ------------------------------------------------------------------------------------------------ |
| `af54617` | `chore`: oxfmt and oxlint skip `**/.pureform/**` (shared by every p4b subphase)                  |
| `1e625d7` | `feat(panda-adapter)`: the `/codegen` subpath, its specs and snapshots, README                   |
| `f7af070` | `refactor(demos)`: both demos generate `.pureform/`; the e2e factory test covers every component |
| `f7bb24a` | `docs(design)`: "Built (p4b-panda)" in §5.2                                                      |

## Built

### `@pureform/panda-adapter/codegen` (`packages/panda-adapter/src/codegen.ts`, `src/codegen/`)

New subpath in `package.json` `exports` (same shape as `.`) and `vite.config.ts` `lib.entry`
(`codegen: "src/codegen.ts"` → `dist/codegen.mjs`). New dependency `@pureform/generate`
(`catalog:`; types and `defineCodegen`), dev dependency `@types/node` (`tsconfig.project.json`
now has `"types": ["node"]`), omni dependency `@pureform/generate`.

```ts
interface PandaCodegenOptions {
    outdir?: string; // Panda's outdir, relative to the root or absolute; default "styled-system"
    prefix?: VarPrefix; // the var prefix given to compilePreset; default none
}
const codegen: CodegenAdapter<PandaCodegenOptions>; // name "panda", platform "web"; also the default export
const STATIC_CSS_FILE = "panda.ts";
const recipeFile: (name: string) => string; // "iconButton" → "icon-button", "fabXL" → "fab-x-l"
const tokenVars: (
    name,
    spec: AnyComponentSpec,
    prefix,
) => Record<string, string>;
const factoryModule: (input: FactoryModuleInput) => string;
interface FactoryModuleInput {
    name;
    shape: ComponentShape;
    slotted: boolean;
    recipe: string /* import specifier */;
    vars;
}
const staticCssModule: (
    components: readonly string[],
    themes: readonly string[],
) => string;
```

Output, for each name in `context.components` (the allow-list, config order):

- **`web/<name>.ts`**, export `<name>`:

    ```ts
    import { selectionCache, withTokenStyle } from "@pureform/styling"; // withTokenStyle only with tokens
    import type { ClassFactory, ClassSlots, Selection } from "@pureform/styling";

    import { iconButton as recipe } from "../../styled-system/recipes/icon-button";

    const vars = { radius: "--pf-components-iconButton-radius", … } as const; // only with tokens

    const classes = selectionCache<Selection<"iconButton">, ClassSlots<"iconButton">>(
        { variants: [/* shape order */], defaults: { /* recipe.defaultVariants */ } },
        (s) => {
            const slots = recipe({ ...s, toggle: s.toggle === "true" ? true : s.toggle === "false" ? false : s.toggle });
            return { root: { class: slots.root }, … }; // every slot, config order
        },
    );

    export const iconButton: ClassFactory<"iconButton"> = (s) =>
        withTokenStyle(classes(s), s.tokens, vars);
    // without tokens: export const text: ClassFactory<"text"> = classes;
    ```

    - Single-slot recipes (`kind: "component"`): Panda returns a string, wrapped as
      `{ root: { class } }`.
    - Only groups whose values include `"true"` or `"false"` get the conversion, and only
      the branches their values have (`icon`'s `filled: true | false | "inherit"` keeps
      `"inherit"`); other groups pass `s` through unchanged.
    - Token vars: a `dynamic` token's own `path` through `varName(path, prefix)`, else
      `varName(["components", name, token], prefix)` (the theme-override name). In the
      preset every component token is dynamic with path `components.<name>.<token>`.
    - The recipe import is `context.importPath(path, `${outdir}/recipes/${recipeFile(name)}`)`.
      `recipeFile` matches Panda 2.2's file naming, checked by running `panda codegen` on odd
      names: split at each capital and at non-alphanumerics, lowercase, join with `-`
      (`a__b` → `a-b`, `_lead` → `lead`, `$d` → `d`). The export name is the recipe name.

- **`panda.ts`** (one file, not per component):

    ```ts
    import type { Config } from "@pandacss/dev";

    export const staticCss = {
        themes: ["teal", "sharp", "dense"], // Object.keys(config.themes)
        recipes: { button: ["*"], checkbox: ["*"] }, // allow-listed components only
    } satisfies NonNullable<Config["staticCss"]>;
    ```

`generate` adds the header, `index.ts`, and `registry.d.ts` as p4a describes.

### What it replaced

p2c's hand-written `apps/solid-demo/.pureform/` and its copy in `apps/react-demo/.pureform/`
(p3b), wholesale. Both are now generated, header-hashed, and still committed.

- **`apps/solid-demo`:** the config moved to `pureform.config.ts` (default export);
  `panda.pureform.ts` imports it, re-exports `pureformConfig`, and exports `PREFIX = "pf"` and
  `pureformPreset`. `scripts/generate.ts` calls `generate({ root, config: "pureform.config.ts",
target: "panda", options: { prefix: PREFIX }, check: argv has "--check" })` over **every
  component** (32), so `panda.config.ts`'s hand list of recipes and themes is gone:
  `staticCss` comes straight from `.pureform/panda`. Dev dependency `@pureform/generate`.
- **`apps/react-demo`:** the same files (its `pureform.config.ts` is a copy of solid-demo's),
  with `components: ["button", "checkbox"]` (the allow-list).
- **omni (both demos):** new task `generate: bun scripts/generate.ts` with dependency
  `^build` (it loads `@pureform/generate` and the adapter from `dist`); `prepare` (`panda
codegen`) now depends on `generate`. Cache keys add `panda.pureform.ts`,
  `pureform.config.ts`, `scripts/**/*`. Omni dependencies add `@pureform/generate` (and, for
  solid-demo, `material`, `theme`, `core`, which the config imports). `tests/browser-e2e-tests`
  and `tests/component-suites` add `apps/solid-demo/pureform.config.ts` to their cache keys.
- **oxfmt and oxlint** ignore `**/.pureform/**` (the generated code isn't formatter output;
  formatting it would make `generate --check` report `modified`). Note the pattern form:
  `./**/.pureform/**/*` doesn't match dot folders, `**/.pureform/**` does.

### Equivalence

- `panda codegen` output (`styled-system/`) and `panda cssgen` output are byte-identical before
  and after, in both demos (solid-demo's hand list equals the set of config components).
- `tests/browser-e2e-tests/src/panda-factories.e2e.test.ts` (196 tests) now covers every
  component in the registry: for every combination of every group's values (about 50,000
  selections; iconButton alone 39,900), the factory equals Panda's recipe called with booleans
  for `"true"`/`"false"`, as slots; booleans and their strings share one cached object; every
  class the preset's recipe styles has a rule in Panda's stylesheet, and every own class in the
  stylesheet is one the factory returns; defaults share the `{}` result, frozen; each token
  sets `varName(path, "pf")` on the root; the stylesheet reads every token var except two
  (below); a checkbox's `boxSize` token resizes its box in the page. Breaking the boolean
  conversion in the generated `iconButton` fails it.
- The generated button and checkbox differ from the hand-written ones only in the header and
  the order of `variants`/`defaults` keys (config order, not Panda's sorted order), which
  changes cache keys, not results.

## Deviations from the design

- **`staticCss.themes`** is generated too (every theme of the config), not only recipes: the
  theme is picked at run time like variants. Recorded in §5.2.
- **The demos regenerate through a per-app script** (`scripts/generate.ts`) and an omni task,
  since `pureform generate` (p4c-cli) and the bundler plugin (p4c-bundler) don't exist yet.
- **solid-demo registers every component**, not only button and checkbox: its registry now
  has 32 static entries (bundle grows by the recipe functions; the CSS is unchanged). This
  is what makes the e2e test cover every component and lets `panda.config.ts` drop its hand
  list.

## Stubs and gaps

- **The `tsconfig` hint misfires on react-demo** (p4a's `generate`): it reads only
  `tsconfig.json`'s text, while react-demo's include is in `tsconfig.project.json`, which
  `tsconfig.json` extends. Harmless; p4c-cli (which prints hints) or a p4a follow-up can follow
  `extends`.
- **Two preset tokens nothing reads:** `--pf-components-slider-stateLayerColor` and
  `--pf-components-menu-supportingColor` (setting them does nothing). The e2e test lists them
  as `UNREAD`; a preset fix should remove them from that list. Not a codegen issue.
- **No package-based styled-system:** `outdir` is a path. An app that ships Panda's output as
  a package (`importMap`) would need an option for a bare specifier; nobody needs it yet.
- `scripts/generate.ts` in each demo goes away when p4c moves the demos onto the CLI or the
  plugin.

## How to verify

- `task_run` `test:unit` and `build` on `@pureform/panda-adapter`: `src/codegen.spec.ts` (10
  tests, snapshots in `src/__snapshots__/codegen.spec.ts.snap`, plus type checks), including
  `generate({ target: codegen })` end to end into a temp root and `check: true` → `ok`.
- `task_run` `prepare` on `@pureform/site` and `@pureform/react-demo` (runs `generate`, then
  `panda codegen`); `bun scripts/generate.ts --check` in either demo exits 0 when
  `.pureform/` is current.
- `task_run` `test:e2e` on `@pureform/browser-e2e-tests`: 440 of 441 pass; the failure is the
  pre-existing rn-parity "every variant value at rest" case. On `@pureform/component-suites`:
  304 passed, 18 skipped, 6 todo.
- Workspace `build` + `test:unit`: all pass except that same pre-existing case.
- Types: `bun x tsc --noEmit -p apps/solid-demo` and `-p apps/react-demo/tsconfig.json` pass
  over all generated modules.

## Notes for the next phases

- **p4b-css, p4b-tailwind, p4b-rn (shared pieces):**
    - `.pureform/` is already ignored by oxfmt and oxlint (`af54617`); don't format generated
      files, or `--check` reports them `modified`.
    - The pattern for wiring a `/codegen` subpath is `1e625d7`: `exports["./codegen"]`,
      `lib.entry.codegen`, dependency `@pureform/generate` in `package.json`, `bun.lock`
      (by hand), and `project.omni.yaml`; `@types/node` and `"types": ["node"]` if the spec
      uses `node:` modules. `bun install --frozen-lockfile` then links it.
    - Spec pattern: a fake `CodegenContext` with `componentShape` for unit snapshots, plus one
      `generate({ root: tmp, config: object, target: codegen })` end-to-end case.
    - `generate` resolves the adapter from `dist` (the `require` condition), so build the
      adapter before running it from a script or an omni task.
- **p4c-bundler / p4c-cli:** replace `apps/*/scripts/generate.ts` and the demos' `generate`
  task with the plugin or `pureform generate`. Options to pass for Panda: `{ prefix: "pf" }`
  (solid-demo, react-demo), and `components: ["button", "checkbox"]` for react-demo. The
  demos commit `.pureform/`; switching to ignoring it is the p4c decision.
- **p6 (component rollout):** a component the config has is already in solid-demo's registry
  and `staticCss`; nothing to register by hand. For react-demo, add it to the allow-list in
  `apps/react-demo/scripts/generate.ts` and run `prepare`.
- **p7 (pruning):** narrow `staticCss.recipes` per component in `staticCssModule` (it emits
  `["*"]` today); the codegen's `components` already follow the allow-list.
- **bun.lock:** edited by hand again (panda-adapter's `@pureform/generate` and `@types/node`,
  both demos' `@pureform/generate`); `bun install --frozen-lockfile` reports no changes.
