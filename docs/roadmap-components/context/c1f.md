# c1f: Snackbar layout (output context)

Commits: see `git log main..c1f-snackbar-layout`.

## Built

- Preset (`packages/preset/src/components/snackbar.ts`): a new `actions` part wrapping `action`
  and `close` (structure `root: [supportingText, actions]`, `actions: [action, close]`), and a
  `layout` variant group: `oneLine` (default, unchanged look), `twoLine` (root `minHeight` reads
  the new `twoLineMinHeight` token, 68px) and `longAction` (root becomes a column, `actions`
  moves below the text with `justifyContent: end`). The AST has no `flexWrap`, hence the wrapper.
  No compound variants (before 0, after 0); the layout sets styles, not tokens, and reads tokens.
- Machine: `actions` in `snackbar.anatomy.ts`, `getActionsProps()` in connect and types (the
  c0b drift test passes).
- binding-core: `SnackbarVariantProps.layout`, `layout` in `SNACKBAR_ROOT_PROPS` and
  `snackbarSelection`, `SnackbarPart` gains `actions`, usage entry `same("layout")`.
- Solid and React: `Snackbar.Actions`; the ready-made snackbar renders it around the action and
  close button when either is present. React Native: the surface wraps them in an `actions` view;
  `layout` is accepted through `SnackbarVariantProps`.
- The optional close icon already existed (`closeLabel` and `closeIcon`); nothing to add.
- `packages/anatomy/src/generated.ts` regenerated. Snapshot and spec updated; new
  `snackbar.spec.ts` in the preset. READMEs and the gap analysis row updated.

## Deviations from the design

- In `longAction` the close button stays beside the action in the wrapper (not at the text's
  end). M3's exact placement of the close icon in that layout is unconfirmed.
- No deprecated options existed on the snackbar; none removed.

## Stubs and gaps

- `useSnackbar()`'s queue (React Native) doesn't pass `layout` to the items; c3a owns the queue.
- No browser screenshot of the layouts and no component-suite case for `layout` were added
  (the existing suite cases render the ready-made snackbar and pass with the wrapper).

## How to verify

- `omni run build test -f all -o continue`; `bunx tsc --noEmit -p tsconfig.json` in preset,
  machines, binding-core, solid, react, react-native.

## Notes for the next phases

- c3a: a queue item should take `layout` and render `Snackbar` with it.
- Run `generate` after merging: `generated.ts` conflicts are to be regenerated.

## Refactoring hints

- **Helpers that look generic:** the actions-wrapper pattern (a row of trailing buttons that moves
  below the text in a column layout) is like the card's `actions` and the dialog's `actions`;
  `layout`-by-flex-direction could be a shared helper.
- **Code that looks like a sibling's:** `Actions` in Solid/React is the same shape as
  `SupportingText` (a plain element part from the machine's props).
- **Suggested home:** `packages/preset/src/components/shared.ts` for a row-or-column actions style.
- **What must not change:** the default (`oneLine`) layout's computed styles; the snapshot in
  `new-components.spec.ts.snap` apart from the new part and variants.

## Open questions

- Is 68px the right two-line height, and does `longAction` want a larger trailing padding?
  Values follow the M3 snackbar spec from memory; not rechecked on m3.material.io.
