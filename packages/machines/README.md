# @pureform/machines

Framework-free behavior for pureform's components: Zag.js's machines, re-exported, and
pureform's own machines in Zag's shape, plus the form helpers every binding wires in. A
binding (`@pureform/solid`, `@pureform/react`) takes a machine from here, runs it with its
framework's Zag adapter, and spreads the part props `connect` returns on its elements. Nothing
here imports a framework.

It depends on Zag's framework-free packages (`@zag-js/core`, `anatomy`, `dom-query`, `types`,
`utils`, `collection`, and the `checkbox`, `switch`, `radio-group`, `select`, `menu`, `dialog`,
`tooltip`, `tabs`, `toggle-group`, and `presence` machines), on `@pureform/js-effects` for the ripple, and on
`@pureform/binding-core/interaction` for the interaction source its machines emit to. The bindings
depend on it.

## Architecture

```
@zag-js/checkbox, switch, radio-group, ──re-exported─┐
  select, menu, dialog, tooltip, tabs, presence      │
own machines (button, ripple, text field,            ├──► @pureform/machines ──► bindings:
  snackbar, navigation, slider) ────── Zag's shape ─┤                         useMachine(machine, props)
                                                     │                         connect(service, normalize)
form helpers (native defaults, reset, fieldsets) ────┘                         spread part props

machine ──emit──► InteractionSource (props.interactionSource / itemInteractionSource(value))
```

Every machine, Zag's or ours, is a namespace with the same members:

| Member                | What it is                                                                |
| --------------------- | ------------------------------------------------------------------------- |
| `machine`             | the Zag machine (`createMachine` from `@zag-js/core`)                     |
| `connect`             | `(service, normalize) => Api`: the state and each part's props            |
| `anatomy`             | Zag's anatomy (`data-scope`, `data-part` per part)                        |
| `props`, `splitProps` | the machine's prop names, and a splitter for a component's props          |
| `Props`, `Api`, …     | the types: `Props`, `Api`, `Machine`, `Service`, `ElementIds`, and others |

Our own machines keep controllable state the way Zag does (its `bindable`): a prop that isn't
`undefined` controls the state, its `default*` prop is read at the start, and the change
callback reports user actions only, with a details object.

