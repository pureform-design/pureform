# @pureform/machines

Framework-free behavior for pureform's components: Zag.js's machines, re-exported, and
pureform's own machines in Zag's shape, plus the form helpers every binding wires in. A
binding (`@pureform/solid`, `@pureform/react`) takes a machine from here, runs it with its
framework's Zag adapter, and spreads the part props `connect` returns on its elements. Nothing
here imports a framework.

It depends on Zag's framework-free packages (`@zag-js/core`, `anatomy`, `dom-query`, `types`,
`utils`, `collection`, and the `checkbox`, `switch`, `radio-group`, and `select` machines) and on
`@pureform/js-effects` for the ripple. The bindings depend on it.

## Architecture

```
@zag-js/checkbox, switch, radio-group, ──re-exported─┐
  select                                             │
own machines (button, ripple, text field,            ├──► @pureform/machines ──► bindings:
  slider stub) ── Zag's shape ───────────────────────┤                         useMachine(machine, props)
                                                     │                         connect(service, normalize)
form helpers (native defaults, reset, fieldsets) ────┘                         spread part props
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

| Module                                                    | What it does                                                                                         |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `button/`                                                 | Press, focus, hover, and an optional toggle (`selected`).                                            |
| `ripple/`                                                 | The ripple of `@pureform/js-effects`, run as a machine.                                              |
| `text-field/`                                             | The text field and text area: value, focus, fieldsets, and validation (`error`, `validate`).         |
| `slider/`                                                 | Stub for p6e: the value only.                                                                        |
| `checkbox.ts`, `switch.ts`, `radio-group.ts`, `select.ts` | Zag's machines, re-exported; all but the checkbox's with pureform's form rules.                      |
| `zag-form.ts`                                             | `withFieldsetRule`: a Zag machine's fieldset tracking swapped for pureform's, and its reset dropped. |
| `form/`                                                   | Native defaults, form reset, and disabled fieldsets.                                                 |
| `testing/`                                                | The test harness: runs a machine with Zag's vanilla adapter. Not exported.                           |

## Public API

| Import                           | Exports                                                                                                     |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `@pureform/machines`             | the namespaces below, the form helpers, and Zag's `Machine`, `Service`, `PropTypes`, `NormalizeProps` types |
| `@pureform/machines/button`      | `button`'s members                                                                                          |
| `@pureform/machines/checkbox`    | `@zag-js/checkbox`                                                                                          |
| `@pureform/machines/switch`      | `@zag-js/switch` (the `switchControl` namespace at the root), its `machine` with pureform's form rules      |
| `@pureform/machines/radio-group` | `@zag-js/radio-group` (`radioGroup` at the root), its `machine` with pureform's form rules                  |
| `@pureform/machines/select`      | `@zag-js/select` (`select` at the root, `collection` included), its `machine` with pureform's form rules    |
| `@pureform/machines/ripple`      | `ripple`'s members                                                                                          |
| `@pureform/machines/text-field`  | `textField`'s members                                                                                       |
| `@pureform/machines/slider`      | `slider`'s members (stub)                                                                                   |
| `@pureform/machines/form`        | the form helpers                                                                                            |

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
(design doc §9.5). Everything else, `connect` included, is Zag's.

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

`connect` returns `pressed`, `focused`, `focusVisible` (what `:focus-visible` says at focus),
`hovered` (mouse and pen only), `disabled`, `toggle`, `selected`, `setSelected(selected)`,
`toggleSelected()`, and part props for `root` (a native `button`, with `aria-pressed` on a
toggle), `label`, and `icon` (`aria-hidden`). The parts carry Zag-style `data-active`,
`data-focus`, `data-focus-visible`, `data-hover`, `data-disabled`, and `data-state` (`on` or
`off` on a toggle); they style nothing, since pureform's CSS reads native and ARIA states
and `data-pf-*` (bindings set `data-pf-active` from `pressed`).

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

- The checkbox, switch, radio group, and select are re-exported so far; p6 adds Zag's tabs,
  menu, dialog, and tooltip as their components land. The checkbox's machine is still Zag's
  own (its reset and closest-fieldset tracking don't show through the bindings; see the shared
  suites); give it `withFieldsetRule` if that changes.
- The slider is a stub with its final shape; p6e fills it in, and its `todo` tests list what's
  missing.
- `setNativeDefault` keeps what an unedited text control or select shows: writing a default
  alone would change it.
- Design doc: §8 (behavior), §9.4 (controlled state), §9.5 (forms).
