# @pureform/generate

The build step that the bundler plugin (`@pureform/bundler`) and the `pureform` command
(`@pureform/cli`) share. It loads `pureform.config.ts`, asks the target's adapter for its
factory modules, and writes the `.pureform/` folder an app hands to `PureformProvider`. It has
no bundler or CLI dependency of its own, so the plugin and the command can't produce
different glue.

- **Depends on:** `@pureform/core` (config types), `jiti` (loads the config), `oxc-parser`
  (checks the config's imports). At run time it loads the target's adapter
  (`@pureform/<target>-adapter/codegen`) from the app's install.
- **Depended on by:** `@pureform/bundler` and `@pureform/cli` (p4c), and each adapter's
  `/codegen` subpath, which implements the interface here (p4b).
- Part of the core train: released at the same version as `core`, `styling`, and the
  adapters.

Design: [§4 config](../../docs/design/component-architecture.md#4-pureformconfigts),
[§6 generated glue](../../docs/design/component-architecture.md#6-generated-glue),
[§10 CLI](../../docs/design/component-architecture.md#10-cli),
[§11 versioning](../../docs/design/component-architecture.md#11-versioning).

## Architecture

```
generate(options)
  ├─ train.ts         installed core-train packages share one version? bindings' peers agree?
  ├─ config.ts        loadConfig: jiti, fresh each call
  │    └─ imports.ts  import rules: only pureform packages and relative data files
  ├─ load-adapter.ts  "panda" → @pureform/panda-adapter/codegen (or an adapter object)
  ├─ hash.ts          one hash of config + options + versions, in every file's header
  ├─ adapter.codegen(context)        ← the adapter writes its modules' source
  ├─ glue.ts          index.ts (registry, version, themes) and registry.d.ts
  └─ write.ts         write what changed, remove what's no longer wanted, or compare (check)
```

| Module            | What it does                                                                  |
| ----------------- | ----------------------------------------------------------------------------- |
| `adapter.ts`      | The codegen interface: `CodegenAdapter`, `CodegenContext`, `CodegenOutput`, … |
| `shape.ts`        | `componentShape(spec)`: a component's groups, defaults, slots, and tokens     |
| `generate.ts`     | `generate(options)`: the whole step                                           |
| `config.ts`       | `loadConfig(path, options)`                                                   |
| `imports.ts`      | `scanConfigImports(entry, options)`, `formatImportViolations`                 |
| `train.ts`        | `CORE_TRAIN_PACKAGES`, `findInstalled(root)`, `checkTrain(installed)`         |
| `semver.ts`       | `compareVersions`, `satisfies`: just enough semver for the train check        |
| `hash.ts`         | `stableStringify`, `hashOf`, the header (`GENERATED_MARK`, `headerHash`)      |
| `glue.ts`         | `registryIndex`, `registryDeclarations`                                       |
| `write.ts`        | `writeFiles`, `compareFiles`                                                  |
| `missing.ts`      | `missingGlueMessage`, `assertGlue`                                            |
| `errors.ts`       | `GenerateError` with a `code`, `isGenerateError`                              |
| `load-adapter.ts` | `loadAdapter(target, root)`                                                   |
| `runner.ts`       | `createGlueRunner(options)`, `findConfigFile(root)`, `CONFIG_FILES`           |
| `watch.ts`        | `watchGlue(options, watching)`: generate on every change, without a bundler   |

## Public API

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
});
result.files; // [{ path: "web/button.ts", status: "written" | "unchanged" | "removed" | … }]
result.ok; // check mode: up to date
result.dependencies; // the config and the files it imports: what to watch
result.hints; // e.g. add ".pureform/**/*" to the tsconfig's include
```

Errors are `GenerateError`s with a `code`: `config-not-found`, `config-load`,
`config-export`, `config-imports`, `adapter-not-found`, `adapter-invalid`,
`adapter-output`, `components`, `train-mismatch`, `missing-glue`.

### What it writes

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
// index.ts
import { createRegistry } from "@pureform/styling";

import { button } from "./web/button";

/** The core train's version this glue was made with. */
export const version = "0.4.1";

export const registry = createRegistry(
    {
        button,
        checkbox: { lazy: () => import("./web/checkbox") },
    },
    { version },
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
  allow-list and lazy list, every installed train and binding package's version, and a
  format number for what `generate` itself writes.

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
    }),
});
```

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

### The train check

Before generating, `generate` reads each installed core-train and binding package (the
nearest `node_modules/<name>` from the root up). It fails when train packages differ in
version, naming the ones behind the newest and the command line to install, or when a
binding's peer range on a train package excludes the train's version. Ranges that aren't
semver (`workspace:^`, `catalog:`) pass. `trainCheck: false` turns it off. The train's
version goes into the glue (`createRegistry(…, { version })`), and the bindings warn in
development when the running `@pureform/styling` differs (`trainVersionMismatch` in
`@pureform/binding-core`).

### Missing glue

`assertGlue(".pureform", { root, importer })` throws a `missing-glue` error naming both ways
to generate the folder (`pureform generate`, or the bundler plugin) when the index is
missing; `missingGlueMessage(outDir, importer)` gives the text. Nothing raises it on its own:
the bundler plugin raises it when an import resolves into a missing folder, and test setups
can call `assertGlue`. (`pureform generate --check` reports a missing folder as out of date.)

### Generating again: the runner and the watcher

What the bundler plugin, its Metro wrapper, and `pureform generate --watch` share:

```ts
import {
    createGlueRunner,
    findConfigFile,
    watchGlue,
} from "@pureform/generate";

findConfigFile(root); // the first pureform.config.{ts,mts,cts,js,mjs,cjs}, else "pureform.config.ts"

const runner = createGlueRunner({
    root,
    config: "pureform.config.ts",
    target: "panda",
});
await runner.run(); // calls during a run share one more run after it
runner.dependencies; // the config and its relative imports (the config alone until a run reads them)
runner.affects(file); // whether a changed file is one of them

const watcher = watchGlue(options, {
    onResult,
    onError,
    delay: 50,
    unref: false,
});
await watcher.ready; // the first run's result, or undefined when it failed (onError has the error)
watcher.close();
```

`watchGlue` watches the folders of `runner.dependencies` with `fs.watch` (editors often save by
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
- **`CORE_TRAIN_PACKAGES` is embedded**, since `cog.toml` isn't there in an app's install; a
  test keeps it equal to `cog.toml`'s `core-train`.
- **semver is partial:** prereleases sort before their release but aren't excluded from
  ranges, unlike npm's rule.
