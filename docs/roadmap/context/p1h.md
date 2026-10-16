# p1h: Versioning configuration (output context)

Commits: 9b4cfc1..5103fd5, then 61690d0 (design doc) and the `docs(roadmap)` commit that adds this file.

## Built

### `cog.toml`

- **The core train is one cocogitto package, `core-train`** (`path = "."`,
  `changelog_path = "CHANGELOG.md"`). Its `include` lists each train package as
  `packages/<name>/**`; a commit touching any of them bumps the whole train to one version,
  tagged `core-train-vX`. Members (15): `anatomy`, `core`, `css-adapter`, `css-lowering`,
  `js-effects`, `machines`, `material`, `panda-adapter`, `preset`, `rn-adapter`, `styling`,
  `tailwind-adapter`, `theme`, `type-utils`, `utils`. All are at
  `0.0.0-semantically-released` today.
- **Bindings**: `@pureform/solid` keeps its own package (tag `@pureform/solid-vX`).
- **Tooling** gets its own packages: `tsconfig`, `vite-config`, `vitest-config`,
  `oxlint-config`, `oxfmt-config`, and the new `release`.
- **Removed**: apps (`css-demo`, `tailwind-demo`, `rn-web-demo`), `tests/browser-e2e-tests`,
  and the `root` package (whose hook deleted and regenerated `bun.lock`).
- `generate_mono_repository_global_tag = false`; global `pre_bump_hooks`/`post_bump_hooks`
  are empty. `public_api` lines are gone (it only matters for the global tag).
- `pre_package_bump_hooks` runs
  `bun "$(git rev-parse --show-toplevel)/packages/release/src/cli.ts" set-version {{package}} {{version}}`;
  `post_package_bump_hooks` still pushes each tag (`git push origin {{version_tag}}`).
