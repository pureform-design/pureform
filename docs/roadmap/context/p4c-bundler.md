# p4c-bundler: @pureform/bundler (output context)

Commits: 61565c4..f0056c9, plus the `docs(roadmap)` commit that adds this file.

| Commit    | What                                                                                               |
| --------- | -------------------------------------------------------------------------------------------------- |
| `61565c4` | `feat(generate)`: `createGlueRunner`, `watchGlue`, `findConfigFile`; jiti `tryNative: false`; hint |
| `09ae2d0` | `feat(bundler)`: the package (unplugin plugin, Metro wrapper, client types), specs, README         |
| `631577c` | `refactor(demos)`: both demos on the plugin; solid-demo stops committing `.pureform/`              |
| `f0056c9` | `docs(design)`: "Built (p4c-bundler)" in §6                                                        |

## Built

### `@pureform/bundler` (`packages/bundler`, new, core train)

Scaffolded with the `ts-package` generator (`release_group: core-train`, in `cog.toml`'s train
and `CORE_TRAIN_PACKAGES`). `sideEffects: false`. Dependencies: `@pureform/generate`,
`@pureform/core` and `@pureform/styling` (types), `unplugin` (new catalog entry `^2.3.11`, the
version already in the lockfile). Dev: `rolldown`, `vite`, `@types/node`. Root catalog entry
`"@pureform/bundler": "workspace:^"`. Subpaths: `.`, `./vite`, `./rollup`, `./rolldown`,
`./esbuild`, `./metro`, `./client` (types only, `client.d.ts` at the package root).

```ts
// options.ts (re-exported from ".")
const REGISTRY_ID = "virtual:pureform/registry";
interface PureformPluginOptions<Options = Record<string, unknown>> {
    readonly target: Target | CodegenAdapter<Options>; // required
    readonly options?: Options; // the adapter's options
    readonly config?: string | CoreConfig; // default: findConfigFile(root)
    readonly components?: readonly string[]; // allow-list
    readonly lazy?: readonly string[];
    readonly root?: string; // default: Vite's root, else cwd
    readonly outDir?: string; // default ".pureform"
    readonly trainCheck?: boolean; // default true
    readonly imports?: boolean | ImportRuleOptions; // default true
    readonly watch?: boolean; // default true: regenerate in dev and watch builds
}
const generateOptions: <O>(
    options: PureformPluginOptions<O>,
    root: string,
) => GenerateOptions<O>; // drops undefined
const describeResult: (result: GenerateResult) => string | undefined; // "pureform: updated .pureform/ (3 written, 1 removed)"

// plugin.ts
const unpluginFactory: UnpluginFactory<PureformPluginOptions, false>;
const pureform: UnpluginInstance<PureformPluginOptions, false>; // .vite, .rollup, .rolldown, .esbuild, …

// vite.ts, rollup.ts, rolldown.ts, esbuild.ts: `pureform` (= pureform.<bundler>), also the default export
import pureform from "@pureform/bundler/vite";

// metro.ts
const withPureformGlue: <C extends MetroConfig>(
    config: C,
    options?: PureformMetroOptions, // the plugin's options, target optional (default "native")
) => Promise<MetroConfigWithGlue<C>>; // C with resolver.resolveRequest wrapped
```

Behavior (`src/plugin.ts`):

- **Vite:** generates in the `config` hook (sequential, before every plugin's
  `configResolved`; Panda's Vite plugin loads `panda.config.ts`, which imports
  `.pureform/panda`, there). Root: `options.root ?? config.root ?? cwd`. `configResolved` swaps
  logging to Vite's logger; `configureServer` adds the dependencies to Vite's watcher.
