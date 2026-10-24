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
