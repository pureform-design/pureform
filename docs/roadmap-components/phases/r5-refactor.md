# r5: Refactor after c5

**Depends on:** c5. **Single agent.** Follow the
[refactor procedure](../conventions.md#refactor-phases).

## Expected duplication to look for

- **Picker chrome:** headline, mode switch, actions row, container shape and elevation shared
  by date picker, time picker, dialog and full-screen dialog.
- **Field composition:** text-field parts used by date input, time input and tags input.
- **Selection state:** selected, range and today styling in the calendar against the list and
  tab selection styles.

## Done when

As for r1, with `/tmp/opencode/r5.md` for c6's authors.
