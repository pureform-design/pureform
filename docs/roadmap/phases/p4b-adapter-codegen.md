# p4b: Adapter codegen subpaths

**Depends on:** p4a (the codegen interface commit)  
**Runs in parallel with:** one subphase per adapter: p4b-panda, p4b-css, p4b-tailwind, p4b-rn, all parallel

Follow the [conventions](../conventions.md).

## Read first

- Design doc: §5.2, §5.4, §7 (allow-list).
- Output contexts: p4a, p2c, p1e.

## Goal

Each adapter emits its own factory modules through `/codegen`.

## Scope

Parallel subphases, one commit series each, each writing its own output context
(`p4b-panda`, `p4b-css`, `p4b-tailwind`, `p4b-rn`):

- **p4b-panda:** `ClassFactory` modules over Panda's recipes, plus `staticCss` entries;
  replaces p2c's hand-written files.
- **p4b-css:** lookup-table factories with no runtime dependency, superseding
  `virtual:pureform/components`.
- **p4b-tailwind:** as css, plus `@source inline(...)`.
- **p4b-rn:** `StyleFactory` modules over the precomputed styles, with the per-selection
  cache from p1e; `useMovingTokens` keeps working.
- Each honors the `components` allow-list.

## Done when

- Each adapter's generated factories match its current output for every component and
  variant (equivalence, since this is a refactor of delivery, not of styles).

## Output context (required)

When done, write `docs/roadmap/context/p4b-<adapter>.md`, one per subphase (`p4b-panda`, `p4b-css`, `p4b-tailwind`, `p4b-rn`), in the format of
[conventions](../conventions.md#finishing-the-output-context-required), commit it with
the work, and tick this phase in the [roadmap](../README.md). It must cover at least:

- Per adapter: the generated module shape and what it replaced.
