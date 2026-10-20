# r4: Refactor after c4

**Depends on:** c4. **Single agent.** Follow the
[refactor procedure](../conventions.md#refactor-phases).

## Expected duplication to look for

- **Bar containers:** app bar (c4b), toolbar (c4c), navigation bar and bottom sheet chrome:
  container colour, elevation, scrolled colours, element spacing.
- **Shape and path morph:** loading indicator and wavy progress (c4a), the button's corner morph.
- **Scroll and overflow behaviour** in app bar, toolbar and tabs (scrollable tabs are c7).
- **Item sizing** in carousel and list.

## Done when

As for r1, with `context/r4.md` for c5's authors.
