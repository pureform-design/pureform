# r3: Refactor after c3

**Depends on:** c3. **Single agent.** Follow the
[refactor procedure](../conventions.md#refactor-phases).

## Expected duplication to look for

- **Modal chrome:** sheets (c3b), full-screen dialog (c2b), the modal rail (c1e) and search
  view (c3c): scrim, focus trap, presence animation, container shape.
- **Combobox and select:** field, listbox and menu parts shared by autocomplete (c3c) and select.
- **Notification colours and placement** between snackbar and toast (c3a).
- **Drag handle** use in sheets (c3b) and anywhere else.

## Done when

As for r1, with `/tmp/opencode/r3.md` for c4's authors.
