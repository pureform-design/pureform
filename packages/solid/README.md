# @pureform/solid

pureform's bindings for Solid 2: the provider, the style registry's hooks, the helpers
components build their parts from, and the components themselves (button, checkbox, switch, radio
group, chip, icon button, FAB, text inputs, overlays, tabs, navigation, and lists so far),
on top of a port of Zag.js's Solid adapter to Solid 2. Each component wires its anatomy to a
machine to the registry, and comes ready-made and as compound parts.

## Where it sits

```
@pureform/styling   anatomy   machines   binding-core     (framework-free)
        │              │          │            │
        └──────────────┴────┬─────┴────────────┘
                            │
@pureform/solid  ── internal/zag ──► @zag-js/core, types, utils
                            │
          solid-js 2, @solidjs/web     (peers, pinned to the tested release candidate)
```

Anything that works without Solid lives in `@pureform/binding-core` (shared with
`@pureform/react`); this package adds context, memos, effects, and rendering. `@pureform/styling`
is a peer, so the app's generated registry and the binding share one copy. See the
[design doc](../../docs/design/component-architecture.md), §3, §5, §8, and §9.

## Architecture

| Module                                                                                             | What it holds                                                                                                                                                                                                                 |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provider.tsx`                                                                                     | `PureformProvider`, `usePureform`, `useRegistry`, `useDirection`, `useMotion`                                                                                                                                                 |
| `classes.ts`                                                                                       | `useClasses`, `useClassFactory`, `useLazyClassFactory`                                                                                                                                                                        |
| `parts.tsx`                                                                                        | `useComponent` (a component's classes and parts), `useUnstyledComponent` (parts the registry doesn't style), `createSlotProps`, `optionalPart`, `slotPartProps` (ready-made components)                                       |
| `props.ts`                                                                                         | Solid's rules for merging a part's props: class arrays, style objects, `[handler, data]`                                                                                                                                      |
| `controllable.ts`                                                                                  | `useControllable`: controlled and uncontrolled props mapped onto a Zag machine                                                                                                                                                |
| `form.ts`                                                                                          | `useFormReset`, `useFieldsetDisabled`                                                                                                                                                                                         |
| `motion.ts`                                                                                        | `useReducedMotion`                                                                                                                                                                                                            |
| `presence.ts`                                                                                      | `usePresence`: an overlay shown while open and while its exit animation runs                                                                                                                                                  |
| `icon-style.ts`                                                                                    | `useIconStyle`, and the context icon parts provide                                                                                                                                                                            |
| `part-context.ts`                                                                                  | `createPartContext`: the context Root shares with its parts, and the error outside Root                                                                                                                                       |
| `button/`                                                                                          | `@pureform/solid/button`: `button.tsx` (the component), `index.ts`, `button.spec.tsx`                                                                                                                                         |
| `checkbox/`                                                                                        | `@pureform/solid/checkbox`: the same layout                                                                                                                                                                                   |
| `switch/`, `radio-group/`, `chip/`, `icon-button/`, `fab/`                                         | The other components, in the same layout                                                                                                                                                                                      |
| `text-field/`, `text-area/`, `select/`                                                             | The text inputs, in the same layout                                                                                                                                                                                           |
| `tabs/`, `navigation-bar/`, `navigation-rail/`                                                     | Navigation, in the same layout                                                                                                                                                                                                |
| `list/`, `list-item/`                                                                              | The list and list item, in the same layout                                                                                                                                                                                    |
| `linear-progress/`, `circular-progress/`, `slider/`, `card/`, `search-bar/`, `ripple/`             | Display components, in the same layout                                                                                                                                                                                        |
| `avatar/`, `media/`, `separator/`, `scrim/`, `supporting-text/`, `text/`, `icon/`, `touch-target/` | Single-part components: the export is Root itself                                                                                                                                                                             |
| `single-part.tsx`                                                                                  | `createSinglePart` (internal): a single-part component's Root                                                                                                                                                                 |
| `navigation.tsx`                                                                                   | `createNavigation` (internal): the navigation bar's and rail's parts and ready-made component                                                                                                                                 |
| `text-input.tsx`                                                                                   | `createTextInput` (internal): the text field's and text area's parts and ready-made component                                                                                                                                 |
| `interaction.ts`                                                                                   | `useOwnInteractionSource`, `itemInteractionSources`, `useInteractionHandlers` (internal): each component's source (the app's, or its own; one per item for composites), and the handlers a surface with no machine emits with |
| `indication.tsx`                                                                                   | `createInteractionSource`, `useInteractionState`, `useIndication`; and (internal) how `useComponent` resolves the indication and wires each part the anatomy's indication entry names                                         |
| `pressable.ts`                                                                                     | `usePressable` (internal): the button machine for Root, shared by the chip, icon button, and FAB                                                                                                                              |
| `internal/zag/`                                                                                    | The Zag port (below)                                                                                                                                                                                                          |

```
Root ── useComponent(anatomy, { selection, testId, unstyled }) ──► useClasses ──► registry entry
  │          │
  │          └─ scope.render(part, { element, as, machine, states, props })
  │                 merges: machine props → data-scope/data-pf-part/data-testid → data-pf-* states
  │                         → registry class + token style → provider slotProps → user props
  └─ context { scope, api } ──► Label, Icon, … call scope.render with their part
