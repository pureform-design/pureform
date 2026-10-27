# Platform-boundary refactor

Branch: `refactor/platform-boundaries`.

## Goal

`core` describes portable meaning; `binding-core` implements portable component behavior.
Neither chooses HTML attributes, CSS classes, CSS serialization, or a browser lifecycle.
Web bindings and compilers share their wire conventions without depending on one another.
Native must not acquire web dependencies as an accidental consequence of code sharing.

Existing generated selectors, HTML attributes, merge precedence, hydration behavior, and
reactive-node/identity budgets are compatibility requirements. Public helper APIs may change.

## Phases

1. **Web wire contracts.** Introduce a leaf `@pureform/web-contracts` package for state,
   anatomy, and motion attribute names. Keep semantic states, anatomy identities/test IDs,
   motion settings, and numeric motion operations portable. Migrate compiler and binding
   consumers together; never make CSS lowering depend on binding-web.
2. **Binding helper separation.** Move web part assembly, class merging/lookups, diagnostics,
   and ripple-class resolution to binding-web. Keep keyed-value readers and portable data
   structures in binding-core. Move the corresponding behavioral tests with the code.
3. **Mixed binding contracts.** Separate provider inheritance from web projection, neutral
   icon presentation from platform fallbacks, and defaults traversal from platform merge
   rules. Split component semantics from Zag/HTML prop adapters.
4. **Styling boundary.** Keep registry loading, selection types/caches, and neutral factory
   contracts in styling; extract web factory outputs, CSS token/runtime-theme helpers, and
   web registry extensions into `@pureform/styling-web`. Update generated modules and adapters.
5. **Easing transport.** Preserve sampling/interpolation as mathematics in core; use structured
   easing values in Native rather than routing its runtime through CSS strings. Put CSS
   easing parsing/serialization on the CSS/web side.
6. **Enforcement and documentation.** Add executable dependency/export boundary tests, sync
   documentation and workspace/release metadata, and validate affected packages and targets.

## Delegation and validation

- GPT-6.1 Sol: dependency design and implementation phases that change public types or runtime
  contracts; independent high-reasoning review for correctness.
- GPT-6 Astra: focused tests, inventory, and documentation work with explicit file ownership.
- Omni MCP: inspect project tasks and use dependency-aware builds/checks/tests when applicable.
- Agents share a worktree: implementation phases with overlapping files run sequentially.
  Independent review may run concurrently, but must not write implementation files.

Each phase reports its changes, validation results, unresolved risks, and any departures from
this plan. Completion is evidence-based; a directory move alone is not boundary enforcement.

## Validation gates

- Typecheck core/binding-core without DOM types and enforce forbidden package dependencies.
- Exercise state-attribute/selector agreement and preserve exact wire names.
- Run core, binding-core, binding-web, styling, CSS-lowering, and Native unit tests as affected.
- Run Solid's typechecked unit suite and its list-row reactive-node budget.
- Run selected React tests and shared SSR/hydration tests across CSS/Panda/Tailwind targets.
- Check generated module imports, registry declarations, workspace lockfile, release train,
  documentation links, and absence of obsolete exports/imports.

## Progress

- Planning: complete.
- Phases 1–5: complete (focused validation below; phase 5's migration is documented in
  [the migration guide](platform-boundaries-migration.md)).
