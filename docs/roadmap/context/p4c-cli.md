# p4c-cli: @pureform/cli (output context)

Commits: 20dfb2b..b52d4b2, plus the `docs(roadmap)` commit that adds this file.

| Commit    | What                                                                                                  |
| --------- | ----------------------------------------------------------------------------------------------------- |
| `20dfb2b` | `fix(omni)`: the `ts-package` script template's shebang lands on line 1 (oxfmt rejected the output)   |
| `afd3abf` | `feat(cli)`: the package, specs, README; `CORE_TRAIN_PACKAGES` gains it; generate and bundler READMEs |
| `b6fc33e` | `refactor(demos)`: both demos' `generate` tasks run `bun x pureform generate`; scripts deleted        |
| `b52d4b2` | `docs(design)`: "Built (p4c-cli)" in §10                                                              |

## Built

### `@pureform/cli` (`packages/cli`, new, core train)

Scaffolded with the `ts-package` generator (`package_type: script`, `script_can_be_used_as_lib:
true`, `shebang_executor: node`, `release_group: core-train`; in `cog.toml`'s train). Added to
`CORE_TRAIN_PACKAGES` in `@pureform/generate` (`src/train.ts`). Dependencies: `@pureform/generate`,
`jiti`. No `commander`: the template's `commander` 15 isn't in the lockfile, and Node's
`parseArgs` covers the flags. Root catalog entry `"@pureform/cli": "workspace:^"`.

- `bin`: `{ "pureform": "./dist/pureform.mjs" }` (entry `src/cli/index.ts`, `#!/usr/bin/env node`,
  kept by the build). `.` exports the in-process API (`dist/index.mjs`).
- `src/package-version.ts` (`VERSION`), kept by the release tooling like generate's.

```ts
// program.ts
const USAGE: string;
const GENERATE_USAGE: string;
const parseGenerateFlags: (args: readonly string[]) => GenerateFlags & { help?: boolean }; // throws CliError
const main: (args: readonly string[], io?: Partial<CliIO>) => Promise<number>; // 0 ok, 1 failed or stale, 2 called wrong

// generate.ts
interface CliIO {
    cwd: string;
    stdout(text: string): void; // one line per call
    stderr(text: string): void;
    signal?: AbortSignal; // stops --watch; default SIGINT/SIGTERM
}
const runGenerate: (flags: GenerateFlags, io: CliIO) => Promise<number>;
const describeError: (error: unknown) => string; // CliError/GenerateError message as is, else with stack

// glue.ts
const GLUE_FILES: readonly ["pureform.glue.ts", ".mts", ".cts", ".js", ".mjs", ".cjs" variants];
const TARGETS: readonly Target[]; // Object.keys(TARGET_PACKAGES)
type GlueOptions<O> = Partial<Omit<GenerateOptions<O>, "check">>;
interface GenerateFlags {
    check?; watch?; root?; config?; glue?; target?: Target;
    options?: string; // JSON
    components?: string; lazy?: string; // comma-separated
    outDir?; trainCheck?: boolean; // false with --no-train-check
}
const findGlueFile: (root: string) => string | undefined;
const loadGlue: (file: string) => Promise<GlueOptions>; // jiti, fresh, tryNative: false; `glue` export, else default
const resolveGlue: (flags, cwd) => Promise<{ options: GenerateOptions; glueFile: string | undefined }>;

// gitignore.ts
const gitignoreHint: (root: string, outDir: string, display?: (file: string) => string) => string | undefined;

// errors.ts
class CliError extends Error {} // messages start with "pureform: "
```

### CLI usage

```
pureform generate [--check] [--watch] [--root <dir>] [--config <file>] [--glue <file>]
                  [--target panda|css|tailwind|native] [--options <json>]
                  [--components a,b] [--lazy a,b] [--out-dir <dir>] [--no-train-check]
pureform --help | --version | generate --help
```

- **Options resolution:** root = `--root` (against cwd) or cwd; glue file = `--glue` or the first
  of `GLUE_FILES` in the root; a `root` in the glue file resolves against the glue file's folder
  (unless `--root`); target = `--target` ?? glue's (required: `CliError` otherwise); adapter
  options = glue's, shallow-merged with `--options`; config = `--config` ?? glue's ??
  `findConfigFile(root)`; components/lazy/outDir: flag ?? glue's; `trainCheck: false` with
  `--no-train-check`; `imports` from the glue file only. Unknown glue keys (the plugin's `watch`)
  are ignored.
- **Write:** stdout `pureform: updated .pureform/ (N written, M removed)` plus the files when 10
  or fewer, or `pureform: .pureform/ is up to date`. Paths are shown relative to cwd.
  `result.hints` go to stderr, each once.
- **`--check`:** `generate({ ..., check: true })`; stdout `... is up to date` (exit 0), or stderr
  ``pureform: .pureform/ is out of date (2 stale). Run `pureform generate` to update it.`` plus
  every non-unchanged file with its status (exit 1). Writes nothing.
- **`--watch`:** `watchGlue(options, { onResult, onError })`; prints the first result, then
  `pureform: watching pureform.config.ts and the files it imports, and pureform.glue.ts (Ctrl+C
to stop)`, then only changes. Errors print and watching continues. The glue file is watched
  separately (folder watch, 50 ms debounce): a change re-resolves the options and restarts the
  watcher; a broken edit keeps the old one. `--watch --check` is a usage error (2).
- **`.gitignore` hint:** once, after the first write (never in `--check`). `git check-ignore -q
-- <outDir>/` in the root: exit 1 (not ignored) and `git ls-files -- <outDir>` empty (not
  tracked) → stderr `pureform: git doesn't ignore .pureform/, which is generated. Unless the app
commits it on purpose, add this line to <root>/.gitignore:\n  .pureform/`. Any other git
  status (no git, not a repo, outDir outside root) → quiet. Never edits `.gitignore`.

### How the demos are wired now

- **`apps/solid-demo`** and **`apps/react-demo`:** `scripts/generate.ts` is gone. The omni
  `generate` task is `exec: bun x pureform generate` (`bun x` follows the bin's `node` shebang;
  checked: a `#!/usr/bin/env node` bin under `bun x` reports Node). It reads `pureform.glue.ts`'s
  `glue` export, the same object `vite.config.ts` passes to the bundler plugin. `@pureform/cli`
  replaced `@pureform/generate` in both demos' `devDependencies` and joined their omni
  `dependencies`; `"scripts/**/*"` left their cache keys. `prepare` (`panda codegen`) still
  depends on `generate`.
- **react-demo's committed glue** changed only in its hash lines (the CLI is an installed train
  package now). `bun x pureform generate --check` in `apps/react-demo` exits 0, also after an omni
  `build` (so Vite's plugin and the CLI write the same hash). solid-demo's glue stays ignored, so
  the `.gitignore` hint stays quiet there; react-demo tracks its folder, so it's quiet too.
- Comments in both demos' `pureform.glue.ts` and `pureform.config.ts`, and both READMEs, name
  `pureform generate` now.

### Other changes

- `omni/generators/ts-package/templates/src/cli/index.ts.tpl`: the shebang now starts the file
  (it began with a blank line, which oxfmt rejects, so `script` packages failed to generate).
- `bun.lock`: the `packages/cli` workspace block, the catalog line, the package line, and the
  demos' dev dependency, edited by hand; `bun install --frozen-lockfile` reports no changes.

## Deviations from the design

- **A glue file holds the target and the adapter's options** (`pureform.glue.ts`, `glue` export),
  shared by the CLI and the bundler config. The design doesn't say where the CLI gets them; the
  config can't hold them (its import rules forbid adapter packages, and they're build options).
  Recorded in §10.
- **The `.gitignore` hint is quiet when git tracks files in the folder**, not only when it's
  ignored, so apps that commit the glue (§6's committed path) don't see it on every run.
- **`parseArgs`, not `commander`**, unlike the generator's script template.

## Stubs and gaps

- **`init`, `eject`, `doctor`** are deferred (§10), not stubbed.
- **The Bun/Node hash difference remains** (p4c-bundler's gap): the CLI only avoids it by running
  under Node. `bunx --bun pureform generate` would write glue Vite then sees as stale.
- **A new glue file isn't picked up by a running `--watch`** that started without one; restart it.
- **No end-to-end test of the built bin** in the package's specs (they run `main` in-process; the
  unit tests run before the build). The bin was checked by hand (`--check`, `--watch` with SIGINT
  → exit 0) and runs in both demos' omni `generate` tasks on every build.

## How to verify

- `task_run` `test:unit` and `build` on `@pureform/cli`: 29 tests with type checks
  (`generate.spec.ts`: writes, flags over the glue file, `--root`; **`--check` fails on missing,
  stale-after-config-change, stale-after-options-change, and hand-edited glue**, passes on fresh;
  errors; `--watch` over config, import, and glue-file edits; `program.spec.ts`;
  `glue.spec.ts`; `gitignore.spec.ts` in temporary git repositories).
- `task_run` `test:unit` on `@pureform/generate`, `@pureform/release`, `@pureform/bundler`: pass.
- `cd apps/react-demo && bun x pureform generate --check` → `pureform: .pureform/ is up to date`;
  same in `apps/solid-demo` after a build. `bun packages/release/src/cli.ts check` passes.
- Workspace `build`, `test:unit`, `test:e2e`: all pass except the pre-existing rn-parity "every
  variant value at rest" case (440 of 441 in `@pureform/browser-e2e-tests`).

## Notes for the next phases

- **Running the CLI from omni or scripts:** `bun x pureform generate` (Node via the shebang).
  Apps need `@pureform/cli` as a dev dependency and `bun install` after its `dist` exists for the
  `.bin/pureform` link (an omni task needs `@pureform/cli` in its `dependencies` for `^build`).
- **p5a:** a CSS or Tailwind demo can keep `{ target: "css" | "tailwind", options }` in its own
  `pureform.glue.ts`, pass `glue` to `pureform.vite(...)`, and run `bun x pureform generate` for
  steps without Vite.
- **p7:** pruning stays in the bundler plugin; the CLI always writes the full (allow-listed) glue.
- **Committed-glue CI:** `bun x pureform generate --check` in the app; exit 1 lists the files.
- **In-process use:** `main(args, { cwd, stdout, stderr, signal })` from `@pureform/cli`.
