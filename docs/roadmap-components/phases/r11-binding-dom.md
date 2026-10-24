# r11 binding-dom split

Depends on: fix-storybook-8.

`@pureform/binding-core` becomes platform-neutral (React, Solid, React Native); a new
`@pureform/binding-dom` holds everything that needs a DOM type or API (React, Solid only).

## Rule

Anything that needs a DOM type or API to compile or run goes in `binding-dom`. `binding-core`
type-checks without the DOM lib, so a leak fails `tsc`.

## Moves to binding-dom

- All of today's `@pureform/binding-core/dom` entry (drags and swipes, menu drill motion,
  `menuSubmenuRoom`, scroll-focus, collapse, reveal, slide, carousel-row, toolbar-dom,
  drag-click, splitter-release, tooltip long-press, web-theme).
- The indication system's DOM half: `indication-host.ts`, the `HTMLElement` host fields of
  `indication.ts`. The interaction state stays in core.
- DOM halves of mixed component files: FabMenu's key handlers (the order rule stays in core),
  Dialog/Popover `initialFocusEl`/`finalFocusEl`, SearchView's input getter, Ripple's layer option.
- Web-only props as extensions of the core props (`DialogDomProps = DialogProps & {...}`):
  element getters, FileUpload's `File`/`FileList` values (core types a generic item),
  `className`, links' `target`/`rel`, DOM event types.

## Stays in binding-core

- `href` (a platform-neutral link destination; React Native Web renders a link, devices can use
  `Linking`), without `target`/`rel`.
- pureform's own `style`/token props and its own `target` fields (select, progress,
  touch-target, shared axis).
- Pure logic: controllable state, settle/spring rules, menu groups and drill picks, usage, tokens,
  provider, interaction state.

## Migration

- No shims: `@pureform/binding-core/dom` is removed; imports rewritten to `@pureform/binding-dom`.
- React and Solid import both; React Native imports only `binding-core`.

## Guards

- `binding-core` tsconfig without the `dom` lib.
- A check that `react-native` (and `rn-adapter`) never import `binding-dom`.
- Full gate green.
