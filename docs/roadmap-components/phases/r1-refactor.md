# r1: Refactor after c1

**Depends on:** c1 (all subphases merged). **Single agent.**

c1's subphases built side by side. Follow the
[refactor procedure](../conventions.md#refactor-phases).

## Expected duplication to look for

These are likely, not certain; the hints say what really happened.

- **Position-based corners:** segmented list items (first, middle, last, single) in c1c, menu
  groups in c1c, and later the connected button group (c2e). One helper that picks corners
  by position, in `shared.ts` or `shaped.ts`.
- **Shape morph and toggle corners:** the button's `corner`, `toggle` and `pressedRadius` (done)
  against the chip's morph (c1d). One set of tokens and a `blend` helper used by both.
- **Field affixes:** `prefixText`, `suffixText`, `counter` across `textField`, `textArea`
  and `select` (c1a).
- **Track and indicator geometry:** the progress track gap and stop indicator (c1b) against the
  slider's stop indicators and active track (c1g).
- **Binding wrappers:** repeated part wiring for optional parts (`secondaryIcon`,
  `trailingIcon`, `caret`-like parts) in binding-core and the three bindings.

## Done when

The refactor's context lists what was extracted and where, the output is identical (fixtures,
screenshots, resolved styles), the gate passes, and `/tmp/opencode/r1.md` says what the next wave
should reuse.
