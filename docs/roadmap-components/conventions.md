# Conventions for every component phase

These add to [`docs/roadmap/conventions.md`](../roadmap/conventions.md), which still applies
(omni MCP first, commits, formatting, READMEs, refactors that don't change output,
compaction). Where this file differs, it wins for the component roadmap. Contexts live in
`docs/roadmap-components/context/`, not `docs/roadmap/context/`.

## Before starting

1. Read the [component guidelines](../design/component-guidelines.md) and the
   [component recipe](component-recipe.md).
2. Read the gap-analysis sections the phase lists, and the sections of
   `component-architecture.md` it points to (at least §5.5 tokens and §9.8 indication).
3. Read the output contexts of every phase you depend on, **including their refactoring
   hints**, then `git log --oneline -20`.

## Parallel work

Subphases of one phase don't depend on each other and run at the same time.

- **One worktree per subphase,** created from the phase's start commit, on a branch named
  after the subphase (`c1a-text-field`). Use `t3_thread_launch`/`delegate_task` with
  `isolation: "worktree"` or the opencode worktree tools. Install and generate in the
  worktree before building.
- **Own files:** each subphase owns the component files named in its section. Don't edit
  another subphase's files; if you need a change there, record it in your context.
- **Shared registration files** are the few files every new component touches:
  `packages/preset/src/index.ts`, `packages/preset/src/pureform.ts`,
  `packages/binding-core/src/index.ts`, `packages/binding-core/src/usage.ts`, each binding's
  `package.json` exports and `vite.config.ts` entries, the bindings' registry fixtures,
  `tests/component-suites` and `tests/browser-e2e-tests` lists, and
  `packages/anatomy/src/generated.ts` (generated: never merge by hand, rerun `generate`).
  Edit them with small additive changes (one line per component) so merges are a union.
- **Targeted checks only in a subphase.** Build and test just what the subphase affects:
  `omni run build test -p <project>` for the packages you touched, or
  `omni run build test -b <phase start commit> -w` for everything changed since the phase began
  and its dependents, plus the type check in each touched package and the specific suites
  (component suites, browser screenshots) for your components. Don't run the whole suite
  (`-f all` on every project); it is slow, and the orchestrator runs it once per phase.
- **Merging:** the orchestrator merges the subphase branches one at a time in the order the
  phase lists, reruns `generate`, rebuilds, and runs the whole suite once, after the last
  merge. If anything fails, it spawns **one** subagent to fix all the failures (with the
  failing output and the subphases' contexts), rather than one per failure or per subphase.
  A conflict outside the shared files is a sign two subphases overlap: stop and say so in the
  phase's context instead of resolving it silently.
- **Don't refactor across subphases.** Duplicated code between siblings is expected and is
  recorded as a hint; the refactor phase after the wave removes it.

## Similar components share a subphase

Before splitting a phase into subphases, check whether two items share most of their parts,
tokens and behaviour (the same machine, the same row structure, the same sub-anatomy). If
they do, one subphase builds both. The phase files already group these; regroup if a closer
look shows more overlap, and note it in the context.

## Theme conformance and tests in every subphase

A subphase isn't done until it passes the
[guidelines' checklist](../design/component-guidelines.md#8-before-calling-a-component-done):
every row of the theme table for a static and a dynamic theme, the radii rule (or a recorded
exception), anatomy agreement between preset, machine and binding, all targets, and the
gap analysis updated. Also:

- Add the component to `expressive.spec.ts`-style preset specs, the adapter codegen
  sampling, `tests/component-suites` (each binding on each target, including the direction
  suite), and the browser suite's screenshots.
- A new variant group counts its compounds before and after (guidelines §4).
- Deprecated options of anything you touch: remove those the new version already has an
  equivalent for (name the replacement in the gap analysis and READMEs, and update their tests
  and fixtures); those without one still work, and a test says so.

## Output context

Write `docs/roadmap-components/context/<id>.md` before the final commit of a subphase, in
the [format of the first roadmap](../roadmap/conventions.md#finishing-the-output-context-required),
plus these sections:

```md
## Refactoring hints

For the refactor phase that follows this wave. Be specific, with file paths and names.

- **Helpers that look generic:** functions or token groups you wrote here that other
  components will want (name, file, what it does, who else would use it).
- **Code that looks like a sibling's:** where you copied a pattern, or know a sibling
  subphase wrote something alike (the other subphase's id, if known).
- **Suggested home:** where the shared piece should live (for example
  `packages/preset/src/components/shared.ts`, a new module, a binding-core helper).
- **What must not change:** the output the refactor has to keep identical (fixtures,
  screenshots, specs to run).

## Open questions

Decisions you made that the user may want to revisit, and spec values you couldn't confirm.
```

A subphase with nothing generic to report writes "None" under the hints, and says why.

## Refactor phases

A refactor phase (`rN`) runs after a wave and is a single agent (or one per area when the
hints split cleanly).

1. Read every output context of the wave, collecting the refactoring hints.
2. Search for duplication the hints missed: components' token blocks, structural builders,
   shape and state-layer helpers, binding wrappers, tests' setup. Compare the sibling files
   side by side.
3. Before each extraction, check that it makes sense logically, the duplication is obvious, and
   the shared code is flexible enough for future changes
   ([guidelines §4](../design/component-guidelines.md#4-variants-without-explosion)). If any
   check fails, leave it and say why in the context. Otherwise extract shared code to the
   suggested homes. Prefer the preset's shared helpers
   (`shared.ts`, `shaped.ts`, `list.ts`) and binding-core's component helpers over new
   packages.
4. **Output must not change:** run the equivalence checks (React Native resolved styles and
   Chromium computed styles before and after, the recorded indication fixtures, screenshots)
   and the whole build and test run.
5. Write the refactor's own context: what was extracted, where, and hints for the next
   wave's authors (what to reuse, so they don't copy again).

If a wave produced no duplication worth extracting, the refactor phase says so with the
evidence and stops; don't refactor for its own sake.

## Gate for a phase

Subphases check only what they affect (see [parallel work](#parallel-work)); the whole run
below happens once, on the merged phase.

1. `omni run build test -f all -o continue` passes on the merged phase (every task, nothing
   replayed from cache). Failures go to a single fixing subagent, then the run repeats.
2. `bunx tsc --noEmit -p tsconfig.json` is clean in each package you touched.
3. The gap analysis (matrix row, verdicts, totals, §7 done list) matches the code.
4. Output contexts exist for each subphase, committed with the work.
5. The phase is ticked in the [README](README.md) with links.
6. Commits are pushed when asked to push.
