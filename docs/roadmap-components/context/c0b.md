# c0b: Machine-anatomy drift test (output context)

Commits: see `git log main..c0b-anatomy-drift` (one `fix(machines)` commit, one `docs` commit)

## Built

- `packages/machines/src/anatomy-drift.spec.ts`: for each of pureform's own machines with an
  `*.anatomy.ts`, checks that every part in the preset's anatomy (`@pureform/anatomy`'s
  generated `<name>Anatomy.partNames`) is a part of the machine's Zag anatomy
  (`anatomy.keys()`). Pairs: button↔`buttonAnatomy`, navigation↔`navigationBarAnatomy` and
  `navigationRailAnatomy`, snackbar↔`snackbarAnatomy`, text field↔`textFieldAnatomy`.
  Deleting any of those parts from a machine anatomy fails the spec (checked by deleting
  `activeIndicator` from navigation).
- Drifts fixed (parts added to the machine anatomies; connect output unchanged since the new
  parts aren't spread by `connect` yet):
    - button: `+touchTarget`
    - navigation: `+indicator`, `+activeIndicator`
    - text field: `+container`, `+leadingIcon`, `+trailingIcon`
- `@pureform/anatomy` added to `packages/machines` devDependencies (test-only; `bun.lock`
  updated).

## Deviations from the design

- The machines test against the preset rather than derive from it: deriving would make
  `@pureform/anatomy` (and so the generated preset anatomy) a runtime dependency of the
  machines. The test gives the same guarantee without it.
- The check is one-way (preset ⊆ machine). Machines may keep extra behaviour-only parts.
- `ripple` has no preset component and is not checked. Zag re-exports (checkbox, menu, …)
  have no `*.anatomy.ts` here and are not checked.

## Stubs and gaps

- Slider: `it.todo("slider has every preset part")`, plus a test pinning the known drift
  (`track`, `activeTrack`, `stateLayer`, `handle` missing). c1g replaces the machine; it must
  add the slider to `pairs` and delete the pin test and the todo.

## How to verify

- `omni run test -p @pureform/machines` (the spec runs in chromium).
- `bunx tsc --noEmit -p tsconfig.json` in `packages/machines`.

## Notes for the next phases

- A new own machine with an `*.anatomy.ts` should add itself to `pairs` in
  `anatomy-drift.spec.ts` (one line, additive).
- Parts are compared by name (camelCase, as in the preset's `partNames`).

## Refactoring hints

None: the spec is a single small file and nothing in it is generic beyond the `missing`
helper. If more machines get anatomies, the `pairs` table could be generated alongside
`packages/anatomy/src/generated.ts`, but it's not worth it for five entries.

- **What must not change:** `anatomy-drift.spec.ts` passing; machine `connect` output.

## Open questions

- Should the check also be the other way (no machine part absent from the preset)? Not done:
  none of the current machines have extra parts except ripple, but the rule could forbid
  behaviour-only parts later.
- Full-run failures seen in this worktree, unrelated to c0b and also failing without its
  changes: `@pureform/rn-adapter` `geometry.spec.ts` drop-shadow test times out at 1000 ms;
  `@pureform/material` `runtime-theme.spec.ts` / `factory.spec.ts` timed out intermittently.
  A first full run also failed the demos' `generate` (`bunx pureform` resolved the npm package)
  until `bun install` was rerun after the build linked the local CLI.
