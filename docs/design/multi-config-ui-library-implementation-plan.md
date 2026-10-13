# Multi-config UI library, implementation plan

> **Status:** phases 0 to 4 are complete. `@pureform/ui-utils` has since been renamed to
> `@pureform/material`, and the hand-written `@pureform/pandacss-preset` has been removed.
> Older names below refer to those packages. Companion to `multi-config-ui-library.md` (the design doc). The
> design doc is the contract: what the AST means and why. This doc is the build order:
> which packages, in what sequence, with which acceptance gates. When the two disagree,
> the design doc wins and this plan gets corrected.
>
> **Marker convention** matches the design doc: **[DECIDED]** settled, **[OPEN]** still
> to decide, **[REPO]** reconciles with the current monorepo. Section references like
> "§4.1" point into the design doc.

---

## 1. How to use this plan

Each phase below lists its deliverables, the file layout it lands, the acceptance gate
that says it is done, and the validation command to run. Phases are ordered by hard
dependency. Do not start a phase until the prior phase's gate is green, except where a
phase is explicitly marked parallel-safe.

The plan tracks §7 of the design doc (Phase 0 to Phase 5+) and expands each phase into
concrete tasks. Nothing here changes a design decision. Where a task needs a decision
the design doc has not made, it is tagged **[OPEN]** and must be resolved in the design
doc first.

---

## 2. Guiding constraints carried from the design

These shape every phase. They are already **[DECIDED]** in the design doc; repeated here
so the build does not drift.

- **Layer 1 (`@pureform/core`) emits nothing.** It is a typed object tree plus helpers
  and a validator. No CSS, no platform strings, no runtime. (§3, §4)
- **A value is portable only if it has a deterministic build-time static lowering on
  every target.** No value lowering may depend on runtime behavior or on a live reference
  to another property. (§4.5)
- **A condition defers only branch selection, not value resolution.** Branch styles are
  emitted statically; a per-target runtime evaluator picks the branch. This is why
  `hover` / `media` / `container` conditions stay portable. (§4.5)
- **Narrowest-acceptable typing.** Node and helper fields type a value as the narrowest
  valid union for the slot (`NumericValue` / `ColorValue` / `EasingValue` / a bare
  `NumericScalarNode`), never the full `ValueNode`. The one accepted hole is a ref's
  resolved kind, checked at compile time, not by TS. (§4.1)