| Module                                                    | What it does                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `button/`                                                 | Press, focus, hover, and an optional toggle (`selected`).                                                                                                                                                                                                                                                    |
| `ripple/`                                                 | The ripple of `@pureform/js-effects`, run as a machine.                                                                                                                                                                                                                                                      |
| `text-field/`                                             | The text field and text area: value, focus, fieldsets, and validation (`error`, `validate`).                                                                                                                                                                                                                 |
| `time-picker/`                                            | The time picker and time input (one machine, no Zag one): the time as `HH:mm`, the view the dial sets, 12/24-hour from the locale, the dial as a slider a pointer drags; `time-picker.time.ts` is the arithmetic React Native shares.                                                                        |
| `paginator/`                                              | Zag's pagination behind the paginator: a root `group`, parts for the page-size group, label and select, the range label (a live region) and the actions, and a page size change that keeps the page's first item shown.                                                                                      |
| `snackbar/`                                               | The snackbar (parts include the `actions` wrapper): `open`, closing itself after `duration` unless held by the pointer or focus; `createQueue`, the queue that shows one at a time.                                                                                                                          |
| `navigation/`                                             | The navigation bar and rail: `value`, the current destination, marked with `aria-current`; the rail's `header` part (`getHeaderProps`).                                                                                                                                                                      |
| `menu.ts`, `tabs.ts`                                      | Zag's machines, re-exported, emitting each item's interactions to its source; the menu's `getItemGroupProps` also takes `first`/`last`, an override of the bindings' own marking (`data-first`/`data-last`, with `data-pf-first`/`data-pf-last` saying it was given).                                        |
| `dialog.ts`                                               | Zag's dialog, re-exported; its dismissable layer doesn't mirror the dialog's layer onto the backdrop and positioner (no forced style read).                                                                                                                                                                  |
| `toast/`                                                  | Zag's toast (store, group and toast machines), with the `icon` part pureform's toast adds.                                                                                                                                                                                                                   |
| `carousel/`                                               | Zag's carousel with `mask` and `content` parts: items size themselves and each snap, the arrow keys move focus by direction, and `reducedMotion` scrolls at once.                                                                                                                                            |
| `accordion/`, `tree-view/`                                | Zag's accordion and tree view: each header or row emits to its item's interaction source; a branch's control also carries `aria-expanded`, `aria-current` and `aria-disabled` for the row's styles                                                                                                           |
| `stepper/`                                                | Zag's steps with `label` and `caption` parts: a row is a tab list (only the current header is a tab stop) and a column a list of disclosure buttons; the arrow keys, Home and End move focus between the headers, by direction; `invalid` and `disabled` headers; a done step's indicator is `aria-checked`. |
| `avatar/`                                                 | Zag's avatar, re-exported: `Image` shows once the picture has loaded, `Fallback` until then and when it fails.                                                                                                                                                                                               |
| `color-picker/` | Zag's color picker, re-exported with a `valueSwatch` part: an area over two channels, channel sliders and inputs, swatches and the eye dropper. `parse` reads a CSS color. Only from `@pureform/machines/color-picker`, not the root. |
| `splitter/`                                               | Zag's splitter, re-exported: panes sized in percent, resized by dragging the divider or the arrow keys on it. The bindings snap a drag to anchors.                                                                                                                                                           |
| `popover.ts`                                              | Zag's popover, re-exported unchanged.                                                                                                                                                                                                                                                                        |
| `tooltip.ts`                                              | Zag's tooltip, re-exported unchanged.                                                                                                                                                                                                                                                                        |
| `button-group.ts`                                         | Zag's toggle group behind a selectable button group: the root is a `group` and every item a toggle button with `aria-pressed`.                                                                                                                                                                               |
| `selection-list.ts`                                       | Zag's listbox behind the selection list: the highlighted option hovers on its interaction source while the list has focus, the highlight clears on blur, and a disabled list leaves the tab order. The chip set reuses `button-group.ts`.                                                                    |
| `presence.ts`                                             | Zag's presence, re-exported; keeps an overlay mounted until its exit animation ends, and only the exit's own animations end it.                                                                                                                                                                              |
| `slider/`                                                 | Zag's slider under the preset's part names: thumbs, range, stops, value indicator, fieldsets.                                                                                                                                                                                                                |
| `number-input/`                                           | Zag's number input, re-exported with the number field's parts (`container`, the icons and affixes, `supportingText`): a `spinbutton` stepped by the arrow keys and the triggers (press and hold repeats), clamped on blur, parsed and formatted in the locale. |
| `pin-input/`                                              | Zag's pin input, re-exported with the code field's `supportingText`: a cell per character, paste of a whole code, focus moving between cells, `otp` and `mask`.                                                                                                |
| `file-upload/`                                            | Zag's file upload as it is, with the preset's `icon`, `headline`, `supportingText` and `error` parts drawn only: a dropzone button that takes drops, a trigger, a hidden input, and a list of accepted and rejected files.                                                                                   |
| `tags-input/`                                             | Zag's tags input, with the field's `container` and an input chip per value (`getChipProps`, `getChipItemProps`, `getChipLabelProps`, `getChipRemoveProps`); not editable in place by default; the highlighted chip hovers.                                                                                   |
| `combobox/`                                               | Zag's combobox, its highlighted suggestion hovering and Enter (not Space) pressing it; `anatomy` (the autocomplete's parts) and `searchViewAnatomy`. The autocomplete and the search view run on it.                                                                                                         |
| `date-picker/`                                            | Zag's date picker, re-exported, with `anatomy` (the modal picker's parts), `dockedAnatomy`, `cellAnatomy` (`calendarCell`) and `toISO(value)`. The modal and docked date pickers run on it.                                                                                                                  |
| `date-input/`                                             | Zag's date input (beta), re-exported, with the date input's parts.                                                                                                                                                                                                                                           |
| `checkbox.ts`, `switch.ts`, `radio-group.ts`, `select.ts` | Zag's machines, re-exported, emitting to an interaction source; all but the checkbox's with pureform's form rules.                                                                                                                                                                                           |
| `zag-form.ts`                                             | `withFieldsetRule`: a Zag machine's fieldset tracking swapped for pureform's, and its reset dropped.                                                                                                                                                                                                         |
| `interaction/`                                            | How machines emit to an interaction source: an emitter per surface, Zag machines wrapped (`withInteraction`), handlers chained after Zag's.                                                                                                                                                                  |
| `form/`                                                   | Native defaults, form reset, and disabled fieldsets.                                                                                                                                                                                                                                                         |
| `testing/`                                                | The test harness: runs a machine with Zag's vanilla adapter. Not exported.                                                                                                                                                                                                                                   |

