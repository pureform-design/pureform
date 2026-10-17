# p6b: Text inputs (output context)

Commits: 8e2d105..c82bccb, plus the `docs(roadmap)` commit that adds this file.

| Commit    | What                                                                                                                                                  |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `8e2d105` | `feat(machines)`: the text field machine filled in; `@pureform/machines/select` (Zag's, `withFieldsetRule`); `setNativeDefault` keeps the shown value |
| `619cc5a` | `feat(anatomy)`: `selectMenuAnatomy`, `compositeTestIds.selectMenu`                                                                                   |
| `f515930` | `feat(binding-core)`: `components/text-field.ts`, `components/select.ts`, `syncTextInput` in `/dom`; the machine API's `supportingTextId`             |
| `42953ce` | `fix(binding-core)`: the select's sideways arrows follow `dir`; Zag's item ids take numbers                                                           |
| `5ea2a82` | `feat(solid)`: `text-field`, `text-area`, `select` subpaths; `src/text-input.tsx`; the Zag port sets up context and refs untracked                    |
| `f922d27` | `feat(react)`: the same                                                                                                                               |
| `f35f14c` | `test(component-suites)`: three cases, `FormCase.aria`, the `error` case runs (settles first), the color scheme put back after emulating it           |
| `d85d0ae` | `docs`: READMEs (machines, anatomy, binding-core, solid, react, component-suites)                                                                     |
| `c82bccb` | `docs(design)`: "Built (p6b)" in §8, §9.1, §9.4, §9.5, §9.6                                                                                           |

## Built

### Components (both bindings, same subpaths, parts, elements, and DOM order)

| Subpath (`@pureform/solid/…`, `@pureform/react/…`) | Export      | Parts (element)                                                                                                                                                                                                                                    | Machine                         |
| -------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `text-field`                                       | `TextField` | `Root` (`div`), `Container` (`div`), `LeadingIcon` (`span`), `Input` (`input`), `Label` (`label`), `TrailingIcon` (`span`), `SupportingText` (`span`)                                                                                              | `@pureform/machines/text-field` |
| `text-area`                                        | `TextArea`  | the same, `Input` is a `textarea`                                                                                                                                                                                                                  | `@pureform/machines/text-field` |
| `select`                                           | `Select`    | `Root`, `Container`, `LeadingIcon`, `Input` (read-only `input`, `role="combobox"`), `Label`, `TrailingIcon`, `SupportingText`, `HiddenSelect` (`select`); `Positioner` (`div`), `Content` (`div`), per option `Item` (`div`), `ItemLabel` (`span`) | `@pureform/machines/select`     |

Machine part props: text inputs Root `getRootProps`, Input `getInputProps`/`getTextAreaProps` +
the restore `onInput`/`onChange`, Label `getLabelProps`, SupportingText `getSupportingTextProps`
(children replaced by `api.errorText` while there is one), icons `aria-hidden`, Container state
`filled: api.filled` (`data-pf-filled`). Select: Root `getRootProps`, Container `getControlProps`,
Input `selectInputProps(getTriggerProps(), valueAsString, dir)`, Label `getLabelProps` (Zag's,
`for` the hidden select, which hands focus to the combobox), TrailingIcon `getIndicatorProps`,
SupportingText `{ id: selectSupportingTextId(props, id) }`, HiddenSelect
`selectHiddenSelectProps(getHiddenSelectProps())` with an `<option>` per item, Positioner
`selectPositionerProps(getPositionerProps(), open)`, Content `getContentProps`, Item
`getItemProps({ item })` with `hover: getItemState({ item }).highlighted`, ItemLabel
`getItemTextProps({ item })`. The list's parts use a second scope,
`useComponent(selectMenuAnatomy, { selection: selectMenuSelection(props), testId: string prefix only })`,
styled by the **menu**'s registry entry.

Ready-made props:

- `TextField`/`TextArea`: Root's (with `leadingIcon`/`trailingIcon` replaced by content), slot-keyed
  `class`/`className`, `style`, `slotProps`, `testId`, `unstyled`; content `label`,
  `supportingText`, `leadingIcon`, `trailingIcon`, `mirrorLeadingIcon`, `mirrorTrailingIcon`; the
  input's attributes go on the input: `TEXT_FIELD_INPUT_PROPS` (`type`, `pattern`, `min`, `max`,
  `step`, `list`, `aria-label`, `aria-labelledby`, `aria-describedby`) or `TEXT_AREA_INPUT_PROPS`
  (`rows`, `cols`, `wrap`, the ARIA three), plus each binding's spelling of `autocomplete`,
  `autocapitalize`, `autofocus`, `enterkeyhint`, `inputmode`, `maxlength`, `minlength`, `size`
  (field only), `spellcheck` (Solid lowercase, React camelCase). An icon turns on Root's
  `leadingIcon`/`trailingIcon` (boolean variant). The supporting text renders when given or while
  `errorText` is defined, and the input gets `aria-describedby` to it then.
