# c2: Splits and actions

**Depends on:** c1 and r1 (c2c needs the chip's morph tokens; c2e and c2f need the button and
menu parts and the shared position-corner helper). **Subphases:** c2a to c2f, parallel.
**Gap analysis:** §4.0, §2.1, §2.2, §2.3.

## Read first

The r1 context (what to reuse), gap analysis §4.0 (draft anatomies), and the c1 contexts
for the parts these build on.

## c2a: Tooltip and rich tooltip

Split `tooltip` into `tooltip` (plain: `root`, optional `caret`, `supportingText`; zag
`tooltip`) and `richTooltip` (`root`, `caret`, `subhead`, `supportingText`, `actions`; zag
`popover` or `hover-card`). **Remove** the `tooltip`'s `variant` group (`plain`, `rich`) and
its `subhead` and `actions` parts. Why: rich tooltips aren't deprecated in M3, they moved to
their own component, so `richTooltip` replaces the variant. Keeping an alias would leave
parts on `tooltip` that only one variant uses. Update the demos, suites and fixtures that
use `variant: "rich"`, and note the breaking change in the commit. Own files: `tooltip.ts`, a new
`rich-tooltip.ts`, `packages/machines/src/tooltip.ts`, bindings.

## c2b: Dialog and full-screen dialog

`fullscreenDialog`: `root`, `header`, `closeTrigger`, `headline`, `confirmAction`, `body`; zag
`dialog`; fills the screen. Own files: `dialog.ts` (small, shared parts only), a new
`fullscreen-dialog.ts`, the dialog machine, bindings. The `scrim` is already a component.

## c2c: Input chip and tags input

`inputChip`: `root`, `avatar`, `icon`, `label`, `remove`, `touchTarget`, with the morph from
c1d. A tags-input field built on zag `tags-input` that composes it (text field parts for the
field). Own files: new `input-chip.ts`, a tags-input component and machine, bindings. One
subphase: the chip has no use without the field.

## c2d: Badge

`badge`: small (dot) and large (label), `size` variant; styling only. Place it against an
existing part: check that `icon`, `indicator` and `tabContent` are positioning contexts in
nav bar, rail and tabs (gap analysis §5.5). Own files: new `badge.ts`, and the positioning
fix in the nav and tabs presets (small, listed in the context).

## c2e: Button group

`buttonGroup`: `root`; children are buttons or icon buttons. `connected` variant (inner
corners change; covers the deprecated segmented button), width change on press, selectable
through zag `toggle-group` (this is also Angular's button toggle). Own files: new
`button-group.ts`, the machine, bindings.

## c2f: Split button and FAB menu

One subphase: both are a button plus a zag `menu`.

- `splitButton`: `root`, `leadingButton`, `trailingButton`, `trailingIcon` (rotates when
  open).
- `fabMenu`: `root`, `closeTrigger`, `item`, `itemIcon`, `itemLabel`.
- Own files: new `split-button.ts`, `fab-menu.ts`, their machines (shared menu wiring),
  bindings.
- Hints: the menu-trigger wiring both share.

## Shared files

Registration files for each new component. Merge order: c2a, c2b, c2c, c2d, c2e, c2f.

## Done when

As for c1. Plus: `tooltip` has no `rich` variant or rich-only parts left, and the new components pass
the direction and indication suites.
