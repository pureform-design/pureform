# @pureform/cli

The `pureform` command. `pureform generate` writes the `.pureform/` glue (the style registry and
its declarations) without a bundler, for `tsc`, lint, tests, or Panda's codegen; `--watch` keeps
it current, and `--check` verifies committed glue in CI. It holds no generation logic: it calls
`@pureform/generate`, the same step the bundler plugin (`@pureform/bundler`) runs, so the two
can't write different glue, and installing the command doesn't pull in the plugin.

- **Depends on:** `@pureform/generate` (generation, config discovery, the watcher), `jiti`
  (loading the glue file).
- **Depended on by:** apps' and fixtures' scripts (`apps/solid-demo`, `apps/react-demo`,
  `tests/panda-fixture`: their omni `generate` tasks).
- Part of the core train: released at the same version as `core`, `styling`, and the adapters.

Design: [§10 CLI](../../docs/design/component-architecture.md#10-cli),
[§6 generated glue](../../docs/design/component-architecture.md#6-generated-glue).

## Usage

```sh
pureform generate                  # write .pureform/
pureform generate --check          # compare, write nothing, exit 1 when it differs
pureform generate --watch          # write, then again on every change to the config
pureform generate --target panda --options '{"prefix":"pf"}' --components button,checkbox
```

| Flag                   | Default                                      | What it does                                                 |
| ---------------------- | -------------------------------------------- | ------------------------------------------------------------ |
| `--check`              | off                                          | Compare instead of writing; exit 1 on missing or stale files |
| `--watch`              | off                                          | Generate again when the config or a file it imports changes  |
| `--root <dir>`         | the working directory                        | The app's root                                               |
| `--config <file>`      | the first `pureform.config.{ts,mts,…}`       | The config, relative to the root                             |
| `--glue <file>`        | the first `pureform.glue.{ts,mts,…}` in root | The module exporting the options                             |
| `--target <target>`    | the glue file's                              | `panda`, `css`, `tailwind`, or `native`                      |
| `--options <json>`     | the glue file's                              | The adapter's options, merged over the glue file's           |
| `--components <names>` | the glue file's, else all                    | The allow-list, comma-separated                              |
| `--lazy <names>`       | the glue file's, else none                   | Components whose registry entries load on demand             |
| `--out-dir <dir>`      | the glue file's, else `.pureform`            | The folder written, relative to the root                     |
| `--no-train-check`     | the check is on                              | Skip checking that pureform packages share one version       |

Exit codes: 0 done (or up to date), 1 generation failed or `--check` found the glue out of
date, 2 called wrong (unknown command or flag, `--watch` with `--check`).

### The glue file

The options (the target, the adapter's options, the allow-list) live where both the command and
the bundler config can read them: `pureform.glue.ts` in the app's root, exporting them as
`glue` (or by default). Flags override them; keys the command doesn't know, such as the
plugin's `watch`, are ignored. A `root` in it is relative to the file's folder.

```ts
// pureform.glue.ts
import type { PureformPluginOptions } from "@pureform/bundler";
import type { PandaCodegenOptions } from "@pureform/panda-adapter/codegen";

export const glue = {
    target: "panda",
    options: { prefix: "pf" },
    components: ["button", "checkbox"],
} satisfies PureformPluginOptions<PandaCodegenOptions>;
```

Without a glue file, `--target` is required.

### What it prints

- A write: `pureform: updated .pureform/ (3 written, 1 removed)` and the files (up to ten), or
  `pureform: .pureform/ is up to date`. `generate`'s hints (such as the tsconfig one) go to
  stderr.
- **The `.gitignore` hint**, once, after the first write: when the root is in a git repository
  that neither ignores the folder nor tracks any file in it, the command names the line to add
  (`.pureform/`) and the `.gitignore` to add it to. It never edits `.gitignore`; an app that
  commits its glue tracks the folder, so the hint stays quiet. `--check` never prints it.
- A check: `pureform: .pureform/ is up to date`, or, on stderr with exit code 1,
  ``pureform: .pureform/ is out of date (2 stale). Run `pureform generate` to update it.``
  and each file with its status (`missing`, `stale`, `modified`, `extra`).
- `--watch`: the first result, then a line naming what it watches (the config, the files it
  imports, and the glue file), then each later change. Errors are printed and watching goes
  on; an edit to the glue file starts over with its new options (a broken edit keeps the old
  ones). SIGINT or SIGTERM stops it with exit code 0.

## Architecture

```
cli/index.ts   the bin (#!/usr/bin/env node): main(process.argv.slice(2))
     │
program.ts     main(args, io): the commands, help, version; parseGenerateFlags (node:util parseArgs)
     │
generate.ts    runGenerate(flags, io): generate once (write or check) or watchGlue; prints results
     ├── glue.ts       resolveGlue(flags, cwd): find and load the glue file, flags over it, defaults
     └── gitignore.ts  gitignoreHint(root, outDir): git check-ignore, git ls-files
```

| Module         | Exports                                                                                  |
| -------------- | ---------------------------------------------------------------------------------------- |
| `program.ts`   | `main`, `parseGenerateFlags`, `USAGE`, `GENERATE_USAGE`                                  |
| `generate.ts`  | `runGenerate`, `describeError`, `CliIO`                                                  |
| `glue.ts`      | `GLUE_FILES`, `TARGETS`, `findGlueFile`, `loadGlue`, `resolveGlue`, `GlueOptions`, flags |
| `gitignore.ts` | `gitignoreHint`                                                                          |
| `errors.ts`    | `CliError`                                                                               |

`main` takes an `io` (`cwd`, `stdout`, `stderr`, and an `AbortSignal` that stops `--watch`), so
tools and tests can run the command in-process:

```ts
import { main } from "@pureform/cli";

const code = await main(["generate", "--check"], { cwd: "apps/my-app" });
```

## Build and test

- `task_run` `test:unit` on `@pureform/cli`: in-process runs on temporary apps whose glue file
  holds a fake adapter (writing, flags over the glue file, `--root`, `--check` on missing,
  fresh, stale after a config or options change, and hand-edited glue, errors, `--watch` over
  config, import, and glue-file edits), the flag parser, the glue file's loading, and the
  `.gitignore` hint in temporary git repositories.
- `task_run` `build` on `@pureform/cli`: `dist/pureform.mjs` (the bin) and `dist/index.mjs`.
  Apps get the bin linked as `node_modules/.bin/pureform` after `bun install`.

## Surprises

- **It runs under Node on purpose.** The preset computes a shape morph's curves differently
  under Bun than under Node, so the glue's hash differs by runtime; Vite runs the bundler plugin
  under Node, and the bin's shebang is `node`, so both agree. `bun x pureform` follows the
  shebang; `bunx --bun pureform` would not, and its glue would look stale to Vite.
- **No `commander`:** the flags are few, so Node's `parseArgs` keeps the bin dependency-free
  beyond `@pureform/generate` and `jiti`.
- **Deferred commands** (design doc §10): `init`, `eject`, `doctor`.
