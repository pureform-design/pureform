# Changelog

All notable changes to this project will be documented in this file. See [conventional commits](https://www.conventionalcommits.org/) for commit guidelines.

- - -

## Unreleased

#### Features

- New package: the web half of the bindings, split from `@pureform/binding-core` (r11). It holds
  what was `@pureform/binding-core/dom` (now the root entry), the indication host and Material's
  web ripple (`/indication`), and the web-only props as extensions of binding-core's contracts:
  `DialogFocusProps`, `PopoverDomRootOwnProps`, `RippleDomRootOwnProps`,
  `searchViewDomDialogProps`, the `FileUploadDom*` types over `File`, and `fabMenuListProps`.

- - -
