# @pureform/react

pureform's bindings for React 19: the provider, the style registry's hooks, the helpers
components build their parts from, and the components themselves (button, checkbox, switch, radio
group, chip, icon button, FAB, text inputs, overlays, tabs, navigation, and lists so far).
It mirrors `@pureform/solid`'s API with React's idioms (values instead of accessors, `className`
instead of `class`, `useMemo`, `use()` for lazy entries, `useId`). Each component wires its
anatomy to a machine to the registry, and comes ready-made and as compound parts. Machines run
through `@zag-js/react`'s `useMachine`.

## Where it sits

```
@pureform/styling   anatomy   machines   binding-core     (framework-free)
        │              │          │            │
        └──────────────┴────┬─────┴────────────┘
                            │
                    @pureform/react  ──► @zag-js/react, @zag-js/core (types)
                            │
                 react 19, react-dom 19    (peers)
```

Anything that works without React lives in `@pureform/binding-core` (shared with
`@pureform/solid`, and later `@pureform/react-native`); this package adds context, memos,
effects, and rendering. `@pureform/styling` is a peer, so the app's generated registry and the
binding share one copy. See the [design doc](../../docs/design/component-architecture.md), §3,
§5, and §9.

## Architecture

| Module                                                                                                                   | What it holds                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provider.tsx`                                                                                                           | `PureformProvider`, `usePureform`, `useRegistry`, `useDirection`, `useMotion`                                                                                                                  |
| `classes.ts`                                                                                                             | `useClasses`, `useClassFactory`, `useLazyClassFactory`                                                                                                                                         |
| `parts.tsx`                                                                                                              | `useComponent` (a component's classes and parts), `useUnstyledComponent` (parts the registry doesn't style), `useSlotProps`, `slotPartProps`, `mergeRefs`                                      |
| `props.ts`                                                                                                               | React's rules for merging a part's props: one `className` string (`cx`), style objects                                                                                                         |
| `controllable.ts`                                                                                                        | `useControllable`: controlled and uncontrolled props mapped onto a Zag machine                                                                                                                 |
| `form.ts`                                                                                                                | `useFormReset`, `useFieldsetDisabled`                                                                                                                                                          |
| `motion.ts`                                                                                                              | `useReducedMotion`                                                                                                                                                                             |
| `presence.ts`                                                                                                            | `usePresence`: an overlay shown while open and while its exit animation runs                                                                                                                   |
| `icon-style.ts`                                                                                                          | `useIconStyle`, and the context icon parts provide                                                                                                                                             |
| `provided-tokens.tsx`                                                                                                    | `ProvidedTokens` and `useProvidedTokens`: token values handed to nested components (component-architecture.md §5.5); `useComponent` merges a component's share under its own tokens            |
| `part-context.ts`                                                                                                        | `createPartContext`: the context Root shares with its parts, and the error outside Root                                                                                                        |
| `machine.ts`                                                                                                             | `useMachine`: Zag's, typed so a component can pass its optional props through                                                                                                                  |
| `button/`                                                                                                                | `@pureform/react/button`: `button.tsx` (the component), `index.ts`, `button.spec.tsx`                                                                                                          |
| `checkbox/`                                                                                                              | `@pureform/react/checkbox`: the same layout                                                                                                                                                    |
| `switch/`, `radio-group/`, `chip/`, `icon-button/`, `fab/`                                                               | The other components, in the same layout                                                                                                                                                       |
| `text-field/`, `text-area/`, `select/`, `autocomplete/`, `date-picker/`, `docked-date-picker/`, `date-input/`            | The text inputs and date pickers, in the same layout                                                                                                                                           |
| `tabs/`, `navigation-bar/`, `navigation-rail/`                                                                           | Navigation, in the same layout                                                                                                                                                                 |
| `list/`, `list-item/`                                                                                                    | The list and list item, in the same layout                                                                                                                                                     |
| `linear-progress/`, `circular-progress/`, `loading-indicator/`, `slider/`, `card/`, `search-bar/`, `app-bar/`, `ripple/` | Display components, in the same layout                                                                                                                                                         |
| `fade-through/`                                                                                                          | The fade through, in the same layout                                                                                                                                                           |
| `avatar/`, `media/`, `separator/`, `scrim/`, `supporting-text/`, `text/`, `icon/`, `touch-target/`                       | Single-part components: the export is Root itself                                                                                                                                              |
| `single-part.tsx`                                                                                                        | `createSinglePart` (internal): a single-part component's Root                                                                                                                                  |
| `navigation.tsx`                                                                                                         | `createNavigation` (internal): the navigation bar's and rail's parts and ready-made component                                                                                                  |
| `text-input.tsx`                                                                                                         | `createTextInput` (internal): the text field's and text area's parts and ready-made component                                                                                                  |
| `interaction.ts`                                                                                                         | `useOwnInteractionSource`, `useItemInteractionSources` (internal): each interactive component's interaction source (one per item for composites), made on the client and passed to its machine |
| `indication.tsx`                                                                                                         | `useInteractionSource`, `useInteractionState`, `useIndication`; and (internal) how `useComponent` resolves the indication and wires each part the anatomy's indication entry names             |
| `pressable.ts`                                                                                                           | `usePressable` (internal): the button machine for Root, shared by the chip, icon button, and FAB                                                                                               |
| `env.ts`                                                                                                                 | `isDev` (`process.env.NODE_ENV`, left for the app's bundler) and `isServer`                                                                                                                    |

```
Root ── useComponent(anatomy, { selection, testId, unstyled }) ──► useClasses ──► registry entry
  │          │
  │          └─ scope.render(part, { element, as, machine, states, props })
  │                 merges: machine props → data-scope/data-pf-part/data-testid → data-pf-* states
  │                         → registry class + token style → provider slotProps → user props
  └─ context { scope, api } ──► Label, Icon, … call scope.render with their part
```

The merge order comes from binding-core's `partSources`, the rules from `combineProps`; this
package only says how React joins classes (into `className`, `clsx`-style) and styles.

## Public API

Every entry starts with `"use client"`: every export is a hook or a component.

### Components

One subpath per component, so an app's bundle keeps only what it imports. Each export is the
ready-made component, with its compound parts as properties. The API, parts, DOM, and behavior
match `@pureform/solid`'s; one shared browser suite runs against both.

```tsx
import { Button } from "@pureform/react/button";
import { Checkbox } from "@pureform/react/checkbox";
import { Dialog } from "@pureform/react/dialog";
import { Menu } from "@pureform/react/menu";
import { Snackbar } from "@pureform/react/snackbar";
import { Tabs } from "@pureform/react/tabs";
import { NavigationBar } from "@pureform/react/navigation-bar";
import { List } from "@pureform/react/list";
import { ListItem } from "@pureform/react/list-item";
import { Tooltip } from "@pureform/react/tooltip";
import { Popover } from "@pureform/react/popover";
import { RichTooltip } from "@pureform/react/rich-tooltip";

<Button label="Save" icon={<SaveIcon />} variant="tonal" type="submit" />
<Button
    label="Bold"
    defaultSelected={false} // a toggle: aria-pressed, onSelectedChange({ selected })
    className={{ root: ["wide", { busy: saving }], label: "caps" }}
    style={{ root: { marginTop: 8 } }}
    testId="bold" // bold-root, bold-label, …
    slotProps={{ icon: { title: "B" } }}
    unstyled={{ label: true }}
/>
<Button.Root variant="text" onClick={save}>
    <Button.TouchTarget />
    <Button.Icon mirror><ArrowIcon /></Button.Icon>
    <Button.Label>Next</Button.Label>
</Button.Root>

<Checkbox name="terms" aria-label="Accept the terms" defaultChecked />
<Checkbox checked={agreed} onCheckedChange={(d) => setAgreed(d.checked === true)} />
<Switch name="wifi" aria-label="Wi-Fi" icon={<CheckIcon />} />
<RadioGroup
    name="size"
    aria-label="Size"
    defaultValue="m"
    items={[{ value: "s", label: "Small" }, { value: "m", label: "Medium" }]}
/>
<Chip label="Vegan" defaultSelected={false} trailingIcon={<ArrowDownIcon />} /> // a filter chip
<IconButton icon={<StarIcon />} aria-label="Favorite" defaultSelected={false} variant="filled" />
<Fab icon={<EditIcon />} label="Compose" /> // extended, since it has a label
<TextField label="Email" name="email" type="email" supportingText="We won't share it" />
<TextField label="Name" value={name} onValueChange={(d) => setName(d.value)} error={taken ? "Taken" : undefined} />
<TextArea label="Bio" name="bio" rows={3} autoGrow />
<Select
    label="Size"
    name="size"
    defaultValue="m"
    items={[{ value: "s", label: "Small" }, { value: "m", label: "Medium" }]}
/>
<Menu
    trigger="Edit" // drawn as a Button
    items={[{ value: "cut", label: "Cut", leadingIcon: <CutIcon />, trailingText: "⌘X" }]}
    onSelect={(d) => run(d.value)}
/>
<Tooltip trigger="Save" supportingText="Save to drafts" />
<Popover trigger="Filters" heading="Filters" body="Show only the items that match." actions={<Button label="Apply" variant="text" />} caret />
<RichTooltip trigger="Drafts" subhead="Drafts" supportingText="Stay on this device." actions={<Button label="Learn more" variant="text" />} />
<Dialog
    trigger="Discard"
    headline="Discard draft?"
    body="Your changes won't be saved."
    actions={<Button label="Cancel" variant="text" />}
/>
<Snackbar open={saved} onOpenChange={(d) => setSaved(d.open)} supportingText="Saved" action="Undo" closeLabel="Dismiss" />
<Tabs
    aria-label="Trips" // on the tab list
    items={[{ value: "flights", label: "Flights", icon: <PlaneIcon />, content: <Flights /> }]}
    onValueChange={(d) => setTab(d.value)}
/>
<NavigationBar
    aria-label="Main"
    value={route}
    items={[{ value: "home", label: "Home", icon: <HomeIcon />, href: "/" }]} // links; without href, buttons
/>
<List items={[{ headline: "Inbox", supportingText: "3 new", leading: <InboxIcon />, href: "/inbox", selected: true }]} />
<ListItem as="button" headline="Archive" onClick={archive} />
<Menu.Root onSelect={(d) => run(d.value)}>
    <Menu.Trigger as={IconButton} icon={<MoreIcon />} aria-label="More" />
    <Menu.Positioner>
        <Menu.Content>
            <Menu.Item value="share"><Menu.ItemLabel>Share</Menu.ItemLabel></Menu.Item>
        </Menu.Content>
    </Menu.Positioner>
</Menu.Root>
<Menu contextTrigger={<Canvas />} items={[{ value: "paste", label: "Paste" }]} /> // opens at a right-click, a long press, or the context menu key / Shift+F10
// (or compose `Menu.ContextTrigger` around any content). Zag holds a long press 700ms and doesn't let it change; React Native's is 500ms.

<Checkbox.Root ids={{ input: "terms" }} color="error" invalid>
    <Checkbox.TouchTarget />
    <Checkbox.Input />
    <Checkbox.Box>
        <Checkbox.CheckIcon />
        <Checkbox.IndeterminateIcon />
    </Checkbox.Box>
