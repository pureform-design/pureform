# c9: Components beyond M3

**Depends on:** c8. **Subphases:** c9a to c9e, parallel.
**Source:** [next.md §4](../next.md#no-m3-component-ranked-by-usefulness), ranks 1 to 7.

Components M3 doesn't specify, built with the Material guidelines and pureform's existing parts,
tokens and anatomy, each backed by a Zag machine where one exists. Each follows the component
recipe, in React, Solid and React Native, on the css, panda and tailwind targets. Record in each
context where the design is pureform's own rather than M3's, as c6 did.

## c9a: NumberField and CodeField

Both are text fields (filled and outlined, the field's label, supporting text and error).

- **NumberField** (Zag's `number-input`): increment and decrement icon buttons; min, max, step;
  clamping on blur; locale formatting and parsing; press-and-hold repeat; the `spinbutton`
  role. Not to be confused with `Stepper`, the step-by-step wizard.
- **CodeField** (Zag's `pin-input`): a row of single-character cells for verification and
  one-time codes; paste of a whole code, focus moving between cells, backspace to the previous
  cell, `autocomplete="one-time-code"`, masked entry for PINs.
- Own files: `number-field.ts`, `code-field.ts`, machines, bindings.

## c9b: FileUpload

- Zag's `file-upload`: a drop zone with drag-over state, a trigger button, the hidden input
  reachable by keyboard, accepted types and size limits, and a file list with per-file errors
  and remove buttons.
- The list reuses list items (or input chips) and progress for uploads the app reports.
- Own files: `file-upload.ts`, machines, bindings.

## c9c: Popover

- Zag's `popover`: an anchored, non-modal panel for filters and small forms, with a title,
  body and actions. Closes on an outside press and Escape, returns focus to its trigger,
  optional modal mode.
- Surface and motion from the rich tooltip and m2's popup spring; positioning from the menu.
  Distinct from `RichTooltip`, which holds text and opens on hover or focus.
- Own files: `popover.ts`, machines, bindings.

## c9d: ColorPicker

- Zag's `color-picker`: an area for saturation and lightness (or M3's HCT tone and chroma, if
  it fits `@pureform/material`'s colour tools; record the choice), hue slider, optional alpha,
  a text field for the value, swatches, and the eye dropper where the platform has one.
- Uses the slider and text field; fits pureform's seed-based theming (a demo theme builder).
- Own files: `color-picker.ts`, machines, bindings.

## c9e: CopyButton and Rating

Small controls over existing parts.

- **CopyButton** (Zag's `clipboard`): an icon button that copies a value and confirms it (the
  icon swaps to a check, with a tooltip or snackbar); React Native uses the platform clipboard.
- **Rating** (Zag's `rating-group`): star icon buttons with radio-group keyboard behaviour,
  half values, read-only display, and a label.
- Own files: `copy-button.ts`, `rating.ts`, machines, bindings.
