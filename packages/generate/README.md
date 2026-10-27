# @pureform/generate

The build step that the bundler plugin (`@pureform/bundler`) and the `pureform` command
(`@pureform/cli`) share. It loads `pureform.config.ts`, asks the target's adapter for its
factory modules, and writes the `.pureform/` folder an app hands to `PureformProvider`. It has
no bundler or CLI dependency of its own, so the plugin and the command can't produce
different output.

- **Depends on:** `@pureform/core` (config types), `jiti` (loads the config), `oxc-parser`
  (checks the config's imports). At run time it loads the target's adapter
  (`@pureform/<target>-adapter/codegen`) from the app's install.
- **Depended on by:** `@pureform/bundler` and `@pureform/cli`, and each adapter's
  `/codegen` subpath, which implements the interface here.
- Part of the core: released at the same version as `core`, `styling`, and the
  adapters.

Design: [§4 config](../../docs/design/component-architecture.md#4-pureformconfigts),
[§6 the generated registry](../../docs/design/component-architecture.md#6-the-generated-registry),
[§10 CLI](../../docs/design/component-architecture.md#10-cli),
[§11 versioning](../../docs/design/component-architecture.md#11-versioning).

## Architecture

```
generateTargets(options)          one config, several targets, full and pruned output apart
  ├─ generate(…) per target and output kind, into .pureform/<target>/<full|pruned>/
  └─ the top of .pureform/: entries re-exporting the default target's full/, registry.d.ts

generate(options)                 one target into one folder
  ├─ version-check.ts           installed core packages share one version? bindings' peers agree?
  ├─ config.ts          loadConfig: jiti, fresh each call
  │    └─ imports.ts    import rules: only pureform packages and relative data files
  ├─ load-adapter.ts    "panda" → @pureform/panda-adapter/codegen (or an adapter object)
  ├─ hash.ts            one hash of config + options + versions, in every file's header
  ├─ adapter.codegen(context)        ← the adapter writes its modules' source
  ├─ registry-index.ts  index.ts (registry, version, themes) and registry.d.ts
  └─ write.ts           write what changed, remove what's no longer wanted, or compare (check)
```

| Module              | What it does                                                                                             |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| `adapter.ts`        | The codegen interface: `CodegenAdapter`, `CodegenContext`, `CodegenOutput`, …                            |
| `shape.ts`          | `componentShape(spec, config?)`: groups, defaults, slots, tokens, and `springs` (core's `isSpringToken`) |
| `generate.ts`       | `generate(options)`: one target into one folder                                                          |
| `targets.ts`        | `generateTargets(options)`, `entryFile`, `targetsOf`, `OUTPUT_ENV`: several targets and the layout       |
| `config.ts`         | `loadConfig(path, options)`                                                                              |
| `imports.ts`        | `scanConfigImports(entry, options)`, `formatImportViolations`, `resolveRelative`                         |
| `usage.ts`          | Pruning's input: `Usage`, `VariantUsage`, `normalizeVariants`, `narrowConfig`                            |
| `version-check.ts`  | `CORE_PACKAGES`, `findInstalled(root)`, `checkVersions(installed)`                                       |
| `semver.ts`         | `compareVersions`, `satisfies`: just enough semver for the version check                                 |
| `hash.ts`           | `stableStringify`, `hashOf`, the header (`GENERATED_MARK`, `headerHash`)                                 |
| `registry-index.ts` | `registryIndex`, `registryDeclarations`                                                                  |
| `write.ts`          | `writeFiles`, `compareFiles`                                                                             |
| `missing.ts`        | `missingOutputMessage`, `assertGenerated`                                                                |
| `errors.ts`         | `GenerateError` with a `code`, `isGenerateError`                                                         |
| `load-adapter.ts`   | `loadAdapter(target, root)`                                                                              |
| `runner.ts`         | `createGenerateRunner(options)` over `generateTargets`, `findConfigFile(root)`, `CONFIG_FILES`           |
| `watch.ts`          | `watchGenerate(options, watching)`: `generateTargets` on every change, without a bundler                 |

## Public API

### `generateTargets`: what the plugin, Metro and the CLI run

```ts
import { entryFile, generateTargets } from "@pureform/generate";

const result = await generateTargets({
    root: process.cwd(),
    config: "pureform.config.ts",
    // Several targets by name, or `target`, `options`, `components`, `lazy` for one (named
    // after the target: `target: "panda"` writes `.pureform/panda/`).
    targets: {
        web: { target: "panda", options: { prefix: "pf" } },
        native: { target: "native", components: ["button"] },
    },
    pruned: true, // write pruned/ too (builds), for `usage`; full/ is always written
    usage: { components: ["button"] }, // one scan serves every target
    check: false,
});
result.defaultTarget; // "web": the first web target, else the first
result.targets; // [{ name, platform, full: GenerateResult, pruned?: GenerateResult }]
result.entries; // { "index.ts": { target: undefined, file: "index.ts" }, "panda.ts": …, "native.ts": … }
entryFile(result, "/app/.pureform", "native", "pruned"); // "/app/.pureform/native/pruned/index.ts"
```

The layout:

```
.pureform/
  web/full/…           ← every allowed component and variant: dev servers, the editor
  web/pruned/…         ← what the app uses: builds (kept when a later run writes full only)
  native/full/…
  index.ts             ← export * from "./web/full/index"  (bundlers redirect it per import)
  panda.ts             ← the default target's other root files, re-exported (styles.css: @import)
  web.ts, native.ts    ← with several targets: one entry per target
  registry.d.ts        ← the only declarations, from the default target's full output
```

- **Dev and build never overwrite each other.** A dev run writes `full/`; a build writes
  `full/` (unchanged when the inputs are) and `pruned/`. The entries and declarations come from
  `full/`, so the editor and `tsc` see the same thing after either.
- **One augmentation.** Only the top-level `registry.d.ts` declares `@pureform/styling`'s
  `ComponentRegistry`, from the default target's full output (a superset of pruned); the
  folders under it have none, so a tsconfig including `.pureform/**/*.*` doesn't merge two.
  The config is shared, so variants, slots and tokens agree across targets; native-only fields
  (`states`) aren't declared when a web target is the default.
- **Entries.** `index.ts` stands for whichever target an import gets (`entry.target` is
  `undefined`); a per-target entry (`native.ts`) and the other root files (`panda.ts`,
  `styles.css`) stand for their own. Types of the plain entry come from the default target;
  import `.pureform/<target>` for another target's.
- **Scripts loaded outside the bundler.** A root `.ts` file other than the index (Panda's
  `panda.ts`, read by Panda's own config loader) re-exports `full/`, or `pruned/` when the
  process sets `OUTPUT_ENV` (`PUREFORM_OUTPUT=pruned`, as a pruned Vite build does) and
  `pruned/` exists.
- **Clean-up.** Generated files at the top that no entry wants, and folders of an older layout,
  are removed; `<target>/full/` and `<target>/pruned/` are left to their own runs.

### `generate`

```ts
import { generate } from "@pureform/generate";

const result = await generate({
    root: process.cwd(), // the app
    config: "pureform.config.ts", // or the config object
    target: "panda", // "panda" | "css" | "tailwind" | "native", or a CodegenAdapter
    options: { prefix: "pf" }, // the adapter's own options
    components: ["button", "checkbox"], // optional allow-list
    lazy: ["checkbox"], // optional: lazy registry entries
    outDir: ".pureform", // default
    check: false, // true: compare, write nothing
    // optional: what the app uses (the bundler plugin's pruning)
    usage: {
        components: ["button"],
        variants: { button: { variant: ["text"], "*": [] } },
    },
});
result.components; // ["button"]: what was generated
result.files; // [{ path: "web/button.ts", status: "written" | "unchanged" | "removed" | … }]
result.ok; // check mode: up to date
result.dependencies; // the config and the files it imports: what to watch
result.hints; // e.g. add ".pureform/**/*" to the tsconfig's include
result.platform; // the adapter's
result.declarations; // registry.d.ts's source, written unless `declarations: false`
```

`generate` writes one target into one folder; `generateTargets` calls it per target and output
with `declarations: false`, and writes the declarations once at the top.

Errors are `GenerateError`s with a `code`: `config-not-found`, `config-load`,
`config-export`, `config-imports`, `adapter-not-found`, `adapter-invalid`,
`adapter-output`, `components`, `version-mismatch`, `missing-output`.

### Pruning: `usage`

The bundler plugin scans an app in builds and passes what it found as `usage` (design doc §7):

```ts
interface Usage {
    readonly components: readonly string[]; // drawn; within the allow-list, the rest left out
    readonly variants?: VariantUsage; // values selected
}
// component → group → values. A component or group left out keeps every value, and so does a
// group listed as ["*"]; a "*" group stands for the groups not listed.
type VariantUsage = Readonly<
    Record<string, Readonly<Record<string, readonly string[]>>>
>;
```

- `components` narrows the generated components (names the config lacks are ignored; lazy
  names left out are dropped).
- `variants` reaches the adapter as `context.variants`, normalized by `normalizeVariants`:
  only generated components and real groups, each narrowed group with its default, in the
  config's order, and no group that keeps every value. Adapters narrow their styles to it; the
  factory modules and the declarations don't change. `narrowConfig(config, components,
  variants)` gives the config with only those components and the values in use (their compound
  variants too), for adapters that compile styles from the config. `keepsValue` answers for one
  value.
- The hash covers `variants` only when they narrow something, so a registry made with a usage that
  narrows nothing equals an unpruned one.

### What `generate` writes

Into its `outDir` (`generateTargets` gives it `.pureform/<target>/<full|pruned>/`, without
`registry.d.ts`):

```
.pureform/
  web/button.ts      ← the adapter's modules (native/… on React Native)
  web/checkbox.ts
  panda.ts           ← the adapter's other files
  index.ts           ← registry, version, themes, Components
  registry.d.ts      ← augments @pureform/styling's ComponentRegistry
```

Every file starts with the same header:

```ts
// Generated by pureform: do not edit. Run `pureform generate` to update it.
// pureform-hash: 5f4646e703808a3a
```

```ts
// index.ts (a web target; a native one imports createRegistry from @pureform/styling)
import { createWebRegistry } from "@pureform/styling-web";

import { button } from "./web/button";

/** The core's version this registry was made with. */
export const version = "0.4.1";

export const registry = createWebRegistry(
    {
        button,
        checkbox: { lazy: () => import("./web/checkbox") },
    },
    { version, themeAttribute: "data-panda-theme", vars: { prefix: "pf" } },
);

export const themes = ["teal", "sharp", "dense"] as const;

export type Components = "button" | "checkbox";
```

- **Rewrite only on change:** a file is written only when its contents differ, and generated
  files that are no longer wanted (a component left the allow-list) are removed. Files
  without the header are the app's and are left alone.
- **Check:** `check: true` writes nothing. It compares hashes first: a missing index or a
  header with another hash is stale without running the adapter. With matching hashes it
  runs the adapter and compares contents (`modified`), and lists generated files no longer
  wanted (`extra`).
- **The hash** covers the config, the target's name and platform, the adapter's options, the
  allow-list and lazy list (after pruning), the pruned variants when they narrow anything,
  every installed core package and binding package's version, and a format number for what
  `generate` itself writes.

### The adapter codegen interface

Each adapter exports `codegen` from its `/codegen` subpath:

```ts
import { defineCodegen } from "@pureform/generate";

export const codegen = defineCodegen<{ prefix?: string }>({
    name: "panda",
    platform: "web", // "native" for StyleFactory modules
    codegen: (context) => ({
        components: context.components.map((name) => ({
            name,
            path: `web/${name}.ts`,
            contents: `…export const ${name}: ClassFactory<"${name}"> = …`,
            // exportName, and shape (to add native states), are optional
        })),
        files: [
            { path: "panda.ts", contents: "export const staticCss = …;\n" },
        ],
        themeAttribute: "data-panda-theme", // how the stylesheet scopes named themes
        vars: { prefix: "pf" }, // how the stylesheet names its CSS vars
    }),
});
```

The context also carries `variants` in a pruned build (empty or absent otherwise): narrow the
stylesheet, `staticCss`, or precomputed tables to it, never the modules (see Pruning above).

The adapter's `platform` picks the registry: a web target's index calls `@pureform/styling-web`'s
`createWebRegistry`, a native target's calls `@pureform/styling`'s neutral `createRegistry` with
just `{ version }`. Both make the same entries; the declarations augment `@pureform/styling` for
every target. `themeAttribute` is the attribute the target's stylesheet matches named themes with;
a web index passes it to `createWebRegistry`, whose `themeAttributes(name)` providers write on
their element. `vars` (`CodegenVars`: the component var `prefix` and the `tokenPrefix`) is how the
stylesheet names its CSS vars; a web index passes the defined ones as `vars`, which providers name
token overrides and runtime theme vars with. A native index ignores both.

The context gives the config, the components to generate, the adapter's options, the root
and output folder, `shape(name)` (groups, defaults, slots, tokens from the config), and
`importPath(from, to)` for imports out of the folder (`"../../styled-system/recipes/button"`).
See `src/adapter.ts` for every field.

### The config's import rules

`loadConfig` (and `generate` with a config path) walks the config's relative imports and
fails on a Node built-in, a package that isn't `@pureform/*`, or `process.env`,
`import.meta.env`, `Bun.env`, or `Deno.env` read at top level. Type-only imports are fine.
`imports: { allow: ["lodash-es", /^@acme\//] }` allows pure-data packages; `imports: false`
skips the check.

### The version check

Before generating, `generate` reads each installed core package and binding package (the
nearest `node_modules/<name>` from the root up). It fails when core packages differ in
version, naming the ones behind the newest and the command line to install, or when a
binding's peer range on a core package excludes the core's version. Ranges that aren't
semver (`workspace:^`, `catalog:`) pass. `versionCheck: false` turns it off. The core's
version goes into the generated registry (`createRegistry(…, { version })`), and the bindings warn
in development when the running `@pureform/styling` differs (`versionMismatch` in
`@pureform/binding-core`).

### Missing output

`assertGenerated(".pureform", { root, importer })` throws a `missing-output` error naming both ways
to generate the folder (`pureform generate`, or the bundler plugin) when the index is
missing; `missingOutputMessage(outDir, importer)` gives the text. Nothing raises it on its own:
the bundler plugin raises it when an import resolves into a missing folder, and test setups
can call `assertGenerated`. (`pureform generate --check` reports a missing folder as out of date.)

### Generating again: the runner and the watcher

What the bundler plugin, its Metro wrapper, and `pureform generate --watch` share:

```ts
import {
    createGenerateRunner,
    findConfigFile,
    watchGenerate,
} from "@pureform/generate";

findConfigFile(root); // the first pureform.config.{ts,mts,cts,js,mjs,cjs}, else "pureform.config.ts"

const runner = createGenerateRunner({
    root,
    config: "pureform.config.ts",
    target: "panda", // or `targets`, and `pruned` with `usage`: generateTargets' options
});
await runner.run(); // calls during a run share one more run after it
runner.dependencies; // the config and its relative imports (the config alone until a run reads them)
runner.affects(file); // whether a changed file is one of them

const watcher = watchGenerate(options, {
    onResult,
    onError,
    delay: 50,
    unref: false,
});
await watcher.ready; // the first run's result, or undefined when it failed (onError has the error)
watcher.close();
```

`watchGenerate` watches the folders of `runner.dependencies` with `fs.watch` (editors often save by
replacing a file, which ends a watch on the file itself), runs again after a change to one of
them, follows the dependencies each run finds, and keeps watching after a failed run.

## Build and test

- `task_run` `test:unit` on `@pureform/generate`: unit tests with a fake adapter, temporary
  app roots, and fixture `node_modules`, plus type checks.
- `task_run` `build` on `@pureform/generate`: builds `dist`, which the bundler and the CLI
  import.

## Surprises

- **TypeScript skips dot folders.** An app's tsconfig must include `.pureform/**/*` or the
  declarations are invisible; `generate` returns a hint when neither the root's
  `tsconfig.json` nor a tsconfig it extends by a relative path mentions the folder.
- **The hash depends on the JavaScript engine.** It covers the evaluated config, and the preset
  computes some values (a shape morph's curves) differently under Bun than under Node, so the
  same config hashes differently in each. Generate under one runtime (Node, as Vite runs the
  bundler plugin, and as `pureform`'s bin runs). jiti transforms the config itself under both (`tryNative: false`), so at
  least functions' source doesn't differ.
- **Files without a header** (`header: false`, for JSON) can't be told from the app's, so
  they're never removed or reported as extra.
- **`CORE_PACKAGES` is embedded**, since `cog.toml` isn't there in an app's install; a
  test keeps it equal to `cog.toml`'s `core`.
- **semver is partial:** prereleases sort before their release but aren't excluded from
  ranges, unlike npm's rule.
