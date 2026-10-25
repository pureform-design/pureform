# p1b: Reduced motion stops movement only

**Depends on:** nothing  
**Runs in parallel with:** p1a, p1c, p1d, p1e, p1f, p1g, p1h

Follow the [conventions](../conventions.md), and use the omni MCP as much as possible ([how](../conventions.md#use-the-omni-mcp-first)).

## Read first

- Design doc: §5.8 ([doc](../../design/component-architecture.md)).
- The output contexts (`/tmp/opencode/<id>.md`) of the phases this depends on, if they still exist.

## Goal

Under reduced motion, stop movement (position, size, shape, ripples, length and number token tweens) but keep color, opacity, and elevation fades and color token tweens.

## Scope

- `packages/preset/src/components/shared.ts`: `STATE_TWEENS` (colors and elevation) always
  run; `tweens(...)` gates only the moving properties it's given; shape morphs gate only
  `clip-path`. Update every component that used `when("reducedMotion", none, …)` on a
  whole transition.
- `packages/rn-adapter`: Animated token tweens check the token's `valueType` and skip only
  lengths, angles, numbers, and percentages under reduced motion.
- The provider's `motion="system" | "reduce" | "full"` setting and `data-pf-motion` are
  binding work (p2a, p2b, p8); here, only make the lowering able to express the
  `[data-pf-motion]` override, or leave a stub the bindings fill.

## Notes

Touches `shared.ts`, which p1c also uses through `tweens("left")`; coordinate if both run at once.

## Done when

- Fixtures: under reduced motion, computed `transition` keeps color properties and drops
  moving ones, in Chromium; React Native selection drops the same.
- Unit tests and build pass.

## Output context (required)

When done, write `/tmp/opencode/p1b.md` (not committed) in the format of
[conventions](../conventions.md#finishing-the-output-context-required), and tick this phase in the [roadmap](../README.md). It must cover at least:

- Which helpers changed (`STATE_TWEENS`, `tweens`, morph transitions) and their new
  behavior.
- What the bindings must do for `motion` and `data-pf-motion`.