```

## Public API

### Components

One subpath per component, so an app's bundle keeps only what it imports. Each export is the
ready-made component, with its compound parts as properties.

```tsx
import { Button } from "@pureform/solid/button";
import { Checkbox } from "@pureform/solid/checkbox";
import { Dialog } from "@pureform/solid/dialog";
import { Menu } from "@pureform/solid/menu";
import { Snackbar } from "@pureform/solid/snackbar";
import { Tabs } from "@pureform/solid/tabs";
import { NavigationBar } from "@pureform/solid/navigation-bar";
import { List } from "@pureform/solid/list";
import { ListItem } from "@pureform/solid/list-item";
import { Tooltip } from "@pureform/solid/tooltip";

<Button label="Save" icon={<SaveIcon />} variant="tonal" type="submit" />
<Button
    label="Bold"
    defaultSelected={false} // a toggle: aria-pressed, onSelectedChange({ selected })
    class={{ root: ["wide", { busy: saving() }], label: "caps" }}
    style={{ root: { "margin-top": "8px" } }}
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
<Checkbox checked={agreed()} onCheckedChange={(d) => setAgreed(d.checked === true)} />
<Switch name="wifi" aria-label="Wi-Fi" icon={<CheckIcon />} />
<RadioGroup
    name="size"
    aria-label="Size"
    defaultValue="m"
    items={[{ value: "s", label: "Small" }, { value: "m", label: "Medium" }]}
/>
<Chip label="Vegan" defaultSelected={false} /> // a filter chip
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
<Dialog
    trigger="Discard"
    headline="Discard draft?"
    body="Your changes won't be saved."
    actions={<Button label="Cancel" variant="text" />}
/>
<Snackbar open={saved()} onOpenChange={(d) => setSaved(d.open)} supportingText="Saved" action="Undo" closeLabel="Dismiss" />
<Tabs
    aria-label="Trips" // on the tab list
    items={[{ value: "flights", label: "Flights", icon: <PlaneIcon />, content: <Flights /> }]}
    onValueChange={(d) => setTab(d.value)}
/>
<NavigationBar
    aria-label="Main"
    value={route()}
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

<Checkbox.Root ids={{ input: "terms" }} color="error" invalid>
    <Checkbox.TouchTarget />
    <Checkbox.Input />
    <Checkbox.Box>
        <Checkbox.CheckIcon />
        <Checkbox.IndeterminateIcon />
    </Checkbox.Box>
