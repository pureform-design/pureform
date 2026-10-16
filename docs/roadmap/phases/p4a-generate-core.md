# p4a: @pureform/generate core

**Depends on:** p1e, p2c (the factory shape)  
**Runs in parallel with:** p3a, p3b, p3c (p4 doesn't need the components)

Follow the [conventions](../conventions.md), and use the omni MCP as much as possible ([how](../conventions.md#use-the-omni-mcp-first)).

## Read first

- Design doc: §4, §6, §10, §11 (mismatch detection).
- Output contexts: p1e, p2c (factory shape).

## Goal

The shared build step: load the config, ask each adapter for factory modules, and write `.pureform/`.

## Scope

- Scaffold `packages/generate`.
- Config loading with jiti; the import rules check (§4).
- The adapter codegen interface: what an adapter's `/codegen` subpath exports and returns.
  Define it first and commit it alone, so p4b can start.
- Writing `.pureform/`: the header hash (config, build options, package versions),
  rewrite only on change, `--check` semantics, the registry index and `.d.ts`, static and
  lazy entries.
- The core-train version check (§11) with a message naming the versions to install.
- The missing-glue error message (§6); record how it's raised.

## Done when

- Unit tests for loading, hashing, writing, `check`, and the train check, with a fake
  adapter.

## Output context (required)

When done, write `docs/roadmap/context/p4a.md` in the format of
[conventions](../conventions.md#finishing-the-output-context-required), commit it with
the work, and tick this phase in the [roadmap](../README.md). It must cover at least:

- The adapter codegen interface, exactly.
- The `generate()` API p4c and p4d call.
