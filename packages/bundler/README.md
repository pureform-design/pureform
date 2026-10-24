# @pureform/bundler

The pureform bundler plugin. It writes the generated registry to `.pureform/` (the style
registry's modules and their declarations) when `vite dev` or `vite build` starts, writes it
again in dev when the config changes, and serves the generated index as
`virtual:pureform/registry`. Generation itself is `@pureform/generate`'s, the same step
`pureform generate` (`@pureform/cli`) runs, so the plugin and the command can't produce
different output. In builds it prunes: it scans the app's source first and generates only the
components the app draws and the variant values it selects.

- **Depends on:** `@pureform/generate` (generation, the runner and watcher), `unplugin` (one
  plugin for every bundler), `@pureform/binding-core/usage` (what each component draws),
  `@pureform/anatomy` (anatomy names), `oxc-parser` (the scan), `@pureform/styling` and
  `@pureform/core` (types).
- **Depended on by:** apps' bundler configs (every app under `apps/`; `rn-web-demo` uses the Vite
  plugin with the `native` target).
- Part of the core train: released at the same version as `core`, `styling`, and the adapters.

Design: [§6 the generated registry](../../docs/design/component-architecture.md#6-the-generated-registry),
[§7 tree shaking](../../docs/design/component-architecture.md#7-tree-shaking) (the allow-list and
pruning), [§3 package layout](../../docs/design/component-architecture.md#3-package-layout).

## Architecture

```
vite.ts, rollup.ts, rolldown.ts, esbuild.ts   one unplugin instance per bundler
        │
     plugin.ts ── createGenerateRunner (@pureform/generate's generateTargets)
        │            config hook (Vite)    scan the app (builds), then generate every target
        │                                  (full, and pruned in builds) before any plugin's
        │                                  configResolved; set PUREFORM_OUTPUT=pruned in builds
        │            buildStart            generate (once), watch the config and its imports
        │            watchChange           generate again when one of them changes
        │            resolveId             virtual:pureform/registry and .pureform/'s entries →
        │                                  the import's target, full (dev) or pruned (build);
        │                                  an import into a missing outDir → missing-output error
        │            transform             a pruned build's CSS @imports of an entry → pruned/
     metro.ts ── watchGenerate (@pureform/generate)
                     withPureform          generate before Metro starts, keep watching,
                                           resolve the registry and entries to the native target
     options.ts      the shared options, generateOptions, pruneOptions, describeResult
     prune/
       scan.ts       scanUsage: the app's files → Usage (components, variant values)
       index.ts      findUsage (scan + the prune options), describePruning
```

| Module        | What it does                                                                                                                                                     |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `options.ts`  | `PureformPluginOptions`, `PluginTarget`, `PruneOptions`, `REGISTRY_ID`, `generateOptions`, `pruneOptions`, `includes`, `aliasesReactNativeWeb`, `describeResult` |
| `prune/`      | `scanUsage`, `findUsage`, `describePruning`                                                                                                                      |
| `plugin.ts`   | `unpluginFactory`, `pureform` (the unplugin instance)                                                                                                            |
| `vite.ts` …   | `pureform` for one bundler, also the default export                                                                                                              |
| `metro.ts`    | `withPureform(metroConfig, options)`                                                                                                                             |
| `client.d.ts` | ambient types for `virtual:pureform/registry` (`@pureform/bundler/client`)                                                                                       |

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

| Option       | Default                                   | What it does                                                                |
| ------------ | ----------------------------------------- | --------------------------------------------------------------------------- |
| `target`     | (`target` or `targets`)                   | One adapter: `@pureform/<target>-adapter/codegen`, or one                   |
| `targets`    | (`target` or `targets`)                   | Several, by name: `{ web: { target, options, components, lazy, include } }` |
| `options`    | `{}`                                      | The single target's build options; part of the output's hash                |
| `config`     | the first `pureform.config.{ts,mts,…}`    | A path relative to the root, or the config object                           |
| `components` | every component                           | The allow-list                                                              |
| `lazy`       | none                                      | Components whose registry entries load on demand                            |
| `root`       | Vite's `root`, else the working directory | The app's root                                                              |
| `outDir`     | `.pureform`                               | The folder written, relative to the root                                    |
| `trainCheck` | `true`                                    | Fail when installed pureform packages disagree in version                   |
| `imports`    | `true`                                    | The config's import rules, or `{ allow }`, or `false`                       |
| `watch`      | `true`                                    | Generate again in dev and watch builds when the config changes              |
| `prune`      | `true` (Metro: `false`)                   | Usage-based pruning in builds, or `PruneOptions` (below)                    |

The app reads the registry from the folder or from the virtual id:

```ts
import { registry } from "virtual:pureform/registry"; // the import's target's index
// or: import { registry } from "../.pureform";
```

### Several targets, full and pruned output

The plugin writes `@pureform/generate`'s layout (see its README): `.pureform/<target>/full/`
for dev servers and the editor, `.pureform/<target>/pruned/` for builds, and stable entries at
the top (`index.ts`, `panda.ts`, `styles.css`, `registry.d.ts`, and `<target>.ts` with several
targets) that re-export `full/`. So tsconfig includes, Panda's `import "./.pureform/panda"` and
stylesheet imports keep working, and a dev server and a build can run side by side.

`resolveId` redirects each import of an entry (by relative or absolute path, with or without
its extension, and `virtual:pureform/registry`) to the file it stands for, in `full/` for dev
servers and watch builds and `pruned/` for builds that prune. The plain entry (`.pureform`,
`.pureform/index`) gets the importing file's target:

1. When any target has `include` (paths relative to the root, a folder taking everything
   under it, or patterns over the absolute path), the target whose `include` matches the
   importer, else the default target (the first web one).
2. Otherwise, a native target when the importing environment maps `react-native` to
   `react-native-web` (Vite's environment API, `this.environment.config.resolve.alias`, or the
   resolved config's aliases), else the default target.

Per-target entries (`.pureform/native`) and the other root files always resolve to their own
target. Types of the plain entry come from the default target; import `.pureform/<target>`
for another's. Tools that read the entries without the bundler see `full/`, except a `.ts`
entry such as Panda's `panda.ts`, which gives `pruned/` when the build set
`PUREFORM_OUTPUT=pruned` (the `config` hook does, before Panda's `configResolved`). CSS
tools that resolve `@import` themselves (Tailwind) get `pruned/` from the `transform` hook,
which rewrites a pruned build's `@import`s of an entry.

```ts
// Storybook, whose single Vite build maps react-native to react-native-web everywhere:
export const codegen = {
    targets: {
        web: { target: "panda", options: { prefix: "pf" } },
        native: { target: "native", include: ["src/native"] },
    },
};
```

Keeping the options in a codegen file lets `pureform generate` (`@pureform/cli`) use them too,
for steps without a bundler: the command reads the `codegen` export of `pureform.codegen.ts`.

```ts
// pureform.codegen.ts
export const codegen = {
    target: "panda",
    options: { prefix: "pf" },
} satisfies PureformPluginOptions<PandaCodegenOptions>;

// vite.config.ts
plugins: [pureform(codegen), pandacss()];
```

For TypeScript, add `"@pureform/bundler/client"` to `types` (the registry typed by the
generated `registry.d.ts`, which the tsconfig must include), or map the id to the index with
`paths` (`"virtual:pureform/registry": ["./.pureform/index.ts"]`) for the index's own types,
without the client types (an ambient module wins over `paths`).

### Metro

Metro has no plugin API unplugin reaches, so the config is wrapped. `target` defaults to
`"native"`; the rest of the options are the plugin's. With `targets`, the registry and
`.pureform/`'s entries resolve to the first native target (full, or pruned with `prune`).

```js
// metro.config.js
const { getDefaultConfig } = require("@react-native/metro-config");
const { withPureform } = require("@pureform/bundler/metro");

module.exports = withPureform(getDefaultConfig(__dirname), {
    options: { fontStack: "all" },
});
```

It returns a promise of the config (Metro accepts one): it generates first (failing like a
build when that fails), keeps regenerating on changes with an unref'd watcher (so a one-off
bundle still exits), and resolves `virtual:pureform/registry` before the config's own
`resolveRequest`. Metro serves and bundles from one config, so it doesn't prune unless asked:
pass `prune: true` in the config a release bundle uses. It scans once, before Metro starts, and
regenerations keep that usage, so don't prune a config a dev server runs.

## How it behaves

- **Before other plugins.** In Vite, generation runs in the `config` hook, which Vite runs in
  order before any plugin's `configResolved`. Panda's plugin loads `panda.config.ts` (which imports
  `.pureform/panda`) in `configResolved`, so the generated registry is there first. Other bundlers
  generate in `buildStart`.
- **Once per start.** Builds with several environments (client and server) generate once.
- **Failures.** A failed generation fails a build. A dev server keeps running and logs the
  error (and shows it in the overlay on a later failure); an import of the registry then fails
  with the missing-output message if there's no generated registry at all.
- **Missing generated registry.** An import of `virtual:pureform/registry`, or a relative import
  into the output folder, when `<outDir>/index.ts` doesn't exist, fails with `@pureform/generate`'s
  `missing-output` error, naming `pureform generate` and this plugin.
- **Regeneration.** Only changes to the config and the files it imports (relative paths)
  trigger it; generation rewrites only files whose contents differ, so an unchanged registry
  doesn't reload anything. Changes to installed packages need a restart.
- **Pruning writes beside the full output.** A pruned build writes `<target>/pruned/` and leaves
  `<target>/full/` and the entries as a dev server wrote them, so neither overwrites the other.
  An app that styles components the scan can't see, such as through Panda's recipe functions,
  sets `prune: false`.

## Pruning

`vite build` (and Rollup, Rolldown, and esbuild builds) prunes by default; dev servers and
watch builds never do. Before generating, the plugin scans the app and passes what it found to
`generate` as `usage`: the registry, the declarations, and the factory modules keep only the
components the app draws, and the target narrows its styles to the variant values it selects
(Panda's `staticCss`, the CSS and Tailwind stylesheets, the native precomputed tables).

```ts
pureform({
    target: "css",
    prune: {
        include: ["src"], // where to start (default: every script under the root)
        exclude: ["src/stories"], // besides node_modules, dot folders, dist, build, tests, …
        keep: ["dialog"], // whole components, whatever the scan finds
        variants: false, // prune components only
    },
});
```

**What the scan reads**, in every script under the root (or `include`) and what they import by
relative path (`node_modules`, dot folders, `dist`, `build`, `coverage`, `styled-system`, the
generated registry, the bundler's `outDir`, and test and story files are skipped):

- imports of component subpaths (`@pureform/solid/button`, `/react/…`, `/react-native/…`):
  each draws the registry entries `COMPONENT_USAGE` lists (a dialog draws `dialog`, `scrim`,
  and `button`);
- the JSX that renders them (`<Button variant="text">`, `<Button.Root>`, `<ns.Button>`): a
  written-out value (a string, number, boolean, `undefined`, a template without expressions,
  or `a ? "x" : "y"`) selects those values; anything else keeps every value of that group; a
  spread, or the component used other than as a tag (`as={Button}`, `<Dynamic component>`,
  passed to a function, re-exported), keeps every value of every group;
- `useClasses(name, selection)` and `useStyles`: the selection's written-out values (an object,
  or a function returning one), other groups at their defaults; `useClassFactory(name)`,
  `useLazyClassFactory`, `useStyleFactory`: the entry with every value;
- `useComponent(anatomy, { selection })` with an anatomy from `@pureform/anatomy`;
- `registry.entry("name")` and `.preload("name")` on the generated `registry` or `useRegistry()`,
  and imports of `.pureform/web/<name>`: the entry with every value;
- `<PureformProvider defaults={{ button: { variant: "text" } }}>`: those values (any other
  `defaults` keeps every value of every component).

Groups a component sets itself (a FAB's `extended`, a text field's icons, a card's
`interactive`) keep every value. Defaults are always kept.

**The ripple.** Every component that shows indication (a button, a checkbox, a tab, …), an
anatomy with an indication entry passed to `useComponent`, and `useIndication` draw the `ripple`
entry: the layer inside each surface is styled with it. The scan drops it only when every
`<PureformProvider>` it sees passes an indication it can tell has no layer, and so does every
component's `indication` prop: `noIndication`, `materialIndication({ ripple: false })`, or
`defineIndication({ … })` (or an object) without `layer: true`. With no provider in the scanned
files, the ripple stays.

**When it keeps everything** and warns (`pureform: pruning kept every component and variant, since
…`): a file that doesn't parse, a registry hook or `registry.entry` with a name it can't read,
`useComponent` with an anatomy it can't name, an unknown component subpath, re-exported or
dynamically imported registry hooks, or the generated registry imported as a namespace or
dynamically.

**What it can't see** (use `keep`, or `prune: false`): components drawn from packages under
`node_modules` (a design system that wraps pureform), names passed through `usePureform()`'s
registry or a registry passed around under another name, and a registry hook assigned to another
name (`const use = useClasses`; a wrapper that calls it with a parameter keeps everything
instead). The scan isn't the bundler's module graph: unused files under the root
count as used.

## Build and test

- `task_run` `test:unit` on `@pureform/bundler`: Vite builds and dev servers on temporary apps
  with a fake adapter (generation before `configResolved`, the options, a failing build,
  regeneration on a change, a missing registry in dev), a Rolldown build, the hooks called directly,
  the Metro wrapper, and a `tsc` run over the client types. Pruning: `prune/scan.spec.ts` (what
  the scan reads and when it keeps everything), pruned Vite, dev, and Rolldown builds in
  `plugin.spec.ts`, and `prune/fixture.spec.ts`, a fixture app on the CSS target with the whole
  preset whose build ships only the components and values its source uses.
- `task_run` `build` on `@pureform/bundler`: `dist/{index,vite,rollup,rolldown,esbuild,metro}.mjs`.

## Surprises

- **Rollup and esbuild aren't installed here**, so their subpaths (thin unplugin outputs) are
  untested; Vite and Rolldown are.
- **It replaced the CSS and Tailwind adapters' own Vite plugins** (`pureformCss`,
  `pureformTailwind`, `virtual:pureform/components`), which are gone: with `target: "css"` or
  `"tailwind"` it writes `.pureform/styles.css` too, which the app imports (Tailwind: after
  `tailwindcss`, and with this plugin before Tailwind's).
- **Generate under one runtime.** The output's hash covers the evaluated config, which the preset
  computes slightly differently under Bun than under Node; Vite runs the plugin under Node, and
  so does `pureform generate` (its bin's shebang, which `bun x` follows).