</Checkbox.Root>
```

| Component                         | Parts (element)                                                                                                                                                                                                                                                                  | Machine                                              |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `Button`                          | `Root` (`button`), `TouchTarget`, `Icon`, `Label` (`span`)                                                                                                                                                                                                                       | `@pureform/machines/button`                          |
| `Checkbox`                        | `Root` (`label`), `TouchTarget` (`span`), `Input` (`input`), `Box`, `CheckIcon`, `IndeterminateIcon`                                                                                                                                                                             | Zag's checkbox, through `internal/zag`               |
| `Switch`                          | `Root` (`label`), `TouchTarget`, `Input` (`input`, `role="switch"`), `Track`, `StateLayer`, `Handle`, `Icon`                                                                                                                                                                     | Zag's switch (`@pureform/machines/switch`)           |
| `RadioGroup`                      | `Root` (`div`, unstyled), and per radio `Item` (`label`), `ItemTouchTarget`, `ItemInput` (`input`), `ItemRing`, `ItemDot`                                                                                                                                                        | Zag's radio group (`@pureform/machines/radio-group`) |
| `Chip`                            | `Root` (`button`), `TouchTarget`, `Icon`, `Label` (`span`)                                                                                                                                                                                                                       | `@pureform/machines/button`                          |
| `IconButton`                      | `Root` (`button`), `TouchTarget`, `Container`, `Icon`, `Outline` (`span`)                                                                                                                                                                                                        | `@pureform/machines/button`                          |
| `Fab`                             | `Root` (`button`), `TouchTarget`, `Container`, `Icon`, `Label` (`span`)                                                                                                                                                                                                          | `@pureform/machines/button` (never a toggle)         |
| `TextField`, `TextArea`           | `Root` (`div`), `Container` (`div`), `LeadingIcon`, `Input` (`input` or `textarea`), `Label` (`label`), `TrailingIcon`, `SupportingText` (`span`)                                                                                                                                | `@pureform/machines/text-field`                      |
| `Select`                          | the field's (`Input` is a read-only `input`), `HiddenSelect` (`select`, unstyled), `Positioner` (`div`, unstyled), `Content` (`div`), and per option `Item` (`div`), `ItemLabel` (`span`)                                                                                        | Zag's select (`@pureform/machines/select`)           |
| `Menu`                            | `Root` (`div`, unstyled), `Trigger` (`button`, or `as`), `Positioner` (`div`, unstyled), `Content` (`div`, the menu's `root` slot), per item `Item` (`div`), `ItemLeading`, `ItemLabel`, `ItemTrailing`, `ItemTrailingText` (`span`)                                             | Zag's menu (`@pureform/machines/menu`)               |
| `Tooltip`                         | `Root` (`div`, unstyled), `Trigger` (`button`, or `as`), `Positioner` (`div`, unstyled), `Content` (`div`, the tooltip's `root` slot), `Subhead`, `SupportingText` (`span`), `Actions` (`div`)                                                                                   | Zag's tooltip (`@pureform/machines/tooltip`)         |
| `Dialog`                          | `Root` (`div`, unstyled), `Trigger` (`button`, or `as`), `Backdrop` (`div`, the scrim), `Positioner` (`div`, unstyled), `Content` (`div`, the dialog's `root` slot), `Icon` (`span`), `Headline` (`h2`), `Body`, `Actions` (`div`), `CloseTrigger` (`button`, unstyled, or `as`) | Zag's dialog (`@pureform/machines/dialog`)           |
| `Snackbar`                        | `Root` (`div`, `role="status"`), `SupportingText` (`span`), `Action`, `Close` (`button`)                                                                                                                                                                                         | `@pureform/machines/snackbar`                        |
| `Tabs`                            | `Root` (`div`, unstyled), `List` (`div`, the tabs' `root` slot), per tab `Tab` (`button`, around its content, a `span` it renders), `Icon`, `Label`, `Indicator` (`span`), per panel `Content` (`div`, unstyled)                                                                 | Zag's tabs (`@pureform/machines/tabs`)               |
| `NavigationBar`, `NavigationRail` | `Root` (`nav`), per destination `Item` (`a` with an `href`, else `button`), `Indicator`, `ActiveIndicator`, `Icon`, `Label` (`span`)                                                                                                                                             | `@pureform/machines/navigation`                      |
| `ListItem`                        | `Root` (`div`, `a` with an `href`, or `as`), `Leading` (`span`), `Content` (`div`), `Overline`, `Headline`, `SupportingText`, `Trailing`, `TrailingText` (`span`)                                                                                                                | none                                                 |
| `List`                            | `Root` (`ul`, unstyled), per item `Item` (`li`, unstyled) holding a `ListItem`                                                                                                                                                                                                   | none                                                 |

- **Root's props** are the variant groups (`color`, `variant`, …, typed from the app's registry),
  `tokens`, the machine's props (`disabled`, `type`, `name`, `value`, `form`, and the controllable
  `selected` or `checked`), `id` and `ids` (the machine finds its elements by id, so set them
  here rather than on a part), `testId`, `unstyled`, `as`, and the element's own props. The lists
  live in `@pureform/binding-core` (`BUTTON_ROOT_PROPS`, `CHECKBOX_ROOT_PROPS`), shared with React.
- **Parts** take the element's props and their own `unstyled`; `Button.Icon` takes `mirror`.
  A part outside its Root throws, naming both.
- **The ready-made** component takes Root's props, with `class`, `style`, and `slotProps` keyed by
  part. `Button` takes `label`, `icon` (the icon part renders only when given), and `mirrorIcon`.
  `Checkbox` puts `aria-label`, `aria-labelledby`, and `aria-describedby` on its input.
- **The switch is a `<label>` too**, around a native checkbox with `role="switch"`; its ready-made
  takes `icon` (shown in the handle while on) and puts the ARIA naming props on the input.
- **The radio group** is an unstyled `div` (`radioGroupAnatomy`, `data-scope="radio-group"`, test
  id `pf-radio-group-root`) holding a preset `radio` per item. Name the group with `aria-label` or
  `aria-labelledby`, and each radio on its `ItemInput` (the ready-made uses each item's `label`).
  Variants on the group (`color`, `density`, `tokens`) are every radio's defaults; an `Item`'s own
  win. The ready-made takes `items` (`{ value, label, disabled?, invalid?, testId? }`), and
  `slotProps` and `unstyled` keyed by the radio's parts, applied to every radio; `class` and
  `style` are the group element's. Arrow keys move and check, by direction, natively.
- **The chip and icon button toggle** when given `selected` or `defaultSelected` (`aria-pressed`);
  a toggle icon button also selects the preset's `toggle` variant. **The FAB** never toggles; its
  ready-made is extended (`extended` variant) when it has a `label`. Icon-only components (icon
  button, FAB without a label) need `aria-label` or `aria-labelledby` in their types, and warn in
  development without one.
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
  validates. The combobox's own default (its `defaultValue`) follows the label it shows, so a form
  reset doesn't blank it when the value stays (a controlled select whose owner ignores the reset).
  `value` is one string or `null`; `open` is controllable too. Enter, Space, and the
  arrow keys up and down open the list; the sideways arrow keys choose the option before or after,
  by direction. Root takes `items` (`{ value, label, disabled? }`); the ready-made renders every
  part. One value only: no `multiple` yet.
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
  `disabled`, `closeOnSelect`, `leadingIcon`, `trailingIcon`, `trailingText`, and the icons'
  `mirror*` flags. Root takes `onSelect({ value })`, `closeOnSelect`, `loopFocus`, `typeahead`,
  and `positioning` (`bottom-start` by default). Open, the surface holds focus and the highlighted
  item shows the hover state (`data-pf-hover`).
- **The tooltip** opens on hover after `openDelay` (400 ms) and on keyboard focus, and points the
  trigger's `aria-describedby` at itself. The ready-made renders a plain tooltip's
  `supportingText` straight in the surface, and a rich one's (`variant="rich"`) `subhead`,
  `supportingText`, and `actions` in their parts; a rich tooltip is `interactive`. `disabled`
  stops the tooltip, not the trigger.
- **The dialog** is fixed over the viewport and centered (inline layout styles on the
  positioner), with the scrim's registry entry drawing the `Backdrop` (`pf-dialog-backdrop`; Root's
  `testId` and `unstyled` take a `backdrop` key). While a modal dialog is open, Zag keeps focus in
  it, hides the rest of the page from assistive technology, and stops the page scrolling. The
  `Headline` (an `<h2>`) names it and the `Body` describes it. The ready-made takes `icon` (turning
  on the `icon` variant), `mirrorIcon`, `headline`, `body`, and `actions`; `Dialog.CloseTrigger`
  closes it (`as={Button}`).
- **The snackbar** is its `Root`: a `role="status"` region, hidden once closed and its exit
  animation over, that closes itself after `duration` (5000 ms; `null` to stay) unless the pointer or focus is in it. `onOpenChange`
  gets `{ open, reason }` (`timeout`, `action`, `close`, `escape`, `open`); `onAction` runs before
  the action asks to close. The ready-made takes `supportingText`, `action` (the button renders
  only when given), `closeLabel` (the close button's name; it renders only when given), and
  `closeIcon` (a cross unless given). Placing it is the app's. `class`, `style`, and `slotProps` are
  keyed by part on every ready-made.
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
  least 24px), a secondary one the tab. The ready-made addresses it by slot (`class`, `style`,
  `slotProps`, `testId`), and `Tab` takes its props as `tabContentProps`. Each tab draws its own
  indicator; Zag's moving indicator isn't used. When the value changes (a click, a key, a
  controlled `value`), Root slides the new tab's `Indicator` in from where the old one is drawn
  (`slideIndicator`, design doc §9.10), over the `transform` transition its style declares, moving and resizing it between tabs
  whose content differs in width: not on mount or hydration, not under reduced motion, and from
  where a running slide has got to.
- **The navigation bar and rail** share their parts and behavior: a `<nav>` (name it with
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
  are `aria-hidden` (give `aria-hidden={false}` to one that says something).
- **The list** is an unstyled `<ul>` (`listAnatomy`, `pf-list-root`) with each list item in an
  unstyled `<li>` (`List.Item`, `pf-list-item`). Its `density`, `color`, and `tokens` are every
  item's defaults. The ready-made takes `items` (a list item's content and props, with an optional
  `value` as its key: a row stays while its value, else its index, does, and follows its item's
  props, so a list made again from data keeps its rows), and `slotProps` and `unstyled` keyed by
  the list item's parts, applied to every item. A `ListItem` alone isn't in a list; put it in `List.Item`, or give it `as="li"` in
  your own `<ul>`.
- **Progress indicators** (`LinearProgress`, `CircularProgress`) have no machine: Root is a
  `role="progressbar"` with `aria-valuemin`, `aria-valuemax`, and `aria-valuenow`, and `value`
  (from `min` to `max`, 0 to 100 by default) sets the preset's `value` token as a percentage.
  Without a value (or with `indeterminate`) it's indeterminate: no `aria-valuenow`, and the preset
  animates it. Name it with `aria-label`. `<LinearProgress value={40} aria-label="Uploading" />`.
- **The slider** runs pureform's slider machine over a native `<input type="range">` laid over the
  track: the browser handles dragging, the keyboard (its arrow keys follow `dir`), forms, and
  screen readers. `value` is controllable (`number`); `min`, `max`, `step`, `name`, `form`,
  `disabled`, `readOnly`, `invalid` go to the machine and the input; the value sets the root's
  `value` token. The ready-made puts `aria-label`, `aria-labelledby`, `aria-describedby`, and
  `aria-valuetext` on the input. A controlled or read-only slider's input is put back after a
  change it didn't take.
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
- **The ripple** is the layer a press ripple draws in: put `<Ripple />` inside a positioned
  surface. It runs pureform's ripple machine with `useReducedMotion()` (no ripples while motion is
  reduced) and the `ripple` slot's class for each ripple. Props: `disabled`, `effect`
  (`"ink-well"` or `"ink-sparkle"`), `centered`, `allowPropagation`, `getSurfaceEl`.
- **Single-part components** (`Avatar`, `Media`, `Separator`, `Scrim`, `SupportingText`, `Text`,
  `Icon`, `TouchTarget`) are Root alone (`Avatar.Root` is the same component): their variants,
  `tokens`, `testId`, `unstyled`, `as`, and the element's own props, `class` and `style` included.
  The avatar is an `<img>` with `src` (its `label` the `alt`), else a `<span>` of its children,
  `role="img"` named by `label`, or hidden without one. Media is an `<img>` (`as="video"` for a
  video). The separator is an `<hr>` (another element gets `role="separator"`). The scrim and touch
  target are `aria-hidden`. Text takes the preset's `style` group as `textStyle`, since `style` is
  the element's. The icon is hidden unless given a `label` (then `role="img"`), flips under `rtl`
  with `mirror`, and provides `useIconStyle()` to what it holds.
- **The checkbox is a `<label>`** around the native input, as Zag expects, so a click on its touch
  target toggles it. Name it with `aria-label`, or point a `<label for>` at `ids.input`; don't
  wrap it in another label. The input carries every native state the CSS reads (`:checked`,
  `:indeterminate`, `:disabled`, `aria-invalid`), and the form reset and fieldset rule are the
  binding's (below).

### Provider

```tsx
<PureformProvider
    registry={registry} // from .pureform, or a fake one in tests
    dir="rtl" // written on its element, passed to machines; "ltr" at the root
    motion="reduce" // "system" | "reduce" | "full"; writes data-pf-motion unless "system"
    defaults={{ button: { variant: "tonal" } }}
    slotProps={{ button: { label: { class: "caps" } } }}
    theme="teal" // a named theme, or a runtime one: seedTheme({ seed: "#006A60" })
    overrides={{ "colors.primary": "#006a60" }} // token vars in its element's style
    hydrate="reuse" // or "regenerate": how the client gets a server-rendered runtime theme
