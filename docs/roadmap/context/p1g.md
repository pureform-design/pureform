# p1g: @pureform/machines (output context)

Commits: 2226b21, plus the `docs(roadmap)` commit that adds this file.

## Built

A new package, `packages/machines` (`@pureform/machines`), scaffolded with the `ts-package`
generator. `sideEffects: false`. Dependencies: `@pureform/js-effects`, `@zag-js/anatomy`,
`core`, `dom-query`, `types`, `utils`, `checkbox`, `switch`, `radio-group` (all 1.46). Dev:
`@zag-js/vanilla` (test harness), `@vitest/browser-playwright`, `playwright`. Root catalog
entries added: `@pureform/machines`, `@zag-js/anatomy`, `@zag-js/dom-query`, `@zag-js/vanilla`.

### Entry points

| Import                           | Exports                                                                                                                                                                                        |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@pureform/machines`             | namespaces `button`, `checkbox`, `switchControl`, `radioGroup`, `ripple`, `textField`, `slider`; every form helper; types `Machine`, `MachineSchema`, `Service`, `PropTypes`, `NormalizeProps` |
| `@pureform/machines/button`      | `machine`, `connect`, `anatomy`, `props`, `splitProps`, types `Props`, `Api`, `Schema`, `Event`, `Machine`, `Service`, `ElementIds`, `PressSource`, `SelectedChangeDetails`                    |
| `@pureform/machines/checkbox`    | `export * from "@zag-js/checkbox"`                                                                                                                                                             |
| `@pureform/machines/switch`      | `export * from "@zag-js/switch"` (root namespace `switchControl`: `switch` can't be an import name; matches the preset's name)                                                                 |
| `@pureform/machines/radio-group` | `export * from "@zag-js/radio-group"` (root namespace `radioGroup`)                                                                                                                            |
| `@pureform/machines/ripple`      | `machine`, `connect`, `anatomy`, `props`, `splitProps`, types `Props`, `Api`, `Schema`, `Machine`, `Service`, `ElementIds`                                                                     |
| `@pureform/machines/text-field`  | same members, stub (`ValueChangeDetails` too)                                                                                                                                                  |
| `@pureform/machines/slider`      | same members, stub (`ValueChangeDetails` too)                                                                                                                                                  |
| `@pureform/machines/form`        | the form helpers                                                                                                                                                                               |

Every machine has Zag's shape: `connect<T extends PropTypes>(service: Service<Schema>,
normalize: NormalizeProps<T>): Api<T>`. Run them with the Solid port's `useMachine` or
`@zag-js/react`'s.

### Button (`src/button/`)

```ts
interface ButtonProps extends DirectionProperty, CommonProperties {
    // id, getRootNode, dir
    ids?: { root?: string; label?: string }; // default "button:<id>", "button:<id>:label"
    disabled?: boolean; // a disabled fieldset disables it too
    type?: "button" | "submit" | "reset"; // default "button"
    name?: string;
    value?: string;
    form?: string; // forwarded to the native button
    toggle?: boolean; // default: selected or defaultSelected given
    selected?: boolean; // controlled
    defaultSelected?: boolean; // default false
    onSelectedChange?: (details: { selected: boolean }) => void;
}
```

- **States:** `"idle" | "pressed"`. `PRESS.START { source: "pointer" | "keyboard" }` (guarded by
  not disabled) → `pressed`; `PRESS.END`, `PRESS.CANCEL` → `idle`; `BLUR` → `idle` only for a
  keyboard press. A pointer press ends on `pointerup`/`pointercancel` anywhere on the window
  (an effect of `pressed`), as `:active` does. Becoming disabled (prop or fieldset) cancels the
  press and clears focus and hover.
- **Context:** `selected` (bindable, Zag semantics), `focused`, `focusVisible`, `hovered`,
  `fieldsetDisabled`. Computed `disabled`. Refs `pressSource`.
- **Other events:** `SELECTED.TOGGLE` (toggle and not disabled), `SELECTED.SET { selected }`
  (toggle only), `CONTEXT.SET { context }`.
- **Effect:** `trackFormControl` (ours) on the root for the fieldset.
- **Api:** `pressed`, `focused`, `focusVisible` (`:focus-visible` at focus), `hovered` (mouse
  and pen only), `disabled`, `toggle`, `selected` (false unless toggle), `setSelected(b)`,
  `toggleSelected()`, `getRootProps()` (`T["button"]`), `getLabelProps()`, `getIconProps()`.
- **Parts:** `root` (native `<button>`: `id`, `type`, `name`, `value`, `form`, `disabled`,
  `aria-pressed` only on a toggle; handlers `onPointerDown/Move/Leave`, `onKeyDown/Up`,
  `onFocus`, `onBlur`, `onClick`), `label` (`id`), `icon` (`aria-hidden`). Every part has
  Zag's `data-scope="button"`/`data-part` and `data-active`, `data-focus`,
  `data-focus-visible`, `data-hover`, `data-disabled`, `data-state` (`on`/`off` on a toggle).
  These style nothing.
- A toggle flips on `click`, so Enter, Space, and the pointer all toggle it.

### Ripple (`src/ripple/`)

Props: `id`, `ids?: { layer? }` (default `ripple:<id>:layer`), `disabled`, `reducedMotion`
(binding's `useReducedMotion()`; `undefined` → js-effects checks the media query; `true` →
no ripples; defined → the media query is ignored), `variant` (default `"ink-well"`),
`centered`, `rippleClass`, `color`, `timing`, `allowPropagation`, `sparkle`,
`getSurfaceEl?: (layer) => HTMLElement | null` (default the layer's parent). State `ready`
with effect `trackRipple`, which calls js-effects' `ripple(surface, options)` with getters,
so prop changes apply at the next press. Api: `getLayerProps()` → `T["element"]` with `id`,
`data-ripple-layer`, `aria-hidden`, `data-scope="ripple"`, `data-part="layer"`.

### Text field and slider (stubs)

- `textField`: props `value`, `defaultValue` (default `""`), `onValueChange({ value })`,
  `disabled`, `readOnly`, `required`, `invalid`, `name`, `form`, `ids { root, input, label,
supportingText }`. State `idle`; context `value`, `focused`, `fieldsetDisabled`; computed
  `disabled`, `filled`. Api: `value`, `focused`, `filled`, `disabled`, `invalid`,
  `setValue`, `getRootProps`, `getLabelProps`, `getInputProps`, `getSupportingTextProps`.
- `slider`: props `value`, `defaultValue` (default `min`), `onValueChange({ value })`, `min`
  (0), `max` (100), `step` (1), `disabled`, `readOnly`, `invalid`, `name`, `form`,
  `ids { root, input }`. Computed `disabled`, `fraction` (0 to 1). Api: `value`, `fraction`,
  `disabled`, `setValue` (clamped), `getRootProps`, `getInputProps` (`type="range"`).

### Form helpers (`src/form/`), for p2a and p2b

```ts
type NativeDefault =
    boolean | string | number | readonly string[] | null | undefined;
