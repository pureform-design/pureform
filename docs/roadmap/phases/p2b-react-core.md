# p2b: React binding core

**Depends on:** p1a, p1e, p1f, p1g (p1b for `motion`)  
**Runs in parallel with:** p2a, p2c

Follow the [conventions](../conventions.md).

## Read first

- Design doc: as p2a.
- Output contexts: p1a, p1b, p1e, p1f, p1g.

## Goal

Create `@pureform/react` with the same surface as p2a, built in parallel so shared logic surfaces early.

## Scope

- Scaffold `packages/react`, using `@zag-js/react` directly.
- The same provider, hooks, part helpers, controllable props, and form wiring as p2a,
  with React's idioms (`useMemo`, `use()` for lazy entries, `useId`, a `clsx`-compatible
  class joiner).
- Anything p2a and p2b both write that compiles without a framework moves to
  `@pureform/styling`, `@pureform/anatomy`, or `@pureform/machines`; coordinate with p2a.

## Done when

- Tests with React Testing Library in browser mode, mirroring p2a's.

## Output context (required)

When done, write `docs/roadmap/context/p2b.md` in the format of
[conventions](../conventions.md#finishing-the-output-context-required), commit it with
the work, and tick this phase in the [roadmap](../README.md). It must cover at least:

- Every export with its signature.
- What moved into the shared packages, and what remains React-only.
