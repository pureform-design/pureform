# p1c: Styles that flip with direction

**Depends on:** nothing  
**Runs in parallel with:** p1a, p1b, p1d, p1e, p1f, p1g, p1h

Follow the [conventions](../conventions.md), and use the omni MCP as much as possible ([how](../conventions.md#use-the-omni-mcp-first)).

## Read first

- Design doc: §5.9 ([doc](../../design/component-architecture.md)).
- The output contexts of the phases this depends on, if any.

## Goal

Make the few physical styles flip in RTL, and guard against new ones.

## Scope

- Switch: handle and state layer on `insetInlineStart`, with the centering translation
  flipped under `rtl`.
- Linear progress: an `rtl` set of indeterminate keyframes.
- A preset spec that fails on a physical horizontal property (`left`, `right`,
  `marginLeft`, `translateX`, …) unless it's symmetric (`left: 0` with `right: 0` or
  `width: 100%`, centering with `left: 50%`) or under a direction condition.
- The icon `mirror` is in p1d, not here.

## Done when

- Chromium test: each changed component's slot boxes in `rtl` mirror their `ltr` boxes
  across the root (`x' = width - x - w`).
- Unit tests and build pass.

## Output context (required)

When done, write `docs/roadmap/context/p1c.md` in the format of
[conventions](../conventions.md#finishing-the-output-context-required), commit it with
the work, and tick this phase in the [roadmap](../README.md). It must cover at least:

- The physical-property spec: where it lives and how to allow an exception.
- The mirrored-box test helper, for reuse in p3c and p6.