- **Core owns canonical token values and is the dependency root.** `ui-utils` depends on
  core and feeds `Partial<CoreConfig>` fragments in; the dependency never points the
  other way. (§3, §8 #5)
- **Design-system flavor stays upstream of core.** Material state layers and elevation
  steps live in `ui-utils` / a Material generator that emits a plain `CoreConfig`. Core
  ships only generic primitives. (§3)

---

## 3. Target dependency graph **[REPO]**

The in-scope package graph. Arrows point from dependent to dependency. Layer 3 (CLI
delivery) and Layer 4 (packaged Solid library) are out of scope for now, so this plan
stops at Layer 2.

```
@pureform/dtcg ──► @pureform/panda-adapter ──► @pureform/core
 (codec, Layer 2)         ▲                          ▲
                          │                          │
                          │                          │
@pureform/ui-utils ───────┴──────────────────────────┘
```

New packages this plan creates, in dependency order:

1. `@pureform/core` (Layer 1)
2. `@pureform/panda-adapter` (Layer 2)
3. `@pureform/dtcg` (Layer 2 codec, optional, scheduled after the adapter is proven)

`@pureform/cli` (Layer 3) and `@pureform/solid` (Layer 4) are deferred; see §9.

`@pureform/ui-utils` already exists and is retrofitted to depend on core in Phase 1b.
The existing `@pureform/pandacss-preset` is out of scope for now. The adapter's output
is consumed directly; folding the preset into the adapter is a later decision, not part
of this plan.

---

## 4. Phase 0, finalize and freeze the contract (complete)

**Goal.** The design doc has no `[OPEN]` markers blocking Phase 1, and the node model is
stable enough to implement against.

**Tasks.**

- Confirm every §4 / §5 marker is `[DECIDED]`. The remaining `[OPEN]` items are the
  deferred-extension list (§9.1 group A), which do not block scaffolding.
- The one contract question that gated `Unit` is resolved: `em` is kept. It is a
  relative length like `rem` (web-verbatim; non-web resolves against the in-scope
  font-size as a static approximation), so `unit.ts` ships `em` alongside `px` / `rem`.
  Recorded in the design doc's `Unit` definition. **[DECIDED]**

**Gate.** No `[OPEN]` marker remains inside §4.1 through §4.7 except the group-A deferred
list. The `em` question is answered in the doc.

**Validation.** Doc review only. No code.

---

## 5. Phase 1, scaffold `@pureform/core` and land the node model (complete)

**Goal.** The AST, its helpers, the schema types, path resolution, and the config
validator exist and are unit-tested. No adapter yet.

### 5a. Scaffold the package

Run the `ts-package` generator into `packages/core`:

```
generator: ts-package
output_dir: packages/core
package_name: core
scope_name: pureform
package_description: Agnostic styling AST and config contract (Layer 1)
```

This lands `package.json`, the `tsconfig.*.json` set, `vite.config.ts`, the vitest
configs, and `project.omni.yaml`, matching the shape of the existing packages (compare
`packages/ui-utils`). Add catalog entries for any new dependency rather than pinning
versions inline, per the root `package.json` catalog.

### 5b. Module layout

Mirror the design doc's `src/ast/` split. One file per concern so a new leaf node adds
its node type, its helper, and its `LeafNodeMap` key without touching unrelated files.

```
packages/core/src/
  ast/
    nodes.ts          # all node interfaces + the ValueNode union + RefNode + the
                      #   per-property keyword vocab unions (AlignKeyword, …)
    value-map.ts      # LeafNodeMap, ValueKind, ValueNodeMap (§4.1)
    style.ts          # StyleMap, the value categories (Color/Dimension/…) (§4.1)
    helpers/
      index.ts        # barrel: re-exports every helper group
      scalar.ts       # literal, numeric
      unit.ts         # px, rem, pct, unitless, em(?), withUnit
      ref.ts          # alias, dynamic
      platform.ts     # platform
      condition.ts    # when + ConditionalBuilder, viewport/container*, rawCondition
      color.ts        # color, rgb/hsl/oklch/hct/hex, alpha (overloaded), colorMix
      font.ts         # fontFamily
      shadow.ts       # shadow
      gradient.ts     # grad, linear/radial/conicGradient, stop
      transform.ts    # transform, op, translate*, scale, rotate
      filter.ts       # filter, fn, blur/brightness/saturate
      motion.ts       # easing, cubicBezier, steps, tween, transition, animation
      math.ts         # calc, add/sub/mul/div, min, max, clamp
      keyword/
        index.ts      # barrel, imported as `import * as kw from ".../keyword"`
        kw.ts         # shared `kw` factory (narrow-literal inference)
        align.ts display.ts position.ts flexDirection.ts lineStyle.ts
        textAlign.ts cursor.ts overflow.ts color.ts common.ts
    index.ts          # public @pureform/core/ast barrel
  types.ts            # CoreConfig, *ComponentSpec, UtilityDef, Metadata/WithMeta/Token,
                      #   defineConfig/defineComponent/defineSlotComponent/mergeConfigs,
                      #   meta/tokenValue/stack
  path.ts             # getByPath + cycle-safe alias resolution helpers
  index.ts            # package root barrel
```

Export map in `package.json` must expose at least `.` (root), `./ast`, `./ast/helpers`,
and `./ast/helpers/keyword` so consumers can namespace-import keyword and unit helpers as
the design doc shows (`import * as kw`, `import * as unit`).

### 5c. Deliverables

- **Node model** (`nodes.ts`): every interface in §4.1, the `ValueNode` union, `RefNode`,
  `NumericValue` / `ColorValue` / `EasingValue` aliases, and the keyword vocab unions.
  Discriminated unions use their stated discriminant (`EasingNode` by `kind`, `MathFnNode`
  by `fn`, `ComponentSpec`/`SlottedComponentSpec` by `kind`).
- **Value map** (`value-map.ts`): `LeafNodeMap`, `ValueKind`, `ValueNodeMap`.
- **Style map** (`style.ts`): `StyleMap` with the curated, csstype-derived portable
  property set, including the flow-relative (logical) properties, `states`, `apply`, and
  `rawRules`.
- **Helpers**: one constructor per node, grouped as above, each returning a plain node
  object. `when` ships both the variadic-cases form and the builder form. `alpha` is
  overloaded (concrete color sets the channel; ref/keyword/mix lowers to a
  transparent `color-mix`).
- **Schema types** (`types.ts`): `CoreConfig` (tokens, semanticTokens, components,
  breakpoints, zIndices, durations, easings, textStyles, utilities, keyframes,
  rootStyles, componentBaseStyles, globalRaw), the component spec union, `UtilityDef`
  union with `defineStaticUtility` / `defineDynamicUtility`, the `Metadata` / `WithMeta`
  / `Token` wrappers with `meta` / `tokenValue`, and `stack`.
- **`defineConfig`**: validates the config (§5 #3). At minimum: every `alias` / `dynamic`
  path resolves to an existing entry, no alias cycles, `apply` names resolve to defined
  utilities, dynamic-utility `arg` scales resolve, and `rtl` / `currentColor` style
  preconditions hold (e.g. a `currentColor` reference requires `color` in scope once that
  lands). Validation is the only place the compile-time ref hole is caught, so it must be
  thorough.
- **Path resolution** (`path.ts`): `getByPath` plus cycle detection used by both
  `defineConfig` and later the adapter.

### 5d. Tests

- Each helper returns the exact node shape (snapshot or structural assertion).
- `when` builder and variadic forms produce identical nodes.
- `alpha` overload picks the right branch for concrete vs ref color.
- Keyword factory infers the narrow literal and type-errors on an off-vocab token (type
  tests via `tsd` or `expectTypeOf`, consistent with how `type-utils` tests types).
- `defineConfig` accepts a valid config and rejects: unknown alias path, alias cycle,
  unknown `apply` utility, unknown dynamic-utility scale key.
- `getByPath` resolves nested paths and detects cycles.
- `mergeConfigs` deep-merges fragments and a later fragment wins.

### 5e. `ui-utils` retrofit (Phase 1b, parallel-safe after 5c) (complete)

- Add `@pureform/core` to `ui-utils` dependencies (catalog ref).
- Expose `palette(seed)` returning `{ tokens, semanticTokens }` built with core's
  `hct()` / `oklch()` helpers, and `elevation()` returning `{ utilities }` as a
  `shadowElevation` `UtilityDef`, both as `Partial<CoreConfig>` fragments.
- A generated palette must be indistinguishable from a hand-authored config fragment and
  compose via `mergeConfigs(palette(seed), …overrides)`.

**Gate.** `@pureform/core` type-checks, all unit and type tests pass, the public barrels
export the documented entry points, and `ui-utils` produces core-shaped fragments.

**Validation.** `task_run` the core package's typecheck + unit test tasks; `tsc` with no
errors; vitest green.

---

## 6. Phase 2, model one real component and validate coverage (complete) **[REPO]**

**Goal.** Prove `CoreConfig` covers a real component before building the adapter.

**Tasks.**

- Author the real `button` (not the simplified Appendix A one) as a
  `SlottedComponentSpec`: its actual slots and the full variant set (color, variant,
  size, leading, trailing, disabled), the elevation utility, and the opacity mixing a
  real button needs. The repo's existing hand-written `button` is a useful read-only
  reference for what a real button requires; it is not a migration target here.
- Record every expressiveness gap the modeling exposes.
- Fold each gap into the design doc: if it is a true Layer-1 gap, it joins §9.1; if it is
  an adapter or Layer-4 concern, it is reclassified there. Do not patch core silently;
  the design doc leads.

**Gate.** The real button is expressible as a `CoreConfig` with no undocumented gap. Any
gap is either closed in core (with a design-doc update) or explicitly deferred in §9.1.

**Validation.** The modeled config passes `defineConfig` with no errors. Gap notes are
in the design doc.

---

## 7. Phase 3, build `@pureform/panda-adapter` (complete)

**Goal.** Compile a `CoreConfig` into valid Panda preset-shaped output. This is the
focus of the plan: a working adapter, not a reconciliation with any existing preset.

### 7a. Scaffold

`ts-package` into `packages/panda-adapter`, `package_name: panda-adapter`. Depends on
`@pureform/core` and `@pandacss/dev` / `@pandacss/types` (catalog refs; Panda is `2.0.1`
stable).

### 7b. Deliverables

- `compileNodeToCSS` per §5: lowers each node kind to its Panda / CSS spelling, including
  the `keyword` case (canonical camelCase token to per-target spelling), alias to Panda
  `token(...)` refs (never inlined, to preserve dark-mode and conditions), `dynamic` to a
  `var()` chain with nested fallbacks, and `platform({ css })` verbatim escape.
- Config lowering: `tokens` / `semanticTokens` to `defineTokens` / `defineSemanticTokens`;
  `components` to `defineRecipe` (single-slot) / `defineSlotRecipe` (slotted);
  `utilities` to Panda utilities (static to fixed value maps, dynamic to a
  value-parameterized utility); `zIndices` to the `zIndex` token category; `breakpoints`,
  `durations`, `easings`, `textStyles`, `keyframes` to their Panda categories.
- Condition lowering: `PortableCondition` to Panda conditions (`hover`, `dark`,
  `disabled`, `rtl` to `[dir=rtl]` / `:dir(rtl)`, viewport/container breakpoints to
  `@media` / `@container`), `rawCondition` and `rawRules` emitted verbatim for the web
  target only.
- Prefix handling: honor the config prefix (`'pf'` or the granular
  `{ globals, components }` form), applied only on lowering. The config stays canonical.
- Output: a `definePreset`-shaped object the adapter returns from the Phase 2 button
  config, ready to be consumed by a Panda `panda.config` as a preset.

### 7c. Tests

- Snapshot `compileNodeToCSS` output per node kind.
- Snapshot the full preset generated from the Phase 2 button config. Assert the shape is
  valid Panda input (`defineSlotRecipe` / `defineSemanticTokens` / utilities) and that
  the condition, alias, and dynamic lowerings are correct.
- Alias lowering emits `token(...)` refs, not inlined values.
- `dynamic` emits the nested `var()` fallback chain in the right order.

**Gate.** The adapter turns the Phase 2 button `CoreConfig` into valid Panda preset
output that Panda accepts without error. Snapshot tests lock the lowering of every node
kind and condition.

**Validation.** Vitest snapshot suite green; the generated preset loads in a throwaway
Panda config without error.

---

## 8. Phase 4, prove the adapter output end-to-end (complete)

**Goal.** Render adapter output in a real app, so the compile path is proven beyond
snapshots.

**Tasks.**

- Generate a Panda preset from the Phase 2 button `CoreConfig` via the adapter and feed
  it into `apps/solid-demo`'s Panda config as a preset (alongside or in place of whatever
  the demo uses today). The existing `@pureform/pandacss-preset` stays untouched.
- Keep `ui-utils` as the value generator feeding primitives (palette, elevation) into the
  `CoreConfig`.
- Verify the demo builds and the button renders with the generated styles.

**Gate.** `apps/solid-demo` builds and renders a button styled from adapter-generated
output.

**Validation.** Build the demo; run its existing checks; visual spot-check the button.

---

## 9. Optional follow-on and out-of-scope layers

**`@pureform/dtcg`** (Layer 2 codec, optional). Can start once the node model is frozen
in Phase 1. Scaffolded via `ts-package`. Bidirectional `CoreConfig` to/from DTCG JSON per
§9.1: pack/unpack `$value`, map node-kind to `$type`, `$meta` fields to `$description` /
`$deprecated` / `$extensions`, and `platformHints` to the reserved
`$extensions["sh.pureform.hints"]` namespace. **[OPEN]** which tools to target first
(Figma, Tokens Studio, Style Dictionary). Gate: round-trips a `CoreConfig` through DTCG
JSON and back with no loss.

**Out of scope for now.** Layer 3 and Layer 4 are deferred and not planned here:

- **`@pureform/cli`** (Layer 3). `npx @pureform/cli add button` copies a Solid component +
  its recipe binding into the consumer (shadcn-style), plus Zag.js behavior where a
  component needs it. Behavior lives here, orthogonal to the styling AST (§8 #9).
- **`@pureform/solid`** (Layer 4). Turnkey Solid component library. Home to the
  per-platform runtime bindings behind portable contracts: the size-observer that
  fulfills `containerSize` / `containerBreakpoint` where there is no native `@container`
  (`ResizeObserver` on web, `onLayout` on native), the `--ui-*` runtime override contract
  points (§6), and the `currentColor` / viewport-relative contracts if and when a real
  component needs them (§9.1 A).

Revisit both once Layers 1 and 2 are proven in `apps/solid-demo`.

---

## 10. Cross-cutting concerns

- **Catalog discipline.** Every new dependency goes through the root `package.json`
  catalog (`catalog:` refs), matching existing packages. Do not pin inline.
- **Keep `project.omni.yaml` in sync, especially dependencies.** Each package's
  `project.omni.yaml` declares the omni project graph that drives task ordering and
  caching. Whenever a package gains or drops a workspace dependency in its
  `package.json`, update that package's `dependencies.append` list in the same change
  (for example, add `@pureform/core` to `panda-adapter`'s list, and to `ui-utils`'s in
  the Phase 1b retrofit). A stale list means omni builds in the wrong order or serves a
  stale cache. Also keep its `tasks` / `meta.publish` flags current when a package's
  shape changes. The `ts-package` generator writes an initial file; it still needs these
  edits as deps evolve.
- **Versioning.** Packages ship `0.0.0-semantically-released` like the rest of the repo;
  publish config is restricted at the root.
- **Test layering.** Validate narrow first (per-node helper tests, type tests), then the
  config validator, then adapter snapshots, then the demo build. Do not claim a phase
  passed without running its gate.
- **Panda beta risk.** Panda is newly stable (`2.0.1`); early-stable APIs may shift. Pin
  the version and rely on adapter snapshot tests to catch drift (§7 risk note in the
  design doc).
- **Doc-leads rule.** Any expressiveness gap found during implementation updates the
  design doc first (§9.1 or a reclassification), then the code. The plan never silently
  widens the contract.

---

## 11. Critical path and sequencing

```
Phase 0 (freeze contract)
   └─► Phase 1 (core: nodes, helpers, types, defineConfig)
          ├─► Phase 1b (ui-utils retrofit)        [parallel after 1]
          ├─► Phase 2 (model real button, validate coverage)
          │      └─► Phase 3 (panda-adapter: compile to Panda output)
          │             └─► Phase 4 (prove adapter output in solid-demo)
          └─► @pureform/dtcg                        [parallel, optional, after node model frozen]
```

The hard serial spine is Phase 1 to Phase 4, ending at a button rendered from adapter
output in `apps/solid-demo`. That is where this plan stops (Layers 1 and 2). `ui-utils`
retrofit and the optional DTCG codec can run in parallel once the node model is frozen.
Layer 3 (CLI) and Layer 4 (packaged Solid) are deferred (§9).

---

## 12. Deferred work (not scheduled)

The §9.1 group-A on-demand extensions are deliberately out of this plan. Each is additive
and lands when a real component first needs it: rarer CSS math functions, viewport-relative
sizing as a Layer-4 contract, `currentColor` as a reference, gradient interpolation hints,
a richer easing keyword set, the `drop-shadow` filter shape change, and scroll/view-driven
animation timelines. Pull one into a phase only when a concrete component blocks on it, and
update the design doc at that point.
