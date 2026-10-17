# p6a: Toggles (output context)

Commits: 0483b29..9aa0417, plus the `docs(roadmap)` commit that adds this file.

| Commit    | What                                                                                                                                                         |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `0483b29` | `feat(machines)`: the switch and radio group machines with pureform's fieldset rule and no reset of their own (`withFieldsetRule`)                           |
| `46ea90d` | `feat(anatomy)`: `radioGroupAnatomy` and `compositeTestIds` (`src/composites.ts`)                                                                            |
| `715bbe7` | `feat(binding-core)`: contracts for the switch, radio group, chip, icon button, FAB; `content.ts`; radio helpers in `/dom`; `outsideRootMessage(c, p, root)` |
| `4f8187e` | `feat(solid)`: five subpaths, `useUnstyledComponent`, `usePressable`, `useFormReset({ writeDefault })`, `createPartContext(c, root)`, specs                  |
| `4dcee9b` | `feat(react)`: the same                                                                                                                                      |
| `fcab0a3` | `test(component-suites)`: five cases; `KeyCase.to`, focus re-read after each key, hidden parts skipped in the direction suite, forms fix                     |
| `f52d8c1` | `docs`: READMEs (solid, react, binding-core, machines, anatomy, component-suites)                                                                            |
| `9aa0417` | `docs(design)`: "Built (p6a)" in §8, §9.1, §9.5, §9.6                                                                                                        |

## Built

### Components (both bindings, same subpaths, parts, elements, and DOM order)

| Subpath (`@pureform/solid/…`, `@pureform/react/…`) | Export       | Parts (element)                                                                                                       | Machine                                                 |
| -------------------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `switch`                                           | `Switch`     | `Root` (`label`), `TouchTarget`, `Input` (`input`, `role="switch"`), `Track`, `StateLayer`, `Handle`, `Icon` (`span`) | `@pureform/machines/switch` (Zag's, form rules swapped) |
| `radio-group`                                      | `RadioGroup` | `Root` (`div`, unstyled); per radio `Item` (`label`), `ItemTouchTarget`, `ItemInput` (`input`), `ItemRing`, `ItemDot` | `@pureform/machines/radio-group` (same)                 |
| `chip`                                             | `Chip`       | `Root` (`button`), `TouchTarget`, `Icon`, `Label` (`span`)                                                            | `@pureform/machines/button`                             |
| `icon-button`                                      | `IconButton` | `Root` (`button`), `TouchTarget`, `Container` holding `Icon`, `Outline` (`span`)                                      | `@pureform/machines/button`                             |
| `fab`                                              | `Fab`        | `Root` (`button`), `TouchTarget`, `Container` holding `Icon`, `Label` (`span`)                                        | `@pureform/machines/button` (`toggle: false`)           |

Machine part props per part: switch Root `getRootProps`, Input `switchInputProps(getHiddenInputProps(), readOnly)` + the
restore `onClick`, Track `getControlProps` (aria-hidden), Handle `getThumbProps`; radio Item
`radioItemProps(getItemProps(item))`, ItemInput `radioInputProps(getItemHiddenInputProps(item))` + restore,
ItemRing `radioRingProps(getItemControlProps(item))`, group Root `radioGroupRootProps(getRootProps())`;
button-machine components: Root `getRootProps`, Icon `getIconProps`, Label `getLabelProps`. `pressed`
state: switch `context.get("active")`, radio `getItemState(item).active`, others `api.pressed`.

Ready-made props:

- `Switch`: Root's, slot-keyed `class`/`className`, `style`, `slotProps`; `icon` (the handle's icon part
  renders only when given); `aria-label`/`-labelledby`/`-describedby` go on the input.
