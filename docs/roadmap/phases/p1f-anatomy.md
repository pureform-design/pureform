# p1f: @pureform/anatomy

**Depends on:** nothing (p1d adds icon button parts; regenerate after it lands)  
**Runs in parallel with:** p1a, p1b, p1c, p1d, p1e, p1g, p1h

Follow the [conventions](../conventions.md), and use the omni MCP as much as possible ([how](../conventions.md#use-the-omni-mcp-first)).

## Read first

- Design doc: §3, §9.1, §9.2 ([doc](../../design/component-architecture.md)).
- The output contexts (`/tmp/opencode/<id>.md`) of the phases this depends on, if they still exist.

## Goal

Derive each component's parts, test ids, and part attributes from the preset's AST, framework-free.

## Scope

- Scaffold `packages/anatomy`.
- Per component: parts (one per slot, from `slots` and `structure`), each part's
  `data-pf-part` value, default test ids (`pf-<component>-<part>`), and exported
  `testIds.<component>.<part>` constants.
- Extra non-slot parts the design names (`HiddenSelect` for select, §9.5).
- A test that the anatomy matches the AST for every preset component, so they can't
  drift.
- Decide whether the anatomy is generated (a script writing source) or derived at import;
  record the choice.

## Done when

- The drift test passes for every component; build and unit tests pass.

## Output context (required)

When done, write `/tmp/opencode/p1f.md` (not committed) in the format of
[conventions](../conventions.md#finishing-the-output-context-required), and tick this phase in the [roadmap](../README.md). It must cover at least:

- The anatomy shape (types and an example), and how bindings consume it.
- Generated or derived, and how to refresh it when the preset changes.
