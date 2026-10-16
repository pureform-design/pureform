# p1a: Match states on native, then ARIA, then data-pf

**Depends on:** nothing  
**Runs in parallel with:** p1b, p1c, p1d, p1e, p1f, p1g, p1h

Follow the [conventions](../conventions.md), and use the omni MCP as much as possible ([how](../conventions.md#use-the-omni-mcp-first)).

## Read first

- Design doc: §5.1 ("How the web matches a state" and the review table), §9.2, §9.5 ([doc](../../design/component-architecture.md)).
- The output contexts of the phases this depends on, if any.

## Goal

Rework how the web lowers interaction and form states, so styling never depends on Zag's `data-*` attribute names.

## Scope

- `packages/css-lowering/src/conditions.ts`: rewrite the condition table and the slot-state
  table to the design's review table: native pseudo-class, then ARIA, then only
  `data-pf-hover`, `data-pf-active`, `data-pf-dragging`, `data-pf-filled`. Make the two
  tables agree (today `pressed` is `[data-active]` in one and `[data-pressed]` in the
  other; the `disabled` slot state lacks `aria-disabled`).
- `packages/panda-adapter`: pureform's recipes stop using Panda's built-in state keys
  (`_hover`, `_checked`, …) and emit the same selectors as the other targets. An app's own
  `_hover` keeps Panda's meaning.
- Export the attribute names as constants (for example from `@pureform/core` or
  `css-lowering`) so bindings set exactly what the CSS matches.
- Update specs and snapshots in `css-lowering`, `panda-adapter`, `css-adapter`,
  `tailwind-adapter`, and `preset`.

## Notes

Output changes on purpose, so the before-and-after equivalence check doesn't apply. Preset snapshots also change in p1b, p1c, and p1d: land one at a time and regenerate snapshots after rebasing.

## Done when

- Fixture tests in Chromium: for each state, an element marked each allowed way matches,
  and an element carrying only Zag's attributes (`data-state="checked"`, `data-active`,
  `data-hover`, `data-readonly`, …) does not.
- Full build and unit tests pass; the CSS size change is recorded in the commit.

## Output context (required)

When done, write `docs/roadmap/context/p1a.md` in the format of
[conventions](../conventions.md#finishing-the-output-context-required), commit it with
the work, and tick this phase in the [roadmap](../README.md). It must cover at least:

- The final selector per state and target.
- The exported attribute-name constants and where they live: phases p2a and p2b set them.
- Any state that couldn't follow the rule, and why.
