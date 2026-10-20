# c0c: Shape exceptions (output context)

Commits: see `git log 482a594..c0c-shape-exceptions` (one commit, `test(preset): …`).

## Built

- `packages/preset/src/radii.spec.ts` now has an allow-list for the shape rule:
    - `ALLOWED: Record<component, Record<path, reason>>`, empty. The path is the radius's
      path inside the component as the check reports it, without the component name (for
      example `base.borderRadius`, or `variants.size.small.borderRadius`).
    - `checkRadii(found, allowed)` returns `{ fixed, unreasoned, stale }`: fixed radii not
      allowed, entries whose reason is empty or whitespace, and entries that match no fixed
      radius (including unknown components). The main test expects all three empty.
    - Three fixture tests (an allowed ring and a disallowed button) cover passing through,
      an empty reason, and a stale entry.
- The spec's header comment states the exception; `docs/design/component-guidelines.md` §5.1
  item 3 now describes the allow-list's shape and failure modes.

## Deviations from the design

None. Matching is by exact path, not by token name alone, so an exception covers one radius
and not every radius in the component.

## Stubs and gaps

None. The list is empty until c1b (circular progress) and c4a (loading indicator).

## How to verify

- `cd packages/preset && bunx vitest run src/radii.spec.ts` (4 tests pass).
- `bunx tsc --noEmit -p tsconfig.json` in `packages/preset` is clean.
- `omni run build test -f all -o continue`: 101 succeeded, 1 failed:
  `@pureform/rn-adapter#test:unit`, where `src/react.spec.ts` can't parse react-native's Flow
  source ("Flow is not supported"). It fails the same way without this change, so it's
  environmental and unrelated.

## Notes for the next phases

- c1b and c4a: run the spec, copy the reported path (minus the component prefix) into
  `ALLOWED`, and give a geometry reason. Paths are exact; renaming the slot or moving the
  radius into a variant makes the entry stale and the test fails, which is intended.
- In a fresh worktree, run `bun install` again after the first build: the `pureform` bin
  isn't linked until `packages/cli/dist` exists, and the `generate` tasks then fall back to
  `bunx pureform@latest` from npm, which is broken.

## Refactoring hints

None. The helper is specific to this spec; nothing generic was written, and no sibling
touches `radii.spec.ts`.

## Open questions

- Should an allowed entry also pin the fixed lengths (for example `9999`), so a change of
  value is reviewed too? Left out for now; the reason is the review point.