function setNativeDefault(
    element: Element | null | undefined,
    value: NativeDefault,
): void;
// checkbox/radio input: defaultChecked = value === true; other inputs, textarea: defaultValue;
// select: each option's defaultSelected = value includes option.value; anything else: no-op.

function getFormOf(element: Element | null | undefined): HTMLFormElement | null;
// element.form (follows the form attribute), else closest("form").

interface TrackFormResetOptions {
    onBeforeReset?: () => void;
    onReset: () => void;
}
function trackFormReset(
    element: Element | null | undefined,
    options: TrackFormResetOptions,
): VoidFunction;
// onBeforeReset: during the reset event, before the browser resets. onReset: in the next task,
// after the browser's reset, unless the event was prevented. Cleanup clears a pending call.

function isFieldsetDisabled(element: Element | null | undefined): boolean;
function trackFieldsetDisabled(
    element: Element | null | undefined,
    onChange: (disabled: boolean) => void,
): VoidFunction;
// Calls onChange once at the start, then on each change (every ancestor fieldset's disabled
// attribute and children are observed).

interface TrackFormControlOptions {
    onFieldsetDisabledChange?: (disabled: boolean) => void;
    onBeforeFormReset?: () => void;
    onFormReset?: () => void;
}
function trackFormControl(
    element: Element | null | undefined,
    options: TrackFormControlOptions,
): VoidFunction;
```

**The recipe** (tested on Zag's checkbox in `src/form/form.spec.ts`):

```ts
const resetsTo = () => (props.checked ?? props.defaultChecked) === true;
// after spreading Zag's hidden-input props (they write the current state as the default):
setNativeDefault(input, resetsTo());
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