- Anchors: `# @anchor:new-core-train-package` (inside the train's `include`) and
  `#@anchor:new-typescript-package` (end of file).

### `@pureform/release` (`packages/release`, new, private tooling)

Scaffolded with the `ts-package` generator (lib, unit tests only). No runtime
dependencies; dev dependency `@types/node` (tsconfig `types: ["node"]`). The CLI runs from
source with Bun, so hooks need no build.

| Module         | Exports                                                                                                                                                                                               |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cog.ts`       | `CORE_TRAIN = "core-train"`, `interface CogPackage { name; path; include: string[] }`, `parseCogPackages(toml): CogPackage[]`, `trainPaths(packages): string[]`                                       |
| `version.ts`   | `setManifestVersion(json, version): string`, `setLockVersion(lock, dir, version): string` (text edits, formatting kept)                                                                               |
| `check.ts`     | `interface WorkspacePackage { path; name; version }`, `checkRelease(cog, workspace): string[]`                                                                                                        |
| `workspace.ts` | `findRoot(from)`, `readCog(root)`, `readWorkspace(root)`, `checkRepository(root)`, `releasePaths(cog, name)`, `setVersion(root, name, version, { dryRun? }): string[]` (changed files, root-relative) |
| `cli.ts`       | `set-version <cog package> <version> [--dry-run]`, `check`                                                                                                                                            |

`checkRelease` fails when: there's no `core-train`; a train glob isn't `<dir>/**` or names
no workspace package; a cog package's path isn't a workspace package or its name differs
from `package.json`; a package is in the train and has its own entry; a package under
`packages/` is in no group; train packages differ in version.

### Generator

`omni/generators/ts-package/generator.omni.yaml` asks `release_group` for lib and script
packages: `core-train` (default; prepends `"<dir>/**",` at the train anchor), `binding` or
`tooling` (own `[monorepo.packages."…"]` section), `none` (no cog entry). Other package
types get no cog entry. All four paths were run and checked.

### Other

- `packages/tsconfig/CHANGELOG.md`, `packages/vite-config/CHANGELOG.md`: a formatter had
  turned cog's `- - -` separators into `---`; restored (cog bump fails without them).
  `**/CHANGELOG.md` is already in oxfmt's ignore list.
- `bun.lock`: the `packages/release` workspace and its `packages` line, added by hand;
  `bun install --frozen-lockfile` then reports no changes.
- Design doc §11 now describes the `core-train` package instead of the global tag.

## Deviations from the design

- **No global tag; the train is a cocogitto package.** The design said the train moves to
  the global tag. Cocogitto 7.0.0 returns early from `cog bump --auto` when no package
  bumps, so a change to train packages alone (not in any package) would never release; and
  the global version also counts every commit outside package paths (apps, tests, docs).
  One `core-train` package gives the train one version and one tag, and only train commits
  move it. The design doc is updated.
- **Apps and tests left `cog.toml`.** They aren't released; without a global tag, their
  commits bump nothing.
- **A new tooling package, `@pureform/release`,** holds the bump hook's version setter and
  the consistency check, rather than `bun x @omni-oss/set-version`, which doesn't know the
  train and leaves `bun.lock`'s workspace versions stale. Regenerating the lockfile
  (`bun install --lockfile-only`, which the old `root` package's hook did after deleting
  it) re-resolves unrelated dependencies, so the lock is edited in place.

## Stubs and gaps

- **Tooling baselines:** `tsconfig` (0.1.1) and `vite-config` (0.2.1) have changelogs from
  earlier releases but no tags in this repository, so cog counts from 0.0.0 and would
  propose `tsconfig` 0.1.0 and `vite-config` 0.0.1. Before their first release, tag their
  current versions locally, e.g. `git tag @pureform/tsconfig-v0.1.1 <commit>` and
  `git tag @pureform/vite-config-v0.2.1 <commit>`. Not done here (no tags created).
- **`cog check` fails on history:** two old commits have whitespace in their scope
  (`feat(css-lowering, css-adapter, panda-adapter): …`); cog skips them when bumping. The
  `commit-msg` hook in `cog.toml` runs `cog check` and isn't installed; installing it as is
  would reject every commit. Don't use comma-separated scopes.
- **The build-time train check** (p4a) and **the development warning** (p2a, p2b) aren't
  built; they're those phases' work.
- **Publishing** isn't wired to releases: every train package's `project.omni.yaml` has
  `publish` disabled, and `solid`'s `package.json` doesn't yet peer on a train range (p2a).

## How to verify

- `task_run` `test:unit` and `build` on `@pureform/release`: 24 tests, including a check of
  this repository's `cog.toml` against its workspace.
- `bun packages/release/src/cli.ts check` → `cog.toml and the workspace agree`.
- `cog bump --auto --dry-run` → `core-train-v0.1.0`, `@pureform/solid-v0.1.0`,
  `@pureform/tsconfig-v0.1.0`, `@pureform/vite-config-v0.0.1`.
- `cog bump --package @pureform/solid --auto --dry-run` → `@pureform/solid-v0.1.0` alone.
- `bun packages/release/src/cli.ts set-version core-train 0.1.0 --dry-run` lists the 15
  train `package.json` files and `bun.lock`.
- A real bump was run in a throwaway clone with no remote (`git clone`,
  `git remote remove origin`, `cog bump --auto`): one `chore(version): bump packages` commit set all 15 train
  packages to 0.1.0 and `solid` to 0.1.0 alone, wrote `CHANGELOG.md` and
  `packages/solid/CHANGELOG.md`, updated `bun.lock`, and tagged; only the tag push failed,
  as expected. After it, a `fix(solid)` commit dry-runs to `@pureform/solid-v0.1.1` alone,
  and adding a `feat(styling)` commit gives `core-train-v0.2.0` too.

## Notes for the next phases

**Which packages are in the train:** the `include` list of `[monorepo.packages.core-train]`
in `cog.toml` (listed above). `releasePaths(readCog(root), CORE_TRAIN)` from
`@pureform/release` reads it.

**Adding a package:**

- Train (`generate`, `bundler`, `cli` in p4): run the `ts-package` generator with
  `release_group: "core-train"`, or add `"packages/<name>/**",` above
  `# @anchor:new-core-train-package`. Keep its `package.json` version equal to the train's
  (`0.0.0-semantically-released` until the first release); `check` fails otherwise.
- Binding (`react` in p2b, `react-native` in p8): `release_group: "binding"`, or a
  `[monorepo.packages."@pureform/<name>"]` section with `path` and `include`.
- Tooling: `release_group: "tooling"`. Apps and tests: no entry.
- Then run `test:unit` on `@pureform/release`; it fails on a package in no group.

**How a release is cut:**

1. Commit everything (cog refuses a dirty tree), then `cog bump --auto --dry-run` to see
   the tags.
2. `cog bump --auto`: per bumped package it writes the changelog, runs `set-version`
   (all train `package.json` files and `bun.lock` for `core-train`), commits
   `chore(version): bump packages`, tags each package, and pushes each tag.
3. `git push origin main`, then publish (not wired yet).

`cog bump --package <name> --auto` bumps one package alone (`core-train` for the train).

**p4a:** the train check needs the train's names at a user's install, where `cog.toml`
isn't present; embed the list (generate it from `cog.toml` with `@pureform/release` if it
should stay in sync). A train-wide mismatch check can reuse the idea of `checkRelease`'s
version rule.

**Commit scopes:** one scope, no spaces (`feat(css-adapter): …`); cog can't parse
`feat(a, b): …` and skips the commit when bumping.
