# p3a: Solid button and checkbox (output context)

Commits: ecadbde..174e0c3, plus the `docs(roadmap)` commit that adds this file.

| Commit    | What                                                                                                                            |
| --------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `ecadbde` | `feat(binding-core)`: button and checkbox contracts, `VariantProp`, `outsideRootMessage`, `syncCheckedInput` (`/dom`)           |
| `0eef0cb` | `feat(solid)`: `@pureform/solid/button`, `@pureform/solid/checkbox`, `createPartContext`, fake checkbox in the fixture registry |
| `174e0c3` | `docs(design)`: "Built (p3a)" notes in §9.1, §9.4, §9.5                                                                         |

## Built

### File layout (p6 copies it)

```
packages/binding-core/src/components/
    variants.ts        VariantProp<C, G>
    button.ts          the button's contract (below)
    checkbox.ts        the checkbox's contract (below)
    components.spec.ts
packages/solid/src/
    part-context.ts    createPartContext
    button/
        button.tsx     Root, Label, Icon, TouchTarget, ReadyMade → export const Button
        index.ts       the subpath's exports
        button.spec.tsx
    checkbox/
        checkbox.tsx   Root, TouchTarget, Input, Box, CheckIcon, IndeterminateIcon, ReadyMade → Checkbox
        index.ts
        checkbox.spec.tsx
```

New subpaths in `packages/solid/package.json` (`types` → `dist/<name>/index.d.ts`; `solid` and
`import` → `development: src/<name>/index.ts`, default `dist/<name>.jsx`), and an entry each in
`vite.config.ts`'s `lib.entry`. The package stays `sideEffects: false`. Components aren't
re-exported from the root entry.

### Shared contracts: `@pureform/binding-core` (p3b imports these; don't redefine them)

```ts
// components/variants.ts
type VariantProp<C extends ComponentRef, G extends string> =
    G extends keyof Variants<C> ? Exclude<Variants<C>[G], object> | undefined : undefined;
// registered: that group's values; group not registered: undefined; nothing registered: string | boolean | undefined

// components/button.ts
type ButtonPart = PartName<typeof buttonAnatomy>;
interface ButtonVariantProps { color?; variant?; size?; density?: VariantProp<"button", …>;
    tokens?: InstanceTokens<"button"> | undefined }
interface ButtonElementIds { root?: string; label?: string }
interface ButtonBehaviorProps extends Controllable<"selected", boolean> {
    disabled?; type?: "button" | "submit" | "reset"; name?; value?; form?; toggle?;
    id?: string; ids?: ButtonElementIds }
interface ButtonRootOwnProps extends ButtonVariantProps, ButtonBehaviorProps {
    testId?: TestIdOverride<ButtonPart>; unstyled?: Unstyled<ButtonPart> }
const BUTTON_ROOT_PROPS;   // every key of ButtonRootOwnProps (18), kept off the element
buttonSelection(props): Selection<"button">;            // { color, variant, size, density, tokens }
buttonMachineProps(props);  // { disabled, type, name, value, form, toggle, ids: { root: id ?? ids.root, label } }
interface ButtonContentProps<Node> { label?: Node; icon?: Node; mirrorIcon?: boolean }
const BUTTON_CONTENT_PROPS; // ["label", "icon", "mirrorIcon"]

// components/checkbox.ts
type CheckboxPart = PartName<typeof checkboxAnatomy>;
type CheckedState = boolean | "indeterminate";
interface CheckboxVariantProps { color?; density?; tokens?: InstanceTokens<"checkbox"> }
interface CheckboxElementIds { root?: string; input?: string }
interface CheckboxBehaviorProps extends Controllable<"checked", CheckedState> {
    disabled?; invalid?; required?; readOnly?; name?; form?; value?; id?; ids?: CheckboxElementIds }
interface CheckboxRootOwnProps extends CheckboxVariantProps, CheckboxBehaviorProps { testId?; unstyled? }
const CHECKBOX_ROOT_PROPS;          // its 17 keys
const CHECKBOX_INPUT_LABEL_PROPS;   // ["aria-label", "aria-labelledby", "aria-describedby"]
checkboxSelection(props): Selection<"checkbox">;
checkboxMachineProps(props, fieldsetDisabled: boolean);
    // { disabled: disabled || fieldsetDisabled, invalid, required, readOnly, name, form, value,
    //   ids: { root: id ?? ids.root, hiddenInput: ids.input } }
checkboxNativeDefault(resetsTo): boolean;            // resetsTo === true
checkboxResetState(defaultChecked): CheckedState;    // defaultChecked ?? false
checkboxInputProps<P>(zagHiddenInputProps: P, readOnly): Omit<P, "style" | "aria-labelledby"> & { "aria-readonly": "true" | undefined }
checkboxMarkProps<P>(zagIndicatorProps: P): Omit<P, "hidden">

// parts.ts
outsideRootMessage(component, part): string;
    // "pureform: <Button.Label> must be inside <Button.Root>, which shares the machine and classes with its parts."

// @pureform/binding-core/dom
syncCheckedInput(input: HTMLInputElement, checked: boolean | "indeterminate"): void;
```