- **Everyone (incl. Vite):** `buildStart` awaits the run (one per start, so client and server
  environments share it), prints `result.hints` once, and `addWatchFile`s the dependencies.
  `watchChange(id)` regenerates when `runner.affects(id)`; errors there are logged (and sent to
  Vite's overlay), not thrown. A failed first run throws in a build, logs in a dev server.
- **`resolveId`** (`enforce: "pre"`): `virtual:pureform/registry` → `<outDir>/index.ts` (after
  awaiting the latest run); that id, or a relative/absolute import that lands in `outDir`, when
  `<outDir>/index.ts` is missing → `GenerateError("missing-glue")` with
  `missingGlueMessage("<outDir rel>/", "<importer rel>")`. Other imports: `null`.
- **Metro:** generates (with `watchGlue`, `unref: true`; `watch: false` → one `generate`), throws
  if the first run fails, logs later results and errors, and wraps `resolver.resolveRequest`
  (the config's own, else `context.resolveRequest`) to resolve the registry id.
- **`client.d.ts`:** `declare module "virtual:pureform/registry"` with `registry:
Registry<{ [N in keyof ComponentRegistry & string]: AnyFactory | LazyInput }>`, `version`,
  `themes: readonly string[]`, `type Components`. Alternative for exact types: tsconfig
  `paths` → `./.pureform/index.ts` (without the client types; ambient modules win).

### Shared with p4c-cli, in `@pureform/generate` (`src/runner.ts`, `src/watch.ts`)

```ts
const CONFIG_FILES: readonly ["pureform.config.ts", ".mts", ".cts", ".js", ".mjs", ".cjs" variants];
const findConfigFile: (root?: string) => string; // first existing, else "pureform.config.ts"
interface GlueRunner {
    run(): Promise<GenerateResult>; // calls during a run share one more run after it
    readonly last: GenerateResult | undefined;
    readonly dependencies: readonly string[]; // absolute; config file at least, even after a failure
    affects(file: string): boolean; // file relative to root or absolute
}
const createGlueRunner: <O>(options: GenerateOptions<O>) => GlueRunner;
interface WatchGlueOptions {
    onResult?(result): void;
    onError?(error): void;
    delay?: number /* 50 */;
    unref?: boolean;
}
interface GlueWatcher {
    runner: GlueRunner;
    ready: Promise<GenerateResult | undefined>;
    close(): void;
}
const watchGlue: <O>(options: GenerateOptions<O>, watching?: WatchGlueOptions) => GlueWatcher;
```

`watchGlue` runs at once, watches the folders of the dependencies with `fs.watch` (files
replaced on save end a file watch), filters events to dependency files, debounces, follows new
dependencies after each run, and keeps watching after a failure. **This is `pureform generate
--watch`**: the CLI only needs to print `onResult`/`onError`.

Also in that commit: `loadConfig` creates jiti with `tryNative: false` (Bun no longer imports
the config natively), and the tsconfig hint follows relative `extends` (fixes p4b-panda's
react-demo misfire).

### How the demos are wired now

- **`apps/solid-demo`:** `vite.config.ts` puts `pureform(glue)` (from
  `@pureform/bundler/vite`) first in `plugins`. `pureform.glue.ts` (new) exports `PREFIX = "pf"`
  and `glue = { target: "panda", options: { prefix: PREFIX } } satisfies
PureformPluginOptions<PandaCodegenOptions>`; `panda.pureform.ts` imports `PREFIX` from it and
  re-exports it. **`.pureform/` is no longer committed** (`.gitignore`; `git rm --cached`).
  `vite build` from a deleted folder writes it and builds (checked by hand: bodies identical
  to before, only the hash line differs). `vite dev` regenerates on a config change (checked by
  hand: adding a theme rewrote `index.ts`, reverting restored it). The omni `generate` task is
  still `scripts/generate.ts` (now `node scripts/generate.ts`, spreading `glue`), with cache
  output `.pureform/**/*`; `.pureform/**/*` left its cache key, `pureform.glue.ts` joined it.
  `prepare` (`panda codegen`) still depends on `generate`.
- **`apps/react-demo`:** the same plugin and `pureform.glue.ts` (plus `components: ["button",
"checkbox"]`); **its `.pureform/` stays committed** (the "committed" path of §6, for p4c-cli's
  `--check`). Its glue changed only in the hash line (the bundler is now an installed train
  package, and the hash is Node's).
- **Tests:** `tests/browser-e2e-tests` and `tests/component-suites` add
  `apps/solid-demo/pureform.glue.ts` to their cache keys; they still get the glue through
  `^prepare` → `generate`.
- **CSS and Tailwind plugins not retired:** `css-demo` and `tailwind-demo` still read class
  strings from `virtual:pureform/components` (`pureformCss`, `pureformTailwind`); moving them onto
  the registry is p5a's, after which both plugins can go.

## Deviations from the design

- **Metro is a config wrapper, not an unplugin target** (`withPureformGlue` in `/metro`):
  unplugin has no Metro adapter. It returns a promise of the config.
- **`virtual:pureform/registry` resolves to the real `index.ts`** rather than a virtual module
  re-exporting it, so HMR and the declarations work on the file itself.
- **solid-demo stops committing its glue**, react-demo keeps it: both paths of §6 stay in use.
- **Generation runs in Vite's `config` hook** as well as `buildStart`, so it precedes Panda's
  plugin; recorded in §6.

## Stubs and gaps

- **Bun and Node hash the same config differently.** The preset computes
  `components.fab.recipe.variants.shape.cookieToCircle` (a shape morph's curves) differently
  under JavaScriptCore than V8, so the evaluated config, and the hash, differ by runtime (and
  any adapter output that writes those values, such as the CSS target's stylesheet, would
  differ too). Worked around by running the demos' scripts under Node, as Vite does. A preset
  fix (deterministic morph) or hashing source files instead of the evaluated config would
  remove it; neither is done. Recorded in the generate and bundler READMEs and §6.
- **Rollup and esbuild aren't installed** in the repo, so `/rollup` and `/esbuild` are untested
  (Vite and Rolldown are).
- **Metro isn't run for real** in the specs (the wrapper's generation, watching, and
  `resolveRequest` are); nothing uses it yet (rn-web-demo is Vite; p8 decides).
- **No pruning** (p7).
- **`scripts/generate.ts` in both demos** remains until p4c-cli's `pureform generate` replaces it.

## How to verify

- `task_run` `test:unit` and `build` on `@pureform/bundler`: 18 tests with type checks
  (`plugin.spec.ts`: Vite builds of temp apps importing the virtual id, glue before another
  plugin's `configResolved`, options, a failing build, dev-server regeneration on config and
  import changes, missing glue in dev, Rolldown, hooks; `metro.spec.ts`; `options.spec.ts`;
  `client.spec.ts` runs `tsc` on an app using the client types with `@ts-expect-error`s).
- `task_run` `test:unit` on `@pureform/generate`: runner and watcher specs, hint-follows-extends.
- `task_run` `build` on `@pureform/site` and `@pureform/react-demo`: pass.
  `cd apps/solid-demo && rm -rf .pureform && bun x vite build` writes the glue and builds.
- Workspace `build` + `test:unit`: all pass except the pre-existing rn-parity "every variant
  value at rest" case (440 of 441 in `@pureform/browser-e2e-tests`); `component-suites`
  `test:e2e` passes.
- `node apps/react-demo/scripts/generate.ts --check` exits 0; `tsc --noEmit -p apps/solid-demo`
  and `-p apps/react-demo/tsconfig.json` pass; `bun packages/release/src/cli.ts check` passes.

## Notes for the next phases

- **p4c-cli:**
    - Use `watchGlue(options, { onResult, onError })` for `--watch` and `findConfigFile(root)`
      for the default config; `createGlueRunner` if you need the loop yourself.
    - **Where the CLI gets `target`/`options`:** the plugin takes them as options; the demos keep
      them in `pureform.glue.ts` (`export const glue = { target, options, components? }`), which
      `vite.config.ts` and `scripts/generate.ts` both import. A CLI flag or a default
      options module (e.g. loading `pureform.glue.ts`'s `glue` export) would let
      `pureform generate` replace the scripts without repeating them; that's your call.
    - Replace `apps/{solid,react}-demo/scripts/generate.ts` and the omni `generate` tasks
      (`node scripts/generate.ts`, which must stay in Node or match whatever runtime Vite uses;
      see the Bun/Node gap). The CLI's bin should run under Node, or `--check` disagrees with
      glue Vite wrote.
    - react-demo's glue is committed: a good `--check` subject. solid-demo's is ignored: a good
      `.gitignore` hint subject (it's already in `.gitignore`, so the hint should stay quiet).
- **p5a:** `pureform.vite({ target: "css" | "tailwind", options })` writes `styles.css` into
  `.pureform/`; the app imports it (Tailwind: after `tailwindcss`). Then retire `pureformCss` and
  `pureformTailwind` and `virtual:pureform/components`.
- **p7:** pruning goes in this plugin (build mode, `moduleParsed`/`generateBundle`), regenerating
  with a narrowed `components` through `createGlueRunner`'s options.
- **p8:** `withPureformGlue` (target `native`) is ready for a Metro app; rn-web-demo (Vite) can
  use `pureform.vite({ target: "native", options: { fontStack: "all" } })`.
- **Lockfile:** edited by hand (workspace block, two catalog lines, one package line, the demos'
  dev dependency); `bun install --frozen-lockfile` reports no changes.
