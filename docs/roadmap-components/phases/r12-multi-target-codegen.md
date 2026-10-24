# r12 multi-target codegen

Runs in parallel with fix-storybook-8, ts71 and r11 (different files).

## Goal
One codegen setup can serve several targets, and pruned (build) and full (dev) output live apart,
so dev and build never overwrite each other. Mostly transparent: existing apps change little.

## Design
- `codegen` takes `targets: { <name>: { target, options, components? } }`; a single `target` stays
  valid (shorthand for one target).
- Layout: `.pureform/<target>/full/` and `.pureform/<target>/pruned/`; stable top-level entries
  (`index`, `index.d.ts` from full, `panda.ts`, `styles.css`, ...) re-export the right folder so
  tsconfig, Panda and CSS imports keep working.
- Generation stays in Vite's `config` hook (Panda reads `.pureform/panda.ts` in its own
  `configResolved`); other bundlers in `buildStart`. Pruned vs full is chosen there (serve/watch:
  full; build: pruned). One usage scan shared by all targets.
- Target choice per import in `resolveId`: Metro and Vite environments mapping `react-native` to
  `react-native-web` get the native target, others the web one; a per-file pattern override for
  setups running both (Storybook).
- CLI `pureform generate` writes every target's `full/` by default; `--prune` writes `pruned/`.

## Storybook
Declare web and native targets; drop the run-time `pureformRn()` plugin so React Native stories use
generated styles like a real app.

## Gate
Every demo in dev and build; Storybook dev and build; full gate.

## Types and editor (added, user-approved)
- Declarations live only at the top of `.pureform/` (`registry.d.ts`), generated from the full
  output (a superset of pruned), so the editor and `tsc` never depend on dev vs build. `full/` and
  `pruned/` hold no `.d.ts` augmenting `@pureform/styling` (an app's `.pureform/**/*.*` include
  would otherwise merge two `ComponentRegistry` declarations). That include keeps working as is.
- Top-level `.ts` entries (`index.ts`, `panda.ts`, ...) re-export `full/`, so TypeScript resolves
  real files; the bundler's `resolveId` redirects to `pruned/` in builds. No tsconfig `paths`.
- One augmentation for all targets: the config is shared, so variants, slots and tokens agree;
  native-only fields (`states`) aren't declared.
- Several targets also get per-target entries (`.pureform/web.ts`, `.pureform/native.ts`, named
  after the `targets` keys) with their factory types. Single-target apps keep importing
  `.pureform/`; multi-target code imports the per-target entry, or the plain entry resolved per
  import (typed from the default target; documented).
- Tests: `tsc` on a demo after build and after dev gives the same result; a multi-target fixture
  type-checks; nothing in `full/` or `pruned/` declares the module.