### `@pureform/solid/button`

```ts
export const Button: typeof ReadyMade & { Root; Label; Icon; TouchTarget };
export type { ButtonProps, ButtonRootProps, ButtonPartProps, ButtonIconProps };

interface ButtonRootProps
    extends Omit<PartProps, keyof ButtonRootOwnProps>, ButtonRootOwnProps {
    as?: ValidComponent;
}
interface ButtonPartProps extends PartProps {
    unstyled?: boolean;
}
interface ButtonIconProps extends ButtonPartProps {
    mirror?: boolean;
}
interface ButtonProps
    extends
        Omit<ButtonRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy>,
        ButtonContentProps<JSX.Element> {}
```

| Part          | Element  | Machine props         | States                   |
| ------------- | -------- | --------------------- | ------------------------ |
| `Root`        | `button` | `api.getRootProps()`  | `pressed: api.pressed`   |
| `Label`       | `span`   | `api.getLabelProps()` |                          |
| `Icon`        | `span`   | `api.getIconProps()`  | `mirrored: props.mirror` |
| `TouchTarget` | `span`   | none                  |                          |

Root: `createUniqueId()` id, `dir: useDirection()()`, `...buttonMachineProps(props)`,
`...useControllable("Button", "selected", props).machineProps()`; one `useComponent(buttonAnatomy,
{ selection: () => buttonSelection(props), testId, unstyled })`; its element gets
`omit(props, "as", ...BUTTON_ROOT_PROPS)`. Ready-made: `<Root {...omit(props, "class", "style",
"slotProps", ...BUTTON_CONTENT_PROPS)} {...slotPartProps(props, "root")}>` then `TouchTarget`,
`Icon` (only when `icon` isn't `undefined`/`null`/`false`, with `mirror={mirrorIcon}`), `Label`
(`{props.label}`), each with `slotPartProps(props, part)`. DOM order: touch target, icon, label
(the anatomy's `structure`).

### `@pureform/solid/checkbox`

```ts
export const Checkbox: typeof ReadyMade & {
    Root;
    TouchTarget;
    Input;
    Box;
    CheckIcon;
    IndeterminateIcon;
};
export type {
    CheckboxProps,
    CheckboxRootProps,
    CheckboxPartProps,
    CheckedState,
};
```

| Part                | Element | Machine props                                                                     | States                           |
| ------------------- | ------- | --------------------------------------------------------------------------------- | -------------------------------- |
| `Root`              | `label` | `api.getRootProps()` (Zag's `htmlFor` kept)                                       | `pressed: context.get("active")` |
| `TouchTarget`       | `span`  | none                                                                              |                                  |
| `Input`             | `input` | `checkboxInputProps(api.getHiddenInputProps(), readOnly)` + the restore `onClick` |                                  |
| `Box`               | `span`  | `api.getControlProps()` (`aria-hidden`)                                           |                                  |
| `CheckIcon`         | `span`  | `checkboxMarkProps(api.getIndicatorProps())`                                      |                                  |
| `IndeterminateIcon` | `span`  | `checkboxMarkProps(api.getIndicatorProps())`                                      |                                  |

Root wiring, in order: `useControllable("Checkbox", "checked", props)`; the input element in a
signal (`createSignal(undefined, { ownedWrite: true })`, set from the Input part's `ref` through
context); `useFieldsetDisabled(input)`; `useMachine(checkbox.machine, () => ({ id, dir,
...checkboxMachineProps(props, fieldsetDisabled()), ...checked.machineProps() }))`;
`useFormReset(input, { resetsTo: () => checkboxNativeDefault(checked.resetsTo()), onBeforeReset:
checked.beforeReset, onReset: () => checked.reset(() => service.send({ type: "CHECKED.SET",
checked: checkboxResetState(checked.defaultValue), isTrusted: true })) })`. Context value:
`{ scope, api, readOnly: () => props.readOnly, setInput }`.

Input's restore `onClick` (after Zag's, merged with `combinePartProps`): `queueMicrotask(() => {
flush(); syncCheckedInput(input, untrack(() => api().checkedState)); })`.

Ready-made: Root gets `omit(props, "class", "style", "slotProps", ...CHECKBOX_INPUT_LABEL_PROPS)`
plus `slotPartProps(props, "root")`; `Input` gets the three ARIA props, then its slot props;
structure `TouchTarget`, `Input`, `Box > CheckIcon, IndeterminateIcon`.

### `@pureform/solid` root additions

`createPartContext<T>(component: string): PartContext<T>`, `PartContext<T> = { Provider:
Context<T | null>; use(part: string): T }` (throws `outsideRootMessage` outside Root).

### Tests

`packages/solid/src/button/button.spec.tsx` (15) and `checkbox/checkbox.spec.tsx` (22), Chromium
browser mode with the fake registry (`__fixtures__/registry.ts` now has a `checkbox` factory whose
classes name the selection, token `boxSize` → `--pf-checkbox-box-size`):

- rendering: elements, `data-scope`/`data-pf-part`, DOM order, registry classes per slot, the
  icon only when given, `aria-hidden` on the icon and box, `hidden` dropped from the marks, no
  inline style on the input;
- keyboard: Enter and Space click the button and mark `data-pf-active` while held; Space toggles
  the checkbox and marks its root; Tab skips disabled ones;
- pointer: clicks, the checkbox's touch target outside the control toggles it;
- controlled and uncontrolled: toggle button and checkbox, callbacks once per action, nothing
  moves until the prop does (including the native input and `indeterminate`), an owner who takes
  the change;
- test ids (prefix and per part, every anatomy part), `unstyled` (all and per part, plus a part's
  own), slot-keyed `class`/`style`/`slotProps`, instance tokens, provider `defaults` and
  `slotProps`;
- forms: submitter name/value, `type="reset"`, `FormData` with `name`/`value`, reset of
  uncontrolled and controlled with `reason: "reset"`, prop and nested-fieldset disabling,
  `invalid`/`required`/`readOnly`;
- naming: `aria-label` on the ready-made checkbox lands on the input; `<label for>` with
  `ids.input`; a part outside Root throws.

## Deviations from the design

- **`Button` is both** the ready-made component and the namespace of parts (`Object.assign`),
  so `<Button label>` and `<Button.Root>` come from one import, as §9.1 writes them.
- **`TouchTarget` is a part** on both components (every AST slot is a part); the phase listed
  only Root, Icon, Label for the button.
- **The ready-made button takes `label`, `icon`, `mirrorIcon`**; no `children`.
- **The checkbox root is a `<label>`** (Zag's root props are a label's, and the touch target then
  toggles), and the preset has no label slot: Zag's `aria-labelledby` is dropped, the input is
  named by `aria-label` (forwarded by the ready-made), or by a `<label for>` at `ids.input`. Don't
  wrap the checkbox in another `<label>`. Recorded in §9.5.
- **Root's `id` becomes the machine's root id** (`ids.root`), since the machines find elements
  by id; a user `id` on a part would break that. Recorded in §9.1.
- **Strict control of the native input** needed a fix p2a didn't have: Zag only writes the input
  when its state changes, so a controlled checkbox the owner ignored kept the browser's toggle.
  Recorded in §9.4.
- **`readOnly` sets `aria-readonly`** on the input (Zag only blocks the click).
- Components aren't re-exported from `@pureform/solid`'s root; only their subpaths.

## Stubs and gaps

- **No axe check yet**; p3c's shared suite adds accessibility, direction, and server rendering.
  SSR isn't exercised here.
- **The ready-made button evaluates `icon` once extra** to decide whether to render the icon
  part (Solid's prop getters build the JSX on read); the part builds it again in its own context
  so `useIconStyle()` works. Harmless for icons, but a stateful icon component runs twice.
- **No link button:** `as="a"` renders an anchor but the machine still writes `type` and
  `disabled` (p1g's gap stands).
- Zag's own fieldset tracking still runs inside the checkbox (p2a's legend-exemption gap).
- `@pureform/solid` isn't a dependency of the demo yet (p3c).
- Pre-existing, unchanged: `rn-parity` "every variant value at rest" (257 of 258 e2e).

## How to verify

- `task_run` `build` and `test:unit` on `@pureform/binding-core` (138 passed, 2 todo, counting
  the type-check run) and `@pureform/solid` (160 passed, 2 todo). Workspace `build` +
  `test:unit`: pass except the pre-existing rn-parity e2e case.
- Single run: `cd packages/solid && set -a; source ../../.env.local; set +a; bun x vitest --config
vitest.config.unit.ts run src/button src/checkbox`.
- Types against a real registry: a file in `apps/solid-demo/src` importing
  `packages/solid/dist/button` type-checks `variant="tonal"` and rejects `variant="nope"` (the
  demo's `.pureform/registry.d.ts` augments `@pureform/styling`); checked by hand, not committed.

## Notes for the next phases

- **p3b (React) mirrors this exactly:** the same subpaths (`@pureform/react/button`,
  `@pureform/react/checkbox`), the same `Object.assign` export shape and part names, the same
  elements, machine props, states, and DOM order per part (tables above), the ready-made
  composition, and Root's props from binding-core's `*RootOwnProps`/`*_ROOT_PROPS`/
  `*_CONTENT_PROPS`/`CHECKBOX_INPUT_LABEL_PROPS` (destructure them off rather than `omit`).
  Differences allowed: `className` instead of `class` in slot-keyed props, `ReactNode` for
  `ButtonContentProps`, `useId()`, values instead of accessors, `createPartContext` as a
  `createContext(null)` + hook pair using `outsideRootMessage`. The icon-presence check is just
  `icon != null && icon !== false` in React. For the strict input: after Zag's `onClick`, restore
  with `syncCheckedInput(input, api.checkedState)` once Zag's queued send and the owner's update
  have rendered (React's timing differs from Solid's: Zag's React adapter also queues the send
  in a microtask and applies state in `flushSync`, so check when the owner's update lands); the spec
  "stays indeterminate when the owner ignores a click" and "asks to change, and moves only with
  the prop" catch it. Copy the two spec files case by case.
- **p3c:** select with `testIds.button.*`/`testIds.checkbox.*`; name checkboxes with
  `aria-label`. The specs' inline `layout` CSS stands in for the preset's input overlay; with the
  real registry the classes do it.
- **p6:** add a component by copying a `button/` or `checkbox/` folder and putting its contract in
  `binding-core/src/components/<name>.ts`; register the entry and subpath. Switch and radio follow
  the checkbox (label root, input part with `checkboxInputProps`-style stripping, the restore
  click, form reset, fieldset).
- **Solid traps hit:** spreading `slotPartProps(props, "root")` into Root needs a cast (`as
object`): a part's `PartProps.id` is `string | RemoveAttribute`, Root's is `string | undefined`.
  Binding-core helpers that take normalized part props must be generic (`<P extends object>`):
  Solid's prop types have no index signature. Zag's `send` runs in a microtask, so anything that
  reads the machine after an event waits a microtask and calls `flush()`.