- `Select`: Root's (`items: { value, label, disabled? }[]`, `value`/`defaultValue`/`onValueChange`
  with `string | null`, `open`/`defaultOpen`/`onOpenChange`, `error`, `positioning`,
  `autoComplete`, …), slot-keyed props for the field's parts, content `label`, `supportingText`,
  `leadingIcon`, `trailingIcon` (default: an inline SVG drop-down arrow); `aria-label`,
  `aria-labelledby`, `aria-describedby` go on the combobox. It renders the hidden select and the
  list (`Positioner > Content > Item > ItemLabel` per item) itself.

The text field and text area come from one internal factory per binding,
`createTextInput({ component, anatomy, element, rootProps, inputProps, selection })` in
`packages/{solid,react}/src/text-input.tsx`, which returns `{ ReadyMade, parts }`; each component
file types its own props and `Object.assign`s them.

### Contracts (`@pureform/binding-core/src/components/`)

```ts
// text-field.ts (text field and text area)
TextFieldPart; TextAreaPart;
TextFieldVariantProps { variant, color, density, leadingIcon?: boolean, trailingIcon?: boolean, tokens }
TextAreaVariantProps  // + autoGrow?: boolean
TextFieldElementIds { root, input, label, supportingText }
TextFieldBehaviorProps extends Controllable<"value", string> { disabled, invalid, error, validate?: "native",
    required, readOnly, placeholder, name, form, id, ids }
TextFieldRootOwnProps; TextAreaRootOwnProps; TEXT_FIELD_ROOT_PROPS; TEXT_AREA_ROOT_PROPS
TEXT_FIELD_INPUT_PROPS; TEXT_AREA_INPUT_PROPS; TextFieldContentProps<Node>; TEXT_FIELD_CONTENT_PROPS
textFieldSelection(props); textAreaSelection(props); textFieldMachineProps(props); textFieldNativeDefault(resetsTo)

// select.ts
SelectPart; SelectMenuPart; SelectVariantProps { variant, color, density, leadingIcon?: boolean, tokens }
SelectElementIds { root, input, label, hiddenSelect, content, positioner, supportingText, item?(value) }
SelectItem { value, label, disabled? }; SelectPositioning { placement, gutter, sameWidth, strategy, flip }
SelectBehaviorProps extends Controllable<"value", string | null>, Controllable<"open", boolean> { items, disabled,
    invalid, error, required, readOnly, name, form, autoComplete, positioning, id, ids }
SelectRootOwnProps; SELECT_ROOT_PROPS; SELECT_INPUT_LABEL_PROPS; SelectContentProps<Node>; SELECT_CONTENT_PROPS
selectSelection(props)            // trailingIcon: true always
selectMenuSelection(props)        // Selection<"menu">: the select's color and density
toZagValue(v); fromZagValue(list); selectValueProps(controllable.machineProps)
selectMachineProps(props, fieldsetDisabled)  // invalid ||= !!error; positioning { placement: "bottom-start", sameWidth: true, ...}
SELECT_COLLECTION { itemToValue, itemToString, isItemDisabled }; selectSupportingTextId(props, id)
selectInputProps(zagTrigger, valueText, dir)  // − type; + readOnly, value, placeholder " ", autoComplete "off"; rtl swaps ArrowLeft/Right
selectPositionerProps(p, open)    // + hidden while closed
selectHiddenSelectProps(p)        // − aria-labelledby
```