## Public API

| Import                              | Exports                                                                                                                                                                                                                                                |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@pureform/machines`                | the namespaces below, the form helpers, Zag's `Machine`, `Service`, `PropTypes`, `NormalizeProps` types, and `InteractionProps`, `ItemInteractionProps`                                                                                                |
| `@pureform/machines/button`         | `button`'s members                                                                                                                                                                                                                                     |
| `@pureform/machines/checkbox`       | `@zag-js/checkbox`                                                                                                                                                                                                                                     |
| `@pureform/machines/switch`         | `@zag-js/switch` (the `switchControl` namespace at the root), its `machine` with pureform's form rules                                                                                                                                                 |
| `@pureform/machines/radio-group`    | `@zag-js/radio-group` (`radioGroup` at the root), its `machine` with pureform's form rules                                                                                                                                                             |
| `@pureform/machines/select`         | `@zag-js/select` (`select` at the root, `collection` included), its `machine` with pureform's form rules and derived selected items                                                                                                                    |
| `@pureform/machines/menu`           | `@zag-js/menu` (`menu` at the root)                                                                                                                                                                                                                    |
| `@pureform/machines/dialog`         | `@zag-js/dialog` (`dialog` at the root), its `machine` without the layer mirrored onto the backdrop and positioner                                                                                                                                     |
| `@pureform/machines/tooltip`        | `@zag-js/tooltip` (`tooltip` at the root)                                                                                                                                                                                                              |
| `@pureform/machines/button-group`   | `@zag-js/toggle-group` (`buttonGroup` at the root), its `connect` making the root a `group` and each item a toggle button (`aria-pressed`) in single mode too                                                                                          |
| `@pureform/machines/selection-list` | `@zag-js/listbox` (`selectionList` at the root), its options emitting to their interaction sources                                                                                                                                                     |
| `@pureform/machines/presence`       | `@zag-js/presence` (`presence` at the root), its `machine` ending an exit only on the exit's own animations                                                                                                                                            |
| `@pureform/machines/tabs`           | `@zag-js/tabs` (`tabs` at the root)                                                                                                                                                                                                                    |
| `@pureform/machines/snackbar`       | `snackbar`'s members                                                                                                                                                                                                                                   |
| `@pureform/machines/toast`          | `@zag-js/toast` (`toast` at the root: `createStore`, `group`, `machine`), with an `icon` part in `anatomy` and `getIconProps` in `connect`                                                                                                             |
| `@pureform/machines/carousel`       | `@zag-js/carousel`, with `getMaskProps`/`getContentProps`, a `reducedMotion` prop, and no style reads as it starts                                                                                                                                     |
| `@pureform/machines/avatar`         | `@zag-js/avatar` (`avatar` at the root)                                                                                                                                                                                                                |
| `@pureform/machines/color-picker` | `@zag-js/color-picker`, with `valueSwatch` in `anatomy` |
| `@pureform/machines/splitter`       | `@zag-js/splitter` (`splitter` at the root)                                                                                                                                                                                                            |
| `@pureform/machines/accordion`      | `@zag-js/accordion`, each item's header emitting to its interaction source                                                                                                                                                                             |
| `@pureform/machines/tree-view`      | `@zag-js/tree-view`, each row emitting to its source, a branch's control marked as its treeitem                                                                                                                                                        |
| `@pureform/machines/stepper`        | `@zag-js/steps`, with `getLabelProps`/`getCaptionProps`, `getTriggerProps({ index, invalid, disabled })` and the headers' keys                                                                                                                         |
| `@pureform/machines/navigation`     | `navigation`'s members                                                                                                                                                                                                                                 |
| `@pureform/machines/ripple`         | `ripple`'s members                                                                                                                                                                                                                                     |
| `@pureform/machines/text-field`     | `textField`'s members                                                                                                                                                                                                                                  |
| `@pureform/machines/time-picker`    | `timePicker`'s members, and the time arithmetic (`parseTime`, `stepTime`, `dialLabels`, `timeAtPoint`, `localeHourCycle`, …)                                                                                                                           |
| `@pureform/machines/paginator`      | `paginator`'s members (Zag's pagination, wrapped), and `pageAfterSize`                                                                                                                                                                                 |
| `@pureform/machines/table`          | `table`'s members (own machine: the sort and the chosen rows), and the arithmetic React Native shares (`nextSort`, `ariaSort`, `sortRows`, `compareValues`, `toggleRow`, `toggleAll`, `selectAllState`)                                                |
| `@pureform/machines/slider`         | `slider`'s members (Zag's slider, wrapped)                                                                                                                                                                                                             |
| `@pureform/machines/number-input`   | `@zag-js/number-input` (`numberInput` at the root)                                                                                                                                                                                                     |
| `@pureform/machines/pin-input`      | `@zag-js/pin-input` (`pinInput` at the root)                                                                                                                                                                                                           |
| `@pureform/machines/tags-input`     | `tagsInput`'s members (Zag's tags input, wrapped)                                                                                                                                                                                                      |
| `@pureform/machines/combobox`       | `combobox`'s members (Zag's combobox, wrapped)                                                                                                                                                                                                         |
| `@pureform/machines/form`           | the form helpers                                                                                                                                                                                                                                       |
| `@pureform/machines/interaction`    | `InteractionEmitter`, `InteractionEmitters`, `claimEvent`, `pointerKind`, `isFocusVisible`, `withInteraction`, `chainProps`, `emittersOf`, `rovingIndex`: emitting to an interaction source from a machine of your own (or React Native's `Pressable`) |

```ts
import { button } from "@pureform/machines";
// or: import * as button from "@pureform/machines/button";