</Checkbox.Root>
```

| Component                         | Parts (element)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Machine                                                                       |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `Button`                          | `Root` (`button`), `TouchTarget`, `Icon`, `SecondaryIcon`, `Label` (`span`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `@pureform/machines/button`                                                   |
| `Checkbox`                        | `Root` (`label`), `TouchTarget` (`span`), `Input` (`input`), `Box`, `CheckIcon`, `IndeterminateIcon`                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Zag's checkbox                                                                |
| `Switch`                          | `Root` (`label`), `TouchTarget`, `Input` (`input`, `role="switch"`), `Track`, `StateLayer`, `Handle`, `Icon`                                                                                                                                                                                                                                                                                                                                                                                                                                          | Zag's switch (`@pureform/machines/switch`)                                    |
| `RadioGroup`                      | `Root` (`div`, unstyled), and per radio `Item` (`label`), `ItemTouchTarget`, `ItemInput` (`input`), `ItemRing`, `ItemDot`                                                                                                                                                                                                                                                                                                                                                                                                                             | Zag's radio group (`@pureform/machines/radio-group`)                          |
| `Chip`                            | `Root` (`button`), `TouchTarget`, `Icon`, `Label`, `TrailingIcon` (`span`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `@pureform/machines/button`                                                   |
| `IconButton`                      | `Root` (`button`), `TouchTarget`, `Container`, `Icon`, `Outline` (`span`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `@pureform/machines/button`                                                   |
| `Fab`                             | `Root` (`button`), `TouchTarget`, `Container`, `Icon`, `Label` (`span`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `@pureform/machines/button` (never a toggle)                                  |
| `TextField`, `TextArea`           | `Root` (`div`), `Container` (`div`), `LeadingIcon`, `PrefixText`\*, `Input` (`input` or `textarea`), `SuffixText`\*, `Label` (`label`), `TrailingIcon` (a `button` when `secure`\*), `SupportingText` (`span`), `Counter` (`span`, under `counterMax`); \* text field only (`SupportingRow` removed: the root wraps)                                                                                                                                                                                                                                  | `@pureform/machines/text-field`                                               |
| `SplitButton`                     | `Root` (`div`, inside the menu's unstyled `Root`), `LeadingButton`, `TrailingButton` (`button`, the menu's trigger), `TrailingIcon` (`span`), `Menu` (the menu's `Positioner` and `Content`; put `Menu.Item`s in it)                                                                                                                                                                                                                                                                                                                                  | Zag's menu (`@pureform/machines/menu`)                                        |
| `FabMenu`                         | `Root` (`div`), `List` (`div`, the menu's content), per item `Item` (`div`), `ItemIcon`, `ItemLabel` (`span`), `CloseTrigger` (`button`, the FAB and the menu's trigger)                                                                                                                                                                                                                                                                                                                                                                              | Zag's menu (`@pureform/machines/menu`)                                        |
| `Select`                          | the field's (`Input` is a read-only `input`), `HiddenSelect` (`select`, unstyled), `Positioner` (`div`, unstyled), `Content` (`div`), and per group `ItemGroup` (`div`) and `ItemGroupLabel` (`div`), per option `Item` (`div`), `ItemLabel` (`span`)                                                                                                                                                                                                                                                                                                 | Zag's select (`@pureform/machines/select`)                                    |
| `Autocomplete`                    | the field's (`Input` is an editable combobox `input`), `Positioner` (`div`, unstyled), `Content` (`div`), and per group `ItemGroup` (`div`) and `ItemGroupLabel` (`div`), per suggestion `Item` (`div`), `ItemLabel` (`span`)                                                                                                                                                                                                                                                                                                                         | Zag's combobox (`@pureform/machines/combobox`)                                |
| `DatePicker`                      | `Root` (`div`, unstyled), `Trigger` (`button`, or `as`), `Backdrop` (the scrim), `Positioner` (`div`, unstyled), `Content` (`div`, the dialog), `Header`, `Headline`, `SelectedDate`, `ModeToggle` (`button`, or `as`), `Divider` (`hr`), `Controls`, `ViewTrigger`, `Prev`, `Next` (`button`, or `as`), `Weekdays`, `Weekday`, `Grid`, `Week`, `YearList` (`div`), `Cell` (its own `calendarCell` component), `Actions`                                                                                                                              | Zag's dialog, and Zag's date picker inline (`@pureform/machines/date-picker`) |
| `DockedDatePicker`                | the field's (`Input` is the date as text, `TrailingIcon` the `button` that opens the calendar), `Positioner` (`div`, unstyled), `Content`, `Controls`, `Prev`, `MonthButton`, `Next`, `YearButton`, `Weekdays`, `Weekday`, `Grid`, `Week`, `MonthList`, `YearList`, `Cell` (a `calendarCell`), `Actions`                                                                                                                                                                                                                                              | Zag's date picker (`@pureform/machines/date-picker`)                          |
| `DateInput`                       | `Root` (`div`, a group), `Header`, `Headline`, `SelectedDate`, `ModeToggle`, `Divider`, `Field`, the field's (`Input` is a group of `Segment`s; a hidden `input` submits), `Actions`                                                                                                                                                                                                                                                                                                                                                                  | Zag's date input (`@pureform/machines/date-input`)                            |
| `TagsInput`                       | the field's (`Root`, `Container`, `LeadingIcon`, `Input`, `Label`, `TrailingIcon`, `SupportingText`), and per value `Chip` (`div`, the input chip's `root` slot), `ChipTouchTarget`, `ChipAvatar` or `ChipIcon`, `ChipLabel` (`span`), `ChipRemove` (`button`); a hidden `input` submits                                                                                                                                                                                                                                                              | Zag's tags input (`@pureform/machines/tags-input`)                            |
| `NumberField`                     | the field's (`Root`, `Container`, `LeadingIcon`, `PrefixText`, `Input` (a `spinbutton` `input`), `SuffixText`, `Label`, `SupportingText`), `Control` (`div`, a group), `DecrementTrigger`, `IncrementTrigger` (`button`; holding one repeats)                                                                                                                                                                                                                                                                                                         | Zag's number input (`@pureform/machines/number-input`)                        |
| `CodeField`                       | `Root` (`div`), `Label` (`label`), `Control` (`div`), an `Input` (`input`) per cell by `index`, `SupportingText` (`span`); a hidden `input` submits the code                                                                                                                                                                                                                                                                                                                                                                                          | Zag's pin input (`@pureform/machines/pin-input`)                              |
| `FileUpload`                      | the machine's `Root` (`div`, with the hidden file `input`), `Label`, `Dropzone` (`div`, a drop target, not a button), `Icon`, `Headline`, `SupportingText`, `Trigger` (a `Button`, which opens the file dialog), `ItemGroup` (`ul`), per file `Item` (`li`, a `ListItem` with a remove `IconButton` and an optional `LinearProgress`) and `Error`. A rejected file's `errors` replace its size. The files are `value` (Zag's `acceptedFiles`), with `defaultValue` and `onValueChange` (`{ value, rejectedFiles }`); the app reports `progress(file)` |
| `CopyButton`                      | the ready-made icon button only (`IconButton`'s props, but `value`, `timeout`, `onCopy`, `label`, `copiedLabel`, `icon`, `copiedIcon`); the root has `data-copied` while copied                                                                                                                                                                                                                                                                                                                                                                       | Zag's clipboard (`@pureform/machines/clipboard`) with the button machine      |
| `Rating`                          | `Root`, `Label` (`label`), `Control` (`div`, `radiogroup`), `Item` (`index`, a `radio`), `Icon`, `Fill`, `HalfFill` (`span`); a hidden `input` submits the value                                                                                                                                                                                                                                                                                                                                                                                      | Zag's rating group (`@pureform/machines/rating-group`)                        |
| `Menu`                            | `Root` (`div`, unstyled), `Trigger` (`button`, or `as`), `Positioner` (`div`, unstyled), `Content` (`div`, the menu's `root` slot), per group `ItemGroup` (`div`; the content marks its first and last groups itself, and a group's `first`/`last` override that) and `ItemGroupLabel` (`div`), per item `Item` (`div`), `ItemLeading`, `ItemContent`, `ItemLabel`, `ItemSupportingText`, `ItemTrailing`, `ItemTrailingText` (`span`); a `Submenu` (`div`, unstyled) holding its `TriggerItem` (`div`, the parent's item), `Positioner` and `Content` | Zag's menu (`@pureform/machines/menu`)                                        |
| `Tooltip`                         | `Root` (`div`, unstyled), `Trigger` (`button`, or `as`), `Positioner` (`div`, unstyled), `Content` (`div`, the tooltip's `root` slot), `SupportingText` (`span`), `Caret` (`div`, with Zag's arrow tip inside)                                                                                                                                                                                                                                                                                                                                        | Zag's tooltip (`@pureform/machines/tooltip`)                                  |
| `RichTooltip`                     | `Root` (`div`, unstyled), `Trigger` (`button`, or `as`), `Positioner` (`div`, unstyled), `Content` (`div`, the rich tooltip's `root` slot), `Subhead`, `SupportingText` (`span`), `Actions` (`div`), `Caret`                                                                                                                                                                                                                                                                                                                                          | Zag's tooltip (`@pureform/machines/tooltip`)                                  |
| `Popover`                         | `Root` (`div`, unstyled), `Trigger` (`button`, or `as`), `Positioner` (`div`, unstyled), `Content` (`div`, the popover's `root` slot), `Title` (`h2`), `Body`, `Actions`, `CloseTrigger` (`button`, or `as`, unstyled), `Caret`; ready-made props `trigger`, `heading`, `body`, `actions`, `caret` (c9c; `modal`, `autoFocus`, `closeOnInteractOutside`, `closeOnEscape`, `restoreFocus`, `initialFocusEl`, `finalFocusEl`, `positioning`, `open`)                                                                                                    |
| `Dialog`                          | `Root` (`div`, unstyled), `Trigger` (`button`, or `as`), `Backdrop` (`div`, the scrim), `Positioner` (`div`, unstyled), `Content` (`div`, the dialog's `root` slot), `Icon` (`span`), `Headline` (`h2`), `Body`, `Actions` (`div`), `CloseTrigger` (`button`, unstyled, or `as`)                                                                                                                                                                                                                                                                      | Zag's dialog (`@pureform/machines/dialog`)                                    |
| `FullscreenDialog`                | `Root` (`div`, unstyled), `Trigger` (`button`, or `as`), `Positioner` (`div`, unstyled), `Content` (`div`, the dialog's `root` slot), `Header`, `Body` (`div`), `CloseTrigger` (`button`, or `as`), `Headline` (`h2`), `ConfirmAction` (`button`, or `as={Button}`)                                                                                                                                                                                                                                                                                   | Zag's dialog (`@pureform/machines/dialog`)                                    |
| `SearchView`                      | `Root` (`div`, unstyled), `Trigger` (`div`, unstyled, around a `SearchBar`), `Positioner` (`div`, unstyled), `Surface` (`div`, the dialog), `Header`, `Divider`, `Content` (`div`, the listbox), `Leading`, `Input` (`input`), `Trailing` (`span`), per suggestion `Item` (`div`), `ItemLeading`, `ItemContent`, `ItemLabel`, `ItemSupportingText`, `ItemTrailing` (`span`)                                                                                                                                                                           | Zag's dialog and combobox (`@pureform/machines/dialog`, `/combobox`)          |
| `Snackbar`                        | `Root` (`div`, `role="status"`), `SupportingText` (`span`), `Actions` (`span`, wraps the buttons), `Action`, `Close` (`button`); `layout`: `oneLine`, `twoLine`, `longAction`                                                                                                                                                                                                                                                                                                                                                                         | `@pureform/machines/snackbar`                                                 |
| `Toast`                           | `Group` (`div`, the region; children render each toast), `Root` (`div`, `role="status"`), `Icon` (`span`), `Title`, `Description` (`div`), `ActionTrigger`, `CloseTrigger` (`button`); `Toaster` is the ready-made                                                                                                                                                                                                                                                                                                                                    | Zag's toast (`@pureform/machines/toast`)                                      |
| `Toolbar`                         | `Root` (`div`, `role="toolbar"`); the ready-made renders `IconButton`s, `Button`s and a `Menu` for its overflow                                                                                                                                                                                                                                                                                                                                                                                                                                       | none (arrow keys move focus)                                                  |
| `TimePicker`, `TimeInput`         | `Root` (`div`, `role="group"`), `Headline`, `Body`, `HourSelector`/`MinuteSelector` (toggle buttons, spin buttons in `mode="scroll"`) or `HourField`/`MinuteField` (`label` around an `input`), `Separator`, `PeriodSelector` with a `Period` each, `Dial` (a slider), `Actions`                                                                                                                                                                                                                                                                      | own (`@pureform/machines/time-picker`)                                        |
| `Paginator`                       | `Root` (`div`, `role="group"`), `PageSize` with `PageSizeLabel` and `PageSizeSelect`, `RangeLabel`, `Actions`, and `FirstTrigger`/`PrevTrigger`/`NextTrigger`/`LastTrigger` (buttons; `as={IconButton}`)                                                                                                                                                                                                                                                                                                                                              | Zag's pagination (`@pureform/machines/paginator`)                             |
| `Carousel`                        | `Root` (`div`, the region; takes `slideCount`), `ItemGroup` (the row), `Item` (`index`, `aspectRatio`), `Mask` (focusable, pressable), `Content`; the ready-made takes `items`                                                                                                                                                                                                                                                                                                                                                                        | Zag's carousel (`@pureform/machines/carousel`)                                |
| `Accordion`                       | `Root` (`div`, a column of items), per item `Item` (`div`, `value`), `Trigger` (`button`, the header), `Leading` (`span`), `Text` around `Title` and `Description` (`span`), `Indicator` (`span`, a chevron by default), `Content` (`div`); the ready-made takes `items`                                                                                                                                                                                                                                                                              | Zag's accordion (`@pureform/machines/accordion`)                              |
| `Tree`                            | `Root` (`div`, takes `items`), `Label` (`span`), `Tree` (`div`, `role="tree"`), per branch `Branch` (`div`, `node`, `indexPath`) around `BranchControl` (`div`, its row) and `Group` (`div`), per leaf `Item` (`div`, its row), `Leading`, `Text`, `Indicator` (`span`); the ready-made takes `items` and `label`                                                                                                                                                                                                                                     | Zag's tree view (`@pureform/machines/tree-view`)                              |
| `Stepper`                         | `Root` (`div`; takes `count`), `List`, `Item` (`index`), `Trigger` (`button`: `error`, `editable`, `disabled`), `Indicator`, `Label`, `Caption`, `Separator`, `Content` (`index` in a row), `NextTrigger`, `PrevTrigger`; the ready-made takes `items`                                                                                                                                                                                                                                                                                                |
| `GridList`                        | `Root` (`div`, `role="list"`; `columns`, `gutter`, `aspect`), `Tile` (`div`, `role="listitem"`; `as="li"` in a `ul`), `Content`, `Media` (`img`), `Header`, `Footer`, `Headline`, `Subhead`; compound only                                                                                                                                                                                                                                                                                                                                            |
| `Tabs`                            | `Root` (`div`, unstyled), `List` (`div`, the tabs' `root` slot), per tab `Tab` (`button`, around its content, a `span` it renders), `Icon`, `Label`, `Indicator` (`span`), per panel `Content` (`div`, unstyled)                                                                                                                                                                                                                                                                                                                                      | Zag's tabs (`@pureform/machines/tabs`)                                        |
| `NavigationBar`, `NavigationRail` | `Root` (`nav`), the rail's `Header` and `SectionLabel` (`div`), per destination `Item` (`a` with an `href`, else `button`), `Indicator`, `ActiveIndicator`, `Icon`, `Label` (`span`)                                                                                                                                                                                                                                                                                                                                                                  | `@pureform/machines/navigation`                                               |
| `ListItem`                        | `Root` (`div`, `a` with an `href`, or `as`), `Leading` (`span`), `Content` (`div`), `Overline`, `Headline`, `SupportingText`, `Trailing`, `TrailingText`, `Indicator` (`span`); an `Expandable` (no element) around `Root` (a `button`) and its `Region` (`div`)                                                                                                                                                                                                                                                                                      | none                                                                          |
| `List`                            | `Root` (`ul`), per item `Item` (`li`) holding a `ListItem`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | none                                                                          |
| `ButtonGroup`                     | `Root` (`div`, `role="group"`), and per button `Button` or `IconButton` (the button and icon button, in the group's variants, `position` and selection)                                                                                                                                                                                                                                                                                                                                                                                               | Zag's toggle group (`@pureform/machines/button-group`) when `selectable`      |
| Component                         | Parts (element)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Machine                                                                       |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------                                                                                       | ----------------------------------------------------------------------------- |
| `Button`                          | `Root` (`button`), `TouchTarget`, `Icon`, `SecondaryIcon`, `Label` (`span`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `@pureform/machines/button`                                                   |
| `Checkbox`                        | `Root` (`label`), `TouchTarget` (`span`), `Input` (`input`), `Box`, `CheckIcon`, `IndeterminateIcon`                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Zag's checkbox                                                                |
| `Switch`                          | `Root` (`label`), `TouchTarget`, `Input` (`input`, `role="switch"`), `Track`, `StateLayer`, `Handle`, `Icon`                                                                                                                                                                                                                                                                                                                                                                                                                                          | Zag's switch (`@pureform/machines/switch`)                                    |
| `RadioGroup`                      | `Root` (`div`, unstyled), and per radio `Item` (`label`), `ItemTouchTarget`, `ItemInput` (`input`), `ItemRing`, `ItemDot`                                                                                                                                                                                                                                                                                                                                                                                                                             | Zag's radio group (`@pureform/machines/radio-group`)                          |
| `Chip`                            | `Root` (`button`), `TouchTarget`, `Icon`, `Label`, `TrailingIcon` (`span`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `@pureform/machines/button`                                                   |
| `IconButton`                      | `Root` (`button`), `TouchTarget`, `Container`, `Icon`, `Outline` (`span`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `@pureform/machines/button`                                                   |
| `Fab`                             | `Root` (`button`), `TouchTarget`, `Container`, `Icon`, `Label` (`span`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `@pureform/machines/button` (never a toggle)                                  |
| `TextField`, `TextArea`           | `Root` (`div`), `Container` (`div`), `LeadingIcon`, `PrefixText`\*, `Input` (`input` or `textarea`), `SuffixText`\*, `Label` (`label`), `TrailingIcon` (a `button` when `secure`\*), `SupportingText` (`span`), `Counter` (`span`, under `counterMax`); \* text field only (`SupportingRow` removed: the root wraps)                                                                                                                                                                                                                                  | `@pureform/machines/text-field`                                               |
| `SplitButton`                     | `Root` (`div`, inside the menu's unstyled `Root`), `LeadingButton`, `TrailingButton` (`button`, the menu's trigger), `TrailingIcon` (`span`), `Menu` (the menu's `Positioner` and `Content`; put `Menu.Item`s in it)                                                                                                                                                                                                                                                                                                                                  | Zag's menu (`@pureform/machines/menu`)                                        |
| `FabMenu`                         | `Root` (`div`), `List` (`div`, the menu's content), per item `Item` (`div`), `ItemIcon`, `ItemLabel` (`span`), `CloseTrigger` (`button`, the FAB and the menu's trigger)                                                                                                                                                                                                                                                                                                                                                                              | Zag's menu (`@pureform/machines/menu`)                                        |
| `Select`                          | the field's (`Input` is a read-only `input`), `HiddenSelect` (`select`, unstyled), `Positioner` (`div`, unstyled), `Content` (`div`), and per group `ItemGroup` (`div`) and `ItemGroupLabel` (`div`), per option `Item` (`div`), `ItemLabel` (`span`)                                                                                                                                                                                                                                                                                                 | Zag's select (`@pureform/machines/select`)                                    |
| `Autocomplete`                    | the field's (`Input` is an editable combobox `input`), `Positioner` (`div`, unstyled), `Content` (`div`), and per group `ItemGroup` (`div`) and `ItemGroupLabel` (`div`), per suggestion `Item` (`div`), `ItemLabel` (`span`)                                                                                                                                                                                                                                                                                                                         | Zag's combobox (`@pureform/machines/combobox`)                                |
| `DatePicker`                      | `Root` (`div`, unstyled), `Trigger` (`button`, or `as`), `Backdrop` (the scrim), `Positioner` (`div`, unstyled), `Content` (`div`, the dialog), `Header`, `Headline`, `SelectedDate`, `ModeToggle` (`button`, or `as`), `Divider` (`hr`), `Controls`, `ViewTrigger`, `Prev`, `Next` (`button`, or `as`), `Weekdays`, `Weekday`, `Grid`, `Week`, `YearList` (`div`), `Cell` (its own `calendarCell` component), `Actions`                                                                                                                              | Zag's dialog, and Zag's date picker inline (`@pureform/machines/date-picker`) |
| `DockedDatePicker`                | the field's (`Input` is the date as text, `TrailingIcon` the `button` that opens the calendar), `Positioner` (`div`, unstyled), `Content`, `Controls`, `Prev`, `MonthButton`, `Next`, `YearButton`, `Weekdays`, `Weekday`, `Grid`, `Week`, `MonthList`, `YearList`, `Cell` (a `calendarCell`), `Actions`                                                                                                                                                                                                                                              | Zag's date picker (`@pureform/machines/date-picker`)                          |
| `DateInput`                       | `Root` (`div`, a group), `Header`, `Headline`, `SelectedDate`, `ModeToggle`, `Divider`, `Field`, the field's (`Input` is a group of `Segment`s; a hidden `input` submits), `Actions`                                                                                                                                                                                                                                                                                                                                                                  | Zag's date input (`@pureform/machines/date-input`)                            |
| `TagsInput`                       | the field's (`Root`, `Container`, `LeadingIcon`, `Input`, `Label`, `TrailingIcon`, `SupportingText`), and per value `Chip` (`div`, the input chip's `root` slot), `ChipTouchTarget`, `ChipAvatar` or `ChipIcon`, `ChipLabel` (`span`), `ChipRemove` (`button`); a hidden `input` submits                                                                                                                                                                                                                                                              | Zag's tags input (`@pureform/machines/tags-input`)                            |
| `NumberField`                     | the field's (`Root`, `Container`, `LeadingIcon`, `PrefixText`, `Input` (a `spinbutton` `input`), `SuffixText`, `Label`, `SupportingText`), `Control` (`div`, a group), `DecrementTrigger`, `IncrementTrigger` (`button`; holding one repeats)                                                                                                                                                                                                                                                                                                         | Zag's number input (`@pureform/machines/number-input`)                        |
| `CodeField`                       | `Root` (`div`), `Label` (`label`), `Control` (`div`), an `Input` (`input`) per cell by `index`, `SupportingText` (`span`); a hidden `input` submits the code                                                                                                                                                                                                                                                                                                                                                                                          | Zag's pin input (`@pureform/machines/pin-input`)                              |
| `FileUpload`                      | the machine's `Root` (`div`, with the hidden file `input`), `Label`, `Dropzone` (`div`, a drop target, not a button), `Icon`, `Headline`, `SupportingText`, `Trigger` (a `Button`, which opens the file dialog), `ItemGroup` (`ul`), per file `Item` (`li`, a `ListItem` with a remove `IconButton` and an optional `LinearProgress`) and `Error`. A rejected file's `errors` replace its size. The files are `value` (Zag's `acceptedFiles`), with `defaultValue` and `onValueChange` (`{ value, rejectedFiles }`); the app reports `progress(file)` |
| `CopyButton`                      | the ready-made icon button only (`IconButton`'s props, but `value`, `timeout`, `onCopy`, `label`, `copiedLabel`, `icon`, `copiedIcon`); the root has `data-copied` while copied                                                                                                                                                                                                                                                                                                                                                                       | Zag's clipboard (`@pureform/machines/clipboard`) with the button machine      |
| `Rating`                          | `Root`, `Label` (`label`), `Control` (`div`, `radiogroup`), `Item` (`index`, a `radio`), `Icon`, `Fill`, `HalfFill` (`span`); a hidden `input` submits the value                                                                                                                                                                                                                                                                                                                                                                                      | Zag's rating group (`@pureform/machines/rating-group`)                        |
| `Menu`                            | `Root` (`div`, unstyled), `Trigger` (`button`, or `as`), `Positioner` (`div`, unstyled), `Content` (`div`, the menu's `root` slot), per group `ItemGroup` (`div`; the content marks its first and last groups itself, and a group's `first`/`last` override that) and `ItemGroupLabel` (`div`), per item `Item` (`div`), `ItemLeading`, `ItemContent`, `ItemLabel`, `ItemSupportingText`, `ItemTrailing`, `ItemTrailingText` (`span`); a `Submenu` (`div`, unstyled) holding its `TriggerItem` (`div`, the parent's item), `Positioner` and `Content` | Zag's menu (`@pureform/machines/menu`)                                        |
| `Tooltip`                         | `Root` (`div`, unstyled), `Trigger` (`button`, or `as`), `Positioner` (`div`, unstyled), `Content` (`div`, the tooltip's `root` slot), `SupportingText` (`span`), `Caret` (`div`, with Zag's arrow tip inside)                                                                                                                                                                                                                                                                                                                                        | Zag's tooltip (`@pureform/machines/tooltip`)                                  |
| `RichTooltip`                     | `Root` (`div`, unstyled), `Trigger` (`button`, or `as`), `Positioner` (`div`, unstyled), `Content` (`div`, the rich tooltip's `root` slot), `Subhead`, `SupportingText` (`span`), `Actions` (`div`), `Caret`                                                                                                                                                                                                                                                                                                                                          | Zag's tooltip (`@pureform/machines/tooltip`)                                  |
| `Popover`                         | `Root` (`div`, unstyled), `Trigger` (`button`, or `as`), `Positioner` (`div`, unstyled), `Content` (`div`, the popover's `root` slot), `Title` (`h2`), `Body`, `Actions`, `CloseTrigger` (`button`, or `as`, unstyled), `Caret`; ready-made props `trigger`, `heading`, `body`, `actions`, `caret` (c9c; `modal`, `autoFocus`, `closeOnInteractOutside`, `closeOnEscape`, `restoreFocus`, `initialFocusEl`, `finalFocusEl`, `positioning`, `open`)                                                                                                    |
| `Dialog`                          | `Root` (`div`, unstyled), `Trigger` (`button`, or `as`), `Backdrop` (`div`, the scrim), `Positioner` (`div`, unstyled), `Content` (`div`, the dialog's `root` slot), `Icon` (`span`), `Headline` (`h2`), `Body`, `Actions` (`div`), `CloseTrigger` (`button`, unstyled, or `as`)                                                                                                                                                                                                                                                                      | Zag's dialog (`@pureform/machines/dialog`)                                    |
| `FullscreenDialog`                | `Root` (`div`, unstyled), `Trigger` (`button`, or `as`), `Positioner` (`div`, unstyled), `Content` (`div`, the dialog's `root` slot), `Header`, `Body` (`div`), `CloseTrigger` (`button`, or `as`), `Headline` (`h2`), `ConfirmAction` (`button`, or `as={Button}`)                                                                                                                                                                                                                                                                                   | Zag's dialog (`@pureform/machines/dialog`)                                    |
| `SearchView`                      | `Root` (`div`, unstyled), `Trigger` (`div`, unstyled, around a `SearchBar`), `Positioner` (`div`, unstyled), `Surface` (`div`, the dialog), `Header`, `Divider`, `Content` (`div`, the listbox), `Leading`, `Input` (`input`), `Trailing` (`span`), per suggestion `Item` (`div`), `ItemLeading`, `ItemContent`, `ItemLabel`, `ItemSupportingText`, `ItemTrailing` (`span`)                                                                                                                                                                           | Zag's dialog and combobox (`@pureform/machines/dialog`, `/combobox`)          |
| `Snackbar`                        | `Root` (`div`, `role="status"`), `SupportingText` (`span`), `Actions` (`span`, wraps the buttons), `Action`, `Close` (`button`); `layout`: `oneLine`, `twoLine`, `longAction`                                                                                                                                                                                                                                                                                                                                                                         | `@pureform/machines/snackbar`                                                 |
| `Toast`                           | `Group` (`div`, the region; children render each toast), `Root` (`div`, `role="status"`), `Icon` (`span`), `Title`, `Description` (`div`), `ActionTrigger`, `CloseTrigger` (`button`); `Toaster` is the ready-made                                                                                                                                                                                                                                                                                                                                    | Zag's toast (`@pureform/machines/toast`)                                      |
| `Toolbar`                         | `Root` (`div`, `role="toolbar"`); the ready-made renders `IconButton`s, `Button`s and a `Menu` for its overflow                                                                                                                                                                                                                                                                                                                                                                                                                                       | none (arrow keys move focus)                                                  |
| `TimePicker`, `TimeInput`         | `Root` (`div`, `role="group"`), `Headline`, `Body`, `HourSelector`/`MinuteSelector` (toggle buttons, spin buttons in `mode="scroll"`) or `HourField`/`MinuteField` (`label` around an `input`), `Separator`, `PeriodSelector` with a `Period` each, `Dial` (a slider), `Actions`                                                                                                                                                                                                                                                                      | own (`@pureform/machines/time-picker`)                                        |
| `Table`                           | `Root` (`table`, `role="table"`), `Header`/`Body`/`Footer` (`thead`/`tbody`/`tfoot`), `HeaderRow`, `Row` (`value`, `index`; `alternateRow` every other one when `striped`), `FooterRow` (`tr`), `HeaderCell` (`th`, `column`, `sortable`: `aria-sort`), `Cell`, `FooterCell` (`td`), `SelectionCell` (a checkbox, or select-all in the header row), `SortHeader` (`button`, with its label and arrow); the ready-made takes `columns` and `rows` and sorts them                                                                                       | own (`@pureform/machines/table`)                                              |
| `Carousel`                        | `Root` (`div`, the region; takes `slideCount`), `ItemGroup` (the row), `Item` (`index`, `aspectRatio`), `Mask` (focusable, pressable), `Content`; the ready-made takes `items`                                                                                                                                                                                                                                                                                                                                                                        | Zag's carousel (`@pureform/machines/carousel`)                                |
| `Tabs`                            | `Root` (`div`, unstyled), `List` (`div`, the tabs' `root` slot), per tab `Tab` (`button`, around its content, a `span` it renders), `Icon`, `Label`, `Indicator` (`span`), per panel `Content` (`div`, unstyled)                                                                                                                                                                                                                                                                                                                                      | Zag's tabs (`@pureform/machines/tabs`)                                        |
| `NavigationBar`, `NavigationRail` | `Root` (`nav`), the rail's `Header` and `SectionLabel` (`div`), per destination `Item` (`a` with an `href`, else `button`), `Indicator`, `ActiveIndicator`, `Icon`, `Label` (`span`)                                                                                                                                                                                                                                                                                                                                                                  | `@pureform/machines/navigation`                                               |
| `ListItem`                        | `Root` (`div`, `a` with an `href`, or `as`), `Leading` (`span`), `Content` (`div`), `Overline`, `Headline`, `SupportingText`, `Trailing`, `TrailingText`, `Indicator` (`span`); an `Expandable` (no element) around `Root` (a `button`) and its `Region` (`div`)                                                                                                                                                                                                                                                                                      | none                                                                          |
| `List`                            | `Root` (`ul`), per item `Item` (`li`) holding a `ListItem`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | none                                                                          |
| `ButtonGroup`                     | `Root` (`div`, `role="group"`), and per button `Button` or `IconButton` (the button and icon button, in the group's variants, `position` and selection)                                                                                                                                                                                                                                                                                                                                                                                               | Zag's toggle group (`@pureform/machines/button-group`) when `selectable`      |

- **Root's props** are the variant groups (`color`, `variant`, …, typed from the app's registry),
  `tokens`, the machine's props (`disabled`, `type`, `name`, `value`, `form`, and the controllable
  `selected` or `checked`), `id` and `ids` (the machine finds its elements by id, so set them
  here rather than on a part), `testId`, `unstyled`, `as`, `ref`, and the element's own props.
  The lists live in `@pureform/binding-core` (`BUTTON_ROOT_PROPS`, `CHECKBOX_ROOT_PROPS`), shared
  with Solid.
- **Parts** take the element's props (and `ref`) and their own `unstyled`; `Button.Icon` takes
  `mirror`. A part outside its Root throws, naming both.
- **The ready-made** component takes Root's props, with `className`, `style`, and `slotProps`
  keyed by part. `Button` takes `label`, `icon` (the icon part renders only when given), and
  `mirrorIcon`. `Checkbox` puts `aria-label`, `aria-labelledby`, and `aria-describedby` on its
  input.
- **The switch, radio group, chip, icon button, and FAB** behave as `@pureform/solid`'s do (see
  its README): the switch is a `<label>` around a checkbox with `role="switch"`; the radio group
  is an unstyled `div` (`radioGroupAnatomy`) around a preset `radio` per `Item`, its ready-made
  taking `items`, and `slotProps`/`unstyled` keyed by the radio's parts; the chip and icon button
  toggle when given `selected` or `defaultSelected` (a toggle icon button also selects the
  `toggle` variant); the FAB is extended when its ready-made has a `label`. Icon-only components
  need `aria-label` or `aria-labelledby`, and warn in development without one.
- **The button group** (`@pureform/react/button-group`) behaves as `@pureform/solid`'s does: a
  `div` with `role="group"` holding `ButtonGroup.Button`s and `ButtonGroup.IconButton`s in its
  variants, each with its `position` (the ready-made sets it from `items`), and toggle buttons on
  Zag's toggle group with `selectable`.
- **The chip set** (`@pureform/react/chip-set`) is a `div` with `role="group"` (`chipSetAnatomy`)
  holding chips in its variants (`variant`, `corner`, `color`, `density`, `tokens` under each
  chip's own); `singleLine` keeps them on one scrolling line. With `selectable` (`single` or
  `multiple`) it runs Zag's toggle group, as the button group does, and its chips are filter
  chips (`aria-pressed`). `ChipSet.Root` and `ChipSet.Chip` compose it.
- **The selection list** (`@pureform/react/selection-list`) is a `List` that is Zag's listbox:
  each option is a `ListItem` with `role="option"` and `aria-selected` (the list item's selected
  colors), in an `li` with `role="presentation"`. `selectionMode` is `single` by default, as
  M3 lists mostly select one; `multiple` selects any number, as Angular's selection list. The list takes focus; the arrow keys and typeahead move a highlight,
  shown as hover, and Enter, Space or a press select.
- **The horizontal shared axis** (`HorizontalSharedAxis`, `@pureform/react/horizontal-shared-axis`)
  moves between spatially related pages as Compose's `MaterialTransitions.HorizontalSharedAxis`:
  give it the page's `index` and the page as children. A higher `index` slides forward (the new
  page from the end, the old one toward the start, a fifth of the width, on the `spatialDefault`
  spring, fading linearly over 90ms after 50ms); a lower one backward; right to left mirrors the
  slide and reduced motion keeps the fades. The old page stays, `inert` and `aria-hidden`, until
  its animations end; `scrim` (off by default: Compose draws it only behind predictive back, which
  pureform leaves out) veils the page underneath in the theme's scrim color (20% over a light
  surface, 80% over a dark one). The ready-made `Tabs` and a row `Stepper` take
  `transition="sharedAxis"` (and `transitionScrim`) to move their panels so, or
  `transition="fadeThrough"` for pages that aren't spatially related; a panel leaving stays drawn
  (`useTransitionPage()`, from either entry, says where the page around a part is). Both
  transitions keep their pages with binding-core's `page-transition` model.
- **Scrollable tabs** (`scrollable`) scroll the newly selected tab into view
  (`revealInRow` from `@pureform/binding-core/dom`).
- **The text field and text area** float their label over a native `<input>` or `<textarea>`
  (its placeholder is one space by default, so the CSS sees when it holds a value; the container
  also gets `data-pf-filled`). The ready-made takes `label`, `supportingText`, `leadingIcon`,
  `trailingIcon` (each icon part renders only when given, and turns on Root's `leadingIcon` or
  `trailingIcon` variant), `mirrorLeadingIcon`, `mirrorTrailingIcon`, and the input's attributes
  (`type`, `autocomplete`, `maxlength`, `rows`, `aria-label`, …), which go on the input. `error`
  marks the field invalid, shows in place of the supporting text, and blocks submitting (custom
  validity); `validate="native"` shows the browser's message once the user commits a change or
  the form is checked; `invalid` only marks it. A controlled field the owner doesn't update puts
  the typed text back.
- **The select** is the text field's look over Zag's select: the `Input` part is a read-only
  combobox `<input>` showing the chosen option's label, the arrow is the trailing icon (a
  drop-down arrow unless given), and the list opens in a `Positioner` (placed by Zag under the
  field, as wide as it) holding `Content`, drawn with the menu's registry entry
  (`selectMenuAnatomy`: test ids `pf-select-content`, `pf-select-item`, …; the highlighted option
  shows the hover state). A hidden native `<select>` with an option per item submits, resets, and
  validates. `value` is one string or `null`; `open` is controllable too. Enter, Space, and the
  arrow keys up and down open the list; the sideways arrow keys choose the option before or after,
  by direction. Root takes `items` (`{ value, label, disabled?, group? }`); the ready-made renders every
  part. Options with a `group` sit together in an `ItemGroup` (`role="group"`) under an
  `ItemGroupLabel` showing the group, in the order each group first appears (the arrow keys follow
  it); options without one render as they are. One value only: no `multiple` yet.
- **The autocomplete** is the select's look over Zag's combobox: the `Input` part is an editable
  combobox `<input>` whose text filters the suggestions (`filter`: contains by default, your own
  `(item, text) => boolean`, or `false` for none), drawn as a menu (`autocompleteMenuAnatomy`).
  The arrow keys move through them, Enter chooses one, Escape closes the list; the trailing arrow
  opens or closes it. The input submits its text and resets with the form; `value`,
  `inputValue`, and `open` are controllable, and `error` blocks submitting. Typed text no
  suggestion matches stays. Import it from `@pureform/react/autocomplete`.
- **The date pickers** take and report ISO dates (`"2026-08-17"`): `value` and `defaultValue`
  are `readonly string[]` (one date, or two with `selectionMode: "range"`), and `onValueChange`
  gets `{ value }`. The locale sets the weekdays, the format and the week's first day
  (`firstDayOfWeek` overrides it), the same on every target. `DatePicker` (from
  `@pureform/react/date-picker`) is a calendar in a dialog that holds a draft: OK commits it,
  Cancel drops it (composed, `ConfirmTrigger` and `CancelTrigger` run them; `DateInput` has the
  same two parts). `DockedDatePicker`
  (`@pureform/react/docked-date-picker`) is a text field whose button opens the calendar under
  it; a typed date sets the value once the field loses focus, a chosen one at once.
  `DateInput` (`@pureform/react/date-input`) takes the date as segments and calls `onConfirm`
  with it; ready-made, it takes `leadingIcon`, `trailingIcon`, `prefixText` and `suffixText` as
  content (not flags) and `mirrorLeadingIcon` and `mirrorTrailingIcon`. Every day, month and year is its own `calendarCell` component (`view`, `selection`,
  `today`, `outside`).
- **The tags input** draws Material's input chips inside the text field's container: Enter (or
  `delimiter`) adds the typed text as a chip, Backspace highlights the last chip (the hover state)
  and then removes it, and each chip's remove button removes it. The input chip exists only inside
  it (drawn with the `inputChip` registry entry, styled by Root's `chip`); tags aren't edited in
  place. `value` is a `string[]`; the ready-made takes `chipAvatar` / `chipIcon` from a value.
- **Overlays render in place.** The menu, tooltip, and dialog have an unstyled `Root` element
  (test id `pf-<name>-root`) around their trigger and a `Positioner`, and draw the preset's surface
  as `Content` (`data-pf-part="content"`, `pf-<name>-content`; the registry's `root` slot styles
  it). Nothing is portaled: the provider's theme, `dir`, and registry reach the overlay as any part,
  and server rendering and hydration see one tree. A clipping or stacking ancestor can cut a menu or
  tooltip off; `positioning={{ strategy: "fixed" }}` escapes most. Each surface stacks at its
  layer of the theme's stacking scale (the positioner takes the surface's `z-index`) and animates
  on `data-state`; `usePresence` (Zag's presence machine on the surface) keeps the positioner and
  surface showing while the exit animation runs, then `hidden`, at once when none runs. `Trigger` is a `<button>`, or any component with `as` (`as={Button}`,
  `as={IconButton}`), which takes the rest of its props; the ready-mades draw it as a `Button`
  labeled with `trigger`, and render none without it (open them with `open`). `open`,
  `defaultOpen`, and `onOpenChange` are controllable on all three.
- **The menu**'s ready-made takes `items` as data: `value`, `label`, and optionally `valueText`,
  `disabled`, `closeOnSelect`, `supportingText` (a line under the label; the label and it sit in
  `ItemContent`), `leadingIcon`, `trailingIcon`, `trailingText`, and the icons' `mirror*` flags.
  An item with `type: "checkbox"` or `"radio"` is toggleable (`menuitemcheckbox`,
  `menuitemradio`): `checked` sets `aria-checked`, which fills it, and `onCheckedChange(checked)`
  reports a toggle. `groups` (`{ id, label?, items }`) render after `items`, each an `ItemGroup`
  (`role="group"`) labelled by its `ItemGroupLabel`; the menu is `grouped` (each group its own
  tile) when it has groups, unless given `grouped`. `vibrant` draws it in the tertiary container's
  colours. Root takes `onSelect({ value })`, `closeOnSelect`, `loopFocus`, `typeahead`,
  and `positioning` (`bottom-start` by default). Open, the surface holds focus and the highlighted
  item shows the hover state (`data-pf-hover`).
- **The tooltip** opens on hover after `openDelay` (400 ms) and on keyboard focus, and points the
  trigger's `aria-describedby` at itself. The ready-made renders `supportingText` in its part, and
  a `Caret` with `caret`. `RichTooltip` is the rich one (it replaces `variant="rich"`): `subhead`,
  `supportingText`, and `actions` in their parts, `interactive` unless told otherwise. Unless it's
  `interactive`, the whole tooltip, positioner and all, lets the pointer through: Zag lays the
  positioner out at the corner of its containing block as it opens, before placing it, where it
  would otherwise take the pointer from a trigger there and close the tooltip. `disabled` stops
  the tooltip, not the trigger.
- **The dialog** is fixed over the viewport and centered (inline layout styles on the
  positioner), with the scrim's registry entry drawing the `Backdrop` (`pf-dialog-backdrop`; Root's
  `testId` and `unstyled` take a `backdrop` key). While a modal dialog is open, Zag keeps focus in
  it, hides the rest of the page from assistive technology, and stops the page scrolling. The
  `Headline` (an `<h2>`) names it and the `Body` describes it. The ready-made takes `icon` (turning
  on the `icon` variant), `mirrorIcon`, `headline`, `body`, and `actions`; `Dialog.CloseTrigger`
  closes it (`as={Button}`).
- **The full-screen dialog** runs on the same Zag machine, in a positioner that fills the viewport
  (no padding, no backdrop). Its `Header` holds the `CloseTrigger` (the ready-made draws an icon
  button named by `closeLabel`, "Close" by default, with `closeIcon` or a cross), the `Headline`
  and the `ConfirmAction` (a text button); the `Body` scrolls. Zag focuses the first focusable
  element, the close trigger. The ready-made takes `trigger`, `closeLabel`, `closeIcon`,
  `headline`, `confirmAction` and `body`. Import it from `@pureform/react/fullscreen-dialog`.
- **The bottom sheet** runs on the same Zag machine, in a positioner fixed to the bottom of the
  viewport, over a `Backdrop` when modal (`modal={false}` makes a standard sheet, no backdrop, the
  page usable). Its `DragHandle` (the drag handle component) closes it on a press or a drag down
  past where it rested (see below). With the default `partiallyExpandable`, a sheet taller than half the screen
  opens partly (its top at half the screen, Compose's `PartiallyExpanded`; `partiallyExpandable={false}`
  opens it fully, as Compose's `skipPartiallyExpanded`), and a drag or a press on the handle moves it
  between partly and fully open (`expanded` controlled, `defaultExpanded`, `onExpandedChange`); a
  drag down from partly open closes it. Where a drag goes is Compose's rule: 56px past where it
  rested, or a flick at 125dp/s. A partly open sheet is placed again when it or the window resizes,
  and the body is in the tab order only while it overflows. A settle after a drag starts at the release's speed. Without
  `aria-label`, the handle is named for what a press does. Root's `onClose` is asked before any close of its own: Escape, the
  scrim, a press on the handle, or a drag. `true` closes, `false` keeps it open (a dragged sheet
  settles back), and a promise keeps it open (a dragged sheet holding where it was let go) until
  it settles (resolved `true` leaves). Closing it through a controlled `open` (the app's own `setOpen(false)`) doesn't ask: by design, as in Radix and MUI, the app already decided. The ready-made takes `trigger`, `dragHandle`, `dragHandleLabel`
  and `body`. Import it from `@pureform/react/bottom-sheet`.
- **`onClose` on the dialog, the full-screen dialog and the side sheet.** Root's `onClose` is asked,
  as the bottom sheet's, before any close of their own: Escape, a press on the scrim (the dialog and
  the side sheet; an `alertdialog` or `closeOnInteractOutside={false}` doesn't close on one), and
  their `CloseTrigger`s, through binding-core's `closeAsker`. `true` closes, `false` keeps it open, a
  promise keeps it open until it settles (a rejection keeps it open). Closing it through a controlled
  `open` doesn't ask, by design. A `BackButton` and the full-screen dialog's `ConfirmAction` don't close
  by themselves, so they don't ask. An app's own Cancel button asks `onClose` by being a
  `CloseTrigger` (`<Dialog.CloseTrigger as={Button}>Cancel</Dialog.CloseTrigger>`); a button that
  sets `open` itself closes without asking. Every overlay takes binding-core's one
  `OverlayCloseProps`.
- **The side sheet** sits against the end edge of the viewport (`coplanar` puts a standard sheet
  in the page's layout). Its `Header` holds a `BackButton`, the `Headline` and the
  `CloseTrigger`; `Body` and `Actions` follow. The ready-made takes `trigger`, `headline`,
  `onBack`, `backLabel`, `backIcon`, `closeLabel`, `closeIcon`, `body` and `actions`. Import it
  from `@pureform/react/side-sheet`.
- **The drag handle** is a `<button>` holding the pill (`orientation="vertical"` for a pane
  divider); name it with `aria-label`. Import it from `@pureform/react/drag-handle`.
- **The color picker** runs Zag's color picker, inline: `ColorPicker.Root` takes `value`/
  `defaultValue`/`onValueChange` (any CSS color in; hex out, `#rrggbb` or `#rrggbbaa` when not
  opaque; the default is `#6750a4`), `onValueChangeEnd`, `disabled`, `readOnly` and `name` (its
  hidden input submits the hex). Inside it, `Label` and `Content` hold the `Area` (saturation and
  brightness, HSB), a `ChannelSlider` per `channel` (`hue`, `alpha` over a transparency grid),
  `Control` with the `ValueSwatch`, the `HexField` (an outlined text field: Enter or leaving it
  sets the color, other text marks it invalid until left) and the `EyeDropperTrigger` (an icon
  button, rendered once mounted where the browser has `EyeDropper`), and the `SwatchGroup` of
  `SwatchTrigger`s (`value`; `aria-pressed` while it's the value). The ready-made takes `label`,
  `area` (default on), `alpha`, `swatches`, `inputLabel`, `eyeDropper` and `eyeDropperLabel`.
  Import it from `@pureform/react/color-picker`.
- **The splitter** runs Zag's splitter: `Splitter.Root` takes the `panels` (`id`, `minSize`,
  `maxSize`, in percent or `"240px"`), `size`/`defaultSize`/`onSizeChange` (percent, the default
  read once; without either the panes share the room from the first render), `anchors`,
  `keyboardResizeBy` and `orientation`; each `Panel` takes its `id`, and a `ResizeTrigger`
  (`id` `"list:detail"`, `label`, default "Resize panes") sits between two, holding Material's
  drag handle pill (Compose's `VerticalDragHandle`, which grows while pressed or dragged). A drag
  or the arrow keys resize the panes (Shift moves 10%, Home and End to the limits). When a drag
  lets go, the divider snaps to the nearest anchor, or the next one the way it was flung past
  200px/s, as Compose's pane expansion: `SPLITTER_ANCHORS` (either edge, 240px from either edge,
  half) by default, `anchors={[]}` to rest where it's let go. A pane's content scrolls natively.
  The ready-made takes `panes` (each with its `content`) and `resizeLabel`. Import it from
  `@pureform/react/splitter`.
