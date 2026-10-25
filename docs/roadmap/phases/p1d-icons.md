# p1d: Icon slot: fill, mirror, and toggle icon buttons

**Depends on:** nothing  
**Runs in parallel with:** p1a, p1b, p1c, p1e, p1f, p1g, p1h

Follow the [conventions](../conventions.md), and use the omni MCP as much as possible ([how](../conventions.md#use-the-omni-mcp-first)).

## Read first

- Design doc: §9.6, §9.4 (the `selected` row), §5.9 (icons that point) ([doc](../../design/component-architecture.md)).
- The output contexts (`/tmp/opencode/<id>.md`) of the phases this depends on, if they still exist.

## Goal

Add the icon-slot features the design needs from the preset.

## Scope

- A `fill` token on icon slots (0 or 1), written as `font-variation-settings: "FILL"
<fill>`, set by the states Material draws filled (the active navigation destination,
  …).
- `mirror`: an icon slot flips with `scaleX(-1)` under `rtl` when marked
  (`data-pf-mirror`, or a variant; pick one and record it).
- Icon button: a `selected` state, for toggle icon buttons, with Material's selected
  colors per fill.

## Done when

- Snapshots or fixtures show the fill, the mirror, and the selected colors.
- Unit tests and build pass.

## Output context (required)

When done, write `/tmp/opencode/p1d.md` (not committed) in the format of
[conventions](../conventions.md#finishing-the-output-context-required), and tick this phase in the [roadmap](../README.md). It must cover at least:

- The `fill` token name and which states set it.
- How `mirror` is expressed (attribute or variant), so bindings set it.
- The icon button's `selected` state and how a binding marks it (ARIA, per p1a).