>
    <App />
</PureformProvider>
```

It renders a `div` with `display: contents` holding `dir`, `data-pf-motion`, and its theme's
attributes, so the CSS (which reads them from an ancestor) and the browser agree with what
components read. Other props (`class`, `style`, `data-*`) go on that element. Nested providers
inherit what they leave out.

**Themes at run time.** `overrides` (token paths, as React Native takes them) become CSS vars in
the element's `style`, named by the registry's `vars`, on the server too. A runtime theme (a
`RuntimeTheme` such as `seedTheme` from `@pureform/material/runtime-theme`) puts the theme
attribute on the element with its scope, `pf-<hash>` of its input, and both schemes' vars in one
`<style data-pf-theme="pf-…">` block in the head, through `useHead` from `@solidjs/web` keyed by
the scope (providers with the same theme share it). On the server the generator must be loaded:
`await preloadTheme(theme)` before rendering (it warns once in development otherwise). With
`hydrate: "reuse"` (the default) the client adopts the server's block and loads nothing; with
`"regenerate"`, or without a server block, it generates (loading the generator after mount the
first time). `useThemeVars()` gives the generated vars. A server render with `renderToString`
and no `</head>` hands the head tags to its `onHead` option.

| Hook             | Returns                                                                            |
| ---------------- | ---------------------------------------------------------------------------------- |
| `usePureform()`  | `Accessor<PureformState>`: the resolved provider state, the root's with none       |
| `useRegistry()`  | `Accessor<AnyRegistry>`; reading it throws when no provider has a registry         |
| `useDirection()` | `Accessor<"ltr" \| "rtl">`: pass it to every machine as `dir`                      |
| `useThemeVars()` | the nearest runtime theme's generated vars, `undefined` while reusing the server's |
| `useMotion()`    | `Accessor<MotionSetting>`: the nearest `"reduce"` or `"full"`, else `"system"`     |

The state `usePureform()` gives is one object for the provider's life, with a memo behind each
field: a component depends on the fields it reads (`state().dir`), and only a field whose value
changed updates its readers (`defaults`, `slotProps`, and `overrides` compare their entries).
Every component reads the provider, so with the whole state as one value, a change to any
setting ran most of a page again (Solid's diagnostics reported `HUGE_FAN_OUT`). Read a field
untracked as `untrack(() => state().dir)`; `untrack(state).dir` reads the field's memo outside
`untrack`.

The fields components read (the registry, `dir`, `motion`, `defaults`, `slotProps`, and the
indication) resolve over the parent's same fields alone, apart from the theme, `overrides`, and
`hydrate`, which reach components as CSS only. So changing those runs the provider and what reads
them through `usePureform()`, not the components under it, even where nested providers both set
`defaults` or `slotProps` for a component, whose merged entries would otherwise be built again
(200 buttons under two such providers: 4.7 ms to 0.1 ms per switch). The provider's own options
compare by identity, as React's do.

### Indication

How interactive components show hover, focus, and press (design doc §9.8): the state layer and
the focus indicator are the preset's CSS, and the indication picks their tokens; the ripple
draws in a layer element inside each surface.

```tsx
import {
    defineIndication,
    materialIndication,
    noIndication,
} from "@pureform/solid";

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
  element: the target's `layer` finds it in the surface when the ripple draws.
