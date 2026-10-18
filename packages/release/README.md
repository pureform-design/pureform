# @pureform/release

Release tooling for this repository. Cocogitto (`cog.toml`) decides which packages bump and
to what version; this package writes those versions. It sets every core train package to
one version together, sets a binding's or a tooling package's version alone, and checks that
`cog.toml` and the workspace agree. It's internal tooling: private, never published, with no
dependencies on other pureform packages. Only `@pureform/generate`'s tests use it, to keep its
embedded list of train packages in step with `cog.toml`.

## Release groups

Every package under `packages/` is in exactly one group ([design doc, versioning](../../docs/design/component-architecture.md#11-versioning)):

| Group      | Packages                                                                                                                                                                                                                   | Versioned as                                                    |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Core train | `core`, `theme`, `material`, `preset`, `css-lowering`, `css-adapter`, `panda-adapter`, `tailwind-adapter`, `rn-adapter`, `js-effects`, `utils`, `type-utils`, `styling`, `anatomy`, `machines`, `binding-core`, `generate` | one cog package, `core-train`: one version, tag `core-train-vX` |
| Bindings   | `solid`, `react` (later `react-native`)                                                                                                                                                                                    | a cog package each: tag `@pureform/solid-vX`                    |
| Tooling    | `tsconfig`, `vite-config`, `vitest-config`, `oxlint-config`, `oxfmt-config`, `release`                                                                                                                                     | a cog package each                                              |

Apps (`apps/*`) and tests (`tests/*`) aren't released and aren't in `cog.toml`.

The train is the `include` list of `[monorepo.packages.core-train]` in `cog.toml`: a commit
touching any of those directories bumps the whole train. There is no global tag: cocogitto
skips the global bump when no package bumps, and would count commits to apps, tests, and docs
toward it.

## Architecture

```
cog bump --auto
  └─ per bumped cog package: pre_package_bump_hooks
       └─ cli.ts set-version {{package}} {{version}}
            ├─ cog.ts        reads cog.toml: the train's include globs, each package's path
            ├─ workspace.ts  maps the cog package to directories (all train dirs, or one)
            └─ version.ts    rewrites "version" in each package.json, src/package-version.ts,
                             and bun.lock entry
```

| Module         | What it does                                                                                                                       |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `cog.ts`       | `parseCogPackages(toml)`: the `[monorepo.packages.*]` sections; `trainPaths(packages)`.                                            |
| `version.ts`   | `setManifestVersion(json, v)`, `setLockVersion(lock, dir, v)`, `setSourceVersion(source, v)`: text edits that keep the formatting. |
| `check.ts`     | `checkRelease(cog, workspace)`: the problems found, as messages.                                                                   |
| `workspace.ts` | The file system side: `findRoot`, `readCog`, `readWorkspace`, `setVersion`, `checkRepository`.                                     |
| `cli.ts`       | The command line, run with Bun from the source (no build needed), so cog's hooks work in a checkout.                               |

The lockfile is edited in place rather than regenerated: `bun install --lockfile-only`
re-resolves unrelated dependencies, which a release commit shouldn't carry.

## Usage

```sh
# What cog's hook runs, from any directory in the repository:
bun packages/release/src/cli.ts set-version core-train 0.2.0
bun packages/release/src/cli.ts set-version @pureform/solid 0.3.1 --dry-run

# Check that cog.toml and the workspace agree (the unit tests run it too):
bun packages/release/src/cli.ts check
```

```ts
import { checkRepository, findRoot } from "@pureform/release";

const issues = checkRepository(findRoot(process.cwd()));
```

### Cutting a release

1. `cog bump --auto --dry-run` lists the tags it would create: `core-train-vX` when a train
   package changed, and one tag per changed binding or tooling package.
2. `cog bump --auto` writes the changelogs (`CHANGELOG.md` for the train, each package's own
   otherwise), runs `set-version` for each bumped cog package, commits
   `chore(version): bump packages`, tags, and pushes each tag (`post_package_bump_hooks`).
3. Push the commit (`git push origin main`), then publish.

`cog bump --package @pureform/solid --auto` bumps one package alone.

### Adding a package

The `ts-package` generator asks for the release group and edits `cog.toml`: a train package
goes into `core-train`'s `include` (at `# @anchor:new-core-train-package`), a binding or
tooling package gets its own section, and an unreleased one gets nothing. A new train package
must start at the train's current version; `check` fails until it does.

### Versions read at runtime

A package that needs its own version at runtime keeps it in `src/package-version.ts`, as
`export const VERSION = "…";` (`@pureform/styling` does, for the development check that the
generated registry matches it). `set-version` rewrites that line with `package.json`, and `check`
fails when the two differ.

## Build and test

- `task_run` `test:unit` on `@pureform/release`: unit tests, including a check of this
  repository's `cog.toml` against its workspace.
- `task_run` `build` on `@pureform/release`: builds `dist` (only needed to import the package).

## Surprises

- `cog.ts` reads only the subset of TOML that `cog.toml` uses: section headers, string
  values, and string arrays, with comments.
- Tooling packages had versions before this setup (`tsconfig` 0.1.1, `vite-config` 0.2.1)
  but no tags, so cog counts them from 0.0.0. Tag their current versions before their first
  release, or cog proposes a lower version.
