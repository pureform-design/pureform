# tsc-project (output context)

Branch `tsc-project`, from main. Not pushed.

## Findings

- `tsconfig.project.json` is **not a standalone config**: it's the per-package fragment that
  `tsconfig.json` and `tsconfig.types.json` extend (it only holds `outDir`, `lib`/`types`, `jsx`).
  `tsc -p tsconfig.project.json` has no base: default `module`, no `include` (so it sweeps in
  `vite.config.ts`, the workspace's `vite-config`/`vitest-config` sources and `dist`), no
  `skipLibCheck` (so third-party `.d.ts` such as `unplugin-dts` and `vitest` fail under TS 7).
  All 32 packages fail that way (20+ errors each, all in third-party `.d.ts` or `.ts` import
  extensions of the config packages); the `Type '"accordion"'…` errors in rn-web-demo come from the
  same run reading binding-core's `dist` without the real compiler options. None is a code bug, so
  nothing was "fixed" there; the real configs are the ones to check.
- Real configs (`tsconfig.json`, `tsconfig.types.json`, `tsconfig.spec.json`) across every
  package, after `omni run build`, before the fix:
  - react, solid `tsconfig.types.json`: the exclude `src/**/*.{spec,test}.*` used braces, which tsc
    globs don't support, so specs were type-checked (`emulateReducedMotion` missing on
    `BrowserCommands`). The same pattern was in `packages/tsconfig/types.json`.
  - react-native `tsconfig.types.json`: included `src/testing/**` (Vitest browser commands, not
    published), error TS2883 on `CONFIGS`.
  - tests/component-suites, browser-e2e-tests, panda-fixture: import generated output
    (`.pureform/*`, `$recipes`) that no task writes before a check.
  - Pre-existing vs recent: not bisected; the brace glob predates this batch.

## Done

- `packages/tsconfig/types.json`, react and solid `tsconfig.types.json`: two plain globs instead of
  braces. react-native's excludes specs, tests and `src/testing/**` (its own `exclude` replaces the
  base's, so it lists all three).
- `check:types` (omni `ts` preset) was `bun check .`, a no-op that always passed. It now runs
  `tsc --noEmit -p tsconfig.json` after `^build` (dependencies' declarations). It's disabled in the
  three test projects above. Cost: `omni run check:types` over all 60 tasks, ~70 s cold (cached after).
  Nothing runs it in `build`/`test`; run it with `omni run check:types`.
- No `skipLibCheck` added (the shared base already sets it for third-party code).

## Checks

- `tsc --noEmit` clean on every `tsconfig.json`/`tsconfig.types.json`/`tsconfig.spec.json` except
  the three generated-output test projects (disabled in `check:types`).
- `omni run build test -p` react, solid, react-native: pass (react-native's indeterminate-progress
  gap spec flaked once under load, passed on `-f failed`).

## Open questions

- Should `tsconfig.project.json` be renamed (e.g. `tsconfig.shared.json`) so nobody runs it directly?
- Vite/Vitest config files aren't type-checked by any config (their own `tsconfig` includes only
  `src`); they type-check clean when included, given `allowImportingTsExtensions`.
