# c0a: Navigation label colour (output context)

## Built

- `NAV_TOKENS` in `packages/preset/src/components/navigation.ts` has a second current-label
  token, `horizontalActiveLabelColor` (default `onSecondaryContainer`, the active icon's
  color), next to `activeLabelColor` (`secondary`, the vertical item's). Both the navigation
  bar and the navigation rail get it through `navTokens`.
- `packages/preset/src/contrast.ts`: `NAV_PAIRS` checks `horizontalActiveLabelColor` on
  `indicatorColor` at 4.5:1, since a horizontal item's label sits on the pill with its icon.
  The preset's contrast spec covers both components through this list, under every palette.

## Deviations from the design

- Nothing reads the new token yet; c1e's horizontal item layout selects it. So the CSS has no
  `var(--…-horizontalActiveLabelColor)`, and the generated output, fixtures and screenshots
  are unchanged (vertical output identical; no snapshot moved).
- `packages/css-adapter/src/codegen.spec.ts` is outside the owned files: its "tokens the
  preset declares but no style reads yet" allowlist gained the two new vars, with a comment
  pointing at c1e. Without it that spec fails. c1e must remove these entries once it reads
  the token.

## Stubs and gaps

- The colour variants (`colorVariant` in `navigation-bar.ts` and `navigation-rail.ts`) pass
  only `label: g.main` to `navColors`. A horizontal item under a non-default colour group
  needs `g.onContainer` for its label; `NavActive` has no horizontal field yet. Left to c1e,
  which owns the layout selection.

## How to verify

- `bunx vitest run` in `packages/preset` (contrast spec included) and
  `bunx vitest run src/codegen.spec.ts` in `packages/css-adapter`.
- `bunx tsc --noEmit -p tsconfig.json` in both packages.

## Notes for the next phases

- c1e: in the horizontal layout, set the item's `selected` color to
  `ref("horizontalActiveLabelColor")` (and add a `horizontalLabel` to `NavActive` for the
  colour variants, using the group's `onContainer`), then drop the allowlist entries in
  `packages/css-adapter/src/codegen.spec.ts`.

## Refactoring hints

None. The change is two token entries and one contrast pair; nothing generic was written.

- **What must not change:** `packages/preset/src/components/__snapshots__/new-components.spec.ts.snap`
  (nav entries) and the contrast spec results.

## Open questions

- The default `onSecondaryContainer` follows Compose 1.5's "label takes the icon's color"
  rule; the M3 token tables for the horizontal item were not cross-checked against a newer
  release.
- The token name `horizontalActiveLabelColor` (rather than, say, `activeLabelColorHorizontal`)
  is my choice; rename in c1e if a layout-keyed token group reads better.
