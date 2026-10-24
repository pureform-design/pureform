# Changelog

All notable changes to this project will be documented in this file. See [conventional commits](https://www.conventionalcommits.org/) for commit guidelines.

- - -

## Unreleased

#### Breaking changes

- `AppBar`: `searchBar` -> `searchBarProps` (slot-c).
- `List`, `SelectionList`: `tokens` are the list's own (they were every item's); items' tokens and
  test ids go in `listItemProps`.
- `RadioGroup`: `tokens` -> `radioProps.tokens` (with `radioProps.testId`).
- `ButtonGroup`: `groupTokens` -> `tokens`; new `buttonProps` / `iconButtonProps` (`tokens`, `testId`).
- `ChipSet`: `setTokens` -> `tokens` (they were every chip's); chips' tokens go in `chipProps`.
- `TagsInput`: `chip.tokens` -> `chipProps.tokens`.
- `ButtonGroup` and `ChipSet` pass `indication` to their buttons and chips.
- Root-only `style` -> keyed `style={{ root: … }}` (Button, IconButton, Fab, Chip, Checkbox,
  Switch, Radio, RadioGroup, Badge, Text, FadeThrough); `RootStyleProps` and `withUserStyle` are
  gone (slot-d).
- `inputProps` (TextField, TextArea, Select, Autocomplete, SearchBar, NumberField, CodeField,
  TagsInput) -> `slotProps.input`; the component's own input props win over it.
- Overlays name their parts as the web does: the surface is `content` (`pf-dialog-content`,
  `pf-menu-content`, … were `-root`), a sheet's content `body` (`pf-bottom-sheet-body`), the
  search view's surface `surface`; `testId`, `style` and `slotProps` take these keys, and
  `backdrop` for a dialog's, sheet's or date picker's scrim. The date picker's trigger id follows
  its `testId`.

#### Features

- Every ready-made takes `style` and `slotProps` keyed by its parts (`<X>Hosts` says what each
  part renders as); handlers compose, the component's first; merged values are cached by
  identity (`nativeSlots`).
- `<component>Props` for what a ready-made draws: `listItemProps`/`radioProps`/`buttonProps`/
  `iconButtonProps`/`chipProps` take `style` and `slotProps` too; new `menuProps` (Select,
  Autocomplete, SplitButton, Toolbar), Toolbar `buttonProps`/`iconButtonProps`, SearchView
  `searchBarProps`/`backButtonProps`/`clearButtonProps`, DatePicker and DateInput
  `cancelButtonProps`/`confirmButtonProps`, Paginator `selectProps`, Table `checkboxProps`,
  FileUpload `buttonProps`/`listItemProps`/`iconButtonProps`/`linearProgressProps`, ColorPicker
  `textFieldProps`/`iconButtonProps`, TagsInput `chipProps.style`/`slotProps`.

- - -