- **Sources.** Every interactive component takes `interactionSource` (on Root and the
  ready-made component; a composite's items take one each: `Tabs.Tab`, `Menu.Item`,
  `RadioGroup.Item`, a navigation `Item`, or `interactionSource` in an item's data; the
  snackbar's `Action` and `Close`). Components sharing a source show each other's hover and
  press: the binding marks a hover or press from another origin with `data-pf-hover` or
  `data-pf-active` on the element the preset matches it on (the trigger, or the root around a
  native input), after mount only. Focus is never forwarded.

| Hook                                  | Returns                                                                                                                                                  |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createInteractionSource()`           | a stable `MutableInteractionSource`                                                                                                                      |
| `useInteractionState(source)`         | `Accessor<InteractionState>`: hovered, focused, focusVisible, pressed, dragged; idle on the server                                                       |
| `useIndication(source, { centered })` | `{ surface, layer }`: props for an app's own surface (ref, handlers that emit to `source`, forwarded attributes) and the layer to render first inside it |

```tsx
function Tile() {
    const source = createInteractionSource();
    const indication = useIndication(source, { centered: false });
    return (
        <div class="tile" {...indication.surface}>
            {indication.layer}
            Open
        </div>
    );
}
```

### Registry hooks

```ts
useClasses(name, () => selection): Accessor<ClassSlots<N>>   // over the provider's defaults
useClassFactory(name: StaticComponentName): ClassFactory<N>  // throws for a lazy entry
useLazyClassFactory(name: LazyComponentName): Accessor<ClassFactory<N>>
```

A static entry gives a plain memo. A lazy entry gives an async memo resolving to classes, which
suspends to the nearest `<Loading>` and serializes for hydration. `useLazyClassFactory` memoizes
with `ssrSource: "client"` and warns in development when it runs on the server.

### Building a component

```tsx
const ButtonContext = createContext<{ scope: ComponentScope<typeof buttonAnatomy>; api: … }>();

export function Root(props: RootProps) {
    const id = createUniqueId();
    const dir = useDirection();
    const selected = useControllable("Button", "selected", props);
    const service = useMachine(button.machine, () => ({
        id, dir: dir(), disabled: props.disabled, ...selected.machineProps(),
    }));
    const api = createMemo(() => button.connect(service, normalizeProps));
    const scope = useComponent(buttonAnatomy, {
        selection: () => ({ variant: props.variant, tokens: props.tokens }),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
    });
    return (
        <ButtonContext value={{ scope, api }}>
            {scope.render("root", {
                element: "button",
                as: () => props.as,
                machine: () => api().getRootProps(),
                states: () => ({ pressed: api().pressed }),
                props: omit(props, ...ROOT_PROPS),
            })}
        </ButtonContext>
    );
}

export function Icon(props: PartProps & { mirror?: boolean }) {
    const { scope, api } = useContext(ButtonContext);
    return scope.render("icon", {
        element: "span",
        machine: () => api().getIconProps(),
        states: () => ({ mirrored: props.mirror }),
        props: omit(props, "mirror"),
    });
}
```

The full example, with a ready-made `Button` over `slotPartProps`, is
`src/__fixtures__/button.tsx`.

- `scope.part(part, options)` returns the merged props as a live view to spread yourself;
  `scope.render` also renders the element (`as` overrides it), passes the user's `ref` and
  `children`, and for an icon part (`mirror: true` in the anatomy) provides its element to
  `useIconStyle()`.
- **State attributes:** `states` sets only `STATE_ATTRIBUTES` (`data-pf-hover`, `data-pf-active`,
  `data-pf-dragging`, `data-pf-filled`, `data-pf-mirror`), `""` when on and absent when off.
  Everything else (`aria-checked`, `aria-pressed`, `:disabled`, …) comes from the machine's
  props or the native element.
- **Test ids:** `pf-<scope>-<part>` by default; Root's `testId` is a prefix (`save` →
  `save-root`) or ids by part.
- `unstyled` (Root's, `true` or per part, or a part's own) drops the registry's class and token
  style for that part. Parts outside the AST's slots never get registry classes.
- Ready-made components take `class`, `style`, and `slotProps` keyed by part; `testId` and
  `unstyled` go to Root whole. `createSlotProps(props)` computes every part's props from them
  together, once: `slots("label")` is the label's, to spread from a variable (`const label =
slots("label")`, then `{...label}`; a call inside a spread makes a memo of its own). When the
  three are literals the compiler passed as is (or absent), each part's props are a plain object;
  otherwise a live view of one memo, so a later change still reaches every part.
  `slotPartProps(props, part)` gives one part's, with a memo of its own.
- `optionalPart(props, key, Part, WhenPresent)` picks the part a ready-made renders for an optional
  content prop: none for an absent literal, `Part` for a present one (no `Show`), else
  `WhenPresent`. An icon slot's `WhenPresent` renders with `optional: true`, which builds the
  content once inside the part's icon context and renders the element only while it's there;
  text slots use `whenPresent(Part)`, a `Show` around the part.

**Per-part cost.** A part is one memo (its merged props, from `merge` over the compute function),
its element's spread and children effects, and, for a part with `as`, `dynamic`'s memos. A part
without `as` renders its element through `dynamic(…, { static: true })`, which makes no
computation, on the server as on the client. Its children are read where the element inserts them,
with no memo of their own. One ready-made interactive list item row (a button with an avatar,
supporting and trailing text) creates 68 reactive nodes, down from 144; `list-item/row-cost.spec.tsx`
holds that budget.

### Controllable state and forms

```ts
const checked = useControllable("Checkbox", "checked", props);
// checked.machineProps(): { checked, defaultChecked (read once), onCheckedChange }
useFormReset(inputElement, {
    resetsTo: () => checked.resetsTo() === true, // controlled value, else the default
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
const fieldsetDisabled = useFieldsetDisabled(inputElement); // OR it into the machine's disabled
```

- A defined value prop controls the state; switching between defined and `undefined` warns once
  per instance in development.
- A form reset calls the callback with `reason: "reset"`. Zag's own reset (during the `reset`
  event, to the value at creation) is reported when uncontrolled and dropped when controlled; the
  binding then sends the real default.

### Motion and icons

- `useReducedMotion(): Accessor<boolean>`: the nearest `"reduce"` (true) or `"full"` (false),
  else the system's `prefers-reduced-motion`, `false` until mounted.
- `usePresence(open, onShow?): { present: Accessor<boolean>; ref }`: an overlay's presence on
  Zag's presence machine: `present` while open and while the surface given to `ref` runs its exit
  animation, `false` once it ends (at once when none runs). `onShow` gets the surface each time it
  shows, and may return what undoes it (the dialog stacks its positioner there, in the next
  frame).
- `useIconStyle(): Accessor<IconStyle>`: inside an icon part, its measured `{ size, color,
filled }`, following the component's state; elsewhere `{ size: undefined, color:
"currentColor", filled: false }`.

### `@pureform/solid/internal/zag`

Zag.js machines run as Solid 2 services. Zag's own Solid adapter (`@zag-js/solid`) still
targets Solid 1, so this is a port of its version 1.46.0, with the same exports:

| Export                       | What it does                                                                                              |
| ---------------------------- | --------------------------------------------------------------------------------------------------------- |
| `useMachine(machine, props)` | Runs a Zag machine. `props` can be an object or an accessor; any prop may be `undefined`.                 |
| `normalizeProps`             | Turns Zag's React-shaped part props into Solid 2's: event names, lowercase attributes, hyphenated styles. |
| `mergeProps(...sources)`     | Merges part props lazily: classes, styles, and handlers combine; other keys take the last value.          |
| `useSyncExternalStore`       | An external store's snapshot as a signal.                                                                 |
| `Key`                        | A list keyed by a property or function, built on Solid 2's `<For keyed>`.                                 |

It's internal: components use it, apps shouldn't. When `@zag-js/solid` supports Solid 2, the
port is swapped out by changing imports. What changed from Zag's adapter, and why, is in the
design doc's §8. Beyond Zag's adapter, `normalizeProps` writes ARIA booleans as `"true"` and
`"false"` (Solid 2 writes `true` as an empty attribute), and a machine's watches run untracked,
since they read props and context on purpose (otherwise Solid's development diagnostics warn
`STRICT_READ_UNTRACKED` on every watched change). A machine's context and refs are set up
untracked too: Zag's select reads its props there once (the items of its initial value). The props
a machine's refs read later are untracked as well: refs hold what it reads when an event fires
(the interaction emitters read their source then), which can be during Solid's own updates, as a
focused element removed from the page blurs inside the effect that removes it. And a
machine checks its watches right after its own writes (a sent event, a context write, its start),
in the same batch, with each bindable reading its last write rather than the value Solid shows
before the next flush (`readingLatest` in `bindable.ts`). So what a watch derives (the select's
highlighted item, from its highlighted value) reaches readers in the same flush as what it
follows; as effects only, it came a flush later, and Solid reported `EFFECT_RELAY_TEAR`. Each
watch's effect stays, for what changes from outside, such as a prop. A watch that follows a
controlled prop still writes a flush later, so what readers show must not come from one: the
select's machine (`@pureform/machines/select`) derives its selected items from its value and its
items rather than keeping them in context from a watch, so a controlled select updates in one
flush.

## Build and test

Through the omni MCP (or `omni run`):

- `build`: Vite library build into `dist/`. JSX is left as written (`dist/index.jsx`, and shared
  chunks are `.jsx` too, since an app's Solid plugin reads JSX only in files named so), so the
  app's Solid plugin compiles it for the DOM or the server; the `solid` export condition points
  there, as does `import`. Identifiers aren't minified, so components stay capitalized.
- `test:unit`: Vitest in browser mode (Chromium; `CHROMIUM_PATH` from `.env.local`), with type
  checks. The specs use a fake registry (`src/__fixtures__/registry.ts`, button and checkbox
  classes that name the selection, `togglesRegistry()` for the toggles, and `textInputsRegistry()` for the text field, text area, select, and the menu the select draws its list with). Each component's spec covers rendering, keyboard, controlled
  and uncontrolled state, test ids, `unstyled`, slot overrides, and forms; the core helpers'
  specs use a smaller example button (`src/__fixtures__/button.tsx`).

### Adding a component

Copy `src/button/` or `src/checkbox/`: the contract (Root's own props, the selection, the machine
props) goes in `@pureform/binding-core`'s `src/components/<name>.ts`; the component file creates
its part context with `createPartContext`, makes one `useComponent` call in Root, and renders each
part with `scope.render`. Add the entry to `vite.config.ts`'s `lib.entry` and the subpath to
`package.json`'s `exports`. Then add it to the shared suites in `tests/component-suites`, which
check the cross-cutting rules against Solid and React together (see that package's README).

## Worth knowing

- The overlays' ready-made triggers import the `Button` (`../button`), so a menu, tooltip, or
  dialog subpath brings the button's part code with it.
- A dialog with no focusable element inside takes focus on its surface (`tabindex="-1"`); after
  the snackbar's action closes it, focus goes back to the page.
- The development warning for a stale generated registry calls `trainVersionMismatch`, which finds
  nothing until p4a records it.
- A registry entry's kind is read once per component instance; swapping the registry for one
  whose entry kind differs isn't followed.
- `useIconStyle` doesn't see a style that changes by a pseudo-class alone (`:hover`) with no
  transition.
- The ready-made `Button`, `Chip`, and `ListItem` build their icon content (`icon`, `leading`,
  `trailing`) once, inside the part's icon context. The other ready-mades' optional icon slots
  (the dialog's, search bar's, text field's, select's, switch's) still read the prop once to test it
  and build it again inside the part.
- A ready-made decides from the props object the compiler made whether a slot-keyed or content prop
  is a literal (`isStatic`); props that come through a `merge` (a spread of a call, the ready-made
  `List`'s items) always take the reactive path, since the server and the client build merges
  differently and must render the same parts.
- Ids from `createUniqueId` and hydration keys follow the owner tree, so they changed when the
  parts dropped memos; the markup around them is the same.
- A controlled checkbox's or switch's native input is put back after a click the owner ignores,
  in a microtask once the machine and the owner have handled it (`syncCheckedInput`); a radio
  group's radios likewise (`syncRadioInputs`).
- `useFormReset` takes `writeDefault` for a control whose native default isn't one input's: the
  radio group writes every radio's (`setRadioDefaults`), tracking the form through its first
  radio.
- `solid-js` and `@solidjs/web` are peers at the exact release candidate the package is tested
  with (design doc §11).
