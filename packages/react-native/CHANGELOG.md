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

- - -
