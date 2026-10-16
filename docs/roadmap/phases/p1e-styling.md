# p1e: @pureform/styling

**Depends on:** nothing  
**Runs in parallel with:** p1a, p1b, p1c, p1d, p1f, p1g, p1h

Follow the [conventions](../conventions.md), and use the omni MCP as much as possible ([how](../conventions.md#use-the-omni-mcp-first)).

## Read first

- Design doc: §2, §3, §5.1 to §5.4, §5.7 (registry), §6 ([doc](../../design/component-architecture.md)).
- The output contexts of the phases this depends on, if any.

## Goal

Create the framework- and target-free runtime package every binding and generated factory uses.

## Scope

- Scaffold `packages/styling` with the `ts-package` generator.
- Types: `Selection<C>`, `ClassFactory<C>`, `StyleFactory<C>`, `Variants<C>`, `States<C>`,
  `SlotOf<C>`, `InstanceTokens<C>`, and the `ComponentRegistry` interface that generated
  `.d.ts` files augment.
- `createRegistry({ name: factory | { lazy: () => import(...) } })` with static and lazy
  entries, `entry(name)`, `preload(name)`.
- A per-selection cache helper for factories (key from variants and states, lazily
  filled, frozen values), per §2's measurements.
- Move or wrap the runtime of today's class functions
  (`@pureform/css-adapter/runtime`'s `componentClasses`) and `css-lowering`'s
  `themeVars` here, leaving re-exports where they were so nothing breaks.

## Done when

- Unit tests for the registry (static, lazy, preload), the cache, and type tests for the
  generic types.
- The CSS and Tailwind demos still build.

## Output context (required)

When done, write `docs/roadmap/context/p1e.md` in the format of
[conventions](../conventions.md#finishing-the-output-context-required), commit it with
the work, and tick this phase in the [roadmap](../README.md). It must cover at least:

- Every export with its signature.
- How a generated factory module should look against these types (p2c and p4b write them).
- What moved from other packages, and the re-exports left behind.
