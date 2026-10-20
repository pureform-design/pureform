# c6: Angular Material parity

**Depends on:** r5 (reuses `listItem`, `select`, `iconButton`, the button group, the side
sheet). **Subphases:** c6a to c6e, parallel. **Gap analysis:** §1.9.

M3 doesn't specify these, so there is no Android anatomy. Take parts from Angular's own M3
token sets and zag's part lists, make the design calls, and record them in each context. They
follow the same guidelines as everything else: M3 colour roles, shape roles, type styles, the
theme's density, direction, motion and indication, static and dynamic. Don't copy Angular's
code or styles; read the docs and token names (guidelines §1).

## Read first

The r5 context; Angular Material's docs and M3 token lists for each component; zag's part
lists.

## c6a: Accordion and tree

One subphase: both are expandable hierarchies built from list item parts, an expand icon and
nested groups.

- `accordion`: zag `accordion` (and `collapsible`); panel header, content; also the base of
  expandable list items (c7b).
- `tree`: zag `tree-view`; nodes use `listItem` parts, expand icon in `trailing`, nested group
  indented (logical inline padding).
- Own files: new `accordion.ts`, `tree.ts`, machines, bindings.

## c6b: Stepper

zag `steps`; horizontal and vertical; step header (index or icon, label, optional text),
connector, content; states (active, completed, error, editable). Own files: new `stepper.ts`,
machine, bindings.

## c6c: Paginator

zag `pagination`; range label, page-size `select`, previous and next (and first and last)
icon buttons. Own files: new `paginator.ts`, machine, bindings.

## c6d: Table and sort header

Own component, no zag machine: header, row, cell, footer, sort arrow with direction state,
optional selection column (`checkbox`), sticky header, density, zebra and hover states. Our
own machine for sort and selection state. Own files: new `table.ts`, machine, bindings.

## c6e: Grid list

Layout only: columns, gutter, tile aspect, optional tile header and footer. No machine.
Own files: new `grid-list.ts`, bindings. Small; the same agent may finish it early and help
with c6d's tests.

## Shared files

Registration files. Merge order: c6a, c6b, c6c, c6d, c6e.

## Done when

As for c1, plus: every component is keyboard-operable per its ARIA pattern, and the table
handles right to left and density.