- Phase 6: complete (below). The refactor is complete and uncommitted on
  `refactor/platform-boundaries`; every breaking change is listed in
  [the migration guide](platform-boundaries-migration.md#consolidated-breaking-changes).

### Summary

`core`, `anatomy`, `styling`, and `binding-core` now describe and implement portable meaning with
no HTML, CSS, DOM, Zag or browser lifecycle; the wire names live in the leaf `web-contracts`; web
assembly lives in `binding-web`; web styling lives in `styling-web`; CSS easing codecs live in
`css-lowering`. React Native and `rn-adapter` reach no web package, by manifest or by source.
Wire names, selectors, merge precedence, hydration and the Solid list-row budget are unchanged.

### Phase 1 — web wire contracts

- Added `@pureform/web-contracts`, with core as its only production dependency (semantic types
  only); its emitted runtime has no imports. No dependency on binding-core, binding-web,
  styling, or CSS lowering. CSS lowering imports the contract directly, never binding-web.
- Scaffolded through Omni MCP: inspected `ts-package`, validated the lib/unpublished/unit-test
  input successfully, then invoked the discovered `generator_run` tool with
  `/tmp/opencode/platform-phase1-generated/web-contracts` as its output. This preserved the
  interrupted implementation. Reconciled the generated boilerplate with nearby packages,
  retaining the actual contract source and omitting unused log/Zod dependencies and example
  addition files. `release_group: none` prevented the temporary directory from entering
  `cog.toml`; the actual package was added to the core train and version-check list.
- Exact export moves (old exports removed, no compatibility re-exports):
    - core → web-contracts: `STATE_ATTRIBUTES`, `AttributeState`, `StateAttribute`,
      `MOTION_ATTRIBUTE`. Removed core's `state-attributes.ts`; portable state types come from
      the existing AST unions, not a stripped web-name map. `MotionSetting` and numeric motion
      operations stay in core.
    - binding-core → web-contracts: `REDUCED_MOTION_QUERY` (and its former core
      `MOTION_ATTRIBUTE` re-export is gone).
    - anatomy → web-contracts: `PART_ATTRIBUTE`, `SCOPE_ATTRIBUTE`, `TEST_ID_ATTRIBUTE`,
      `PartAttributes`.
    - anatomy → binding-web: `partAttributes`, preserving its frozen-default WeakMap cache.
      `partTestId`, `TestIdOverride`, `TEST_ID_PREFIX`, `partSlot`, and `kebabCase` stay in anatomy.
      The existing `attribute` metadata field remains the serialized part **identity**, not an
      HTML attribute name; clarified its documentation without rewriting generated identities.
    - binding-core → binding-web: `stateAttributes`, `StateAttributes`, `partSources`,
      `PartSourcesInput`, `providerAttributes`, `ProviderAttributes`, `themeAttributes`,
      `themeAttributeOf`. `PartStates` stays portable in binding-core, derived from AST unions.
- Migrated React/Solid assembly/provider consumers, CSS lowering, browser test harness imports,
  package/Omni dependencies, docs, core release metadata, and Bun lockfile/workspace links.
  Audited generator templates: none directly referenced the moved APIs. Added the previously
  missing binding-web → CSS-lowering dependency required by its existing easing imports;
  this is not a reverse compiler → binding dependency.
- Validation passed:
    - Omni dependency-aware builds and `check:types`: core, web-contracts, anatomy, binding-core,
      binding-web, CSS lowering.
    - Omni `test:unit`: web-contracts, anatomy, binding-core, CSS lowering (including typechecks).
    - Core: ESNext-only declaration-config compile without DOM lib; focused motion tests (8).
    - Binding-web: anatomy/composites/parts/provider/index suites (163 tests), including exact
      selector/encoder agreement for every state, wire-name snapshots, cached identity, provider
      motion/theme projection, and browser reduced-motion subscription; no type errors.
    - React provider/parts/button suites (94 tests) and Solid equivalents (92), typechecked.
    - Release workspace metadata tests (18), generator version-check tests (14), frozen offline
      Bun lockfile validation, and source/manifest forbidden-edge audit passed.
- Next-phase overlap: web part assembly and provider HTML projection moved early because
  otherwise binding-core would need a forbidden web encoder dependency. Phase 2 should build
  on `binding-web/src/parts.ts`; class lookup/merge/diagnostic helpers still await extraction.
  The combined parts/provider behavioral suites now live in binding-web (including their
  neutral helper/inheritance cases); anatomy's neutral test-id/type suite remains in anatomy.
  Phase 3 still owns the remaining mixed provider/theme types, icon contracts, defaults merge
  policy, and HTML/Zag adapters. Full cross-target SSR/hydration, Native, and Solid list-row
  budget gates remain for later phases. No phase-1 blocker remains; no commits made.

### Phase 2 — binding helper separation

- Exact export moves (old source modules/exports removed; no backwards web re-exports):
    - binding-core root → binding-web root: `cx`, `ClassValue`, `ClassDictionary` (the
      `class-names.ts` module and tests); `classEntry`, `lazyFactoryError`,
      `serverLazyFactoryMessage` (`entries.ts` and tests); `combineProps`, `CombineRules`,
      `mergeStyleObjects` (`props.ts`); `partClasses`, `spreadableProps`, `outsideRootMessage`
      (into the existing web `parts.ts`). Parts/merge/diagnostic behavioral tests already moved
      in phase 1 now import their web implementations locally.
    - binding-core `/indication` → binding-web `/indication`: `rippleClasses`, `RippleClasses`,
      and the per-registry WeakMap cache, now in web `indication-material.ts`.
- React/Solid class hooks, prop mergers, compound-part diagnostics, indication consumers, and
  React's `ClassValue` customization type now use binding-web. React's public `cx` and
  `ClassValue` re-exports remain intact. Existing manifests already declare the necessary edges;
  no new dependency or package subpath was needed.
- Retained in binding-core: keyed types/readers (`forSlot`, `forInstance`, `isPerInstance`,
  `createSlotReader`), `partAsRoot`, neutral anatomy inspection, `PartStates`, neutral
  `materialIndication`/`noIndication` identity, options, and defaults. No Native production
  source imports the extracted helpers or binding-web. No phase-5 files were edited.
- Implementations preserve source/merge order, slot aliases, children/ref omission, handler
  replacement semantics, and cached ripple success/missing/lazy behavior. Added explicit
  ripple cache coverage (including a preloaded lazy entry still yielding no static classes)
  and neutral built-in indication identity/freeze/default coverage.
- Validation passed:
    - Omni dependency-aware builds: binding-core, binding-web, and dependencies; Omni
      `check:types`: binding-core and binding-web.
    - Omni binding-core `test:unit`: 577 tests including typecheck cases; source compilation uses
      the existing ESNext-only/no-DOM config, with no errors.
    - Focused binding-web suites: class-names, entries, parts/merge, indication-material,
      indication-web, slot-props, provider, anatomy — 158 tests including typechecks.
    - Focused React parts/provider/indication/button/drawn-props: 128 tests; Solid equivalents
      plus slot-props: 134 tests; both typechecked, no errors.
    - Standalone source `tsc --noEmit -p tsconfig.json`: binding-core, binding-web, React, Solid.
    - Native `no-dom` suites: React Native 6 tests, RN adapter 4 tests including typechecks.
    - Compiler-API export audit: all 14 moved APIs absent from old barrels and present in new
      barrels; 21 neutral exports and React's existing public re-exports preserved. Source search
      found no extracted helper references remaining under binding-core. Focused formatting and
      `git diff --check` passed.
- Validation limitation: Omni React/Solid `check:types` reaches a separate node/config check
  that reports TS2664 for `src/testing/commands.ts` augmenting `vitest/browser`. Their source
  checks and focused browser/typecheck suites pass; test configuration was not changed here.
- Handoff: phase 3 owns provider inheritance/projection types, icon semantic/fallback types,
  `overDefaults` traversal/merge policy, and HTML/Zag adapters. `ClassFactory`, `SlotClasses`,
  and registry types intentionally still come from styling until phase 4's styling-web split.
  Broader SSR/hydration and Solid reactive-node budget gates remain for later phases.
  No commits made.

### Phase 3 — mixed binding contracts

- Exact export moves and redesigned shared APIs are listed in the
  [phase 3 export ledger](platform-boundaries-phase3-exports.md); user-facing migration is in
  [the migration guide](platform-boundaries-migration.md). No compatibility re-exports remain.
- Provider: core state keeps registry, direction, motion (system inherits the nearest explicit
  setting), defaults, generic slot-props merge, indication and focus-color inheritance, and
  `requireRegistry`. Theme/overrides/hydration types and inheritance moved to binding-web
  (`WebProviderOptions`/`WebProviderState`/`ROOT_WEB_PROVIDER`/`resolveWebProvider`); the HTML
  projection still writes only the provider's own theme and motion. Native validates and resolves
  its named theme/scheme itself (no styling `isRuntimeTheme` import).
- Icons: core `IconStyle` leaves color unspecified; web's `DEFAULT_ICON_STYLE` keeps
  `currentColor`; Native's default color is now `undefined` rather than a CSS keyword.
- Defaults: core `overDefaults` traverses with an injected key policy. On resume, the
  interrupted implementation's nested-`undefined` skipping (in keyed parts and tokens) was
  reverted: it changed web precedence (an own `{ color: undefined }` no longer cleared a default).
  The traversal, `mergeKeyedDefaults` and `mergeShallowDefaults` now reproduce the former
  semantics exactly; tests lock this for web, core and Native. Native's policy differs only by
  flattening StyleProp arrays/registered styles that were previously replaced wholesale.
- Components: HTML tag inference, data/DOM/CSS constants, hidden select and form-reset
  projection, Zag assembly and browser layout moved to `binding-web/src/components/`; React and
  Solid import them from binding-web. Native uses `fieldControlState`, boolean interaction for
  card/list-item, `selectionListDefaults` and `*Positioning` helpers.
- Validation passed:
    - Standalone `tsc --noEmit`: binding-core (ESNext lib, no DOM types), binding-web, React,
      Solid, React Native.
    - Unit suites: binding-core 217, binding-web 751, React Native 879 (one horizontal-shared-axis
      timing test failed once under parallel load and passed on rerun), React 1075, Solid 1154
      (including `list-item/row-cost.spec.tsx`), all typechecked. Re-ran focused React/Solid
      list/selection-list/toolbar/file-upload/provider/parts suites after final doc-comment edits.
    - Release suite: all workspace tests pass except 9 `platform-boundaries.spec.ts` cases, all
      phase-4 styling scope (styling → css-lowering → web-contracts edges, missing styling-web,
      styling's web re-exports and `./theme-vars` subpath). The spec was not weakened.
- Known separate issue: Omni React/Solid `check:types` node-config TS2664 for
  `vitest/browser` augmentation in `src/testing/commands.ts` (pre-existing, unchanged).
- Deferred web coupling (phase 4): binding-core's registry/selection/factory types come from
  styling, whose production dependency on css-lowering makes binding-core, React Native and
  rn-adapter transitively reach web-contracts. Native's toast-store transport and generic
  `Indication<E>` remain platform extension points without DOM types in core.
- Phase 4 handoff: create `@pureform/styling-web`; move `componentClasses`, `joinClasses`,
  `tokenStyle`, `withTokenStyle`, `ClassFactory`, `SlotClasses`, `CssVars`, the `./theme-vars`
  subpath and runtime-CSS theme helpers there; drop styling's css-lowering dependency; repoint
  binding-web (provider/web-theme/parts), generated modules and adapters. No commits made.

### Phase 4 — styling boundary

- Scaffolded `@pureform/styling-web` through Omni MCP: `generator_inspect` (`ts-package`),
  `generator_validate_input` (lib, unit tests, no integration tests, unpublished,
  `release_group: none`: valid), then the discovered `generator_run` into
  `/tmp/opencode/platform-phase4-generated/styling-web` (no session saved). Reconciled with
  web-contracts' conventions: workspace config devDependencies, no log/Zod dependencies or example
  `add` code, `sideEffects: false`, an added `./theme-vars` entry/subpath, formatted configs. The
  real package joined the core train (`cog.toml`, `CORE_PACKAGES`, release workspace test).
- Dependencies: styling → core only (css-lowering edge and `./theme-vars` subpath removed).
  styling-web → core, styling, css-lowering (web-contracts is allowed but unused). No
  css-lowering → styling-web/binding-web edge; styling never imports or re-exports styling-web.
- Export ledger (styling → styling-web, no compatibility re-exports): `TokenStyle`,
  `SlotClasses`, `ClassSlots`, `ClassFactory` (new `types.ts`), `CssVars`, `componentClasses`,
  `Choice`, `ComponentClasses`, `ComponentManifest`, `joinClasses`, `tokenStyle`,
  `withTokenStyle`, `TokenVars`, `SpringVars` (`tokens.ts`, including phase 5's
  `formatLinearEasing` import from css-lowering), `defineRuntimeTheme`, `isRuntimeTheme`,
  `preloadTheme`, `themeScope`, `AnyRuntimeTheme`, `RuntimeTheme`, `ThemeGenerator`,
  `ThemeInput`, `ThemeSchemeVars`, `ThemeSource`, `ThemeAttributes`, `VarOptions`, and
  `/theme-vars` (`tokenVar`, `themeVars`, `ThemeVarsOptions`). Tests and the web fixture moved
  with them; native fixture/factory/registry tests stay in styling.
- Registry split: neutral `Registry`/`RegistryOptions` keep `version`, `names`, `has`, `entry`,
  `preload` (still frozen; a test locks the key set). New `WebRegistry`, `AnyWebRegistry`,
  `WebOptions`, `WebRegistryOptions`, `createWebRegistry`, and `webRegistry` add
  `themeAttribute`, `themeAttributes(name)` and `vars`, reusing the neutral registry's entry
  functions, so entries/lazy promises are identical and static/lazy generics infer unchanged
  (covered by `styling-web/src/registry.spec.ts`).
- binding-core: `ProviderOptions`, `ProviderState`, `resolveProvider` gained a registry type
  parameter (default neutral `AnyRegistry`), `ROOT_PROVIDER` is `ProviderState<never, never>`,
  and `requireRegistry` is generic. It imports only neutral styling types.
- Consumers: binding-web (provider/web-theme/parts/entries/indication/settle/carousel/swipe;
  web provider types take `AnyWebRegistry`), React and Solid (providers, storybook decorators,
  `useRegistry`, class hooks, parts, public `preloadTheme`/`RuntimeTheme`/`ThemeSchemeVars`
  re-exports, fixtures/tests use `createWebRegistry`), material runtime theme (now depends on
  styling-web instead of styling), css-adapter `runtime.ts` and generated factory imports,
  panda-adapter generated factory imports (snapshots updated), css/tailwind codegen spec temp
  roots, `generate`'s `registryIndex` (new `platform` argument: native → `createRegistry` with
  `{ version }`; web → `createWebRegistry` with theme attribute/vars; declarations still augment
  `@pureform/styling`), bundler client types (`WebRegistry`) and test fixtures, component suites,
  browser e2e imports, solid-demo setup. Package/Omni deps added to binding-web, bundler,
  css-adapter, React/Solid (peer + dev, like styling), web apps and test projects; `bun.lock`
  updated (frozen install clean).
- Validation passed:
    - Release suite 89 tests including all of `platform-boundaries.spec.ts` (the 9 previously
      failing phase-4 cases now pass; spec unchanged).
    - Omni `test:unit` + `check:types`: styling 80, styling-web 76, binding-core 217 (ESNext/no
      DOM), binding-web 751, css-lowering 48, generate 191, css-adapter 92, panda-adapter 156,
      tailwind-adapter 56, material 186, bundler 92, React Native 879, rn-adapter 478.
    - React 1075 and Solid 1154 unit tests (typechecked), including Solid's
      `list-item/row-cost.spec.tsx` budget; Omni React/Solid `check:types` passed this run (the
      earlier TS2664 `vitest/browser` augmentation failure did not reproduce).
    - Shared SSR: `server-rendering.e2e.test.ts -t 'DatePicker|TimePicker|ListItem|Button'` —
      1488 passed (CSS, Tailwind and Panda targets regenerated with `createWebRegistry`).
    - Focused oxfmt check of touched files; no styling-related errors in e2e/test-suite `tsc` runs
      (their unrelated pre-existing fixture-path errors remain; their `check:types` is disabled).
- Risks/notes: `@pureform/bundler/client` declared one ambient registry type for every target
  (resolved in phase 6). Existing `.pureform/` output must be regenerated. No commits made.

### Phase 6 — enforcement, review, documentation

- **Independent review** of the full diff and the untracked packages found no behavior change in
  merge precedence or identity caches: `overDefaults` (class/style/slotProps/tokens order, empty
  and `undefined` handling), `partSources` order, `combineProps`, `partAttributes`' frozen
  default `WeakMap`, `rippleClasses`' per-registry `WeakMap`, and the web registry (same entry
  objects, frozen) match HEAD. No dangling import/export, no stale source reference to a moved
  name, no DOM type or web import in portable packages or Native. Findings:
    - **Fixed (medium, documentation):** about 110 doc comments were dropped or reduced to
      one-liners when core's Zag/HTML adapters moved into `binding-web/src/components/`, plus the
      binding-core indication-token docs and `parts.ts`. The original comments were restored from
      HEAD (`git show`), including their rationale for Zag/RTL/SSR adjustments.
    - **Fixed (low):** two over-long header comments (`core/src/motion.ts`,
      `web-contracts/src/state-attributes.ts`); stale `createRegistry`/`/client`/`styling/theme-vars`
      text in `component-architecture.md`.
    - **Documented, not changed (low):** Native's `overDefaults` now flattens `StyleProp` arrays and
      registered styles; RN-Web keeps a small local linear-easing serializer (Native may not import
      css-lowering); `binding-core` keeps a duplicated explicit `PartStates` key set, kept in step
      with `AttributeState` by the binding-web contract tests.
