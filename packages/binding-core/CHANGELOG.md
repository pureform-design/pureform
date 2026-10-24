# Changelog

All notable changes to this project will be documented in this file. See [conventional commits](https://www.conventionalcommits.org/) for commit guidelines.

- - -

## Unreleased

#### Breaking changes

- `listTokens`, `groupTokens`, `setTokens` are gone: `ListRootOwnProps`, `ButtonGroupRootOwnProps`
  and `ChipSetRootOwnProps` take `tokens` as the container's own (and `unstyled`). `ListVariantProps`
  and `ChipSetChipVariantProps` no longer carry the children's tokens; `listItemVariants`,
  `chipSetChipVariants` and `radioSelection` no longer merge them. `RadioGroupRootOwnProps` has no
  `tokens` (new `RadioGroupVariantProps`). `TagsInputVariantProps.chip` has no `tokens`.
- `ButtonGroupRootOwnProps` and `ChipSetRootOwnProps` take `indication`.

#### Features

- `InnerProps<C>` and `overDefaults(defaults, own)`: a drawn component's customize props, and a
  child's own over its container's defaults (classes join; `style`, `slotProps`, `tokens` merge per
  part; either side as-is when the other is empty).

- - -
