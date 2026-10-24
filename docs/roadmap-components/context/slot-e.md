# slot-e: per-instance values, dead parts, gaps

Branch `slot-e`, from `main` at 6601e241. Last of five batches (a-e). Work split across four
helper agents in one worktree (calendars; collections; menus/fields; misc), each owning distinct
component files; the lead built the shared helpers, reviewed, committed, and ran the checks.

## What was done

### 1. Per-instance values (the standard's sketch §5)

- **binding-core `parts.ts`:** `PerInstance<V, I>`, `SlotKeyedEach<P, V, I>`, `PartInstances`,
  `ItemInstance<T>` (`{ index, item }`), `forInstance`, `isPerInstance`. `Unstyled<P, I>` takes
  per-copy functions (Root's default `I` is "any copy", which Root ignores). `overDefaults`
  merges a container's per-copy defaults with a child's own per copy.
- **React:** `SlotKeyedProps<A, Extra, I>`; `useSlotProps` returns `SlotPropsOf`:
  `slot(part, instance)` resolves the functions (and yields `unstyled: true` for that copy),
  `slot.each(part)` says whether a function was passed, so call sites build the instance only
  then. Plain parts are computed once per change, as before.
- **Solid:** same types; `createSlotProps` takes `slots(part, accessor)`; a per-copy part is a
  memo of that copy (rerun when the copy changes); fixed literal props keep the plain-object path.
- **React Native:** `NativeSlotProps<Hosts, I>`; `PartSlots.props/style/on/with` take an optional
  instance; `slot.each(part)`.
- **Components** (instance types in each binding-core component file, exported):
  Rating stars (`RatingStarInstance`), calendar `cell`/`week`/`weekday` (`CalendarCellInstance`
  etc., DatePicker and DockedDatePicker; DateInput draws no calendar), TimePicker
  `dialLabel`/`scrollItem`, Table `row`/`alternateRow`/`cell`/header, footer and sort cells,
  Stepper steps, Tabs, Carousel slides, Accordion items, Tree nodes (now tells leaf and branch
  apart), Menu items at every depth (`MenuItemInstance`; also Select/Autocomplete/SearchView
  `menuProps`), FabMenu items, Slider thumbs and markers, CodeField inputs, ColorPicker swatches
  and channel sliders, NativeSelect options (web), List/SelectionList items, Navigation
  destinations, FileUpload files, toasts. Not done: ButtonGroup/ChipSet/Toolbar children (their
  `buttonProps`/`chipProps` aren't part-keyed; needs per-item inner props), Snackbar (one at a
  time), Paginator (no page parts).

### 2. Dead parts (all wired; nothing removed, so the anatomy is unchanged; `generate` reran clean)

| Part                                                                              | Choice                                                                                         |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Table `sortLabel`, `sortIndicator`                                                | wired on web (`SortHeader` `labelProps`/`indicatorProps`); RN had it                           |
| Splitter `resizeTriggerIndicator`                                                 | wired on web (`ResizeTrigger` `indicatorProps`); RN had it                                     |
| Calendar `weekdays`/`grid` (S), `weekday`/`week` (R, S, N)                        | wired; `week`/`weekday` per copy                                                               |
| Docked picker `actions`                                                           | kept: the compound `DockedDatePicker.Actions` draws it (ready-mades have no actions by design) |
| DateInput `segment` (R)                                                           | wired (`segmentProps` on Input)                                                                |
| TimeInput `input`, `fieldLabel`                                                   | wired (one value for both fields)                                                              |
| TimePicker dial parts, scroll items                                               | wired; labels and items per copy                                                               |
| ColorPicker area background/thumb, transparency grid, channel track/thumb, swatch | wired on web through a `slots` prop; RN had them                                               |
| FileUpload `error`                                                                | wired (`Item` `errorProps`), per file                                                          |
| Label `requiredIndicator`, DragHandle `handle`                                    | wired via `slotProps` on the single-part component                                             |
| Avatar fallback (S)                                                               | Solid always draws `Fallback`, as React does                                                   |
| ListItem `frame`/`action`/`region`                                                | `unstyled` now reaches them (the rest already did)                                             |
| NavigationRail `scrim`/`dialog`                                                   | extra keys on the ready-made, all renderers                                                    |
| Tabs/Stepper `transition`, `transitionScrim`                                      | not parts (props); new `fadeThroughProps`/`horizontalSharedAxisProps`                          |
| CodeField hidden input, CopyButton status span                                    | no anatomy part (a form's hidden input; a visually hidden live region): left as is             |

### 3. Gaps from earlier batches

- FileUpload `error` reachable (above).
- Solid Toolbar: a string `menuProps.style.root` merges with the hidden style (`mergeStyles`).
- React Native: label `Button` triggers of Dialog, FullscreenDialog, BottomSheet, SideSheet,
  Popover, Menu and DatePicker take the `trigger` key on the button's root
  (`react-native/src/trigger-button.ts`, `triggerButtonProps`); a string `testId` names them
  `<prefix>-trigger` (breaking; DatePicker keeps its own id rule). Menu `contextTrigger` keyed.
- ColorPicker hex field: user handlers in `textFieldProps.slotProps.input` compose after the
  picker's (web: the picker's blur/Enter moved onto the input; RN: `onBlur`, `onSubmitEditing`).
- TagsInput: RN reads `chipProps.testId` (web already did); default ids unchanged.
- Also: submenus inherit the menu's `testId`/`unstyled` (R, S); List `Item` honours `unstyled`.

Docs: architecture doc (repeated parts bullet), READMEs (react, solid, react-native,
binding-core), CHANGELOGs (all four).

## Tests

- New specs per component per binding for per-copy functions (and plain values); binding-core
  `parts.spec.ts` (forInstance, isPerInstance, overDefaults by copy).
- `omni run build test -p` binding-core, react, solid, react-native: pass. RN `presence.spec`
  FAB stagger failed once under load, passes alone (known flake). Solid `row-cost.spec` budget
  75 -> 79: the avatar's initials now sit in its `Fallback` part (the Solid fix above).
- Storybook generated stories, 38 touched files, solid/react/native: 496/496 each.
- component-suites (after `generate prepare` of panda-fixture): table-sort, overlays, keyboard,
  forms, tabs-motion, fade-through, shared-axis narrowed `-t` to touched components, `solid/css`
  and `react/css`: 465 passed each.
- rn-web-demo e2e 12/12. `tsc` clean in binding-core, react, solid, react-native, solid-demo,
  react-demo, rn-web-demo. preset `doc-counts.spec` passes.

## Perf

- Without a function, a part takes the cached path (React: one memo per prop change; Solid: plain
  objects for literal props; RN: identity caches). The instance object is built only when
  `slot.each(part)` is true. A function returning a fresh object makes that copy's props new
  each render (memoized RN rows re-render), as any changed prop would.
- Solid's dynamic path makes one memo per copy per per-copy part, once at creation.

## Refactoring hints

- **Helpers that look generic:** `triggerButtonProps` (RN) mirrors web `asRoot`; the "pass the
  ready-made's slot function to compound parts via an internal `slots` prop" pattern now appears
  in calendar parts, ColorPicker, Table `SortHeader`, Splitter `ResizeTrigger`, FileUpload `Item`
  (`errorProps`), NavigationRail (context). A shared "ready-made slots" context per binding could
  replace the props.
- **Code that looks like a sibling's:** the `each ? { … } : undefined` instance construction at
  every repeated site; the Solid inner components added to read per-copy state (Stepper, Tabs,
  Accordion, Tree, Slider thumbs, Navigation `Destination`).
- **Suggested home:** `parts.tsx` per binding (a `slot.instance(part, build)` helper taking a
  builder would remove the `each` checks), binding-core for instance types (already there).
- **What must not change:** the new per-copy specs, `parts.spec.ts`, `row-cost.spec.tsx`,
  `rows.spec.tsx`, the story files and e2e runs above.

## Open questions

- FadeThrough/HorizontalSharedAxis lack part-keyed props on web, so `*Props` reach only their root.
- Label/DragHandle on web take `slotProps` for their second part while the root keeps plain
  `className`/`style` (single-part API kept).
- Month/year calendar cells report `today`/`outside` false on web; RN marks the current year.
- SplitButton/Toolbar `menuProps` are typed without per-item functions (resolved if passed).
- RN FabMenu items still share test ids; RN NativeSelect has no option parts.
- `ToastInstance.id` is asserted from Zag's optional id.
