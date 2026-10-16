# @pureform/bundler

The pureform bundler plugin. It writes the `.pureform/` glue (the style registry and its
declarations) when `vite dev` or `vite build` starts, writes it again in dev when the config
changes, and serves the generated index as `virtual:pureform/registry`. Generation itself is
`@pureform/generate`'s, the same step `pureform generate` (`@pureform/cli`) runs, so the plugin
and the command can't produce different glue.

- **Depends on:** `@pureform/generate` (generation, the runner and watcher), `unplugin` (one
  plugin for every bundler), `@pureform/styling` and `@pureform/core` (types).
- **Depended on by:** apps' bundler configs (`apps/solid-demo`, `apps/react-demo`).
- Part of the core train: released at the same version as `core`, `styling`, and the adapters.

Design: [§6 generated glue](../../docs/design/component-architecture.md#6-generated-glue),
[§7 tree shaking](../../docs/design/component-architecture.md#7-tree-shaking) (the allow-list;
pruning is p7's), [§3 package layout](../../docs/design/component-architecture.md#3-package-layout).

## Architecture

```
vite.ts, rollup.ts, rolldown.ts, esbuild.ts   one unplugin instance per bundler
        │
     plugin.ts ── createGlueRunner (@pureform/generate)
        │            config hook (Vite)    generate before any plugin's configResolved
        │            buildStart            generate (once), watch the config and its imports
        │            watchChange           generate again when one of them changes
        │            resolveId             virtual:pureform/registry → <outDir>/index.ts;
        │                                  an import into a missing outDir → missing-glue error
     metro.ts ── watchGlue (@pureform/generate)
                     withPureformGlue      generate before Metro starts, keep watching,
                                           resolve virtual:pureform/registry
     options.ts      the shared options, generateOptions, describeResult
```

| Module        | What it does                                                                |
| ------------- | --------------------------------------------------------------------------- |
| `options.ts`  | `PureformPluginOptions`, `REGISTRY_ID`, `generateOptions`, `describeResult` |
| `plugin.ts`   | `unpluginFactory`, `pureform` (the unplugin instance)                       |
| `vite.ts` …   | `pureform` for one bundler, also the default export                         |
| `metro.ts`    | `withPureformGlue(metroConfig, options)`                                    |
| `client.d.ts` | ambient types for `virtual:pureform/registry` (`@pureform/bundler/client`)  |

## Public API

```ts
// vite.config.ts
import pureform from "@pureform/bundler/vite"; // or /rollup, /rolldown, /esbuild

export default defineConfig({
    plugins: [
        pureform({
            target: "panda", // "panda" | "css" | "tailwind" | "native", or a CodegenAdapter
            options: { prefix: "pf" }, // the adapter's options
            components: ["button", "checkbox"], // optional allow-list (design doc §7)
            // config: "pureform.config.ts", lazy: [], outDir: ".pureform", root,
            // trainCheck: true, imports: true, watch: true
        }),
        pandacss(),
    ],
});
```

| Option       | Default                                   | What it does                                                   |
| ------------ | ----------------------------------------- | -------------------------------------------------------------- |
| `target`     | (required)                                | The adapter: `@pureform/<target>-adapter/codegen`, or one      |
| `options`    | `{}`                                      | The adapter's build options; part of the glue's hash           |
| `config`     | the first `pureform.config.{ts,mts,…}`    | A path relative to the root, or the config object              |
| `components` | every component                           | The allow-list                                                 |
| `lazy`       | none                                      | Components whose registry entries load on demand               |
| `root`       | Vite's `root`, else the working directory | The app's root                                                 |
| `outDir`     | `.pureform`                               | The folder written, relative to the root                       |
| `trainCheck` | `true`                                    | Fail when installed pureform packages disagree in version      |
| `imports`    | `true`                                    | The config's import rules, or `{ allow }`, or `false`          |
| `watch`      | `true`                                    | Generate again in dev and watch builds when the config changes |

The app reads the registry from the folder or from the virtual id:

```ts
import { registry } from "virtual:pureform/registry"; // resolves to .pureform/index.ts
// or: import { registry } from "../.pureform";
```

Keeping the options in a glue file lets `pureform generate` (`@pureform/cli`) use them too,
for steps without a bundler: the command reads the `glue` export of `pureform.glue.ts`.

```ts
// pureform.glue.ts
export const glue = {
    target: "panda",
    options: { prefix: "pf" },
} satisfies PureformPluginOptions<PandaCodegenOptions>;

// vite.config.ts
plugins: [pureform(glue), pandacss()];
```

For TypeScript, add `"@pureform/bundler/client"` to `types` (the registry typed by the
generated `registry.d.ts`, which the tsconfig must include), or map the id to the index with
`paths` (`"virtual:pureform/registry": ["./.pureform/index.ts"]`) for the index's own types,
without the client types (an ambient module wins over `paths`).

### Metro

Metro has no plugin API unplugin reaches, so the config is wrapped. `target` defaults to
`"native"`; the rest of the options are the plugin's.

```js
// metro.config.js
const { getDefaultConfig } = require("@react-native/metro-config");
const { withPureformGlue } = require("@pureform/bundler/metro");

module.exports = withPureformGlue(getDefaultConfig(__dirname), {
    options: { fontStack: "all" },
});
```

It returns a promise of the config (Metro accepts one): it generates first (failing like a
build when that fails), keeps regenerating on changes with an unref'd watcher (so a one-off
bundle still exits), and resolves `virtual:pureform/registry` before the config's own
`resolveRequest`.

## How it behaves

- **Before other plugins.** In Vite, generation runs in the `config` hook, which Vite runs in
  order before any plugin's `configResolved`. Panda's plugin loads `panda.config.ts` (which
  imports `.pureform/panda`) in `configResolved`, so the glue is there first. Other bundlers
  generate in `buildStart`.
- **Once per start.** Builds with several environments (client and server) generate once.
- **Failures.** A failed generation fails a build. A dev server keeps running and logs the
  error (and shows it in the overlay on a later failure); an import of the registry then fails
  with the missing-glue message if there's no glue at all.
- **Missing glue.** An import of `virtual:pureform/registry`, or a relative import into the
  output folder, when `<outDir>/index.ts` doesn't exist, fails with `@pureform/generate`'s
  `missing-glue` error, naming `pureform generate` and this plugin.
- **Regeneration.** Only changes to the config and the files it imports (relative paths)
  trigger it; generation rewrites only files whose contents differ, so unchanged glue doesn't
  reload anything. Changes to installed packages need a restart.
- **No pruning yet.** Usage-based pruning (design doc §7, item 3) is p7's.

## Build and test

- `task_run` `test:unit` on `@pureform/bundler`: Vite builds and dev servers on temporary apps
  with a fake adapter (generation before `configResolved`, the options, a failing build,
  regeneration on a change, missing glue in dev), a Rolldown build, the hooks called directly,
  the Metro wrapper, and a `tsc` run over the client types.
- `task_run` `build` on `@pureform/bundler`: `dist/{index,vite,rollup,rolldown,esbuild,metro}.mjs`.

## Surprises

- **Rollup and esbuild aren't installed here**, so their subpaths (thin unplugin outputs) are
  untested; Vite and Rolldown are.
- **The CSS and Tailwind adapters' own Vite plugins stay** (`pureformCss`, `pureformTailwind`,
  serving `virtual:pureform/components`): `css-demo` and `tailwind-demo` still read class
  strings from them, and moving those demos onto the registry is p5a's.
- **Generate under one runtime.** The glue's hash covers the evaluated config, which the preset
  computes slightly differently under Bun than under Node; Vite runs the plugin under Node, and
  so does `pureform generate` (its bin's shebang, which `bun x` follows).