const service = useMachine(button.machine, {
    id,
    defaultSelected: false,
    onSelectedChange: ({ selected }) => save(selected),
});
const api = button.connect(service, normalizeProps);
// <button {...api.getRootProps()}><span {...api.getIconProps()} /><span {...api.getLabelProps()} /></button>
```

The switch's namespace is `switchControl`, since `switch` can't be an import name; it matches
the preset's component name.

**The switch's, radio group's, and select's machines** are Zag's with one effect replaced
(`withFieldsetRule`): `trackFormControlState` follows the fieldsets around the native input (the
switch), the group element (the radio group), or the hidden native select (the select) by the
browser's rule, with pureform's
`trackFieldsetDisabled`, and no longer resets during the form's `reset` event. Zag reads only the
closest fieldset, so a group in the first legend of a disabled fieldset came out disabled; and the
switch's own reset sent an untrusted change that React reported twice. The bindings own the reset
(design doc §9.5).

**The select's selected items are derived** from its value and its collection (`selectedItems`
and `valueAsString`, and the items `onValueChange` reports). Zag kept them in context
(`selectedItemMap`), rewritten by watches; a watch on a controlled value runs a flush after the
value changes, so Solid ran every reader twice (`EFFECT_RELAY_TEAR`) and React rendered twice.
Here the record of selected items lives in the machine's refs, read only for a selected value that
has left the collection: such an item keeps its last label until it's deselected, as in Zag. The
context has no `selectedItemMap`; the refs have it.

### Interaction sources

The button, checkbox, switch, radio group, slider, menu, select, combobox, tabs, tags input, and navigation machines emit
what happens to their surfaces to an interaction source (`@pureform/binding-core/interaction`,
design doc §9.8). A machine with one surface takes it as `interactionSource`; a composite takes
`itemInteractionSource(value)`, one source per radio, tab, menu item, option, or destination. A
binding makes them and passes them in; without one, nothing is emitted (the button keeps a source of
its own, since its API reads one).

| Machine          | Surface (element the handlers are on)               | Emits                                                                                                                  |
| ---------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| button           | root                                                | press (pointer from its point, Enter or Space from the center), release/cancel, hover, focus                           |
| checkbox, switch | root (label) and native input                       | pointer press and hover on the root; Space press and focus on the input                                                |
| radio group      | each item (label) and its native input              | the same, per radio                                                                                                    |
| slider           | root and handles                                    | press and `dragStart` while the pointer is down, then `dragStop` and release; hover, focus                             |
| tabs, navigation | each tab or destination                             | press (pointer; Enter, or Space unless it's a link), hover, focus                                                      |
| menu, select     | each item or option (a menu's toggleable items too) | the highlighted one hovers (no origin element); pointer press; Enter or Space presses and releases the highlighted one |

- **Touch never hovers**: a `pointerType` of `touch` emits no `hoverEnter`.
- **The innermost claims a press**: a press handler claims its event (`claimEvent`), so a
  pressable inside another emits a press once, from the inner one.
- **Disabled ends what's in progress**: when the machine becomes disabled (prop or fieldset), it
  emits a cancel, a drag stop, a hover exit, and a blur for what each surface had started. An
  item that becomes disabled alone (a tab, radio, destination, menu item, or option) does the
  same for itself once the render that disabled it is done (`InteractionEmitter.disabled()`). A
  menu or select ends everything when it closes; every machine does when it stops.
- **A radio is let go wherever the pointer comes up**, as `:active` is: Zag's radio group only
  let go when it came up on the radio.
- **Origins**: a press's `origin` is the pointer's `clientX`/`clientY`, or `"center"`; the
  emit's own origin argument is the element the handler ran on (`undefined` for a highlight or a
  key on a list item, which the item itself didn't receive).
- **A new source**: the button reads its state from the source it emits to, and follows a new
  `interactionSource` when the prop changes. Zag hands props out as copies of plain objects, so
  the machine tracks a source by its `subscribe` function, which every copy shares.
- **Surfaces with no machine** (a card, a list item, the snackbar's buttons) emit through
  `pressableItemProps(props, emitter, disabled, normalize)` from `@pureform/machines/interaction`,
  with an `InteractionEmitter` the binding makes.
- **Zag's machines** are wrapped, not changed: `withInteraction(machine, watch)` adds the
  emitters to its refs, an effect that ends them on stop, and a `watch`; `connect` chains
  the emitting handlers after Zag's on the normalized part props (`chainProps`).

### Button

| Prop                                              | Type                                           | Notes                                                     |
| ------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------- |
| `id`, `ids`                                       | `string`, `{ root?, label? }`                  | element ids: `button:<id>`, `button:<id>:label`           |
| `disabled`                                        | `boolean`                                      | a disabled fieldset around it disables it too             |
| `type`                                            | `"button" \| "submit" \| "reset"`              | default `"button"`                                        |
| `name`, `value`, `form`                           | `string`                                       | forwarded to the native button                            |
| `toggle`                                          | `boolean`                                      | default: true when `selected` or `defaultSelected` is set |
| `selected`, `defaultSelected`, `onSelectedChange` | `boolean`, `boolean`, `({ selected }) => void` | a toggle's state                                          |
| `dir`, `getRootNode`                              |                                                | as in Zag                                                 |

States: `idle` and `pressed`. A press starts on a primary pointer down, or Enter or Space held
on the button, and ends when the pointer is released anywhere (as `:active` does), the key is
released, or, for a keyboard press, focus leaves. A toggle flips on `click`, so the pointer and
the keyboard both toggle it.

`connect` returns `pressed`, `hovered`, and `focusVisible`, read from the interaction source's
state (which a press from another component sharing the source changes too), `focused`,
`disabled`, `toggle`, `selected`, `setSelected(selected)`, `toggleSelected()`, and part props for
`root` (a native `button`, with `aria-pressed` on a toggle), `label`, and `icon` (`aria-hidden`).
The parts carry `data-focus`, `data-disabled`, and `data-state` (`on` or `off` on a toggle); they
style nothing, since pureform's CSS reads native and ARIA states and `data-pf-*` (bindings set
`data-pf-active` from `pressed`). Zag's `data-active`, `data-hover`, and `data-focus-visible`
aren't written. The `interactionSource` prop is the source it emits to; without one it makes its
own when it first emits.

### Text field

The text field and the text area share it: the input part is an `<input>` (`getInputProps()`) or a
`<textarea>` (`getTextAreaProps()`).

| Prop                                     | Type                                                   | Notes                                                                                   |
| ---------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `id`, `ids`                              | `string`, `{ root?, input?, label?, supportingText? }` | element ids: `text-field:<id>`, `…:input`, `…:label`, `…:supporting-text`               |
| `value`, `defaultValue`, `onValueChange` | `string`, `string`, `({ value }) => void`              | controllable, Zag's semantics; the default is `""`                                      |
| `disabled`, `readOnly`, `required`       | `boolean`                                              | a disabled fieldset around the input disables it too                                    |
| `invalid`                                | `boolean`                                              | marks the input `aria-invalid`; nothing else                                            |
| `error`                                  | `string`                                               | invalid, the error text, and the input's custom validity                                |
| `validate`                               | `"native"`                                             | the input's own constraints decide once the user commits a change or the form checks it |
| `placeholder`                            | `string`                                               | default `" "`: the label floats while no placeholder shows                              |
| `counterMax`                             | `number`                                               | `counterText` (`"3 / 20"`); a longer value is `overflow` and marks the field invalid    |
| `secure`, `revealLabel`                  | `boolean`, `string`                                    | password field: `getVisibilityTriggerProps()` toggles `revealed` and the input's `type` |
| `name`, `form`, `dir`, `getRootNode`     |                                                        | forwarded or as in Zag                                                                  |

Parts: `getPrefixTextProps`, `getSuffixTextProps`, `getCounterProps`
(`id`, `data-overflow`), and `getVisibilityTriggerProps` (a `type="button"` toggle with
`aria-pressed` and `aria-controls`) besides the input, label, root and supporting text.

States: `idle` and `focused`. The input keeps its own text: `connect` gives it the value as
`defaultValue` (the server renders it, and React leaves the input to the user), and the machine
writes a value that changed from outside back to the input, leaving an equal one (and the caret)
alone. The value's bindable is `sync`, so under React the owner's update renders before the input
event's microtask ends. A form reset is the binding's: it calls `reset(value)` (event `RESET`) once
the browser has reset the input, which also forgets the user's interaction. `connect` returns
`value`, `focused`, `filled`, `disabled`, `invalid`, `errorText` (the `error`, or the browser's
`validationMessage` under `validate="native"` once the user has interacted), `supportingTextId`,
`setValue`, `reset`, `focus`, and the parts' props.

### Snackbar

| Prop                                  | Type                                                    | Notes                                                                    |
| ------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------ |
| `id`, `ids`                           | `string`, `{ root?, supportingText?, action?, close? }` | element ids: `snackbar:<id>`, `…:supporting-text`, `…:action`, `…:close` |
| `open`, `defaultOpen`, `onOpenChange` | `boolean`, `boolean`, `({ open, reason }) => void`      | controllable; `reason` is `open`, `timeout`, `action`, `close`, `escape` |
| `duration`                            | `number \| null`                                        | milliseconds open, default 5000; `null` stays until closed               |
| `onAction`                            | `() => void`                                            | called when the user chooses the action, before it asks to close         |
| `dir`, `getRootNode`                  |                                                         | as in Zag                                                                |

States: `closed`, `open` (counting down `duration`), and `paused` (the pointer is over it or focus
is inside it; the countdown starts again from the start once both leave). A controlled snackbar
only asks, as Zag's dialog does, and moves with the prop. `connect` returns `open`, `paused`,
`setOpen(open)`, and part props for `root` (`role="status"`, `hidden` while closed; Escape inside
it closes it), `supportingText`, `action`, and `close` (both `type="button"`).

The queue (`createQueue<Options>(prefix?)`) holds snackbars in order and shows one at a time:
`show(options)` returns an id, `dismiss(id?, reason?)` marks the shown one closing (calling its
`onOpenChange` with the reason) or drops a waiting one unseen, `gone(id)` moves on once the shown
one's exit animation is over, and `clear()` closes the shown one and drops the rest. `items()`,
`current()` and `subscribe(listener)` are what a binding renders from. Each shown snackbar times
itself on the snackbar machine.

### Navigation

| Prop                                     | Type                                                      | Notes                                                  |
| ---------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------ |
| `id`, `ids`                              | `string`, `{ root?, item?(value) }`                       | element ids: `navigation:<id>`, `…:item:<value>`       |
| `value`, `defaultValue`, `onValueChange` | `string \| null`, `string \| null`, `({ value }) => void` | controllable; the current destination, `null` for none |
| `disabled`                               | `boolean`                                                 | every destination                                      |
| `dir`, `getRootNode`                     |                                                           | as in Zag                                              |

One state, `idle`. A click on an enabled destination sets the value (a controlled one only asks);
a click on a disabled one is stopped (`preventDefault`, so a link doesn't follow its `href`).
`connect` returns `value`, `setValue(value)` (reported through `onValueChange`, as Zag's `setValue` is), `getItemState({
value, disabled })` → `{ current, disabled }`, and part props for `root`, `item({ value, disabled,
current })` (`aria-current` set to `current`, `"page"` by default, while it's the current one;
`aria-disabled`, `data-disabled`, `data-value`), `icon` (`aria-hidden`), and `label`. Destinations
are links or buttons, each reached with Tab: no roving focus, and arrow keys do nothing.

### Slider

Zag's `@zag-js/slider` (all its props: `value: number[]`, `min`, `max`, `step`, `largeStep`,
`minStepsBetweenThumbs`, `origin`, `orientation`, `thumbCollisionBehavior`, …), wrapped:

- The root is also Zag's control (`ids.control` is the root's id): the pointer moves the value
  anywhere on it. Thumbs are centred on their values (`thumbAlignment: "center"`).
- The API has the preset's parts: `getRootProps`, `getStartTrackProps`, `getTrackProps`,
  `getActiveTrackProps` (Zag's range), `getMarkerGroupProps`, `getMarkerProps({ value })`, and per
  thumb `getHandleProps(i)` (role `slider`, focus and keys), `getStateLayerProps(i)`,
  `getValueIndicatorProps(i)` (Zag's dragging indicator), `getInsetIconProps()` (the icon inside the
  active track; drawn only, `aria-hidden`), `getInputProps(i)` (the hidden input,
  `disabled` while the slider is, so it doesn't submit). Zag's inline styles are left off; the
  preset places every part. Also `percents`, `percentOf(value)`, `disabled`, `focusedIndex`.
- The up and down arrows step a horizontal slider too, as a range input does (Zag ignores them).
- pureform's fieldset rule; the form reset is the bindings'.
- A pointer down on the root or a handle presses and drags the source (`dragStop` before the
  release); the root hovers; handles focus and blur.

### Ripple

`ripple.machine` attaches `@pureform/js-effects`'s `ripple` to the layer's parent (or
`getSurfaceEl(layer)`); `connect` returns `getLayerProps()` for the empty layer element
(`data-ripple-layer`, `aria-hidden`). Props: `disabled`, `reducedMotion` (a binding's
`useReducedMotion()`; left undefined, the media query decides), `variant`, `centered`,
`rippleClass`, `color`, `timing`, `allowPropagation`, `sparkle`. They're read at each press, so
changing one needs no restart.

### Form helpers

```ts
type NativeDefault = boolean | string | number | readonly string[] | null | undefined;
setNativeDefault(element, value: NativeDefault): void;
getFormOf(element): HTMLFormElement | null;
trackFormReset(element, { onBeforeReset?, onReset }): () => void;
isFieldsetDisabled(element): boolean;
trackFieldsetDisabled(element, onChange: (disabled: boolean) => void): () => void;
trackFormControl(element, { onFieldsetDisabledChange?, onBeforeFormReset?, onFormReset? }): () => void;
```

A binding wires them per §9.5 of the design doc:

```ts
// The value a reset should show: the default when uncontrolled; the owner decides otherwise.
const resetsTo = () => (props.checked ?? props.defaultChecked) === true;
setNativeDefault(input, resetsTo()); // after spreading Zag's props, which write the current state
trackFormReset(input, {
    onBeforeReset: () => setNativeDefault(input, resetsTo()),
    onReset: () =>
        service.send({
            type: "CHECKED.SET",
            checked: props.defaultChecked ?? false,
            isTrusted: true,
        }),
});
```

- `trackFormReset` calls `onReset` in the task after the `reset` event, once the browser has
  reset the controls (microtasks can run before it does), and skips a prevented reset. It
  listens in the capture phase, so `onBeforeReset` runs before the form's other `reset`
  listeners, Zag's own among them (a binding marks or drops the callbacks Zag's own reset
  causes from there).
- `trackFieldsetDisabled` follows every fieldset around the element, by the browser's rule
  (the first legend is exempt); Zag's `trackFormControl` reads only the closest one.
- `trackFormControl` has Zag's shape, built on the two above.

## Building and testing

- `task_run` `build` on `@pureform/machines` (Vite library build with declarations).
- `task_run` `test:unit`: Vitest in browser mode (Chromium, `CHROMIUM_PATH` from `.env.local`),
  with type checks. The specs run each machine through Zag's vanilla adapter
  (`src/testing/vanilla.ts`) on real elements, with real pointer, keyboard, and form events.

## Good to know

- The checkbox, switch, radio group, select, menu, dialog, tooltip, and tabs are Zag's. The
  tooltip is unchanged; the dialog keeps Zag's states, transitions, and effects, except that its
  dismissable layer finds no backdrop or positioner to mirror its layer onto: mirroring reads the
  surface's computed `z-index` as the dialog opens, a style recalculation of the whole page that
  the layer's next write (the body's `pointer-events`) makes the frame repeat. The bindings stack
  the positioner themselves in the next frame (`stackPositioner`). The others keep Zag's states
  and transitions and gain the interaction emitters. The checkbox's form tracking is still Zag's own (its reset and
  closest-fieldset tracking don't show through the bindings; see the shared suites); give it
  `withFieldsetRule` if that changes.
- A per-item `disabled` (a tab, a destination, a radio) stops new interactions but doesn't end
  one in progress; only the machine's own `disabled` does.
- `setNativeDefault` keeps what an unedited text control or select shows: writing a default
  alone would change it.
- The snackbar's `paused` isn't marked on its root: the pointer resting on it would change the
  markup a server rendered while it hydrates.
- Design doc: §8 (behavior), §9.4 (controlled state), §9.5 (forms), §9.8 (interaction sources).
