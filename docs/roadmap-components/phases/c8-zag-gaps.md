# c8: Material gaps from Zag

**Depends on:** m2 (sheet springs and the drag settle). **Subphases:** c8a to c8c, parallel.
**Source:** [next.md §4](../next.md#4-zag-components-we-havent-ported-checked-2026-10-22).

Three M3 behaviours pureform lacks that a Zag machine can back. Each follows the component
recipe, the guidelines and the [native scrolling](../conventions.md#native-scrolling) rule, in
React, Solid and React Native, on the css, panda and tailwind targets.

## c8a: Bottom sheet partly-open state

- M3's bottom sheet can rest partly open and drag between partly and fully open (Compose's
  `SheetValue.PartiallyExpanded`, `skipPartiallyExpanded`). Ours is only open or closed today:
  a drag down past a quarter of its height closes it.
- Back it with Zag's `drawer` (snap points), or add snap points to the current sheet if the
  drawer machine doesn't fit the dialog-based Root; record the choice.
- The settle between snap points uses m2b's sheet springs (`SHEET_SETTLE`, React Native's
  `settle()` with the release velocity).
- Scrolling content inside a fully open sheet scrolls natively; the sheet doesn't take over the
  scroll.
- Own files: `sheet.ts`, `bottom-sheet.ts`, the bottom sheet machine and bindings.

## c8b: Context menu trigger

- Open the existing Menu from a right-click or long-press on an element, placed at the
  pointer (Zag's `menu` context trigger, `getContextTriggerProps`).
- An option on Menu's Root, not a new component; submenus and groups work as in a triggered
  menu. Keyboard: the context menu key and Shift+F10.
- React Native: long-press opens it at the touch point.
- Own files: `menu.ts` (only if a part changes), the menu machine and bindings.

## c8c: Resizable panes

- Panes separated by the vertical `DragHandle` that resize by drag and keyboard (Zag's
  `splitter`), as in M3's adaptive list-detail layouts (Compose's `VerticalDragHandle` with
  `ThreePaneScaffold`'s pane expansion).
- Snap to M3's anchors where Compose has them (record the source); minimum pane widths.
- Own files: a new `pane` or `splitter` component, `drag-handle.ts` (only if a part changes),
  machines and bindings.