- `RadioGroup`: Root's (`class`/`style` are the group element's), `items: { value, label, disabled?,
invalid?, testId? }[]` (`label` is the input's `aria-label`), `slotProps` and `unstyled` keyed by the
  radio's parts, applied to every radio. Solid keys `<For>` by `value`; React by `key={value}`.
- `Chip`: Root's + `label`, `icon`, `mirrorIcon` (`ButtonContentProps`).
- `IconButton`: Root's + `icon`, `mirrorIcon`, and `IconOnlyName` (requires `aria-label` or
  `aria-labelledby`). Type is an alias (`type IconButtonProps = … & IconOnlyName`), not an interface.
- `Fab`: Root's + `icon`, `label`, `mirrorIcon`; `extended` defaults to whether `label` is present;
  typed `({ label } | IconOnlyName)`.

### Contracts (`@pureform/binding-core/src/components/`)

```ts
// switch.ts
SwitchPart; SwitchVariantProps { color, tokens }; SwitchElementIds { root, input };
SwitchBehaviorProps extends Controllable<"checked", boolean> { disabled, invalid, required, readOnly, name, form, value, id, ids }
SwitchRootOwnProps; SWITCH_ROOT_PROPS; SWITCH_INPUT_LABEL_PROPS; SwitchContentProps<Node> { icon }; SWITCH_CONTENT_PROPS
switchSelection(props); switchMachineProps(props, fieldsetDisabled); switchNativeDefault(resetsTo): boolean
switchInputProps(zagProps, readOnly)    // + role "switch", aria-readonly; − style, aria-labelledby

// radio-group.ts
RadioPart; RadioGroupPart; RadioVariantProps { color, density, tokens };
RadioGroupElementIds { root, item?(value), itemHiddenInput?(value) }
RadioGroupBehaviorProps extends Controllable<"value", string | null> { disabled, invalid, required, readOnly, name, form, orientation, id, ids }
RadioGroupRootOwnProps (+ testId; no unstyled); RADIO_GROUP_ROOT_PROPS
RadioOwnProps { value, disabled, invalid, color, density, tokens, testId, unstyled }; RADIO_PROPS
RADIO_INPUT_LABEL_PROPS; RadioGroupItem; RadioGroupContentProps { items }; RADIO_GROUP_CONTENT_PROPS
radioSelection(groupVariants, radioVariants)   // radio's own win; tokens merged
radioGroupMachineProps(props, fieldsetDisabled); radioGroupResetValue(defaultValue): string | null
radioGroupRootProps(p) /* − style, aria-labelledby */; radioItemProps(p) /* − data-ssr */
radioInputProps(p) /* − style, aria-labelledby, data-ssr */; radioRingProps = radioItemProps

// chip.ts:        ChipPart; ChipVariantProps { variant, color, density, tokens }; ChipRootOwnProps (ButtonBehaviorProps + …); CHIP_ROOT_PROPS; chipSelection
// icon-button.ts: IconButtonPart; IconButtonVariantProps { color, variant, shape, size, density, tokens };
//                 IconButtonRootOwnProps; ICON_BUTTON_ROOT_PROPS; isToggle(props); iconButtonSelection(props) // + toggle: isToggle
//                 IconButtonContentProps<Node> { icon, mirrorIcon }; ICON_BUTTON_CONTENT_PROPS
// fab.ts:         FabPart; FabVariantProps { color, variant, size, extended, shape, tokens }; FabBehaviorProps (no toggle);
//                 FabRootOwnProps; FAB_ROOT_PROPS; fabSelection; fabMachineProps (toggle: false); FabContentProps<Node>; FAB_CONTENT_PROPS
// content.ts:     isPresent(node); IconOnlyName; hasAccessibleName(props); missingNameMessage(component)
// parts.ts:       outsideRootMessage(component, part, root = "Root")
```

`@pureform/binding-core/dom`: `radioInputs(group)`, `syncRadioInputs(group, value)`,
`setRadioDefaults(group, value)` (writes only a default that differs).

### Binding helpers (Solid and React alike)

