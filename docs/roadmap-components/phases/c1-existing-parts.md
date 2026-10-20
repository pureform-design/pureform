# c1: Parts and variants on existing components

**Depends on:** c0 (c0b drift test for c1g and c1a; c0c shape allow-list for c1b).
**Subphases:** c1a to c1g, parallel. **Gap analysis:** §2, §0.1.

Everything here adds parts or variants to components we already have. List and menu rows are
one subphase (c1c) and button and chip are one (c1d) because they share structure and tokens.

## Read first

Guidelines §3 and §4, the gap analysis §2.1 to §2.5, the c0 contexts, and the existing
preset file of each component.

## c1a: Text field, text area, select

- Add parts `prefixText`, `suffixText`, `counter` (shown once the label floats; the counter
  turns error colour on overflow). Fix the machine anatomy (drift). Secure (password) variant:
  trailing icon toggles visibility.
- Own files: `text-field.ts`, `text-area.ts`, `select.ts`, `field.ts` in the preset;
  `packages/machines/src/text-field`; bindings for those components.
- Select also gets option groups only in c1c (they need the menu's group parts); leave a
  hook.
- Hints to leave: how the affixes and counter are shared between the three, and what `field.ts`
  would need to own them.

## c1b: Progress

- Linear: `track` part separate from `root`, `stopIndicator` (determinate), the indicator-to-
  track gap. Circular: `track` with a gap. Keep `thickness`. Wavy is c4a.
- The circular indicator is the shape exception (guidelines §5.1): its arcs draw from their own
  tokens, listed on c0c's allow-list.
- Own files: `progress.ts` and its bindings.
- Hints: track and gap geometry other components (slider) reuse.

## c1c: List and menu rows

One subphase: they share `list.ts`'s `rowParts`.

- **List:** a `list` container (padding, colour, root for selection), standard and segmented
  `variant` (corners by position), `leading` type (icon, avatar 40, thumbnail 56, video
  114×64). Row height follows its lines.
- **Menu:** `itemSupportingText`, `itemGroup`, `itemGroupLabel` (groups are shaped per
  position, like segmented lists), selectable and toggleable item state, and a `vibrant`
  colour variant. Select reuses the groups for option groups.
- Own files: `list.ts`, `list-item.ts`, `menu.ts`, `select.ts` (groups only), bindings for
  list, listItem, menu, select; `packages/machines/src/menu.ts` (zag menu groups).
- Hints: the position-corner helper, written once for list and menu (r1 moves it to shared).

## c1d: Button and chip

One subphase: they share the shape-morph and toggle tokens.

- **Button:** optional `secondaryIcon` part (start or end), with its own spacing.
- **Chip:** `trailingIcon` part (filter dropdown arrow), `corner` and shape morph on
  selection for filter chips (same `square`/`toggles` flags as the button; the input chip's
  morph comes with c2c).
- Own files: `button.ts`, `chip.ts`, `shared.ts` (only if a flag helper is missing), their
  bindings and machines (`packages/machines/src/button`).
- Hints: tokens and helpers copied between button and chip (name them).

## c1e: Navigation

- **Bar:** `itemLayout` (vertical, horizontal). **Rail:** `header` part (menu button and FAB
  slot), `expanded` variant, `modal` variant (the binding wraps it in zag `dialog` and the
  scrim). Both need the label inside the active pill: restructure so the pill (`indicator`)
  can hold it, or use a different indication surface per layout. Use c0a's label colours.
- Own files: `navigation.ts`, `navigation-bar.ts`, `navigation-rail.ts`, their machines
  (`packages/machines/src/navigation`) and bindings. Section labels for the expanded rail
  are c7.
- Hints: the pill and item structure shared by bar and rail.

## c1f: Snackbar layout

- Two-line layout and long action below (an actions wrapper part, since the style AST has no
  `flexWrap`), optional close icon. The queue is c3a.
- Own files: `snackbar.ts`, `packages/machines/src/snackbar`, bindings.

## c1g: Slider on zag

Largest item; one agent.

- Replace our slider machine with zag `slider`. Add parts: value indicator, `markerGroup`
  and `marker` (stops), range (two handles), `centered`, vertical `orientation`. Keep
  `handleShape` (bar and the deprecated round) and the sizes. Inset icon is c7.
- Own files: `slider.ts`, `packages/machines/src/slider`, bindings. Update the machine
  anatomy to the preset's six parts plus the new ones (c0b's test).
- Hints: the stop indicators and track pieces shared with progress (c1b).

## Shared files

Registration files only for new parts' exports. Merge order: c1a, c1b, c1c, c1d, c1e, c1f,
c1g. c1a and c1c both touch `select.ts`: c1a owns the affixes, c1c only the group part; merge
those two by hand and record it.

## Done when

Each subphase passes the guidelines checklist, its parts exist in preset, anatomy, machine and
bindings, deprecated options still work, and the context lists hints. The phase gate passes.