Uncontrolled: the browser's reset already shows the default; the machine follows and
`onCheckedChange` fires. Controlled: the native default is the controlled value, so the input
doesn't move; the send only calls `onCheckedChange` with the default.

### Files and tests

Specs (Chromium browser mode, type-checked): `src/button/button.spec.ts` (19),
`src/form/form.spec.ts` (24), `src/ripple/ripple.spec.ts` (6), `src/index.spec.ts` (2),
`src/text-field/text-field.spec.ts` and `src/slider/slider.spec.ts` (1 each plus todos).
`src/testing/vanilla.ts` is the harness: `run(machine, connect, props, bind)` runs a machine
with `@zag-js/vanilla`, spreads part props on real elements after every change, and returns
`{ service, api(), setProps(next), stop() }`; `settle()` waits a task. README in the package.

## Deviations from the design

- **Own `trackFormControl`**, not `@zag-js/dom-query`'s: Zag reads only the closest
  fieldset (misses an enabled fieldset inside a disabled one, and wrongly disables a control
  in the first legend) and resets during the event, before the browser. A spec pins both
  differences. Same shape, plus `onBeforeFormReset`. Recorded in design doc §9.5.
- **The native default is "what a reset should show"**, not always the `default*` prop: the
  controlled value when controlled, so the input doesn't move (§9.4's strict control).
  Recorded in §9.5.
- **Only checkbox, switch, and radio group are re-exported.** Zag's tabs, menu, dialog,
  tooltip, and select aren't installed yet; adding them now would mean unused dependencies.
- The ripple's "same shape" is read as Zag's shape (`machine` + `connect`), with the
  `reducedMotion` prop from §5.8's `useReducedMotion()` instead of its own `matchMedia`.
- The button's API doesn't write `data-pf-active` itself: p1a says bindings set
  `STATE_ATTRIBUTES.pressed`; they read `api.pressed`.

## Stubs and gaps

- `textField` (p6b) and `slider` (p6e): value only; todo tests list focus and the floating
  label, reset, fieldset tracking, validation, and dragging.
- Zag re-exports for tabs, menu, dialog, tooltip, select, toggle group: p6b to p6d add
  `@zag-js/<name>` and a `src/<name>.ts` re-export (plus the subpath and vite entry).
- The button doesn't support rendering as a link (`as={A}`): `getRootProps` is a
  `button`'s. p2a/p3a decide whether a link variant is needed.
- No soft-disabled (focusable while disabled, `aria-disabled`) button.
- Not yet run through the Solid port or React; only Zag's vanilla adapter. p2a/p2b should
  smoke-test `button.machine` through their `useMachine`.

## How to verify

- `task_run` `build` and `test:unit` on `@pureform/machines`: pass (100 tests, 14 todo, no
  type errors).
- Workspace `build` and `test:unit`: pass, except the pre-existing rn-parity "every variant
  value at rest" e2e case (244 of 245).

## Notes for the next phases

- **p2a, p2b:** run `button.machine` with your `useMachine`; spread `api.getRootProps()`
  first, then `partAttributes(...)`, then state attributes (`STATE_ATTRIBUTES.pressed` from
  `api.pressed`; `:hover` covers hover, but `api.hovered` is there). For checkbox, switch, and
  radio group, wire the form recipe above (radio: `setNativeDefault(itemInput, item.value ===
resetsToValue)` per item). Add `reason: "reset"` to the callback details yourselves if you
  want it: Zag's details don't carry one.
- **Vanilla normalize maps** `onFocus`/`onBlur` to `focusin`/`focusout` and `onChange` to
  `input`, as Zag's other adapters do; write connects with React-style names.
- **Zag's hidden input can't take a real click** in tests while it has Zag's visually hidden
  style; strip `style` (the preset's `input` slot replaces it anyway).
- **Lockfile:** new npm packages (`@zag-js/vanilla`, `@zag-js/store`, `proxy-compare`) were
  found with `bun install --lockfile-only` (safe with the rn-web-demo dev server running; it
  doesn't touch `node_modules`), which also re-resolved unrelated entries; the lock was
  restored and only this package's hunks copied in, then `bun install --frozen-lockfile`
  installed them (3 packages, no lockfile change).
- **Vitest optimizeDeps:** the package's vitest config pre-includes the Zag packages so Vite
  doesn't reload a test mid-run; do the same when adding re-exports.
