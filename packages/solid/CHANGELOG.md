# Changelog

All notable changes to this project will be documented in this file. See [conventional commits](https://www.conventionalcommits.org/) for commit guidelines.

---

## Unreleased

#### Breaking changes

- `AppBar`: `searchBar` -> `searchBarProps` (slot-c).
- Containers follow the slot-props standard (slot-b). Their `class`, `style` and `slotProps` are
  keyed by their own parts, and the components they draw take one `<component>Props`:
  - `List`, `SelectionList`: `listTokens` is gone; `tokens` are the list's own (they were every
    item's). `slotProps`/`unstyled` keyed by the list item's parts are gone: use
    `listItemProps` (`class`, `style`, `slotProps`, `unstyled`, `testId`, `tokens`), under each
    item's own. `class`/`style` are keyed (`root`, `item`). `List.Root` no longer gives its
    `tokens` to its items.
  - `RadioGroup`: `tokens` and the radio-keyed `slotProps`/`unstyled` are gone: use
    `radioProps`. `RadioGroup.Root` takes no `tokens` (the group has no recipe).
  - `ButtonGroup`: `groupTokens` -> `tokens`; new `buttonProps`, `iconButtonProps`, `unstyled`,
    and `indication` reaching the buttons.
  - `ChipSet`: `setTokens` -> `tokens` (they were every chip's); chips' tokens go in the new
    `chipProps`; new `unstyled`, and `indication` reaching the chips.
  - `Toolbar`: `class`/`style` keyed by `root`; new `buttonProps` and `iconButtonProps`.
  - `TagsInput`: `chip.tokens` -> `chipProps.tokens`; `chipProps` also reaches the chips' parts.
- New `CustomizeProps<A>` and `InnerPropsOf<A>` types.

#### Features

- Repeated parts take a value or a function of the copy (slot-e, `PerInstance<V, I>`) in
  `class`, `style`, `slotProps` and `unstyled`: calendar `cell`/`week`/`weekday` (DatePicker,
  DockedDatePicker), time picker `dialLabel`/`scrollItem`, Table `row`/`alternateRow`/`cell`/header
  and footer cells, Stepper steps, Tabs, Carousel slides, Accordion items, Tree nodes, Rating stars,
  Menu items (and Select/Autocomplete/SearchView `menuProps`), FabMenu items, Slider thumbs and
  markers, CodeField inputs, ColorPicker swatches and channel sliders, NativeSelect options, List/
  SelectionList items, NavigationBar/Rail destinations, FileUpload files, toasts. Instance types
  are exported (`TableRowInstance`, `CalendarCellInstance`, `ItemInstance<T>`, …).
- Dead parts wired (slot-e): Table `sortLabel`/`sortIndicator` (`SortHeader` `labelProps`/
  `indicatorProps`), Splitter `resizeTriggerIndicator` (`ResizeTrigger` `indicatorProps`),
  calendar `weekdays`/`grid`/`weekday`/`week`, DateInput `segment`, TimeInput `input`/`fieldLabel`,
  TimePicker dial parts, ColorPicker area, thumb, transparency grid, channel slider track/thumb and
  swatch, FileUpload `error` (`Item` `errorProps`), Label `requiredIndicator`, DragHandle `handle`
  (`slotProps`), ListItem `frame`/`action`/`region` `unstyled`, NavigationRail `scrim`/`dialog`.
- Stepper and Tabs take `fadeThroughProps` and `horizontalSharedAxisProps`.
- ColorPicker: handlers in `textFieldProps.slotProps.input` compose after the picker's own.
- Submenus inherit the menu's `testId` and `unstyled`.
- Avatar always draws its `Fallback` part; Toolbar keeps a string `menuProps.style.root` while
  the menu is hidden.
- Ready-mades take props for the components they draw (slot-c): `menuProps` (Select,
  Autocomplete, SearchView, SplitButton, Toolbar's overflow menu), `searchBarProps`,
  `backButtonProps`, `clearButtonProps` (SearchView), `cancelButtonProps`/`confirmButtonProps`
  (DatePicker, DateInput), `selectProps` (Paginator), `checkboxProps` (Table), `buttonProps`,
  `listItemProps`, `iconButtonProps`, `linearProgressProps` (FileUpload), `textFieldProps`,
  `iconButtonProps` (ColorPicker), `labelProps`, `inputProps`, `descriptionProps`,
  `errorTextProps` (Field).

---