`@pureform/binding-core/dom`: `syncTextInput(input, value)` (writes only a different value).

### Machines (`@pureform/machines`)

- **`text-field`** (own): props `value`, `defaultValue` (`""`), `onValueChange`, `disabled`,
  `readOnly`, `required`, `invalid`, `error`, `validate: "native"`, `placeholder` (`" "`), `name`,
  `form`, `ids`. States `idle`/`focused`. Context `value` (bindable, `sync: true`),
  `fieldsetDisabled`, `interacted`, `validationMessage`. Computed `disabled`, `filled`,
  `errorText` (`error`, else under `validate` the input's `validationMessage` once interacted),
  `invalid`. Events `VALUE.SET`, `RESET { value }` (clears `interacted`), `COMMIT` (native
  `change`), `INVALID` (native `invalid`), `FOCUS`, `BLUR`. Effects: `trackFormControl` (fieldset
  only) and the native `change`/`invalid` listeners. Watches write a value from outside to the
  input (`syncInputElement`, equal values untouched), `setCustomValidity(error)`, and re-read
  validity. Api: `value`, `focused`, `filled`, `disabled`, `invalid`, `errorText`,
  `supportingTextId`, `setValue`, `reset`, `focus`, `getRootProps`, `getLabelProps`,
  `getInputProps`, `getTextAreaProps`, `getSupportingTextProps`. The input gets the value as
  `defaultValue` (Zag's hidden-input convention).
- **`select`**: `export * from "@zag-js/select"`, `machine` wrapped with `withFieldsetRule` on the
  hidden select (`select:<id>:select`). Root namespace `select`.
- `setNativeDefault` keeps what an unedited text control or select shows (it wrote the default,
  which moves a non-dirty control).
- New deps: `@zag-js/select`, `@zag-js/collection` (catalog entries); lockfile gained only their
  hunks (+ `@zag-js/dismissable`, `interact-outside`, `popper`, `@floating-ui/*`).

### Anatomy

`selectMenuAnatomy` in `src/composites.ts`: `name: "menu"` (so `useComponent` styles it with the
menu's entry), `scope: "select"`, parts `positioner` (unstyled, `pf-select-positioner`), `root`
(the list, `data-pf-part="content"`, `pf-select-content`), `item` (`pf-select-item`), `itemLabel`
(`pf-select-item-label`); `compositeTestIds.selectMenu`.

### Suites

Cases `src/components/{text-field,text-area,select}.ts` (the first two through
`text-input.ts`), in `COMPONENTS` and both scenes. Text inputs: `value` from `""` to `"a"` (a
click, then the key), forms with `required`, `invalid`, `error`; keys `a`/space change (text
area: Enter adds `"\n"`), Enter does nothing in the field. Select: `value` `"m"` → `"l"` by
opening with a click and clicking the option; `keyboard.focusable` is the list while open;
Enter/Space/Up/Down open (nothing), sideways arrows change by direction. Suite changes:
`FormControl` includes text areas and selects; `FormCase.aria(host)` is the element with
`aria-invalid` when it isn't the native control; the `error` case awaits `harness.settle()` before
reading `validationMessage`, and its `todo` is gone; `server-rendering` and `themes` put the
color scheme back to `light` in `afterAll`.

## Deviations from the design

- **The select's list is drawn by the menu's registry entry** through a composite anatomy, not a
  slot of its own: the preset's select has no list slots ("render the menu component below"). Its
  ids and scope are the select's. Provider `slotProps.menu` reaches it too.
- **The select's `Input` is the preset's read-only `<input role="combobox">`**, not Zag's
  `<button>`: Zag's trigger props are spread on it without `type`, with the value's label as its
  `value` and a one-space placeholder, so `:placeholder-shown` floats the label.
- **One value only:** `value: string | null`, mapped to Zag's list. No `multiple`
  (§9.4's `Select<string[]>` is left for later).
- **The select's sideways arrow keys swap under `rtl`** in the contract; Zag doesn't flip them
  (vertical orientation). Recorded in §9.5.
- **`error` on the select too**, as the hidden select's custom validity; `validate="native"` is the
  text inputs' only.
- **`aria-describedby` is set by the ready-made components**, not the machine: only they know
  whether the supporting text renders, on the server too. Compound users set it on `Input`
  (`api.supportingTextId` / `ids.supportingText`).
- **The ready-made select draws an inline SVG arrow** by default (pureform ships no icon set
  otherwise). Recorded in §9.6.

## Stubs and gaps

- **No `multiple` select**, no option groups (`getItemGroupProps`), no item icons or check marks
  (the menu's `itemLeading`/`itemTrailing` slots aren't parts of `selectMenuAnatomy`), no clear
  trigger.
- **The select's list isn't portaled**: it's positioned (`absolute` by default) inside Root, so a
  clipping ancestor clips it; `positioning={{ strategy: "fixed" }}` escapes most.
- **Before hydration** a select with no value shows its first option (a native select with no
  `selected` option does); the binding clears it at mount.
- **Demos not updated** (as after p6a): the demos still use `useClasses` for the text field.
- `validate="native"` counts the native `change` (commit) or the form's check as the interaction;
  typing and clearing without a commit doesn't show an error yet.
- Pre-existing, unchanged: `rn-parity` "every variant value at rest" in `browser-e2e-tests` (99
  differences).

## How to verify

- `task_run` `build` + `test:unit` on `@pureform/machines`, `anatomy`, `binding-core`, `solid`,
  `react`: pass. Workspace `build` + `test:unit`: pass except the pre-existing rn-parity case.
- `task_run` `test:e2e` on `@pureform/component-suites`: 42 files, 5898 passed, 204 skipped, no
  todo (six projects); ran clean twice in a row after the color-scheme fix.
- One component, one project: `cd tests/component-suites && set -a; source ../../.env.local; set +a;
bun x vitest --config vitest.config.e2e.ts run --project 'react/*' -t Select`.
- Unit: `cd packages/solid && bun x vitest --config vitest.config.unit.ts run src/text-field src/select`.

## Notes for the next phases (p6c to p6e)

- **Flakes seen in p6a were a color-scheme leak**: `emulateColorScheme("dark")` belongs to the
  page, which the next test file reuses, so a later axe or themes run read the dark scheme
  against a light page (only targets that follow the system scheme, CSS and Tailwind, showed it).
  Fixed with `afterAll` in the two emulating suites; a new suite that emulates must do the same.
  The runtime-theme "regenerate" case failed once in the first full run and not after.
- **Menu (p6c):** `selectMenuAnatomy` already renders the menu's `root`, `item`, `itemLabel` slots
  for the select; the menu component should keep those classes and states compatible (the
  highlighted item uses `data-pf-hover`, the chosen one `aria-selected`). Zag's select brought
  `@zag-js/popper` and `dismissable`; Zag's menu, tooltip, and dialog reuse them (no new
  floating-ui hunks).
- **Zag machines that read props while setting up their context** warned `STRICT_READ_UNTRACKED`
  in Solid's hydration; the port now untracks `machine.context` and `machine.refs`.
- **A component whose native control isn't what ARIA reads** (a hidden select, a range input under
  a thumb): set `FormCase.aria`.
- **Overlays in the suites**: keep them inside Root (not portaled) so `host` queries find them, wait
  a few frames after opening (Zag places the positioner in a `raf`), and hide the positioner while
  closed so the direction suite skips it.
- **React and typed text**: an input React doesn't control (`defaultValue`) plus a `sync` bindable
  and a microtask restore keeps the caret; React's own controlled `value` would jump it while
  the machine's update lands a microtask late.
- **React select hidden `<select>`**: options render before the machine starts; clear
  `selectedIndex` in the ref when empty, or `required` passes right after mount.
- `apps/solid-demo/solid-env.d.ts` changes on workspace builds; restore it before committing.
- **`.vitest/` attachment folders** appear under `packages/*/` after unit runs and aren't ignored;
  `git add packages/<name>` picks them up. Stage with `':!packages/<name>/.vitest'`.