- **Bundler Native typing (fixed):** `@pureform/bundler/client` types the neutral `Registry`
  and imports only `@pureform/styling`; new `@pureform/bundler/client-web` types `WebRegistry`.
  `@pureform/styling-web` moved from a bundler dependency to an optional peer plus devDependency
  (lockfile updated, frozen offline install clean). Tests (`client.spec.ts`) type-check both entries
  with `tsc`, assert the neutral one rejects web fields and loads no `styling-web` file.
- **Boundary enforcement** (`packages/release/src/platform-boundaries.spec.ts`, 43 tests) added:
  a source-level import scan (parsed modules, not strings) for core/anatomy/styling/binding-core
  (no web package, web runtime, Zag, React or React Native, tests included), react-native/rn-adapter
  (no web package or web runtime; react-dom only in rn-adapter's own tests) and the web leaves'
  allowed `@pureform` imports; an ESNext-only, no-ambient-types program per portable package that
  rejects unknown (DOM) globals; public-surface checks over every manifest subpath
  (removed names, extended list) plus presence checks proving the web owners export what was
  removed. Each rule was confirmed to fail on a deliberately introduced violation.
- **Validation:** release suite 71 (5 files); bundler 94; binding-core 217; core 276;
  web-contracts 4; binding-web 751 (all typechecked); `tsc` clean for binding-web, core,
  web-contracts, release. Omni `build` of every `*-demo` app (35 tasks, dependency-aware, including
  generation for CSS/Tailwind/Panda/RN targets) succeeded; `solid-demo` (`vite build`) and
  `storybook-web` (`storybook build`) succeeded. Component-suites `tsc`: 0 errors. Browser-e2e
  `tsc`: 18 errors, all pre-existing (the imported `tests/panda-fixture/panda.pureform.ts` is not
  in the repository at HEAD, and the `unknown` types that follow); with a temporary copy of that
  file the project is clean, so no new type error exists. Earlier phases' React/Solid/RN/SSR
  gates (phases 3–4) were not repeated: phase 6 touched only comments/docs in those packages.
