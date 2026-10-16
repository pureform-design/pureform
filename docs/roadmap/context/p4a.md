# p4a: @pureform/generate core (output context)

Commits: 0e4182d..5709f91, plus the `docs(roadmap)` commit that adds this file. The
interface commit, which p4b can start from, is **0e4182d**
(`feat(generate): scaffold @pureform/generate with the adapter codegen interface`); it
hasn't changed since.

## Built

### `@pureform/generate` (`packages/generate`, new, core train)

Scaffolded with the `ts-package` generator (`release_group: core-train`, added to
`cog.toml`'s train). `sideEffects: false`. Dependencies: `@pureform/core` (types),
`jiti`, `oxc-parser` (new catalog entry `^0.139.0`, already in the lockfile through
`filesystem-routing`). Dev: `@pureform/release` (new catalog entry), `@types/node`. Root
catalog entry `"@pureform/generate": "workspace:^"`. One entry point (`.`); Node only.

### The adapter codegen interface (`src/adapter.ts`), exactly

Each adapter's `/codegen` subpath exports **`codegen`** (a default export also works), a
`CodegenAdapter`. `generate` finds it as `${TARGET_PACKAGES[target]}/codegen`, resolved
with `createRequire(<root>/package.json)` (so the `require` export condition, which points
at `dist/*.mjs` in this repo), and loaded with `import()`.

```ts
type Platform = "web" | "native";
type Target = "panda" | "css" | "tailwind" | "native";
const TARGET_PACKAGES = {
    panda: "@pureform/panda-adapter",
    css: "@pureform/css-adapter",
    tailwind: "@pureform/tailwind-adapter",
    native: "@pureform/rn-adapter",
} as const;

interface ComponentShape {
    readonly variants: Readonly<Record<string, readonly string[]>>; // group → values, config order
    readonly defaults: Readonly<Record<string, string>>; // recipe.defaultVariants (not declared)
    readonly slots: readonly string[]; // spec.slots, or ["root"]
    readonly states?: readonly string[]; // leave out on the web; native lists what it reads
    readonly tokens: readonly string[]; // Object.keys(spec.tokens)
}

interface CodegenContext<Options = Record<string, unknown>> {
    readonly config: CoreConfig; // loaded; don't mutate
    readonly components: readonly string[]; // allow-listed, config order: one module each, no others
    readonly options: Options; // the adapter's build options; part of the hash
    readonly root: string; // absolute
    readonly outDir: string; // absolute, <root>/.pureform by default
    shape(name: string): ComponentShape; // componentShape(config.components[name]), cached
    importPath(from: string, to: string): string;
    // from: relative to outDir ("web/button.ts"); to: absolute or root-relative
    // ("styled-system/recipes/button") → "../../styled-system/recipes/button"
}

interface ComponentModule {
    readonly name: string; // config key = registry name; a JS identifier
    readonly path: string; // relative to outDir, "/" separators, .ts/.tsx/.js/.mjs
    readonly contents: string; // source WITHOUT the header (generate adds it)
    readonly exportName?: string; // default: name; a JS identifier
    readonly shape?: ComponentShape; // default: context.shape(name)
}

interface GeneratedFile {
    readonly path: string; // relative to outDir
    readonly contents: string; // without the header
    readonly header?: boolean; // default true; false for JSON. ".css" gets /* */, others //
}

interface CodegenOutput {
    readonly components: readonly ComponentModule[];
    readonly files?: readonly GeneratedFile[];
}

interface CodegenAdapter<Options = Record<string, unknown>> {
    readonly name: string; // "panda", used in messages and the hash
    readonly platform: Platform;
    codegen(
        context: CodegenContext<Options>,
    ): CodegenOutput | Promise<CodegenOutput>;
}

const defineCodegen: <Options>(
    adapter: CodegenAdapter<Options>,
) => CodegenAdapter<Options>;
const componentShape: (spec: AnyComponentSpec) => ComponentShape;
```

Rules `generate` enforces on the output (`GenerateError` code `adapter-output`): exactly one
module per requested component, none extra; paths relative with no `.`/`..` segments or
leading `/`, unique across modules and files; not `index.ts` or `registry.d.ts` (generate
writes those); component modules are `.ts`, `.tsx`, `.js`, or `.mjs`; names and export
names are identifiers. Codegen must be pure and write nothing itself.

### `generate()` (`src/generate.ts`), what p4c calls

```ts
interface GenerateOptions<Options = Record<string, unknown>> {
    readonly config: string | CoreConfig; // path (relative to root, loaded with jiti) or object
    readonly target: Target | CodegenAdapter<Options>;
    readonly options?: Options; // the adapter's options
    readonly components?: readonly string[]; // allow-list; default all; unknown names throw
    readonly lazy?: readonly string[]; // lazy registry entries; must be generated
    readonly root?: string; // default process.cwd()
    readonly outDir?: string; // default ".pureform" (DEFAULT_OUT_DIR), relative to root
    readonly check?: boolean; // compare, write nothing
    readonly trainCheck?: boolean; // default true
    readonly imports?: boolean | ImportRuleOptions; // config path only; default true
}
interface GenerateResult {
    readonly root: string;
    readonly outDir: string; // absolute
    readonly hash: string; // 16 hex chars
    readonly trainVersion: string; // recorded in the glue
    readonly files: readonly FileResult[]; // { path, status }
    readonly changed: boolean; // write: anything written/removed; check: anything out of date
    readonly ok: boolean; // check: !changed; write: true
    readonly hints: readonly string[]; // e.g. the tsconfig include hint
    readonly dependencies: readonly string[]; // config + its relative imports, absolute (watch these)
}
type FileStatus =
    | "written"
    | "unchanged"
    | "removed" // write mode
    | "missing"
    | "stale"
    | "modified"
    | "extra"; // check mode
const generate: <Options>(
    options: GenerateOptions<Options>,
) => Promise<GenerateResult>;
```

Order: train check (throws `train-mismatch` before anything is loaded) → load config →
load adapter → resolve `components`/`lazy` → hash → (check mode: hash fast path) → run
codegen → plan files → write or compare.

- **Hash:** `hashOf` (sha256 of `stableStringify`: sorted keys, functions as source, cycles
  marked; first 16 hex chars) of

    ```ts
    ({ format: 1, config, adapter: { name, platform }, options, components, lazy,
       versions: { [installed train or binding name]: version }, generate: VERSION })
    ```

- **Header** on every file (except `header: false`), then a blank line, then the
  contents. CSS files get the same two lines as block comments.

    ```ts
    // Generated by pureform: do not edit. Run `pureform generate` to update it.
    // pureform-hash: 5f4646e703808a3a
    ```

    `GENERATED_MARK`, `headerHash(contents)`, `isGenerated(contents)` are exported.

- **Write mode:** writes a file only when its full contents differ; removes files under
  `outDir` that carry the header but aren't planned (then empty folders). Files without the
  header are left alone.
- **Check mode:** if `index.ts` is missing → `[index.ts: missing, …stale]`; if any
  generated file's header hash differs → those files `stale`. Both return **without running
  the adapter**. Otherwise runs codegen and reports `missing`/`stale`/`modified`/
  `unchanged` per planned file plus `extra` for unwanted generated files.

### What `.pureform/` holds

- The adapter's modules and files, at the paths it returned.
- `index.ts`:

    ```ts
    import { createRegistry } from "@pureform/styling";

    import { button } from "./web/button"; // static entries; `{ x as name }` if exportName differs

    /** The core train's version this glue was made with. */
    export const version = "0.4.1";

    export const registry = createRegistry(
        {
            button,
            checkbox: { lazy: () => import("./web/checkbox") }, // + .then((module) => module.<exportName>)
        },
        { version },
    );

    export const themes = ["teal", "sharp", "dense"] as const; // Object.keys(config.themes)

    export type Components = "button" | "checkbox"; // or never
    ```

- `registry.d.ts`: `declare module "@pureform/styling" { interface ComponentRegistry { … } }`
  plus `export {};`. Per component: `variants` (omitted when no groups), `slots`, `states`
  (only when the shape has them), `tokens` (omitted when none), `lazy: true` (lazy only).
  Values are string unions; `"true" | "false"` groups take booleans through styling's
  `VariantValue`.
- Verified outside the tests: generating from the real preset (`pureform({})` loaded with
  jiti under Node, from `dist`) with a scratch adapter emitting `ClassFactory<"button">`
  modules; `tsc` passes on an app reading `registry.entry("button").factory({ variant:
"filled" })`, rejects `variant: "nope"`, and types `registry.entry("checkbox").kind` as
  `"lazy"`.

### Config loading (`src/config.ts`, `src/imports.ts`)

```ts
const loadConfig: (
    path: string,
    options?: { root?: string; imports?: boolean | ImportRuleOptions },
) => Promise<{
    config: CoreConfig;
    file: string;
    dependencies: readonly string[];
}>;
interface ImportRuleOptions {
    readonly allow?: readonly (string | RegExp)[];
}
const scanConfigImports: (
    entry: string,
    options?: ImportRuleOptions,
) => { files: readonly string[]; violations: readonly ImportViolation[] };
interface ImportViolation {
    file;
    line;
    column;
    rule: "builtin" | "package" | "env";
    specifier?;
    message;
}
const formatImportViolations: (violations, root?: string) => string;
```

- jiti with `moduleCache: false, fsCache: false, interopDefault: false`: fresh every call,
  and the **default export** is the config (it must be an object with `components`).
- Import rules (checked before loading; `config-imports` error): walks static imports,
  re-exports, `import("…")`, and `require("…")` with literal specifiers through relative
  files (TS-style resolution: extensions, `.js` → `.ts`, `index.*`; JSON is listed, not
  parsed). Fails on Node built-ins (`node:*`, `bun:*`, bare builtins), packages outside
  `@pureform/*` unless allowed, and `process.env`/`import.meta.env`/`Bun.env`/`Deno.env`
  outside any function. Type-only imports pass.

### Train check (`src/train.ts`, `src/semver.ts`)

```ts
const CORE_TRAIN_PACKAGES: readonly [...17 names]; // equal to cog.toml's core-train (tested)
const BINDING_PACKAGES = ["@pureform/solid", "@pureform/react", "@pureform/react-native"];
const findInstalled: (root: string, names?) => InstalledPackage[]; // nearest node_modules/<name> upward
interface InstalledPackage { name; version; dir; peerDependencies? }
const checkTrain: (installed) => { version: string | undefined; problems: TrainProblem[]; message: string | undefined };
type TrainProblem =
  | { kind: "version"; name; version; expected }
  | { kind: "peer"; name; version; peer; range; installed };
const compareVersions: (a, b) => number;
const satisfies: (version, range) => boolean | undefined; // undefined: range isn't semver
```

The train's version is the newest installed train package's (`generate` falls back to its
own `VERSION` when none is installed). The message, for example:

```
pureform: the installed pureform packages don't match the core train, 0.4.1.
Core-train packages share one version, and these differ:
  @pureform/core 0.3.2
Install them at 0.4.1:
  @pureform/core@0.4.1
@pureform/react 0.2.3 works with @pureform/styling ^0.4, not 0.5.0.
Install a @pureform/react release made for core-train 0.5.0 (@pureform/react@latest), or install the core train at a version in ^0.4.
```

### Missing glue (`src/missing.ts`)

```ts
const missingGlueMessage: (outDir: string, importer?: string) => string;
const assertGlue: (
    outDir: string,
    options?: { root?: string; importer?: string },
) => void;
// throws GenerateError("missing-glue") when <root>/<outDir>/index.ts doesn't exist
```

Message: `pureform: the generated glue in .pureform/ is missing (imported from src/main.tsx).`
then two lines naming `pureform generate` from `@pureform/cli` and the plugin from
`@pureform/bundler`. **How it's raised:** nothing raises it on its own; the bundler plugin
(p4c-bundler) calls it when an import resolves into a missing `outDir`, and the CLI and test
setups call `assertGlue`.

### Errors (`src/errors.ts`)

`class GenerateError extends Error { code: GenerateErrorCode }`,
`isGenerateError(error, code?)`. Codes: `config-not-found`, `config-load`, `config-export`,
`config-imports`, `adapter-not-found`, `adapter-invalid`, `adapter-output`, `components`,
`train-mismatch`, `missing-glue`. Messages start with `pureform: `.

### Changes to other packages

- **`@pureform/styling`:** `VERSION` (from new `src/package-version.ts`);
  `createRegistry(input, options?: RegistryOptions)` with `RegistryOptions { version?: string }`;
  `Registry.version: string | undefined`.
- **`@pureform/binding-core`:** `trainVersionMismatch(registry, runtime = VERSION)` is real
  now: a message when `registry.version` is a string different from styling's `VERSION`,
  else `undefined` (hand-made registries pass). The providers already call it in development.
- **`@pureform/release`:** `src/package-version.ts` (`export const VERSION = "…";`) is kept
  in step by `set-version` (`setSourceVersion`, `readSourceVersion`,
  `SOURCE_VERSION_FILE`), and `check` fails when it differs from `package.json`
  (`WorkspacePackage.sourceVersion`).

## Deviations from the design

- **Import rules are checked by `loadConfig`**, on every load, rather than by "a test in each
  adapter" (§4). Adapters can still call `scanConfigImports` in their tests. Recorded in §4.
- **The index exports `version`** and passes it to `createRegistry`; §6's sketch has neither.
  This is how "the glue records the train's version" (§11) is built. Recorded in §6 and §11.
- **`@pureform/styling` learns its version from `src/package-version.ts`**, which the release
  tooling rewrites, since its build can't import `package.json` (`rootDir` is `src`).
- **A tsconfig hint** in `GenerateResult.hints` (p2c's note): TypeScript skips dot folders.
- **The train check takes the newest installed version as the train's** and names the rest
  as behind; the design doesn't say which version wins.

## Stubs and gaps

- **No adapter has `/codegen` yet** (p4b-panda, p4b-css, p4b-tailwind, p4b-rn). `target:
"panda"` etc. fail with `adapter-not-found` until each adapter adds the subpath to its
  `package.json` `exports` and its vite `lib.entry`.
- **No `.gitignore` hint**: p4c-cli prints it (§6, §10).
- **No watch mode** here: p4c uses `result.dependencies` to watch and calls `generate` again.
- **`header: false` files** can't be recognized later, so they're never removed or reported
  as `extra`.
- **semver** is a subset: prereleases aren't excluded from ranges as npm does.
- `solid-demo`'s and `react-demo`'s `.pureform/` are still p2c's hand-written files with no
  header; p4b-panda and p4c replace them.

## How to verify

- `task_run` `test:unit` and `build` on `@pureform/generate`: 129 tests (with type checks)
  across `adapter`/`shape`, `config`, `imports`, `hash`, `semver`, `train`, `generate`,
  `missing`. The fake adapter and temp roots are in `src/__fixtures__/project.ts`.
- `task_run` `test:unit` on `@pureform/styling`, `@pureform/binding-core`,
  `@pureform/release`, `@pureform/solid`, `@pureform/react`: pass.
- Workspace `build` and `test:unit`: all pass except the pre-existing rn-parity "every
  variant value at rest" case in `@pureform/browser-e2e-tests` (257 of 258).
- `bun packages/release/src/cli.ts check` → `cog.toml and the workspace agree`.

## Notes for the next phases

- **p4b (every adapter):**
    - Add `"./codegen"` to `package.json` `exports` (same shape as the other subpaths) and
      `codegen: "src/codegen.ts"` to `vite.config.ts`'s `lib.entry`; add
      `@pureform/generate` as a dependency (`catalog:`) for the types and `defineCodegen`.
    - `export const codegen = defineCodegen<YourOptions>({ name, platform, codegen })`.
    - Generate one module per name in `context.components` only (that is the allow-list);
      use `context.shape(name)` for groups (`Object.keys(shape.variants)`), `defaults`, slots,
      and tokens, so every adapter agrees with the declarations.
    - Don't write a header; return `contents` only. Paths: `web/<name>.ts` (web) or
      `native/<name>.ts` (native) by convention.
    - Generated modules import from `@pureform/styling` (`selectionCache`, `withTokenStyle`,
      types) and name the component: `ClassFactory<"button">` works because `registry.d.ts`
      augments `ComponentRegistry`.
    - The output must be deterministic: the same input must give byte-identical contents, or
      `check` reports `modified`.
- **p4b-panda:** recipe imports via `context.importPath("web/button.ts", "<styled-system>/recipes/button")`;
  the styled-system location should be an adapter option (default `styled-system`). Put
  `staticCss` in a `files` entry (`panda.ts`). Boolean groups: convert `"true"`/`"false"`
  back to booleans before calling Panda's recipe (p2c's note).
- **p4b-rn:** return `shape: { ...context.shape(name), states: [...] }` so the declarations
  carry the native states.
- **p4b-css/tailwind:** a stylesheet can be a `files` entry (`.css` gets a block-comment
  header).
- **p4c-bundler:** call `generate({ root, config, target, options, components, lazy })` on
  dev and build start; watch `result.dependencies` and regenerate; `virtual:pureform/registry`
  can re-export `<outDir>/index.ts`. Raise `missingGlueMessage` from `resolveId` for imports
  into a missing `outDir`. `GenerateError.code` tells config errors from adapter errors.
- **p4c-cli:** `pureform generate --check` → `generate({ …, check: true })`, exit non-zero
  when `!result.ok`, print `result.files` that aren't `unchanged` and `result.hints`.
- **Tests that write temp apps:** a temp root with no `node_modules` has no train packages,
  so the glue records `generate`'s own `VERSION`; give it fixture `node_modules` (see
  `installed()` in the fixtures) to test the train check.
- **Lockfile:** two catalog entries and the workspace were added by hand to `bun.lock`
  (`bun install --lockfile-only` re-resolved unrelated packages, including downgrading
  `@oxc-project/types`); `bun install --frozen-lockfile` then reports no changes.
