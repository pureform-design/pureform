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
4. In a fresh worktree, run `cog install-hook --all --overwrite` (the commit-msg hook checks
   conventional commits), then `bun install`, then `omni run build`. The demos' `generate` runs
   the CLI's build directly with Node, so no bin link is needed.
5. `build` doesn't run tests (only `publish` waits for them). Tests run through `omni run test`
   or `build test`; a test package's own `test` runs its whole e2e suite, so run those files
   through Vitest instead, as the targeted checks say.

Other agents run omni in their own worktrees at the same time. Never stop processes by
pattern (`pkill -f "omni run"`); stop only the ones you started, by PID.

Wait for a long run by running it in the foreground with a long tool timeout, or with
`tail --pid=<PID> -f /dev/null` for one already running. Never wait with sleep loops or
`while pgrep -f "<command>"`: `pgrep -f` matches the waiting shell's own command line, so the
loop never ends. Put your subphase in log names under `/tmp/opencode`, which agents share.

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
- **Targeted checks only in a subphase.** Check just what the subphase changed:
    - Build and unit-test the packages you touched with `omni run build test -p <project>`
      (repeat `-p`). Don't use `-b <commit> -w` for a subphase: it pulls in every dependent,
      including the full e2e suites.
    - Run the type check in each touched package.
    - Run only the e2e test files your change can affect, straight through Vitest after the
      build, narrowed by file, project and test name, for example from `tests/component-suites`:
      `bunx vitest run -c vitest.config.e2e.ts src/overlays.e2e.test.ts --project "solid/css" -t Menu`.
      Pick one project per binding unless the change is target-specific; widen only when a
      narrow run fails in a way the others could share.
    - Never run the whole suite, a whole e2e project, or `-f all` across projects; it takes
      30+ minutes under load, and the orchestrator runs it once per phase.
- **Merging:** the orchestrator merges the subphase branches one at a time in the order the
  phase lists, reruns `generate`, rebuilds, and runs the whole suite once, after the last
  merge. If anything fails, it spawns **one** subagent to fix all the failures (with the
  failing output and the subphases' contexts), rather than one per failure or per subphase.
  A conflict outside the shared files is a sign two subphases overlap: stop and say so in the
  phase's context instead of resolving it silently.
- **Don't refactor across subphases.** Duplicated code between siblings is expected and is
  recorded as a hint; the refactor phase after the wave removes it.

## Choosing what omni reruns

`-f` picks which tasks omni runs instead of taking them from its cache. Pick the narrowest
one that answers the question:

- **No `-f` (the default):** omni runs every task whose inputs changed and replays the rest
  from cache. Use it for ordinary checks while working, including after editing a source or
  config file, which already invalidates the tasks that depend on it.
- **`-f failed` after a failure:** reruns only the tasks that failed last time, and anything
  whose inputs changed since. Use it for every rerun after a fix, and for rerunning a
  suspected flake.
- **`-f all` only when the cache can't be trusted:**
    - the phase gate's whole run (below), which must run every task;
    - checking a result omni replayed from cache ("Cache hit… skipping logs") when you need
      to know it still holds, for example comparing a branch with main;
    - when a task reads an input omni doesn't track, such as Vite's dependency cache or the
      design docs `doc-counts.spec.ts` reads. Name the input when you do.

Narrow `-f all` with `-p <project>` whenever it only needs one project.

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

## Slot props

Follow the [slot-props standard](../design/component-architecture.md#93-configurability)
(sketch: [slot-props-sketch.md](../design/slot-props-sketch.md)): own parts take flat
`SlotKeyedProps`; a drawn component gets one `<component>Props` (`InnerProps<C>`, never
`itemProps`; a role name only when drawn more than once); containers merge defaults with
`overDefaults` (child's own wins); variants stay flat; React Native takes keyed
`style`/`slotProps`/`testId`/`tokens`; repeated parts take per-instance functions. New
ready-mades declare what they draw this way, and `tokens` is the component's own only.

## Native scrolling

Never replace or drive native scrolling, on any platform: no springs, no custom scroll or snap
code in place of the browser's scroll snapping or React Native's `ScrollView`. Motion that
follows the scroll position reads it; it doesn't set it.

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
   replayed from cache). Failures go to a single fixing subagent, which reruns with
   `-f failed` until those pass; the gate doesn't repeat the whole run with `-f all`.
2. `bunx tsc --noEmit -p tsconfig.json` is clean in each package you touched.
3. The gap analysis (matrix row, verdicts, totals, §7 done list) matches the code.
4. Output contexts exist for each subphase, committed with the work.
5. The phase is ticked in the [README](README.md) with links.
6. Commits are pushed when asked to push.
