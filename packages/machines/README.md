# @pureform/machines

Framework-free behavior for pureform's components: Zag.js's machines, re-exported, and
pureform's own machines in Zag's shape, plus the form helpers every binding wires in. A
binding (`@pureform/solid`, `@pureform/react`) takes a machine from here, runs it with its
framework's Zag adapter, and spreads the part props `connect` returns on its elements. Nothing
here imports a framework.

It depends on Zag's framework-free packages (`@zag-js/core`, `anatomy`, `dom-query`, `types`,
`utils`, `collection`, and the `checkbox`, `switch`, `radio-group`, `select`, `menu`, `dialog`,
`tooltip`, and `tabs` machines), on `@pureform/js-effects` for the ripple, and on
`@pureform/binding-core/interaction` for the interaction source its machines emit to. The bindings
depend on it.

## Architecture

```
@zag-js/checkbox, switch, radio-group, ──re-exported─┐
  select, menu, dialog, tooltip, tabs                │
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

| Module                                                    | What it does                                                                                                                                |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `button/`                                                 | Press, focus, hover, and an optional toggle (`selected`).                                                                                   |
| `ripple/`                                                 | The ripple of `@pureform/js-effects`, run as a machine.                                                                                     |
| `text-field/`                                             | The text field and text area: value, focus, fieldsets, and validation (`error`, `validate`).                                                |
| `snackbar/`                                               | The snackbar: `open`, closing itself after `duration` unless held by the pointer or focus.                                                  |
| `navigation/`                                             | The navigation bar and rail: `value`, the current destination, marked with `aria-current`.                                                  |
| `menu.ts`, `tabs.ts`                                      | Zag's machines, re-exported, emitting each item's interactions to its source.                                                               |
| `dialog.ts`, `tooltip.ts`                                 | Zag's machines, re-exported unchanged.                                                                                                      |
| `slider/`                                                 | The slider over a native range input: value, snapping, the drag, write-back, and fieldsets.                                                 |
| `checkbox.ts`, `switch.ts`, `radio-group.ts`, `select.ts` | Zag's machines, re-exported, emitting to an interaction source; all but the checkbox's with pureform's form rules.                          |
| `zag-form.ts`                                             | `withFieldsetRule`: a Zag machine's fieldset tracking swapped for pureform's, and its reset dropped.                                        |
| `interaction/`                                            | How machines emit to an interaction source: an emitter per surface, Zag machines wrapped (`withInteraction`), handlers chained after Zag's. |
| `form/`                                                   | Native defaults, form reset, and disabled fieldsets.                                                                                        |
| `testing/`                                                | The test harness: runs a machine with Zag's vanilla adapter. Not exported.                                                                  |

## Public API

| Import                           | Exports                                                                                                                                                                                                                                 |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@pureform/machines`             | the namespaces below, the form helpers, Zag's `Machine`, `Service`, `PropTypes`, `NormalizeProps` types, and `InteractionProps`, `ItemInteractionProps`                                                                                 |
| `@pureform/machines/button`      | `button`'s members                                                                                                                                                                                                                      |
| `@pureform/machines/checkbox`    | `@zag-js/checkbox`                                                                                                                                                                                                                      |
| `@pureform/machines/switch`      | `@zag-js/switch` (the `switchControl` namespace at the root), its `machine` with pureform's form rules                                                                                                                                  |
| `@pureform/machines/radio-group` | `@zag-js/radio-group` (`radioGroup` at the root), its `machine` with pureform's form rules                                                                                                                                              |
| `@pureform/machines/select`      | `@zag-js/select` (`select` at the root, `collection` included), its `machine` with pureform's form rules                                                                                                                                |
| `@pureform/machines/menu`        | `@zag-js/menu` (`menu` at the root)                                                                                                                                                                                                     |
| `@pureform/machines/dialog`      | `@zag-js/dialog` (`dialog` at the root)                                                                                                                                                                                                 |
| `@pureform/machines/tooltip`     | `@zag-js/tooltip` (`tooltip` at the root)                                                                                                                                                                                               |
| `@pureform/machines/tabs`        | `@zag-js/tabs` (`tabs` at the root)                                                                                                                                                                                                     |
| `@pureform/machines/snackbar`    | `snackbar`'s members                                                                                                                                                                                                                    |
| `@pureform/machines/navigation`  | `navigation`'s members                                                                                                                                                                                                                  |
| `@pureform/machines/ripple`      | `ripple`'s members                                                                                                                                                                                                                      |
| `@pureform/machines/text-field`  | `textField`'s members                                                                                                                                                                                                                   |
| `@pureform/machines/slider`      | `slider`'s members, and `snapValue`                                                                                                                                                                                                     |
| `@pureform/machines/form`        | the form helpers                                                                                                                                                                                                                        |
| `@pureform/machines/interaction` | `InteractionEmitter`, `InteractionEmitters`, `claimEvent`, `pointerKind`, `isFocusVisible`, `withInteraction`, `chainProps`, `emittersOf`: emitting to an interaction source from a machine of your own (or React Native's `Pressable`) |

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

### Interaction sources

The button, checkbox, switch, radio group, slider, menu, select, tabs, and navigation machines emit
what happens to their surfaces to an interaction source (`@pureform/binding-core/interaction`,
design doc §9.8). A machine with one surface takes it as `interactionSource`; a composite takes
`itemInteractionSource(value)`, one source per radio, tab, menu item, option, or destination. A
binding makes them and passes them in; without one, nothing is emitted (the button keeps a source of
its own, since its API reads one).

| Machine          | Surface (element the handlers are on)  | Emits                                                                                                                  |
| ---------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| button           | root                                   | press (pointer from its point, Enter or Space from the center), release/cancel, hover, focus                           |
| checkbox, switch | root (label) and native input          | pointer press and hover on the root; Space press and focus on the input                                                |
| radio group      | each item (label) and its native input | the same, per radio                                                                                                    |
| slider           | native input                           | press and `dragStart` while the pointer is down, then `dragStop` and release; hover, focus                             |
| tabs, navigation | each tab or destination                | press (pointer; Enter, or Space unless it's a link), hover, focus                                                      |
| menu, select     | each item or option                    | the highlighted one hovers (no origin element); pointer press; Enter or Space presses and releases the highlighted one |

- **Touch never hovers**: a `pointerType` of `touch` emits no `hoverEnter`.
- **The innermost claims a press**: a press handler claims its event (`claimEvent`), so a
  pressable inside another emits a press once, from the inner one.
- **Disabled ends what's in progress**: when the machine becomes disabled (prop or fieldset), it
  emits a cancel, a drag stop, a hover exit, and a blur for what each surface had started. A
  menu or select ends everything when it closes; every machine does when it stops.
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
| `name`, `form`, `dir`, `getRootNode`     |                                                        | forwarded or as in Zag                                                                  |

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

| Prop                                     | Type                                      | Notes                                                        |
| ---------------------------------------- | ----------------------------------------- | ------------------------------------------------------------ |
| `id`, `ids`                              | `string`, `{ root?, input? }`             | element ids: `slider:<id>`, `slider:<id>:input`              |
| `value`, `defaultValue`, `onValueChange` | `number`, `number`, `({ value }) => void` | controllable; the default is `min`                           |
| `min`, `max`, `step`                     | `number`                                  | 0, 100, 1                                                    |
| `disabled`, `readOnly`, `invalid`        | `boolean`                                 | `readOnly` takes no change (a range input has no `readonly`) |
| `name`, `form`                           | `string`                                  | forwarded to the native input                                |
| `dir`, `getRootNode`                     |                                           | as in Zag                                                    |

The native `<input type="range">` takes the pointer, the keyboard (its arrow keys follow `dir`),
the form, and assistive technology; the machine follows it. States: `idle` and `dragging` (the
pointer is down on the input, until it's let go anywhere). A value from outside is written back
to the input; one the user moves is clamped and snapped to the step from `min`
(`snapValue(value, { min, max, step })`). The fieldsets around the input disable it by the
browser's rule. A form reset is the binding's: it calls `reset(value)` after the browser's.
`connect` returns `value`, `fraction` (0 to 1), `percent` (0 to 100, the preset's `value` token),
`dragging`, `disabled`, `setValue`, `reset`, `focus`, and part props for `root` and `input`
(`type="range"`, `min`, `max`, `step`, the value as `defaultValue`, `aria-invalid`,
`aria-readonly`, `data-dragging`).

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
  dialog and tooltip are unchanged; the others keep Zag's states and transitions and gain the
  interaction emitters. The checkbox's form tracking is still Zag's own (its reset and
  closest-fieldset tracking don't show through the bindings; see the shared suites); give it
  `withFieldsetRule` if that changes.
- A per-item `disabled` (a tab, a destination, a radio) stops new interactions but doesn't end
  one in progress; only the machine's own `disabled` does.
- The slider has one thumb: a range slider with two would need its own inputs (or Zag's slider,
  which owns the pointer and a focusable thumb instead of a native input).
- `setNativeDefault` keeps what an unedited text control or select shows: writing a default
  alone would change it.
- The snackbar's `paused` isn't marked on its root: the pointer resting on it would change the
  markup a server rendered while it hydrates.
- Design doc: §8 (behavior), §9.4 (controlled state), §9.5 (forms), §9.8 (interaction sources).
