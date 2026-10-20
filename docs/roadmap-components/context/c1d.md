# c1d: Button and chip (output context)

Commits: see `git log 38e43e0..c1d-button-and-chip`.

## Built

- **Button** (`packages/preset/src/components/button.ts`): optional `secondaryIcon` part (after
  `icon`, before `touchTarget` in the anatomy order: `root, label, icon, secondaryIcon, touchTarget`).
  Tokens `secondaryIconSize` (each size sets it with `iconSize`), `secondaryIconSpacing`
  (default `spacing("1")`, on top of the root gap) and the flag `secondaryStart`. New variant
  group `secondaryIconPosition` (`end` default, `start`) sets the flag; the part's inline margins
  are `blend`s of it, so the spacing is on the side facing the label. No compound added.
- **Chip** (`chip.ts`): optional `trailingIcon` part (`trailingIconSize`, `trailingIconSpacing`,
  coloured like the leading icon). Variants `corner` (`square` default, `round`) and `toggle`
  (`false`/`true`), reading shared `cornerRadius` / `cornerTransition` from `shared.ts` (no helper
  was missing). Tokens: `radius` is now the round radius (`full`), plus `squareRadius` (small),
  `pressedRadius` (extraSmall), `square` (default 1), `toggles`. Resting corners are as before;
  every chip now also tightens while pressed. No compounds.
- **Machine** (`packages/machines/src/button`): `secondaryIcon` in the anatomy (drift test passes),
  `getSecondaryIconProps()` (aria-hidden), which the chip's trailing icon also uses.
- **binding-core:** `secondaryIconPosition` in `ButtonVariantProps`/`BUTTON_ROOT_PROPS`/
  `buttonSelection`; `secondaryIcon` content prop; chip `corner`, `toggle` (via `isToggle`, as the
  button), `ChipContentProps`/`CHIP_CONTENT_PROPS` (`trailingIcon`); `chipSelection` now takes the
  behaviour props too.
- **Bindings** (Solid, React, React Native): `Button.SecondaryIcon`, `Chip.TrailingIcon`, ready-made
  `secondaryIcon` (placed by `secondaryIconPosition`) and `trailingIcon` props.
- **Tests/fixtures:** preset specs (button, chip, icons, snapshots), binding-core toggles spec,
  anatomy specs (part lists, mirror slots), css-adapter `classes.spec.ts` type, component-suite
  examples, Panda fixture page (round filter chip with a trailing icon, a button with a secondary
  icon), regenerated indication fixtures (additions only) and the `buttons`/`chips` screenshots.
- Docs: gap analysis (§0.1 rows 5 and 6, §2.1, matrix, §7), preset/solid/react READMEs.
  `packages/anatomy/src/generated.ts` regenerated.

## Deviations from the design

- Deprecated options: only the button's `compact` size exists; no Expressive size equals 48 dp, so
  it stays, with a spec. The chip has none.
- The secondary icon position is a variant (`secondaryIconPosition`), since the style AST has no
  position-based state and a flag token keeps one margin rule per side.
- `usage.ts` is unchanged: leaving the new groups out keeps every value (adding them broke the
  bundler's scan expectations).
- Chip `trailingIcon` reuses the button machine's `getSecondaryIconProps`.

## Stubs and gaps

- Input chip morph and `remove`/`avatar`: c2c.
- React Native: `Chip` gets `selected` only, so `toggle` is set whenever `selected` is given.
- No dedicated Panda factory sampling beyond the existing; codegen sampling specs pass.

## How to verify

- `omni run build test -b 38e43e0 -w`; `bunx vitest run` in `packages/preset`, `packages/machines`.
- `cd tests/browser-e2e-tests && bunx vitest run -c vitest.config.e2e.ts` (run `omni run prepare -p @pureform/panda-fixture` first).
- Unit timeouts in `css-adapter` and `rn-adapter` codegen/factory specs occur only under load and pass alone.

## Notes for the next phases

- After building, run `bun install` again before `omni run generate`.
- A new part on an icon-like slot built with `iconBox` automatically "takes mirror" in the anatomy.

## Refactoring hints

- **Helpers that look generic:** the "icon part with margin by a position flag" (`secondaryIcon` in
  `button.ts`); `blend`-based inline margins could live in `shared.ts` for list leading/trailing
  parts (c1c) and the text field (c1a).
- **Code that looks like a sibling's:** button and chip now share the corner-morph tokens
  (`radius`, `squareRadius`, `pressedRadius`, `square`, `toggles`) and the `corner`/`toggle`
  variants; icon button/FAB repeat them (`icon-button.ts`, `fab.ts`). Solid/React button and chip
  both repeat the optional-icon render function (`renderIcon`/`renderSecondaryIcon`/
  `renderTrailingIcon`).
- **Suggested home:** a `cornerMorphTokens()` and `cornerMorphVariants()` pair in `shared.ts`; an
  `optionalIconPart` helper in the bindings' `parts`.
- **What must not change:** `__snapshots__/{button,chip}.spec.ts.snap`, the indication fixtures,
  the `buttons` and `chips` screenshots, `anatomy-drift.spec.ts`.

## Open questions

- `secondaryIconSpacing` and `trailingIconSpacing` default to `spacing("1")`; the M3 values are
  unconfirmed.
- Chip pressed radius (`extraSmall`) and round radius (`full`) are my reading of Compose 1.5; the
  input chip's morph comes with c2c.
- Should the chip's default corner be `round` as the button's? It stays `square` (current look).
