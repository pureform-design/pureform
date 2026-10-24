# tsc-node (output context)

Branch `tsc-node`, from main. Not pushed.

## Done

- `packages/tsconfig/node.json` (exported): extends base, Node types, no DOM (`lib: ESNext`),
  Bundler resolution, `allowImportingTsExtensions`, `noEmit`.
- `tsconfig.node.json` in each of the 33 projects with tool config files (`vite.config.ts`,
  `vitest.config.*.ts`, `panda`/`pureform`/`stories` configs, `.storybook/*`, `scripts/`).
  `@types/node` added as a devDependency where missing (`types: ["node"]` resolves from the project).
- `check:types` (omni `ts` preset) runs `tsc -p tsconfig.json`, then `tsc -p tsconfig.node.json`
  only when that file exists. Its cache key now also covers tsconfigs, config files, `.storybook`, `scripts`.
- Real error fixed: `apps/rn-web-demo/pureform.config.ts` `BRANDS` was widened to `string`; now
  `Record<string, `#${string}`>`.
- `tests/browser-e2e-tests`, `tests/component-suites`: node config adds `DOM` lib (vite config pulls in
  browser-command sources). storybook-web's node config covers only what its main tsconfig doesn't
  (`panda`/`pureform` configs, `.storybook/main.ts`).
- `tests/panda-fixture` has no node config: its configs import generated output (check is disabled there).

## Deviations

- `exactOptionalPropertyTypes: false` in `node.json`: Panda's `defineConfig` types reject presets under it
  (third-party typing, solid-demo/storybook-web `panda.config.ts`). Not a code bug. `skipLibCheck` is the base's.
- Omni runs `exec` without a shell, so the preset wraps the two commands in `sh -c '…'`.

## Checks

- `omni run check:types`: 56 succeeded, 0 failed (4 disabled). `omni run build`: all pass.

## Open questions

- Whether to run the node checks in `build` too (they're only in `check:types`).