- **The search view** runs Zag's dialog (modal: focus stays in it and goes back to the search bar
  once it closes) and Zag's combobox (the query and its suggestions). Its `Trigger` wraps the
  search bar that opens it (a press, Enter, the down arrow, or typing, which carries the key into
  the query). `variant`: `fullScreen` covers the viewport; `docked` and `contained` drop over the
  bar's place inside Root. The `Surface` holds the `Header` (`Leading`, the `Input`, `Trailing`),
  the `Divider`, and the `Content`, with the suggestions drawn as menu items. Enter chooses the
  highlighted suggestion (`onSelect({ value, item })`) or submits the query (`onSubmit({
inputValue })`); either closes it unless `closeOnSelect={false}`. The ready-made takes
  `trigger`, `leading`, `backLabel`, `trailing`, `clearLabel`, and children in place of the
  suggestions. Import it from `@pureform/react/search-view`.
- **The snackbar** is its `Root`: a `role="status"` region, hidden once closed and its exit
  animation over, that closes itself after `duration` (5000 ms; `null` to stay) unless the pointer or focus is in it. `onOpenChange`
  gets `{ open, reason }` (`timeout`, `action`, `close`, `escape`, `open`); `onAction` runs before
  the action asks to close. The ready-made takes `supportingText`, `action` (the button renders
  only when given), `closeLabel` (the close button's name; it renders only when given), and
  `closeIcon` (a cross unless given). Placing it is the app's. `className`, `style`, and `slotProps` are
  keyed by part on every ready-made.
- **The snackbar queue:** `createSnackbarQueue()` gives `show(options)` (an id) and `dismiss(id?)`;
  `<SnackbarHost queue={queue} offset="80px" />` shows its snackbars one at a time, centered at
  the bottom above `offset` (a navigation bar's or a FAB's room). Each takes the ready-made's props
  (`layout` too) and `duration`, `onAction`, `onOpenChange`; the next shows once the one before has
  faded out (`Snackbar.Root`'s `onExitComplete`). Import them from `@pureform/react/snackbar`.
- **The table** (`@pureform/react/table`) holds the sort (`sort`, `defaultSort`, `onSortChange`;
  a sortable column starts at `sortStart`, turns, then clears unless `sortClearable` is false)
  and, with a `selectionMode`, the chosen rows (`selection`, `defaultSelection`,
  `onSelectionChange`) behind a checkbox column. A sort header is a button, so Tab reaches it and
  Enter or Space sorts, the header cell saying so in `aria-sort` (WAI-ARIA's sortable table). The
  ready-made `Table` takes `columns` (`id`, `header`, `footer`, `sortable`, `cell`, `value`) and
  `rows` and sorts them; `striped`, `stickyHeader` and `density` style it.
- **The time picker and time input** (`@pureform/react/time-picker`, `@pureform/react/time-input`)
  hold the time as `HH:mm` (`value`, `defaultValue`, `onValueChange`), on a 12 or 24-hour clock
  (`hourCycle`, else the `locale`'s). The picker's selectors choose what the dial sets; the dial is
  a slider (arrows, Page Up/Down, Home/End; Enter moves to the minutes) and a pointer drags it,
  letting go of an hour moving to the minutes. `mode="scroll"` shows spin buttons instead. The
  input's fields take typed numbers once they read as an hour or minute. With `name`, a hidden
  input submits the time. Put the picker in a `Dialog` for Material's modal picker; `actions` takes
  its buttons.
- **The paginator** (`@pureform/react/paginator`) takes the item `count` and a controllable `page` and
  `pageSize` (`defaultPage`, `onPageChange`, …) on Zag's pagination. The ready-made shows a page-size
  select (`pageSizeOptions`, default 10, 25, 50 and 100; `hidePageSize` removes it), a range label
  ("1 – 10 of 95", a polite live region) and previous and next buttons, with first and last under
  `showFirstLastButtons`. Changing the page size keeps the first item of the page shown. `translations`
  words the labels; `disabled` disables every control. Compose with `Paginator.Root` and its parts;
  the triggers take `as={IconButton}`. The numbered pages Zag offers aren't drawn.
- **The toolbar** (`@pureform/react/toolbar`) renders its `items` as an icon button per element
  with an icon (named by its label) and a text button per element without; `selected` makes an element a toggle. `placement` (`floating`, `docked`),
  `orientation` and `color` (`standard`, `vibrant`) pick the bar. With `overflow`, it measures
  its elements and the room its parent gives it, and moves those that don't fit, from the end,
  into the menu behind an overflow button (`overflowLabel`, "More options"; `overflowIcon`); the
  server renders them all, and the browser hides the rest once mounted. The arrow keys along the
  bar (mirrored under `rtl`), Home and End move focus among its elements. `Toolbar.Root` is the
  bar alone, for your own buttons (no overflow then).
- **The toast** (outside Material 3): `const toaster = createToaster({ placement: "bottom-end" })`
  is Zag's toast store; `<Toaster toaster={toaster} closeLabel="Dismiss" />` shows its toasts, and
  `toaster.success({ title, description, action: { label, onClick } })` (`info`, `warning`,
  `error`, `loading`, `create`, `promise`, `dismiss`) adds one. Each shows its type's icon in the
  type's color (the theme's `success`, `warning`, `error` and `info` groups), its title and
  description, an action, and a close button unless `closable: false`. Zag times, pauses (hover,
  focus) and stacks them; the region sits at the theme's snackbar layer. Compose with
  `Toast.Group` (children: `(toast, index) => …`) and `Toast.Root` and its parts. Import from
  `@pureform/react/toast`.
- **The tabs** are an unstyled `Root` (Zag's root, `pf-tabs-root`) around the tab list (`List`,
  `data-pf-part="list"`, drawn by the tabs' `root` slot) and the panels (`Content`, unstyled, one
  per tab, `hidden` while its tab isn't selected). Only the selected tab takes focus from Tab; the
  arrow keys left and right select the tab before or after, by direction, and Home and End the
  first and last (`activationMode="manual"` waits for Enter or Space). `value` is controllable
  (`string | null`). The ready-made takes `items` (`{ value, label?, "aria-label"?, icon?,
mirrorIcon?, disabled?, content? }`; a tab without a label shows only its icon, named by its
  `aria-label`), puts `aria-label` and `aria-labelledby` on the tab list, turns on the `icon`
  variant when any tab has an icon (`inlineIcon` sets a primary tab's icon beside its label),
  selects the first enabled tab unless given a value, and renders a panel per item with `content`.
  Tabs without panels switch something else and name no panel (`Tab`'s `controls={false}` in
  compound use). Each `Tab` wraps its children in its content (`tabContent`,
  `data-pf-part="tab-content"`), as Material's tabs do, so compound tabs written with `Icon`,
  `Label`, and `Indicator` in a `Tab` get it too: a primary tab's indicator spans the content (at
  least 24px), a secondary one the tab. The ready-made addresses it by slot (`className`, `style`,
  `slotProps`, `testId`), and `Tab` takes its props as `tabContentProps`. Each tab draws its own
  indicator; Zag's moving indicator isn't used. When the value changes (a click, a key, a
  controlled `value`), Root slides the new tab's `Indicator` in from where the old one is drawn
  (`slideIndicator`, design doc §9.10), over the `transform` transition its style declares, moving and resizing it between tabs
  whose content differs in width: not on mount or hydration, not under reduced motion, and from
  where a running slide has got to.
- **The navigation bar and rail** share their parts and behavior: a `<nav>` (name it with
  The bar's `itemLayout="horizontal"` and the rail's `expanded` put labels beside icons. The rail
  takes a `header` (a `Header` part: menu button, FAB) and `modal`: it then renders in Zag's
  dialog over the scrim, along the viewport's start edge, open while `open` (controllable; Escape
  and a click on the scrim close it). `modal` is read once, when Root mounts.
  The page content they switch isn't theirs: wrap it in a `FadeThrough` given the same `value`
  for Material's transition between destinations.
  `aria-label`) of destinations, each a link when it has an `href` and a button otherwise, reached
  in turn with Tab (arrow keys do nothing). `value` (the current destination, controllable) marks
  its item with `aria-current` (`"page"` on a link, `"true"` on a button), which draws its pill and
  fills its icon. A click asks to move; with links, the app's router follows the `href` as usual.
  `disabled` on Root or an item disables buttons and marks links `aria-disabled` (their click is
  stopped). The ready-made takes `items` (`{ value, label, icon?, mirrorIcon?, href?, disabled?
}`).
- **The list item** has no machine. Root is a `<div>` row, a link with `href`, or any element with
  `as` (`as="button"` gets `type="button"`); a link or a button is `interactive` (state layer, focus
  ring) unless told otherwise. `selected` sets `aria-current`, `disabled` a button's `disabled` or
  `aria-disabled`. The ready-made takes `headline`, `overline`, `supportingText`, `leading`,
  `trailing`, `trailingText`, `mirrorLeading`, `mirrorTrailing`, and sets `lines` from them (one,
  two with an overline or supporting text, three with both) unless given. `Leading` and `Trailing`
  are `aria-hidden` (give `aria-hidden={false}` to one that says something). `leadingType`
  (`icon`, `avatar`, `thumbnail`, `video`) sizes the leading part, and `position` (`none`,
  `first`, `middle`, `last`, `single`) shapes a tile in a segmented list. `swipeAction` puts the item in a `frame` with its `action`
  (composed: `ListItem.Frame` around `ListItem.Root` and `ListItem.Action`): the action sits
  under the row (after it in the DOM, so Tab reaches the row first; the row is stacked over it), beside it rather than in it, and dragging the row toward the inline start (or
  the arrow keys on the focused row; Escape closes) slides it over the action, which is `inert`
  until revealed. `revealed`, `defaultRevealed`, `onRevealedChange` and `swipeWidth` (px, 80;
  the preset's `actionWidth` token) control it, on the ready-made item or on `Frame`;
  `actionColor="error"` colours a destructive action with the error container. Since the action
  isn't inside the row, a link, a button, or an expandable item (with a `region`) swipes too.
  `Root` no longer takes `swipeable` or the swipe props: `Frame` replaces them.
- **The list** is a `<ul>` (`listAnatomy`, `pf-list-root`) with each list item in an `<li>`
  (`List.Item`, `pf-list-item`). `variant="segmented"` sets its items apart as tiles, and
  `listTokens` are the list's own tokens. Its `density`, `color`, `leadingType`, and `tokens` are
  every item's defaults. In a segmented list, the ready-made gives each item its `position`
  (`first`, `middle`, `last`, or `single`) unless the item has one. The ready-made takes `items` (a list item's content and props, with an optional
  `value` as its key), and `slotProps` and `unstyled` keyed by the list item's parts, applied to
  every item. A `ListItem` alone isn't in a list; put it in `List.Item`, or give it `as="li"` in
  your own `<ul>`.
- **Progress indicators** (`LinearProgress`: `Track`, `Indicator`, `StopIndicator`; `CircularProgress`: `Track` with its two halves and arcs, then the indicator's) have no machine: Root is a
  `role="progressbar"` with `aria-valuemin`, `aria-valuemax`, and `aria-valuenow`, and `value`
  (from `min` to `max`, 0 to 100 by default) sets the preset's `value` token as a percentage.
  Without a value (or with `indeterminate`) it's indeterminate: no `aria-valuenow`, and the preset
  animates it. Name it with `aria-label`. `<LinearProgress value={40} aria-label="Uploading" />`.
  `shape="wavy"` draws the indicator as a wave (M3 Expressive).
- **The loading indicator** (`LoadingIndicator`: `Root`, `Container` holding `Indicator`) has no
  machine: Root is a `role="progressbar"` with no value, and the preset turns and morphs the
  indicator (a turn only under reduced motion). `variant="contained"` puts it on a round
  container. Name it with `aria-label`. Import it from `@pureform/react/loading-indicator`.
- **The slider** runs Zag's slider machine (`@pureform/machines/slider`). Each thumb's handle has
  the `slider` role and takes focus and the keys (arrows by `dir`, Home, End, Page Up and Down);
  the root takes the pointer. `value` is controllable as a number, or a range's numbers
  (`defaultValue={[20, 60]}`), and reported in the shape given. `centered`, `stops` (`true` or
  values), `valueIndicator`, and `orientation` add M3's configurations. Each thumb submits
  through a hidden input (`name`, or `name[]` for a range). The ready-made puts `aria-label` (one
  per thumb for a range), `aria-labelledby`, `aria-describedby`, and `aria-valuetext` on the
  handles. Compose with `StartTrack`, `Track`, `ActiveTrack`, `MarkerGroup`/`Marker`, and per
  thumb `Handle` (holding `StateLayer`), `ValueIndicator`, `Input`; `insetIcon` (or `InsetIcon`
  between `ActiveTrack` and the handles) draws an icon in the active track from size `medium` up; where
  the active track is too short for it, it's marked `data-pf-overflowing` and sits at the start of
  the inactive track, in its content colour.
  Removed with c1g: the native
  `<input type="range">` (the handle replaces it).
- **The card** has no machine. Root is a `<div>` surface, a link with `href`, or any element with
  `as`; a link or a button is `interactive` (state layer, hover lift, touch target) unless told
  otherwise, and `disabled` disables a button or sets `aria-disabled`. The ready-made takes its
  content as children and renders `TouchTarget` first while interactive. Material's sections are
  parts too (`Media`, `Header`, `Avatar`, `HeaderText`, `Headline`, `Subhead`, `HeaderAction`,
  `Content`, `SupportingText`, `Actions`, `Footer`; Root's `padded={false}` lets them pad
  themselves), and `ActionArea` is the card's own action beside other controls: a link with
  `href`, else a `<button>`, emitting to the card's source, `disabled` with Root unless given. The
  ready-made takes the sections as content props (`headline`, `media`, `actions`, …) and, when it
  acts beside `actions` or a `headerAction`, moves its action and Root's element props to the
  action area (design doc §9.9). `useComponent` takes `entryActive`, which of the anatomy's
  indication entries shows now, and a part an entry names as its `layer` holds the layer.
- **The search bar** runs the text field machine: Root is a `<label>` around `Leading`
  (`aria-hidden`), the `<input type="search">`, and `Trailing` (not hidden: it can hold actions).
  `value` is controllable; `placeholder`, `name`, `form`, `required`, `disabled`, `readOnly` go to
  the input, and so do the ready-made's `aria-label`, `aria-labelledby`, `aria-describedby`,
  `list`, and autocomplete ARIA. Content: `leading`, `trailing`, `mirrorLeading`, `mirrorTrailing`.
  `scrolled` takes the scrolled container colour, for a bar in an app bar scrolled under.
- **The fade through** (`@pureform/react/fade-through`, m3a) is Material's transition between content
  that isn't spatially related: `<FadeThrough value={destination}>…</FadeThrough>` around the page
  content, with the navigation bar's or rail's `value`. A new `value` fades the shown page out (it
  grows to 105%), then the new one in as it grows from 80% on the theme's `spatialDefault` spring;
  the fades are linear, `short2` out and `short4` in after `short2`, as Compose's 90 and 210ms.
  Reduced motion keeps the fades only. The first page doesn't animate; the leaving page
  (`data-state="closed"`) leaves the flow, is `aria-hidden` and `inert`, and goes once its
  animations end (at once unstyled); meanwhile the root is `data-transitioning` and clips, so a
  taller old page doesn't spill. The entering page drops `data-state` once its animations end. Children are the content or a function of the value,
  `{(value) => <Page of={value} />}`. Props: `value`, `testId`, `unstyled`, `as`, and the element's own.
- **The ripple** is the layer a press ripple draws in: put `<Ripple />` inside a positioned
  surface. It runs pureform's ripple machine with `useReducedMotion()` (no ripples while motion is
  reduced) and the `ripple` slot's class for each ripple. Props: `disabled`, `effect`
  (`"ink-well"` or `"ink-sparkle"`), `centered`, `allowPropagation`, `getSurfaceEl`.
- **Single-part components** (`Avatar`, `Badge`, `Media`, `Separator`, `Scrim`, `SupportingText`, `Text`,
  `Icon`, `TouchTarget`) are Root alone (`Avatar.Root` is the same component): their variants,
  `tokens`, `testId`, `unstyled`, `as`, and the element's own props, `className` and `style` included.
  The badge is a `<span>` of its children (`<Badge>3</Badge>`), or a dot with `size="small"`, with
  `placement="anchored"` on the corner of its positioned parent; `label` names it (`role="img"`),
  and a dot without one is `aria-hidden`.
  The avatar is a `<span>` (`role="img"` named by `label`, or hidden without one) holding, with a
  `src`, an `Image` (decorative, `hidden` until it has loaded; Zag's avatar machine) and a `Fallback`
  (its children, shown until then and if the picture fails; `onStatusChange` reports it), else its
  children alone. Compose with `Avatar.Root`, `Avatar.Image`, `Avatar.Fallback`. Media is an `<img>` (`as="video"` for a
  video). The separator is an `<hr>` (another element gets `role="separator"`). The scrim and touch
  target are `aria-hidden`. Text takes the preset's `style` group as `textStyle`, since `style` is
  the element's. The icon is hidden unless given a `label` (then `role="img"`), flips under `rtl`
  with `mirror`, and provides `useIconStyle()` to what it holds.
- **The checkbox is a `<label>`** around the native input, as Zag expects, so a click on its touch
  target toggles it. Name it with `aria-label`, or point a `<label htmlFor>` at `ids.input`;
  don't wrap it in another label. The input carries every native state the CSS reads
  (`:checked`, `:indeterminate`, `:disabled`, `aria-invalid`), and the form reset and fieldset
  rule are the binding's (below).
- **A controlled checkbox doesn't move** until its prop does: after a click, once Zag has sent the
  change, the input is put back to the last committed value (`syncCheckedInput`), and the
  owner's update, if any, then moves it with the machine.

### Provider

```tsx
<PureformProvider
    registry={registry} // from .pureform, or a fake one in tests
    dir="rtl" // written on its element, passed to machines; "ltr" at the root
    motion="reduce" // "system" | "reduce" | "full"; writes data-pf-motion unless "system"
    defaults={{ button: { variant: "tonal" } }}
    slotProps={{ button: { label: { className: "caps" } } }}
    theme="teal" // a named theme, or a runtime one: seedTheme({ seed: "#006A60" })
    overrides={{ "colors.primary": "#006a60" }} // token vars in its element's style
    hydrate="reuse" // or "regenerate": how the client gets a server-rendered runtime theme
>
    <App />
</PureformProvider>
```

It renders a `div` with `display: contents` holding `dir`, `data-pf-motion`, and its theme's
attributes. Other props (`className`, `style`, `data-*`, `ref`) go on that element. Nested
providers inherit what they leave out. Its state is memoized on the options' identity, so keep `defaults`, `slotProps`,
`overrides`, and a runtime `theme` stable (module constants or `useMemo`).

It provides two contexts: the whole state, which `usePureform()` reads, and the part components
read (the registry, `dir`, `motion`, `defaults`, `slotProps`, and the indication), which
`useDirection`, `useMotion`, `useRegistry`, `useClasses`, and `useComponent` read. The theme,
`overrides`, and `hydrate` reach components as CSS only, so changing them renders the provider and
what calls `usePureform()`, not the components under it (200 buttons: 9 ms to 0.3 ms per switch).

**Themes at run time.** `overrides` (token paths, as React Native takes them) become CSS vars in
the element's `style`, named by the registry's `vars`, on the server too. A runtime theme (a
`RuntimeTheme` such as `seedTheme` from `@pureform/material/runtime-theme`) puts the theme
attribute on the element with its scope, `pf-<hash>` of its input, and both schemes' vars in one
`<style href="pf-…" precedence="pureform">`, which React hoists into the head and dedupes by
`href`. On the server the generator must be loaded: `await preloadTheme(theme)` before rendering
(it warns once in development otherwise). With `hydrate: "reuse"` (the default) the client
adopts the server's block and loads nothing; with `"regenerate"`, or without a server block, it
generates (loading the generator after mount the first time). `useThemeVars()` gives the
generated vars. React never removes a hoisted style, so a theme the app switches away from stays
in the head (unused).

| Hook             | Returns                                                                            |
| ---------------- | ---------------------------------------------------------------------------------- |
| `usePureform()`  | `PureformState`: the resolved provider state, the root's with none                 |
| `useRegistry()`  | `AnyRegistry`; throws when no provider has a registry                              |
| `useDirection()` | `"ltr" \| "rtl"`: pass it to every machine as `dir`                                |
| `useThemeVars()` | the nearest runtime theme's generated vars, `undefined` while reusing the server's |
| `useMotion()`    | `MotionSetting`: the nearest `"reduce"` or `"full"`, else `"system"`               |

### Indication

How interactive components show hover, focus, and press (design doc §9.8): the state layer and
the focus indicator are the preset's CSS, and the indication picks their tokens; the ripple
draws in a layer element inside each surface.

```tsx
import {
    defineIndication,
    materialIndication,
    noIndication,
} from "@pureform/react";

<PureformProvider registry={registry} indication={noIndication}>
    {" "}
    {/* every component under it */}
    <Button
        label="Save"
        indication={materialIndication({ ripple: "ink-sparkle" })}
    />
</PureformProvider>;

// An app's own: a softer hover, a thicker focus ring, and a press that scales the surface.
const soft = defineIndication({
    name: "app:soft",
    tokens: { stateHoverOpacity: 0.04, focusIndicatorThickness: 4 },
    web(target, source) {
        return source.subscribe((_, state) => {
            target.surface.style.scale = state.pressed ? "0.98" : "";
        });
    },
});
```

- **The default** is `materialIndication()` (the ink-well ripple). The provider's `indication`
  is inherited and overridable by a nested provider; a component's `indication` prop overrides
  it for that component. The provider writes its indication's tokens as theme-level vars on its
  element (`--opacity-state-hover`, `--sizes-focus-indicator-thickness`); a component's prop
  writes them as instance tokens on its root, so they don't reach a nested component. A
  provider's `focusIndicatorColor` has no theme-level token, so it reaches each component's
  root as an instance token. An indication that sets `focusIndicatorThickness` to 0 warns once
  in development.
- **The layer** is an empty `<span aria-hidden="true" data-ripple-layer>` with the ripple's
  `root` class, rendered first inside the anatomy's surface while the indication has
  `layer: true`, on the server too. The card and the list item show indication only while
  interactive (a link, a button, or `interactive`).
- **The effect** (`web`) runs after mount with the trigger, the surface, the layer, the source,
  and `{ centered, reducedMotion(), dir(), registry }`. The binding doesn't track the layer
  element: the target's `layer` finds it in the surface when the ripple draws. A part attaches
  its element through its ref rather than state, so a surface renders once as it mounts.
- **Sources.** Every interactive component takes `interactionSource` (on Root and the
  ready-made component; a composite's items take one each: `Tabs.Tab`, `Menu.Item`,
  `RadioGroup.Item`, a navigation `Item`, or `interactionSource` in an item's data; the
  snackbar's `Action` and `Close`). Components sharing a source show each other's hover and
  press: the binding marks a hover or press from another origin with `data-pf-hover` or
  `data-pf-active` on the element the preset matches it on (the trigger, or the root around a
  native input), after mount only. Focus is never forwarded.

| Hook                                  | Returns                                                                                                                                                  |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useInteractionSource()`              | a stable `MutableInteractionSource`                                                                                                                      |
| `useInteractionState(source)`         | `InteractionState` (through `useSyncExternalStore`): hovered, focused, focusVisible, pressed, dragged; idle on the server                                |
| `useIndication(source, { centered })` | `{ surface, layer }`: props for an app's own surface (ref, handlers that emit to `source`, forwarded attributes) and the layer to render first inside it |

```tsx
function Tile() {
    const source = useInteractionSource();
    const indication = useIndication(source, { centered: false });
    return (
        <div className="tile" {...indication.surface}>
            {indication.layer}
            Open
        </div>
    );
}
```

### Registry hooks

```ts
useClasses(name, selection): ClassSlots<N>                   // over the provider's defaults
useClassFactory(name: StaticComponentName): ClassFactory<N>  // throws for a lazy entry
useLazyClassFactory(name: LazyComponentName): ClassFactory<N>
```

`useClasses` takes the selection as a plain object, new every render if you like: it's memoized
on the selection's value (`selectionSignature`). A lazy entry suspends to the nearest
`<Suspense>` with `use(entry.load())`, on the server too, so the server renders its classes and
hydration waits for the chunk. `useLazyClassFactory` is client-only: on the server it throws, so
its boundary renders the fallback there (and warns in development).

### Building a component

The components above are the reference: `src/button/button.tsx` and `src/checkbox/checkbox.tsx`.
In short:

```tsx
const context = createPartContext<{ scope: ComponentScope<typeof buttonAnatomy>; api: … }>("Button");

function Root(props: ButtonRootProps) {
    const id = useId();
    const dir = useDirection();
    const selected = useControllable("Button", "selected", props);
    const service = useMachine(button.machine, {
        id,
        dir,
        ...buttonMachineProps(props), // binding-core: the contract Solid shares
        ...selected.machineProps,
    });
    const api = button.connect(service, normalizeProps);
    const scope = useComponent(buttonAnatomy, {
        selection: buttonSelection(props),
        testId: props.testId,
        unstyled: props.unstyled,
    });
    const { as, ...rest } = omitProps(props, BUTTON_ROOT_PROPS); // Root's own props stay off the element
    return (
        <context.Provider value={{ scope, api }}>
            {scope.render("root", {
                element: "button",
                as,
                machine: api.getRootProps(),
                states: { pressed: api.pressed },
                props: rest,
            })}
        </context.Provider>
    );
}

function Icon({ unstyled, mirror, ...props }: ButtonIconProps) {
    const { scope, api } = context.use("Icon"); // throws outside Root
    return scope.render("icon", {
        element: "span",
        machine: api.getIconProps(),
        states: { mirrored: mirror },
        unstyled,
        props,
    });
}
```

`useMachine` is `machine.ts`'s, which lets each machine prop be `undefined`; `omitProps` is in
`props.ts`. `src/__fixtures__/button.tsx` is a smaller example the core specs use.

- `scope.part(part, options)` returns the merged props to spread yourself; `scope.render` also
  renders the element (`as` overrides it), passes the user's `ref` (merged with `options.ref`
  through `mergeRefs`) and `children`, and for an icon part (`mirror: true` in the anatomy)
  provides its element to `useIconStyle()`.
- **State attributes:** `states` sets only `STATE_ATTRIBUTES` (`data-pf-hover`, `data-pf-active`,
  `data-pf-dragging`, `data-pf-filled`, `data-pf-mirror`), `""` when on and absent when off.
  Everything else (`aria-checked`, `aria-pressed`, `:disabled`, …) comes from the machine's
  props or the native element.
- **Test ids:** `pf-<scope>-<part>` by default; Root's `testId` is a prefix (`save` →
  `save-root`) or ids by part.
- `unstyled` (Root's, `true` or per part, or a part's own) drops the registry's class and token
  style for that part. Parts outside the AST's slots never get registry classes.
- Ready-made components take `className` (any `clsx` value), `style`, and `slotProps` keyed by
  part; `testId` and `unstyled` go to Root whole. `useSlotProps(props)` computes every part's
  props from them together, once per change of the three: `slot("label")` is the label's, and a
  part none of them names gets one shared empty object. `slotPartProps(props, part)` gives one
  part's.

### Controllable state and forms

```ts
const checked = useControllable("Checkbox", "checked", props);
// checked.machineProps: { checked, defaultChecked (read once), onCheckedChange (stable) }
const [input, setInput] = useState<HTMLInputElement | null>(null); // ref={setInput}
useFormReset(input, {
    resetsTo: checked.resetsTo === true, // controlled value, else the default
    onBeforeReset: checked.beforeReset,
    onReset: () =>
        checked.reset(() =>
            service.send({
                type: "CHECKED.SET",
                checked: checked.defaultValue ?? false,
                isTrusted: true,
            }),
        ),
});
const fieldsetDisabled = useFieldsetDisabled(input); // OR it into the machine's disabled
```

- A defined value prop controls the state; switching between defined and `undefined` warns once
  per instance in development.
- A form reset calls the callback with `reason: "reset"`. Zag's own reset (during the `reset`
  event, to the value at creation) is reported when uncontrolled and dropped when controlled;
  the binding then sends the real default.
- `useFormReset` writes the input's native default after every commit, since Zag's hidden-input
  props write the current state as the default.

### Motion and icons

- `useReducedMotion(): boolean`: the nearest `"reduce"` (true) or `"full"` (false), else the
  system's `prefers-reduced-motion` (`useSyncExternalStore`; `false` on the server and while
  hydrating).
- `usePresence(open, onShow?): { present: boolean; ref }`: an overlay's presence on Zag's
  presence machine: `present` while open and while the surface given to `ref` runs its exit
  animation, `false` once it ends (at once when none runs). `onShow` gets the surface each time it
  shows, and may return what undoes it (the dialog stacks its positioner there, in the next
  frame).
- `useIconStyle(): IconStyle`: inside an icon part, its measured `{ size, color, filled }`,
  following the component's state; elsewhere `{ size: undefined, color: "currentColor",
filled: false }`.
- `cx(...values)` (from binding-core) joins class values as `clsx` does.

## Build and test

Through the omni MCP (or `omni run`):

- `build`: Vite library build into `dist/index.mjs` and one `dist/<component>.mjs` per subpath
  (shared chunks beside them) with declarations; React, Zag, and the
  pureform packages stay external, and `process.env.NODE_ENV` is left for the app's bundler.
- `test:unit`: Vitest in browser mode (Chromium; `CHROMIUM_PATH` from `.env.local`) with React
  Testing Library, and type checks. The specs use a fake registry
  (`src/__fixtures__/registry.ts`, with button and checkbox factories that name the selection,
  `togglesRegistry()` for the toggles, and `textInputsRegistry()` for the text field, text area, select, and the menu the select draws its list with)
  and the example button. The component specs mirror `@pureform/solid`'s case by case;
  `src/testing/render.tsx` has `outside` (a value set from the test, as a Solid signal) and an
  error boundary. Interactions go through
  `vitest/browser`'s `userEvent` wrapped in `act` (`src/testing/render.tsx`).

## Worth knowing

- The overlays' ready-made triggers import the `Button` (`../button`), so a menu, tooltip, or
  dialog subpath brings the button's part code with it.
- A dialog with no focusable element inside takes focus on its surface (`tabindex="-1"`); after
  the snackbar's action closes it, focus goes back to the page.
- The development warning for a stale generated registry calls `trainVersionMismatch`, which finds
  nothing until p4a records it.
- Server rendering isn't exercised by these tests (p3c's hydration suite).
- `useIconStyle` doesn't see a style that changes by a pseudo-class alone (`:hover`) with no
  transition.
- **No link button yet:** `<Button.Root as="a">` renders an anchor, but the machine still writes
  `type` and `disabled` on it.
- Components aren't re-exported from the root entry; import them from their subpaths.
