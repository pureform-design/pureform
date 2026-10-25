# p3b: React button and checkbox

**Depends on:** p2b, p2c  
**Runs in parallel with:** p3a

Follow the [conventions](../conventions.md), and use the omni MCP as much as possible ([how](../conventions.md#use-the-omni-mcp-first)).

## Read first

- Design doc: as p3a.
- Output contexts (`/tmp/opencode/<id>.md`, if they still exist): p2b, p2c, p1f, p1g.

## Goal

The same two components in React, behaviorally identical to p3a.

## Scope

- `@pureform/react/button` and `@pureform/react/checkbox`, mirroring p3a's API.
- The React demo app to render them: a minimal one under `apps/` with the Panda target, or
  the existing RN-web demo's web side; record the choice.

## Done when

- The same component tests as p3a, adapted.

## Output context (required)

When done, write `/tmp/opencode/p3b.md` (not committed) in the format of
[conventions](../conventions.md#finishing-the-output-context-required), and tick this phase in the [roadmap](../README.md). It must cover at least:

- The file layout and any API difference from p3a, with the reason.
