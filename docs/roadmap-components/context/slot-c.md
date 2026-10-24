# slot-c: props of the components ready-mades draw

Branch `slot-c`, from `main` at 2311b98b. Third of five batches (a-e). React and Solid; React
Native only where a shared type changed (batch d does the rest).

## What was done

Each ready-made that draws another component takes one `<component>Props`
(`InnerPropsOf<typeof xAnatomy>`), passed straight through (spread first, so the ready-made's
own wiring wins; no merging, no allocation), except where noted.

| Component                      | New props                                                                   | Notes                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------ | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AppBar (R, S, N, binding-core) | `searchBarProps` (was `searchBar`, removed)                                 | Typed `SearchBarProps` (content too: placeholder, value); its presence still turns the bar on.                                                                                                                                                                                                                                                                          |
| Select, Autocomplete           | `menuProps` (Root prop too)                                                 | The list is its own `selectMenu`/`autocompleteMenu` anatomy (a menu scope, not the Menu component). `testId`/`unstyled`/`tokens` feed the menu scope (string `testId` still the fallback); keyed props reach positioner, root (Content), item, itemLabel, itemGroup, itemGroupLabel. No `textFieldProps`: the field is the select's own anatomy, not a drawn TextField. |
| SearchView                     | `menuProps` (Root), `searchBarProps`, `backButtonProps`, `clearButtonProps` | Two IconButtons in different roles, so role names.                                                                                                                                                                                                                                                                                                                      |
| SplitButton                    | `menuProps` (Root)                                                          | Menu.Root gets testId/unstyled/tokens and the `root` slot; the ready-made draws Menu.Positioner/Content itself (was `SplitButtonMenu`) with the menu's slots; items through `Menu.ItemEntry slot` (R) / `Menu.Items slot` (S).                                                                                                                                          |
| Toolbar                        | `menuProps` (overflow menu)                                                 | `trigger` key reaches the overflow IconButton (via `asRoot`); root style merges with the hidden style. Closes slot-b's open question.                                                                                                                                                                                                                                   |
| DatePicker, DateInput          | `cancelButtonProps`, `confirmButtonProps`                                   | Prev/next/mode toggle stay parts drawn `as={IconButton}` (`asRoot`): the root is what they need; their inner parts are reachable through `slotProps.<part>`.                                                                                                                                                                                                            |
| Paginator                      | `selectProps` (`InnerPropsOf<select>` + `menuProps`)                        | Arrows stay parts (`asRoot`).                                                                                                                                                                                                                                                                                                                                           |
| Table                          | `checkboxProps` (Root prop, via context)                                    | One prop for select-all and row checkboxes (same role: selection).                                                                                                                                                                                                                                                                                                      |
| FileUpload                     | `buttonProps`, `listItemProps`, `iconButtonProps`, `linearProgressProps`    | `FileUpload.Item` takes the last three; ListItem gets `overDefaults({testId, slotProps: headline/supportingText}, listItemProps)` (user's wins).                                                                                                                                                                                                                        |
| ColorPicker                    | `textFieldProps`, `iconButtonProps`                                         | Hex field and eye dropper.                                                                                                                                                                                                                                                                                                                                              |
| Field                          | `labelProps`, `inputProps`, `descriptionProps`, `errorTextProps`            | The pieces are single-part plain components: typed as their whole props (minus children), so `inputProps` takes `placeholder`/`type` too.                                                                                                                                                                                                                               |

**Kept as part keys (no `<component>Props`):** every `as={Button|IconButton}` part (dialog, sheet,
fullscreen dialog, popover, tooltip, rich tooltip, menu triggers; close/back/confirm buttons;
picker and paginator arrows): the part key reaches the root, and the button's inner parts and
tokens go through `slotProps.<part>` (`tokens`, `slotProps.label`). Adding a second prop would
give two routes to one element.

**Nothing drawn (no change):** Snackbar (actions are own parts), FabMenu (items are own parts),
NavigationBar/Rail, Tabs, Menu items and submenus, Tree, Stepper (own parts; per-instance values
are batch e). Dialog `actions` are user nodes. Tabs/Stepper draw FadeThrough /
HorizontalSharedAxis, but those take only `testId`/`unstyled` (no keyed props), so no
`transitionProps` yet. BottomSheet's DragHandle takes plain `className`, so its part key works.

**Button/IconButton plain `className` string: not done.** `asRoot` also moves `style`, which
can't be told apart from a keyed object, so it would stay anyway; a string-or-keyed `className`
on Button alone would be a shape no other component takes. `asRoot` stays.

Docs: React/Solid READMEs (one bullet listing the props), CHANGELOGs (react, solid,
react-native, binding-core: `searchBar` breaking; features list), binding-core README,
gap analysis (AppBar row).

## Tests

- New `drawn-props.spec.tsx` in react and solid (Select, SplitButton, DateInput, Paginator,
  Table, Field, ColorPicker, FileUpload). AppBar specs use `searchBarProps`.
- `omni run build test -p` binding-core, react, react-native, component-cases, solid: pass.
- Storybook generated stories AppBar, Select, Autocomplete, SearchView, SplitButton, Toolbar,
  DateInput, DatePicker, Paginator, Table, FileUpload, ColorPicker: 161/161 on solid, react, native.
- component-suites (`solid/css`, `react/css`): overlays + table-sort `-t "Menu|Overlays
inside|Table|sort"` 24 passed; keyboard + forms `-t "Select|Autocomplete|SplitButton|Paginator|DateInput|DatePicker"` 155 passed.
- `tsc` clean in react, solid, react-native, solid-demo.

## Refactoring hints

- **Helpers that look generic:** "drawn menu" wiring (menu scope gets `testId ?? stringTestId`,
  `unstyled`, `tokens`; ready-made spreads keyed slots on positioner/content/items) is repeated
  in Select, Autocomplete, SearchView (menu scopes) and SplitButton, Toolbar (Menu component),
  in both bindings. A `useInnerMenu(menuProps, fallbackTestId)` in each binding's
  `select-field-parts.tsx` would cover the first three. Solid's SplitButton has a local
  `createMenuSlotProps`; Solid's other sites build getter objects over `props.menuProps`
  (slot-b's `createInnerSlotProps` hint applies).
- **Code that looks like a sibling's:** `NO_MENU_PROPS` constants (React) in five files.
- **Suggested home:** `parts.tsx` per binding.
- **What must not change:** `drawn-props.spec.tsx` (react, solid), app-bar specs, the story files
  above.

## Open questions

- FileUpload's own `error` part isn't spread from keyed props (gap 7), untouched.
- FadeThrough/HorizontalSharedAxis lack keyed props, so Tabs/Stepper can't reach them.
- Solid Toolbar: a string `menuProps.style.root` is dropped when the menu is hidden.
- React Native: SplitButton/Select menus etc. not done (batch d); only the `searchBarProps` rename.
