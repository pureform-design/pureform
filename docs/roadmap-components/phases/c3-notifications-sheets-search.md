# c3: Notifications, sheets, search

**Depends on:** c2 and r2 (c3b needs the dialog split; c3c needs the text field parts from c1a
and the search bar). **Subphases:** c3a to c3c, parallel. **Gap analysis:** §4.1, §1.2 to §1.5.

## Read first

The r2 context, gap analysis §4.1 and §4.0, and the c1a, c1f and c2b contexts.

## c3a: Snackbar queue and toast

One subphase: both are notifications that share one notify API and the colour tokens.

- **Snackbar:** a queue on our own machine (one at a time, others wait), placement above the
  FAB or navigation bar. Keep the anatomy.
- **Toast:** new, outside M3, on zag `toast`: `group`, `root`, `icon`, `title`, `description`,
  `actionTrigger`, `closeTrigger`, and a `type` variant (success, error, warning, info,
  loading). Error uses M3's error colours; **success and warning need colour roles M3 doesn't
  have**: add them as theme colour tokens (static and dynamic themes must both set them) and
  record the decision.
- Own files: `snackbar.ts`, a new `toast.ts`, `packages/machines/src/snackbar`, a toast
  machine wrapper, bindings.

## c3b: Bottom sheet and side sheet

One subphase: same parts and the same modal behaviour.

- `bottomSheet`: `root`, `dragHandle`, `content`; standard and `modal` (scrim and focus trap);
  zag `drawer` (beta) or `dialog`. `sideSheet`: `root`, optional `header`, `backButton`,
  `actions`; standard, `modal`, `coplanar`; zag `dialog`/`presence`.
- A standalone `dragHandle` part is shared with sheets and any pane.
- Own files: new `bottom-sheet.ts`, `side-sheet.ts`, machines, bindings.

## c3c: Search view and autocomplete

One subphase: both are zag `combobox`.

- `searchView`: `root`, `header`, `leading`, `input`, `trailing`, `divider`, `content`;
  `variant` full-screen, docked, contained (contained animates the icons around the bar
  outward). `searchBar` gets scrolled colours when used in an app bar (c4b).
- Autocomplete: the select's field with an editable input (combobox), reusing the field parts
  and the menu's group and item parts.
- Own files: new `search-view.ts`, `autocomplete.ts`, a combobox machine wrapper,
  `search-bar.ts` (small), bindings.

## Shared files

Registration files. Merge order: c3a, c3b, c3c.

## Done when

As for c1. Plus: queue order and timing tests for the snackbar, themes set success and warning
colours (static and dynamic), and sheets and search view trap focus and restore it.
