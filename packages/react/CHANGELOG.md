# Changelog

All notable changes to this project will be documented in this file. See [conventional commits](https://www.conventionalcommits.org/) for commit guidelines.

- - -

## Unreleased

#### Breaking changes

- Containers follow the slot-props standard (slot-b). Their `className`, `style` and `slotProps` are
  keyed by their own parts, and the components they draw take one `<component>Props`:
    - `List`, `SelectionList`: `listTokens` is gone; `tokens` are the list's own (they were every
      item's). `slotProps`/`unstyled` keyed by the list item's parts are gone: use
      `listItemProps` (`className`, `style`, `slotProps`, `unstyled`, `testId`, `tokens`), under each
      item's own. `className`/`style` are keyed (`root`, `item`). `List.Root` no longer gives its
      `tokens` to its items.
    - `RadioGroup`: `tokens` and the radio-keyed `slotProps`/`unstyled` are gone: use
      `radioProps`. `RadioGroup.Root` takes no `tokens` (the group has no recipe).
    - `ButtonGroup`: `groupTokens` -> `tokens`; new `buttonProps`, `iconButtonProps`, `unstyled`,
      and `indication` reaching the buttons.
    - `ChipSet`: `setTokens` -> `tokens` (they were every chip's); chips' tokens go in the new
      `chipProps`; new `unstyled`, and `indication` reaching the chips.
    - `Toolbar`: `className`/`style` keyed by `root`; new `buttonProps` and `iconButtonProps`.
    - `TagsInput`: `chip.tokens` -> `chipProps.tokens`; `chipProps` also reaches the chips' parts.
- New `CustomizeProps<A>` and `InnerPropsOf<A>` types.

- - -
