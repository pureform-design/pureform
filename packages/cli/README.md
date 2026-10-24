# @pureform/cli

The `pureform` command. `pureform generate` writes the generated registry to `.pureform/` (the style
registry's modules and their declarations) without a bundler, for `tsc`, lint, tests, or Panda's
codegen; `--watch` keeps it current, and `--check` verifies a committed registry in CI. It holds no
generation logic: it calls `@pureform/generate`, the same step the bundler plugin
(`@pureform/bundler`) runs, so the two can't write different output, and installing the command
doesn't pull in the plugin.

- **Depends on:** `@pureform/generate` (generation, config discovery, the watcher), `jiti`
  (loading the codegen file), `@pureform/bundler` (the usage scan behind `--prune`).
- **Depended on by:** apps' and fixtures' scripts (`apps/solid-demo`, `apps/react-demo`,
  `tests/panda-fixture`: their omni `generate` tasks).
- Part of the core train: released at the same version as `core`, `styling`, and the adapters.

Design: [§10 CLI](../../docs/design/component-architecture.md#10-cli),
[§6 the generated registry](../../docs/design/component-architecture.md#6-the-generated-registry).

## Usage

```sh
pureform generate                  # write every target's full output, and the entries
pureform generate --prune          # also write each target's pruned output, as a build does
pureform generate --check          # compare, write nothing, exit 1 when it differs
pureform generate --watch          # write, then again on every change to the config
pureform generate --target panda --options '{"prefix":"pf"}' --components button,checkbox
```

| Flag                   | Default                                         | What it does                                                                             |
| ---------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `--check`              | off                                             | Compare instead of writing; exit 1 on missing or stale files                             |
| `--watch`              | off                                             | Generate again when the config or a file it imports changes                              |
| `--prune`              | off                                             | Scan the app and write `<target>/pruned/` too (the codegen file's `prune` options apply) |
| `--root <dir>`         | the working directory                           | The app's root                                                                           |
| `--config <file>`      | the first `pureform.config.{ts,mts,…}`          | The config, relative to the root                                                         |
| `--codegen <file>`     | the first `pureform.codegen.{ts,mts,…}` in root | The module exporting the options                                                         |
| `--target <target>`    | the codegen file's                              | `panda`, `css`, `tailwind`, or `native`; replaces `targets`                              |
| `--options <json>`     | the codegen file's                              | The adapter's options, merged over the codegen file's                                    |
| `--components <names>` | the codegen file's, else all                    | The allow-list, comma-separated                                                          |
| `--lazy <names>`       | the codegen file's, else none                   | Components whose registry entries load on demand                                         |
| `--out-dir <dir>`      | the codegen file's, else `.pureform`            | The folder written, relative to the root                                                 |
| `--no-train-check`     | the check is on                                 | Skip checking that pureform packages share one version                                   |

Exit codes: 0 done (or up to date), 1 generation failed or `--check` found the output out of
date, 2 called wrong (unknown command or flag, `--watch` with `--check`).

### The codegen file

The options (the target, the adapter's options, the allow-list) live where both the command and
the bundler config can read them: `pureform.codegen.ts` in the app's root, exporting them as
`codegen` (or by default). Flags override them; keys the command doesn't know, such as the
plugin's `watch`, are ignored. A `root` in it is relative to the file's folder.

```ts
// pureform.codegen.ts
import type { PureformPluginOptions } from "@pureform/bundler";
import type { PandaCodegenOptions } from "@pureform/panda-adapter/codegen";

export const codegen = {
    target: "panda",
    options: { prefix: "pf" },
    components: ["button", "checkbox"],
} satisfies PureformPluginOptions<PandaCodegenOptions>;
```

Several targets go in `targets`, as the plugin takes them (see `@pureform/bundler`):

```ts
export const codegen = {
    targets: {
        web: { target: "panda", options: { prefix: "pf" } },
        native: { target: "native" },
    },
};
```

The command writes `.pureform/<target>/full/` for each, then the entries at the top
(`index.ts`, `registry.d.ts`, the default target's other root files, and `web.ts`,
`native.ts`); `--prune` adds `.pureform/<target>/pruned/`. `--options`, `--components` and
`--lazy` set a single target's, so with `targets` they need `--target`, which replaces the
targets with one.

Without a codegen file, `--target` is required.

### What it prints

- A write: `pureform: updated .pureform/ (3 written, 1 removed)` and the files (up to ten), or
  `pureform: .pureform/ is up to date`. `generate`'s hints (such as the tsconfig one) go to
  stderr.
- **The `.gitignore` hint**, once, after the first write: when the root is in a git repository
  that neither ignores the folder nor tracks any file in it, the command names the line to add
  (`.pureform/`) and the `.gitignore` to add it to. It never edits `.gitignore`; an app that
  commits its registry tracks the folder, so the hint stays quiet. `--check` never prints it.
- A check: `pureform: .pureform/ is up to date`, or, on stderr with exit code 1,
  ``pureform: .pureform/ is out of date (2 stale). Run `pureform generate` to update it.``
  and each file with its status (`missing`, `stale`, `modified`, `extra`).
- `--watch`: the first result, then a line naming what it watches (the config, the files it
  imports, and the codegen file), then each later change. Errors are printed and watching
  goes on; an edit to the codegen file starts over with its new options (a broken edit keeps the old
  ones). SIGINT or SIGTERM stops it with exit code 0.

## Architecture

```
cli/index.ts   the bin (#!/usr/bin/env node): main(process.argv.slice(2))
     │
program.ts     main(args, io): the commands, help, version; parseGenerateFlags (node:util parseArgs)
     │
generate.ts    runGenerate(flags, io): generateTargets once (write or check) or watchGenerate; prints results
     ├── codegen-file.ts  resolveCodegenOptions(flags, cwd): find and load the codegen file, flags over it, defaults;
     │                    --prune scans the app with @pureform/bundler's findUsage
     └── gitignore.ts     gitignoreHint(root, outDir): git check-ignore, git ls-files
```

| Module            | Exports                                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `program.ts`      | `main`, `parseGenerateFlags`, `USAGE`, `GENERATE_USAGE`                                                                   |
| `generate.ts`     | `runGenerate`, `describeError`, `CliIO`                                                                                   |
| `codegen-file.ts` | `CODEGEN_FILES`, `TARGETS`, `findCodegenFile`, `loadCodegenOptions`, `resolveCodegenOptions`, `CodegenFileOptions`, flags |
| `gitignore.ts`    | `gitignoreHint`                                                                                                           |
| `errors.ts`       | `CliError`                                                                                                                |

`main` takes an `io` (`cwd`, `stdout`, `stderr`, and an `AbortSignal` that stops `--watch`), so
tools and tests can run the command in-process:

```ts
import { main } from "@pureform/cli";

const code = await main(["generate", "--check"], { cwd: "apps/my-app" });
```

## Build and test

- `task_run` `test:unit` on `@pureform/cli`: in-process runs on temporary apps whose codegen
  file holds a fake adapter (writing, flags over the codegen file, `--root`, `--check` on
  missing, fresh, stale after a config or options change, and hand-edited output, errors,
  `--watch` over config, import, and codegen-file edits), the flag parser, the codegen file's
  loading, and the
  `.gitignore` hint in temporary git repositories.
- `task_run` `build` on `@pureform/cli`: `dist/pureform.mjs` (the bin) and `dist/index.mjs`.
  Apps get the bin linked as `node_modules/.bin/pureform` after `bun install`.

## Surprises

- **It runs under Node on purpose.** The preset computes a shape morph's curves differently
  under Bun than under Node, so the output's hash differs by runtime; Vite runs the bundler plugin
  under Node, and the bin's shebang is `node`, so both agree. `bun x pureform` follows the
  shebang; `bunx --bun pureform` would not, and its output would look stale to Vite.
- **No `commander`:** the flags are few, so Node's `parseArgs` keeps the bin dependency-free
  beyond `@pureform/generate` and `jiti`.
- **Deferred commands** (design doc §10): `init`, `eject`, `doctor`.