- `useUnstyledComponent(anatomy, { testId })` → `PartScope<A>` (`anatomy`, `part`, `render`): parts
  of an anatomy with no registry entry, same attributes/test ids/merging as `useComponent`.
  `ComponentScope<A>` now extends `PartScope<A>` with `classes`. Exported from the root entry, with
  the `PartScope` and `UnstyledComponentOptions` types.
- `useFormReset(input, { …, writeDefault?(input, value) })`: replaces `setNativeDefault` for a control
  whose default isn't one input's.
- `createPartContext(component, root?)`: `root` names the providing part in the error
  (`<RadioGroup.ItemDot> must be inside <RadioGroup.Item>`).
- `src/pressable.ts` (internal): `usePressable(component, props, machineProps)` → the button
  machine's API, with `useControllable<"selected", boolean>`.
- Test fixtures: `togglesRegistry()` in `src/__fixtures__/registry.ts` (static fake factories for
  `switchControl`, `radio`, `chip`, `iconButton`, `fab`; root class `<name> <name>--<group>-<value>`).
- React's `vitest.config.unit.ts` pre-bundles `@pureform/machines > @zag-js/radio-group` and
  `> @zag-js/switch` (otherwise Vite reloads a test mid-run).

### Machines (`@pureform/machines`)

`src/zag-form.ts`: `withFieldsetRule(machine, element(scope))` returns Zag's machine with its
`trackFormControlState` effect replaced by pureform's `trackFieldsetDisabled` on that element
(setting the `fieldsetDisabled` context) and nothing else, so no Zag reset; `zagElement(idsKey,
fallback)` finds Zag's element by id. `switch.ts` and `radio-group.ts` export `machine` wrapped
(switch: the hidden input; radio group: the root), everything else re-exported from Zag. The
checkbox is unchanged. Specs: `src/zag-form.spec.ts`.

### Anatomy

`src/composites.ts`: `radioGroupAnatomy` (`name: "radioGroup"`, `scope: "radio-group"`, one part
`root`, `styled: false`, test id `pf-radio-group-root`) and `compositeTestIds.radioGroup.root`. Not
in `anatomy` or `testIds`; the drift test doesn't see it.

### Suites

Cases `src/components/{switch,radio-group,chip,icon-button,fab}.ts`, all in `COMPONENTS` and both
scenes. Suite changes: `KeyCase.to` (the state a `change` moves to); `keyboard.focusable(host)` is
read again after the key (focus may move with the state); the direction suite drops parts with no
client rect; `forms` returns early from the `reset` describe for a component with no state (FAB).

## Deviations from the design

- **The radio group's element is a composite anatomy**, not an AST slot: the preset's `radio` is
  one radio. Its parts are named after Zag/Ark (`Item`, `ItemInput`, …) under `RadioGroup`, not a
  separate `Radio` namespace. The group has no label part; Zag's `aria-labelledby` is dropped and
  the group is named with `aria-label`/`aria-labelledby`.
- **`@pureform/machines` changes Zag's switch and radio group machines** (p1g re-exported them
  unchanged): their fieldset tracking and reset. Recorded in §8.
- **Arrow keys in the radio group are the browser's** (native radios with one `name`), not Zag's;
  they follow `dir` in Chromium. The ready-made doesn't set `orientation`.
- **The switch's input gets `role="switch"`** in the contract (Zag's has none).
- **`aria-readonly` on a radio isn't valid**, so read-only is only on the group element (Zag's).
- **The icon-only warning** fires from the icon button's Root and the ready-made FAB (not FAB's
  Root, which can't see a label part). It uses `warnOnce`, so once per page.
- **The suites' keyboard contract changed slightly** (focus re-read; `to`), and the direction
  suite skips hidden parts; button and checkbox are unaffected.

## Stubs and gaps

- **Demos not updated:** `apps/solid-demo` `/components`, `apps/react-demo`, and the css/tailwind
  demos still show only button and checkbox as components (css/tailwind draw the icon button, FAB,
  and switch with `useClasses`). Any later phase may switch them; nothing depends on it.
