# pureform

Design-system tooling: a typed styling config, Material 3 components written once as specs, and
adapters and bindings that turn them into Panda CSS, plain CSS, Tailwind or React Native styles
for Solid, React and React Native.

A bun + omni monorepo. Each package's README says what it is, what it depends on and its API.

## Packages

| Area      | Packages                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authoring | [`core`](packages/core/README.md), [`theme`](packages/theme/README.md), [`material`](packages/material/README.md), [`preset`](packages/preset/README.md)                                                                                                                                                                                                                                                    |
| Adapters  | [`css-lowering`](packages/css-lowering/README.md), [`css-adapter`](packages/css-adapter/README.md), [`panda-adapter`](packages/panda-adapter/README.md), [`tailwind-adapter`](packages/tailwind-adapter/README.md), [`rn-adapter`](packages/rn-adapter/README.md)                                                                                                                                           |
| Build     | [`generate`](packages/generate/README.md), [`bundler`](packages/bundler/README.md), [`cli`](packages/cli/README.md)                                                                                                                                                                                                                                                                                         |
| Bindings  | [`styling`](packages/styling/README.md), [`anatomy`](packages/anatomy/README.md), [`machines`](packages/machines/README.md), [`js-effects`](packages/js-effects/README.md), [`binding-core`](packages/binding-core/README.md), [`binding-web`](packages/binding-web/README.md), [`solid`](packages/solid/README.md), [`react`](packages/react/README.md), [`react-native`](packages/react-native/README.md) |
| Tooling   | [`component-cases`](packages/component-cases/README.md), [`vitest-config`](packages/vitest-config/README.md), [`release`](packages/release/README.md)                                                                                                                                                                                                                                                       |

Demos live in `apps/` ([`css-demo`](apps/css-demo/README.md), [`react-demo`](apps/react-demo/README.md),
[`rn-web-demo`](apps/rn-web-demo/README.md), [`solid-demo`](apps/solid-demo/README.md),
[`tailwind-demo`](apps/tailwind-demo/README.md), [`storybook-web`](apps/storybook-web/README.md)).

## Getting started

```sh
bun install
omni run build        # builds every package
omni run test         # unit and e2e tests (slow; use -p <project> to narrow)
```

An app generates its registry with `pureform generate` (or the bundler plugin), which writes
`.pureform/<target>/full` and, with `--prune`, `.pureform/<target>/pruned`. See
[`@pureform/cli`](packages/cli/README.md).

Design notes are in [`docs/design`](docs/design/component-architecture.md).
