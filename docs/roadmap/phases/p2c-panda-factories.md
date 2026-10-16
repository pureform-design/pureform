# p2c: Panda factories for button and checkbox

**Depends on:** p1a, p1e  
**Runs in parallel with:** p2a, p2b

Follow the [conventions](../conventions.md).

## Read first

- Design doc: §5.2 (Panda), §6.
- Output contexts: p1a, p1e.

## Goal

Produce the class factories the first components need on the Panda target, before code generation exists.

## Scope

- Hand-write `.pureform/web/button.ts` and `.pureform/web/checkbox.ts` for `solid-demo` in
  the shape p4b will generate: a `ClassFactory` over Panda's `sva` recipes, and the
  `staticCss` entries that keep their classes.
- A registry index (`createRegistry({ button, checkbox })`) and the `.d.ts` augmenting
  `ComponentRegistry`.
- Keep them in a place p4b can replace wholesale, and say where.

## Done when

- The factories return the classes Panda generates for each variant, checked in a test.

## Output context (required)

When done, write `docs/roadmap/context/p2c.md` in the format of
[conventions](../conventions.md#finishing-the-output-context-required), commit it with
the work, and tick this phase in the [roadmap](../README.md). It must cover at least:

- Where the hand-written factories live, their exact shape, and what p4b must generate to
  replace them.