- **No input chip close button or chip with a trailing icon**: the preset's chip has only `icon`
  and `label` slots.
- **No `RadioGroup.Label` part** (no preset slot); no single ready-made radio outside the group.
- **Radios added after mount** get their native default only at the next `resetsTo` change or the
  next reset's `onBeforeReset`, which writes every radio's; the first-radio form lookup is
  computed when the group element mounts (Solid) or after each commit (React).
- Unit specs are smaller than p3's (19 per binding over the five components); the shared suites
  carry controlled state, forms, keyboard, axe, direction, SSR, and themes.
- Pre-existing, unchanged: `rn-parity` "every variant value at rest" in `browser-e2e-tests`.

## How to verify

- `task_run` `build` + `test:unit` on `@pureform/machines`, `anatomy`, `binding-core`, `solid`,
  `react`: pass. Workspace `build` + `test:unit`: pass except the pre-existing rn-parity case.
- `task_run` `test:e2e` on `@pureform/component-suites`: 42 files, 3780 passed, 192 skipped, 6 todo
  (six projects). Themes and server rendering on `react/*` ran three more times clean.
- One component, one project: `cd tests/component-suites && set -a; source ../../.env.local; set +a;
bun x vitest --config vitest.config.e2e.ts run --project solid/css -t RadioGroup`.
- Unit, one component: `cd packages/react && bun x vitest --config vitest.config.unit.ts run src/radio-group`.

## Notes for the next phases (p6b to p6e)

- **Adding a component** is p3c's five steps minus step 5 (p5a). Contract in
  `binding-core/src/components/<name>.ts` (export from `index.ts`), component in
  `packages/{solid,react}/src/<name>/` with `index.ts` (React's starts with `"use client"`), subpath in
  both `package.json`s and `vite.config.ts`s, a case in `tests/component-suites`.
- **A Zag machine with form tracking** (select, slider if Zag's, any input): wrap it with
  `withFieldsetRule` in `@pureform/machines` (the element is whatever Zag tracks), so the legend
  rule holds and the bindings own the reset; otherwise hydrated-in-legend and React's reset count
  fail. Add the Zag package to `optimizeDeps.include` in Solid's vitest config and as
  `@pureform/machines > @zag-js/<name>` in React's.
- **Parts outside the preset's slots** (a group element, a list container, a dialog's backdrop if
  it isn't a slot): write a composite in `@pureform/anatomy/src/composites.ts` and render it with
  `useUnstyledComponent`. Extra parts _inside_ a slot go in `extras.ts` instead.
- **Zag props that change after hydration** (`data-ssr`, ids built from values) fail the server
  rendering suite: strip them in the contract, as `radioItemProps` does. Zag's inline `style`s on
  hidden inputs and indicators go too.
- **A part the CSS hides** is fine now in the direction suite. A part with two copies (radios,
  list items, tabs) collides by `data-pf-part` name there; the last one wins.
- **Keys that move focus** (tabs, menus, list navigation): `keyboard.focusable(host)` is read again
  after each key, so return where focus should be for the current state; use `KeyCase.to` for a
  change to something other than `state.to`.
- **Themes suite:** every component here draws a themed color in its default props. A component
  that doesn't (a plain container) fails "draws differently in teal".
- **Repeated test ids:** a component that renders several of one anatomy repeats its default test
  ids; cases find items by value or index (`radio-group.ts`), and items take `testId`.
- **Icon-only components** (tabs with icons only, navigation items without labels): reuse
  `IconOnlyName`, `hasAccessibleName`, `missingNameMessage`.
- **Solid traps:** `<For keyed={(item) => item.value}>` gives accessors (`item()`); the default
  `For` gives raw items and re-creates rows for new objects. Generic `useControllable` calls need
  explicit type arguments when the props type is a `Pick` (inference picks the callback type).
- `apps/solid-demo/solid-env.d.ts` changes on workspace builds; restore it before committing.
- **Lockfile untouched** in this phase (no new dependencies).
