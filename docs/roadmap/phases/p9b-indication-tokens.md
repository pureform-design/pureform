# p9b: Indication tokens and the anatomy entry

**Depends on:** p8  
**Runs in parallel with:** p9a

Follow the [conventions](../conventions.md), and use the omni MCP as much as possible ([how](../conventions.md#use-the-omni-mcp-first)).

## Read first

- Design doc: §9.8 ("Tokens" and "Where indication draws"), §5.4, §5.5, §5.6, §9.1.
- Output contexts (`/tmp/opencode/<id>.md`, if they still exist): p1a, p1d, p1f, p5b, p6a to p6e.

## Goal

Make the state layer and the focus indicator read tokens an indication can set, and record in
each anatomy where indication draws.

## Scope

- `@pureform/material` and the theme: `focusIndicatorThickness` (3) and
  `focusIndicatorOuterOffset` (2) beside the state opacities.
- `@pureform/preset`:
    - each interactive component gets `stateHoverOpacity`, `stateFocusOpacity`,
      `statePressedOpacity`, `stateDraggedOpacity`, and `focusIndicatorColor`, defaulting to
      the theme's;
    - its base style sets them back to the theme's on its own root, so a component's prop
      doesn't reach a nested component of the same kind;
    - `stateLayer()`, `slotStateLayer()`, and `focusRing()` read them;
    - each component declares its indication (trigger, surface, centered, focus part) next to
      its state layer, following §9.8's table.
- `@pureform/anatomy`: `IndicationAnatomy` on `ComponentAnatomy`, derived from the
  declaration; regenerate `src/generated.ts`.
- Update specs and snapshots in `preset`, `css-lowering`, the adapters, and `anatomy`.

## Notes

Output changes on purpose (one more var per state-layer and focus-indicator value), so the
equivalence check doesn't apply: check computed colors and outlines against fixtures in
Chromium and on React Native instead, which must equal today's. Record the CSS size change in
the commit.

## Done when

- Fixture tests: every component's hover, focus, press, and drag colors and its focus
  indicator compute as before, on all three web targets and React Native.
- Setting a component's tokens on its root changes it and not a nested component of the same
  kind.
- Every interactive component has an anatomy indication entry, checked against §9.8's table.

## Output context (required)

When done, write `/tmp/opencode/p9b.md` (not committed) in the format of
[conventions](../conventions.md#finishing-the-output-context-required), and tick this phase in the [roadmap](../README.md). It must cover at least:

- The token names per component and their CSS var names per target.
- Each component's indication entry, and any that differ from §9.8's table, with why.
