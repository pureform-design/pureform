# r2: Refactor after c2

**Depends on:** c2. **Single agent.** Follow the
[refactor procedure](../conventions.md#refactor-phases).

## Expected duplication to look for

- **Menu-trigger wiring:** split button and FAB menu (c2f) against the menu binding.
- **Popup chrome:** tooltip, rich tooltip, menu and dialog surfaces (elevation, shape, caret
  placement).
- **Group layouts:** button group (c2e) and the chip set or tags field (c2c) lay out and
  coordinate their children.
- **Chip morph:** the input chip (c2c) against the filter chip (c1d) after r1.
- **Binding wrappers** for the new components.

## Done when

As for r1, with `/tmp/opencode/r2.md` telling c3's authors what to reuse.
